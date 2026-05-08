import { Chess } from 'chess.js';

export class GameManager {
  constructor() {
    this.chess = new Chess();
    this.history = [];
    this.currentMoveIndex = -1;
    this.listeners = {};
    this.gameMode = 'human'; // human, engine, analysis
    this.playerColor = 'w';
    this.isFlipped = false;
    this.gameResult = null;
  }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    (this.listeners[event] || []).forEach(cb => cb(data));
  }

  newGame(options = {}) {
    const fen = options.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    this.chess = new Chess(fen);
    this.history = [];
    this.currentMoveIndex = -1;
    this.gameResult = null;
    this.gameMode = options.mode || 'human';
    this.playerColor = options.color || 'w';
    this.emit('newgame', { fen });
    this.emit('positionchange', this.getState());
  }

  makeMove(from, to, promotion) {
    const moveObj = { from, to };
    if (promotion) moveObj.promotion = promotion;
    
    const move = this.chess.move(moveObj);
    if (!move) return null;

    // Truncate future history if we branched
    if (this.currentMoveIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentMoveIndex + 1);
    }

    this.history.push({
      move,
      fen: this.chess.fen(),
      san: move.san,
      from: move.from,
      to: move.to,
      color: move.color,
      captured: move.captured,
      flags: move.flags
    });
    this.currentMoveIndex = this.history.length - 1;

    this.emit('move', { move, index: this.currentMoveIndex });
    this.emit('positionchange', this.getState());

    // Check game over
    if (this.chess.isGameOver()) {
      this.gameResult = this.getGameResult();
      this.emit('gameover', this.gameResult);
    }

    return move;
  }

  getLegalMoves(square) {
    return this.chess.moves({ square, verbose: true });
  }

  isPromotion(from, to) {
    const moves = this.chess.moves({ square: from, verbose: true });
    return moves.some(m => m.to === to && m.flags.includes('p'));
  }

  undo() {
    if (this.currentMoveIndex < 0) return false;
    this.chess.undo();
    this.currentMoveIndex--;
    this.emit('positionchange', this.getState());
    return true;
  }

  redo() {
    if (this.currentMoveIndex >= this.history.length - 1) return false;
    this.currentMoveIndex++;
    const entry = this.history[this.currentMoveIndex];
    this.chess.move(entry.move);
    this.emit('positionchange', this.getState());
    return true;
  }

  goToMove(index) {
    if (index < -1 || index >= this.history.length) return;
    // Reset to start
    const startFen = this.history.length > 0 ? 
      new Chess(this.history[0].fen).fen() : 
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    
    this.chess = new Chess('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    for (let i = 0; i <= index; i++) {
      this.chess.move(this.history[i].move);
    }
    this.currentMoveIndex = index;
    this.emit('positionchange', this.getState());
  }

  goToStart() { this.goToMove(-1); }
  goToEnd() { this.goToMove(this.history.length - 1); }

  getState() {
    return {
      fen: this.chess.fen(),
      turn: this.chess.turn(),
      inCheck: this.chess.inCheck(),
      isCheckmate: this.chess.isCheckmate(),
      isStalemate: this.chess.isStalemate(),
      isDraw: this.chess.isDraw(),
      isGameOver: this.chess.isGameOver(),
      moveNumber: Math.floor(this.currentMoveIndex / 2) + 1,
      lastMove: this.currentMoveIndex >= 0 ? this.history[this.currentMoveIndex] : null,
      history: this.history,
      currentMoveIndex: this.currentMoveIndex
    };
  }

  getGameResult() {
    if (this.chess.isCheckmate()) {
      return { result: this.chess.turn() === 'w' ? '0-1' : '1-0', reason: 'checkmate' };
    }
    if (this.chess.isStalemate()) return { result: '1/2-1/2', reason: 'stalemate' };
    if (this.chess.isDraw()) return { result: '1/2-1/2', reason: 'draw' };
    if (this.chess.isThreefoldRepetition()) return { result: '1/2-1/2', reason: 'repetition' };
    if (this.chess.isInsufficientMaterial()) return { result: '1/2-1/2', reason: 'insufficient material' };
    return null;
  }

  turn() { return this.chess.turn(); }
  fen() { return this.chess.fen(); }
  board() { return this.chess.board(); }
  isGameOver() { return this.chess.isGameOver(); }

  loadPGN(pgn) {
    try {
      const tempChess = new Chess();
      tempChess.loadPgn(pgn);
      this.chess = new Chess();
      this.history = [];
      this.currentMoveIndex = -1;
      const moves = tempChess.history({ verbose: true });
      for (const move of moves) {
        this.chess.move(move);
        this.history.push({
          move, fen: this.chess.fen(), san: move.san,
          from: move.from, to: move.to, color: move.color,
          captured: move.captured, flags: move.flags
        });
        this.currentMoveIndex++;
      }
      this.emit('positionchange', this.getState());
      return true;
    } catch (e) {
      console.error('Failed to load PGN:', e);
      return false;
    }
  }

  exportPGN() { return this.chess.pgn(); }

  loadFEN(fen) {
    try {
      this.chess = new Chess(fen);
      this.history = [];
      this.currentMoveIndex = -1;
      this.emit('positionchange', this.getState());
      return true;
    } catch (e) {
      console.error('Invalid FEN:', e);
      return false;
    }
  }
}
