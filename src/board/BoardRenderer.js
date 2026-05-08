import { getPieceSVG } from './PieceRenderer.js';

export class BoardRenderer {
  constructor(containerId, gameManager) {
    this.container = document.getElementById(containerId);
    this.game = gameManager;
    this.boardSize = 8;
    this.squareSize = 0;
    this.isFlipped = false;
    this.selectedSquare = null;
    this.legalMoves = [];
    this.lastMove = null;
    this.highlightedSquares = new Set();
    this.dragState = null;
    this.ghostPiece = null;
    this.onMoveAttempt = null;
    this.onPromotionNeeded = null;

    this.init();
    this.setupEvents();
  }

  init() {
    this.container.innerHTML = '';
    this.container.style.gridTemplateColumns = `repeat(${this.boardSize}, 1fr)`;
    this.container.style.gridTemplateRows = `repeat(${this.boardSize}, 1fr)`;
    this.calcSize();
    this.render();
    this.createGhostPiece();
    this.renderCoords();
  }

  calcSize() {
    const vh = window.innerHeight - 120;
    const vw = window.innerWidth - 600;
    const size = Math.min(vh, vw, 640);
    this.squareSize = Math.floor(size / this.boardSize);
    const totalSize = this.squareSize * this.boardSize;
    this.container.style.width = totalSize + 'px';
    this.container.style.height = totalSize + 'px';
    this.container.parentElement.style.width = totalSize + 'px';
    this.container.parentElement.style.height = totalSize + 'px';
  }

  createGhostPiece() {
    this.ghostPiece = document.createElement('div');
    this.ghostPiece.className = 'ghost-piece';
    this.ghostPiece.style.width = this.squareSize + 'px';
    this.ghostPiece.style.height = this.squareSize + 'px';
    document.body.appendChild(this.ghostPiece);
  }

  renderCoords() {
    const filesEl = document.getElementById('coords-files');
    const ranksEl = document.getElementById('coords-ranks');
    if (!filesEl || !ranksEl) return;
    filesEl.innerHTML = '';
    ranksEl.innerHTML = '';
    const files = ['a','b','c','d','e','f','g','h'];
    const ranks = ['8','7','6','5','4','3','2','1'];
    const displayFiles = this.isFlipped ? [...files].reverse() : files;
    const displayRanks = this.isFlipped ? [...ranks].reverse() : ranks;
    displayFiles.forEach(f => { const s = document.createElement('span'); s.textContent = f; filesEl.appendChild(s); });
    displayRanks.forEach(r => { const s = document.createElement('span'); s.textContent = r; ranksEl.appendChild(s); });
  }

  render() {
    this.container.innerHTML = '';
    const board = this.game.board();
    const state = this.game.getState();
    this.lastMove = state.lastMove;

    for (let r = 0; r < this.boardSize; r++) {
      for (let c = 0; c < this.boardSize; c++) {
        const row = this.isFlipped ? (this.boardSize - 1 - r) : r;
        const col = this.isFlipped ? (this.boardSize - 1 - c) : c;
        const square = this.toSquareName(row, col);
        const isLight = (row + col) % 2 === 0;
        const piece = board[row] ? board[row][col] : null;

        const sqEl = document.createElement('div');
        sqEl.className = `square ${isLight ? 'light' : 'dark'}`;
        sqEl.dataset.square = square;
        sqEl.dataset.row = row;
        sqEl.dataset.col = col;

        // Last move highlight
        if (this.lastMove && (square === this.lastMove.from || square === this.lastMove.to)) {
          sqEl.classList.add('highlight');
        }

        // Selected square
        if (this.selectedSquare === square) {
          sqEl.classList.add('selected');
        }

        // Check highlight
        if (state.inCheck && piece && piece.type === 'k' && piece.color === state.turn) {
          sqEl.classList.add('check');
        }

        // Legal move dots
        if (this.legalMoves.some(m => m.to === square)) {
          if (piece) {
            const captureRing = document.createElement('div');
            captureRing.className = 'legal-capture';
            sqEl.appendChild(captureRing);
          } else {
            const dot = document.createElement('div');
            dot.className = 'legal-dot';
            sqEl.appendChild(dot);
          }
        }

        // Piece
        if (piece) {
          const pieceEl = document.createElement('div');
          pieceEl.className = 'piece';
          pieceEl.dataset.piece = piece.color + piece.type;
          pieceEl.dataset.square = square;
          pieceEl.innerHTML = getPieceSVG(piece);
          sqEl.appendChild(pieceEl);
        }

        this.container.appendChild(sqEl);
      }
    }
  }

  toSquareName(row, col) {
    return String.fromCharCode(97 + col) + (8 - row);
  }

  fromSquareName(sq) {
    return { row: 8 - parseInt(sq[1]), col: sq.charCodeAt(0) - 97 };
  }

