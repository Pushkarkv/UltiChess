import { Chess } from 'chess.js';

export class BattleArena {
  constructor(engineManager) {
    this.engine = engineManager;
    this.chess = null;
    this.running = false;
    this.paused = false;
    this.speed = 1000; // ms per move
    this.moveTimer = null;
    this.history = [];
    this.profiles = this.getDefaultProfiles();
    this.whiteProfile = null;
    this.blackProfile = null;
    this.onMove = null;
    this.onGameOver = null;
    this.onUpdate = null;
    this.results = [];
  }

  getDefaultProfiles() {
    return [
      { name: 'Beginner Bot', elo: 800, depth: 3, style: 'random', icon: '🤖' },
      { name: 'Club Player', elo: 1200, depth: 6, style: 'balanced', icon: '🧑' },
      { name: 'Intermediate', elo: 1500, depth: 10, style: 'balanced', icon: '🎯' },
      { name: 'Advanced', elo: 1800, depth: 12, style: 'positional', icon: '🏅' },
      { name: 'Expert', elo: 2000, depth: 15, style: 'aggressive', icon: '⚡' },
      { name: 'Master', elo: 2200, depth: 18, style: 'balanced', icon: '👑' },
      { name: 'Grandmaster', elo: 2500, depth: 20, style: 'positional', icon: '🏆' },
      { name: 'Stockfish Max', elo: null, depth: 25, style: 'optimal', icon: '🐟' }
    ];
  }

  async startBattle(whiteProfile, blackProfile, speed = 1000) {
    this.whiteProfile = whiteProfile;
    this.blackProfile = blackProfile;
    this.speed = speed;
    this.chess = new Chess();
    this.history = [];
    this.running = true;
    this.paused = false;
    
    if (this.onUpdate) this.onUpdate(this.getState());
    this.playNext();
  }

  async playNext() {
    if (!this.running || this.paused || this.chess.isGameOver()) {
      if (this.chess.isGameOver()) {
        this.running = false;
        const result = this.getResult();
        this.results.push({
          white: this.whiteProfile.name,
          black: this.blackProfile.name,
          result: result.result,
          reason: result.reason,
          moves: this.history.length,
          date: new Date().toISOString()
        });
        if (this.onGameOver) this.onGameOver(result);
        if (this.onUpdate) this.onUpdate(this.getState());
      }
      return;
    }

    const currentProfile = this.chess.turn() === 'w' ? this.whiteProfile : this.blackProfile;
    const fen = this.chess.fen();

    // Set engine strength
    if (currentProfile.elo) {
      this.engine.setDifficulty(currentProfile.elo);
    } else {
      this.engine.setDifficulty(null);
    }

    // Get best move
    const moveTime = Math.max(200, this.speed / 2);
    const bestMove = await this.engine.getBestMove(fen, moveTime);

    if (bestMove && bestMove.length >= 4 && this.running) {
      const from = bestMove.substring(0, 2);
      const to = bestMove.substring(2, 4);
      const promo = bestMove.length > 4 ? bestMove[4] : undefined;
      const moveObj = { from, to };
      if (promo) moveObj.promotion = promo;
      
      const move = this.chess.move(moveObj);
      if (move) {
        this.history.push({ move, fen: this.chess.fen(), san: move.san, profile: currentProfile.name });
        if (this.onMove) this.onMove(move, this.getState());
        if (this.onUpdate) this.onUpdate(this.getState());
      }

      // Schedule next move
      this.moveTimer = setTimeout(() => this.playNext(), this.speed);
    }
  }

  pause() { this.paused = true; }
  resume() { this.paused = false; this.playNext(); }

  stop() {
    this.running = false;
    this.paused = false;
    if (this.moveTimer) clearTimeout(this.moveTimer);
  }

  setSpeed(ms) { this.speed = Math.max(100, ms); }

  getResult() {
    if (this.chess.isCheckmate()) {
      return { result: this.chess.turn() === 'w' ? '0-1' : '1-0', reason: 'checkmate' };
    }
    if (this.chess.isStalemate()) return { result: '1/2-1/2', reason: 'stalemate' };
    if (this.chess.isDraw()) return { result: '1/2-1/2', reason: 'draw' };
    return { result: '*', reason: 'ongoing' };
  }

  getState() {
    return {
      running: this.running, paused: this.paused,
      fen: this.chess ? this.chess.fen() : null,
      turn: this.chess ? this.chess.turn() : null,
      history: this.history,
      moveCount: this.history.length,
      whiteProfile: this.whiteProfile,
      blackProfile: this.blackProfile,
      speed: this.speed,
      results: this.results
    };
  }

  getStats() {
    const stats = {};
    this.results.forEach(r => {
      [r.white, r.black].forEach(name => {
        if (!stats[name]) stats[name] = { wins: 0, losses: 0, draws: 0, games: 0 };
        stats[name].games++;
      });
      if (r.result === '1-0') { stats[r.white].wins++; stats[r.black].losses++; }
      else if (r.result === '0-1') { stats[r.black].wins++; stats[r.white].losses++; }
      else { stats[r.white].draws++; stats[r.black].draws++; }
    });
    return stats;
  }
}
