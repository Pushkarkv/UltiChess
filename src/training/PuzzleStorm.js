import { Chess } from 'chess.js';

// Built-in puzzle collection for Puzzle Storm
const PUZZLES = [
  { fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', solution: ['f7'], theme: 'checkmate', rating: 400 },
  { fen: '2r3k1/5ppp/8/8/2B5/8/5PPP/6K1 w - - 0 1', solution: ['f7'], theme: 'fork', rating: 600 },
  { fen: 'r1b1k2r/ppppqppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 6 5', solution: ['d5'], theme: 'center', rating: 800 },
  { fen: 'rnbqkb1r/pp2pppp/5n2/2ppN3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 4', solution: ['f7'], theme: 'attack', rating: 700 },
  { fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', solution: ['g5'], theme: 'development', rating: 900 },
  { fen: 'r1bq1rk1/ppp2ppp/2n1pn2/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R w KQ - 0 6', solution: ['d5'], theme: 'center', rating: 1000 },
  { fen: 'rnb1kb1r/pp1ppppp/1q3n2/2p5/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 3 4', solution: ['d4'], theme: 'gambit', rating: 1100 },
  { fen: 'r2qkb1r/ppp1pppp/2n2n2/3p1b2/3P4/4PN2/PPP2PPP/RNBQKB1R w KQkq - 0 4', solution: ['e4'], theme: 'tactics', rating: 1200 }
];

export class PuzzleStorm {
  constructor() {
    this.puzzles = [...PUZZLES];
    this.currentIndex = 0;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.timeLeft = 180; // 3 minutes
    this.timer = null;
    this.active = false;
    this.currentPuzzle = null;
    this.chess = null;
    this.onUpdate = null;
    this.highScore = parseInt(localStorage.getItem('puzzleStormHighScore') || '0');
  }

  start() {
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.timeLeft = 180;
    this.currentIndex = 0;
    this.active = true;
    this.shufflePuzzles();
    this.loadPuzzle(0);
    this.timer = setInterval(() => {
      this.timeLeft--;
      if (this.onUpdate) this.onUpdate(this.getState());
      if (this.timeLeft <= 0) this.end();
    }, 1000);
  }

  shufflePuzzles() {
    for (let i = this.puzzles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.puzzles[i], this.puzzles[j]] = [this.puzzles[j], this.puzzles[i]];
    }
  }

  loadPuzzle(index) {
    if (index >= this.puzzles.length) index = 0; // cycle
    this.currentIndex = index;
    this.currentPuzzle = this.puzzles[index];
    this.chess = new Chess(this.currentPuzzle.fen);
    if (this.onUpdate) this.onUpdate(this.getState());
  }

  attempt(move) {
    if (!this.active || !this.currentPuzzle) return;
    const solution = this.currentPuzzle.solution;
    const isCorrect = solution.some(s => move.includes(s));

    if (isCorrect) {
      this.score++;
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      // Combo bonus: every 5 correct = +5 seconds
      if (this.combo % 5 === 0) this.timeLeft += 5;
      this.loadPuzzle(this.currentIndex + 1);
    } else {
      this.combo = 0;
      this.timeLeft -= 10; // penalty
      if (this.timeLeft <= 0) this.end();
    }
    if (this.onUpdate) this.onUpdate(this.getState());
  }

  end() {
    this.active = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('puzzleStormHighScore', String(this.highScore));
    }
    if (this.onUpdate) this.onUpdate(this.getState());
  }

  getState() {
    return {
      active: this.active, score: this.score, combo: this.combo,
      maxCombo: this.maxCombo, timeLeft: this.timeLeft,
      highScore: this.highScore,
      puzzle: this.currentPuzzle,
      fen: this.chess ? this.chess.fen() : null,
      puzzleNumber: this.currentIndex + 1
    };
  }
}