  setupEvents() {
    // Click handling
    this.container.addEventListener('mousedown', (e) => this.onMouseDown(e));
    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    document.addEventListener('mouseup', (e) => this.onMouseUp(e));

    // Touch handling
    this.container.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    document.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    document.addEventListener('touchend', (e) => this.onTouchEnd(e));

    // Resize
    window.addEventListener('resize', () => { this.calcSize(); this.render(); this.renderCoords(); });
  }

  onMouseDown(e) {
    const sqEl = e.target.closest('.square');
    if (!sqEl) return;
    const square = sqEl.dataset.square;
    const piece = this.getPieceAt(square);

    // If we have a selected square and click a legal move target
    if (this.selectedSquare && this.legalMoves.some(m => m.to === square)) {
      this.attemptMove(this.selectedSquare, square);
      return;
    }

    // If clicking on own piece
    if (piece && piece.color === this.game.turn()) {
      this.selectedSquare = square;
      this.legalMoves = this.game.getLegalMoves(square);
      this.render();

      // Start drag
      this.dragState = { square, startX: e.clientX, startY: e.clientY, dragging: false };
      const pieceEl = sqEl.querySelector('.piece');
      if (pieceEl) {
        this.ghostPiece.innerHTML = pieceEl.innerHTML;
        this.ghostPiece.style.width = this.squareSize + 'px';
        this.ghostPiece.style.height = this.squareSize + 'px';
      }
    } else {
      this.clearSelection();
    }
  }

  onMouseMove(e) {
    if (!this.dragState) return;
    const dx = e.clientX - this.dragState.startX;
    const dy = e.clientY - this.dragState.startY;
    if (!this.dragState.dragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      this.dragState.dragging = true;
      this.ghostPiece.style.display = 'block';
      const pieceEl = this.container.querySelector(`.piece[data-square="${this.dragState.square}"]`);
      if (pieceEl) pieceEl.classList.add('dragging');
    }
    if (this.dragState.dragging) {
      this.ghostPiece.style.left = (e.clientX - this.squareSize / 2) + 'px';
      this.ghostPiece.style.top = (e.clientY - this.squareSize / 2) + 'px';
    }
  }

  onMouseUp(e) {
    if (!this.dragState) return;
    this.ghostPiece.style.display = 'none';
    const pieceEl = this.container.querySelector(`.piece[data-square="${this.dragState.square}"]`);
    if (pieceEl) pieceEl.classList.remove('dragging');

    if (this.dragState.dragging) {
      const target = this.getSquareFromPoint(e.clientX, e.clientY);
      if (target && target !== this.dragState.square) {
        this.attemptMove(this.dragState.square, target);
      } else {
        this.render();
      }
    }
    this.dragState = null;
  }

  onTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    this.onMouseDown({ target: document.elementFromPoint(touch.clientX, touch.clientY), clientX: touch.clientX, clientY: touch.clientY });
  }

  onTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    this.onMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
  }

  onTouchEnd(e) {
    const touch = e.changedTouches[0];
    this.onMouseUp({ clientX: touch.clientX, clientY: touch.clientY });
  }

  getSquareFromPoint(x, y) {
    const rect = this.container.getBoundingClientRect();
    const col = Math.floor((x - rect.left) / this.squareSize);
    const row = Math.floor((y - rect.top) / this.squareSize);
    if (col < 0 || col >= this.boardSize || row < 0 || row >= this.boardSize) return null;
    const actualRow = this.isFlipped ? (this.boardSize - 1 - row) : row;
    const actualCol = this.isFlipped ? (this.boardSize - 1 - col) : col;
    return this.toSquareName(actualRow, actualCol);
  }

  attemptMove(from, to) {
    if (this.game.isPromotion(from, to)) {
      if (this.onPromotionNeeded) {
        this.onPromotionNeeded(from, to, (promotion) => {
          this.executeMove(from, to, promotion);
        });
      }
    } else {
      this.executeMove(from, to);
    }
  }

  executeMove(from, to, promotion) {
    const move = this.game.makeMove(from, to, promotion);
    if (move) {
      this.clearSelection();
      this.playMoveSound(move);
      if (this.onMoveAttempt) this.onMoveAttempt(move);
    } else {
      this.clearSelection();
    }
  }

  playMoveSound(move) {
    if (typeof SoundManager !== 'undefined') return; // handled elsewhere
    // Basic sound via AudioContext
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.value = 0.1;
      if (move.captured) {
        osc.frequency.value = 300;
      } else if (move.san.includes('+')) {
        osc.frequency.value = 500;
      } else {
        osc.frequency.value = 400;
      }
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) { /* ignore */ }
  }

  getPieceAt(square) {
    const { row, col } = this.fromSquareName(square);
    const board = this.game.board();
    return board[row] ? board[row][col] : null;
  }

  clearSelection() {
    this.selectedSquare = null;
    this.legalMoves = [];
    this.render();
  }

  flip() {
    this.isFlipped = !this.isFlipped;
    this.render();
    this.renderCoords();
  }

  update() {
    this.render();
  }

  resize() {
    this.calcSize();
    this.render();
    this.renderCoords();
  }
}
