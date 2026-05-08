import { SQUARES } from './TrainingData.js';

export class CoordinateTrainer {
  constructor(boardContainer) {
    this.container = boardContainer;
    this.score = 0;
    this.total = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.timeLeft = 30;
    this.timer = null;
    this.currentSquare = null;
    this.mode = 'click'; // 'click' or 'type'
    this.active = false;
    this.boardSize = 8;
    this.isFlipped = false;
    this.onUpdate = null;
  }

  start(seconds = 30) {
    this.score = 0;
    this.total = 0;
    this.streak = 0;
    this.timeLeft = seconds;
    this.active = true;
    this.nextSquare();
    this.renderBoard();
    this.timer = setInterval(() => {
      this.timeLeft--;
      if (this.onUpdate) this.onUpdate(this.getState());
      if (this.timeLeft <= 0) this.end();
    }, 1000);
  }

  nextSquare() {
    this.currentSquare = SQUARES[Math.floor(Math.random() * SQUARES.length)];
    if (this.onUpdate) this.onUpdate(this.getState());
  }

  guess(square) {
    if (!this.active) return;
    this.total++;
    if (square === this.currentSquare) {
      this.score++;
      this.streak++;
      if (this.streak > this.bestStreak) this.bestStreak = this.streak;
      this.nextSquare();
    } else {
      this.streak = 0;
    }
    if (this.onUpdate) this.onUpdate(this.getState());
  }

  end() {
    this.active = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.onUpdate) this.onUpdate(this.getState());
  }

  renderBoard() {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.container.style.gridTemplateColumns = `repeat(${this.boardSize}, 1fr)`;
    this.container.style.gridTemplateRows = `repeat(${this.boardSize}, 1fr)`;

    for (let r = 0; r < this.boardSize; r++) {
      for (let c = 0; c < this.boardSize; c++) {
        const row = this.isFlipped ? (7 - r) : r;
        const col = this.isFlipped ? (7 - c) : c;
        const sq = String.fromCharCode(97 + col) + (8 - row);
        const isLight = (row + col) % 2 === 0;
        const sqEl = document.createElement('div');
        sqEl.className = `square ${isLight ? 'light' : 'dark'}`;
        sqEl.dataset.square = sq;
        sqEl.addEventListener('click', () => this.guess(sq));
        this.container.appendChild(sqEl);
      }
    }
  }

  getState() {
    return {
      score: this.score, total: this.total, streak: this.streak,
      bestStreak: this.bestStreak, timeLeft: this.timeLeft,
      currentSquare: this.currentSquare, active: this.active,
      accuracy: this.total > 0 ? ((this.score / this.total) * 100).toFixed(0) : '0'
    };
  }
}
