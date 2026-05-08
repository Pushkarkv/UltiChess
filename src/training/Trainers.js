import { TRAINING_POSITIONS } from './TrainingData.js';
import { Chess } from 'chess.js';

export class CalculationTrainer {
  constructor(engineManager) {
    this.engine = engineManager;
    this.currentPosition = null;
    this.difficulty = 1; // 1-5 difficulty
    this.lookAhead = 1; // how many moves to calculate
    this.score = 0;
    this.total = 0;
    this.active = false;
    this.bestMove = null;
    this.showingAnswer = false;
    this.onUpdate = null;
    this.timerStart = null;
    this.positions = [...TRAINING_POSITIONS];
  }

  start(difficulty = 1) {
    this.difficulty = Math.max(1, Math.min(5, difficulty));
    this.lookAhead = this.difficulty;
    this.score = 0;
    this.total = 0;
    this.active = true;
    this.nextPosition();
  }

  nextPosition() {
    // Filter by difficulty
    const filtered = this.positions.filter(p => p.difficulty <= this.difficulty + 1);
    const pos = filtered[Math.floor(Math.random() * filtered.length)] || this.positions[0];
    this.currentPosition = pos;
    this.bestMove = null;
    this.showingAnswer = false;
    this.timerStart = Date.now();

    // Get engine's best move
    if (this.engine) {
      this.engine.getBestMove(pos.fen, 2000).then(move => {
        this.bestMove = move;
      });
    }

    if (this.onUpdate) this.onUpdate(this.getState());
  }

  submitAnswer(moveStr) {
    if (!this.active || this.showingAnswer) return;
    this.total++;
    const timeTaken = ((Date.now() - this.timerStart) / 1000).toFixed(1);
    let correct = false;

    // Compare with engine's best or known solution
    if (this.currentPosition.solution) {
      correct = moveStr.toLowerCase().includes(this.currentPosition.solution.toLowerCase());
    } else if (this.bestMove) {
      correct = moveStr.includes(this.bestMove);
    }

    if (correct) this.score++;
    this.showingAnswer = true;
    
    if (this.onUpdate) this.onUpdate({
      ...this.getState(),
      result: correct ? 'correct' : 'wrong',
      timeTaken,
      answer: this.currentPosition.solution || this.bestMove
    });
  }

  skip() {
    this.total++;
    this.showingAnswer = true;
    if (this.onUpdate) this.onUpdate({
      ...this.getState(),
      result: 'skipped',
      answer: this.currentPosition.solution || this.bestMove
    });
  }

  getState() {
    return {
      score: this.score, total: this.total, active: this.active,
      position: this.currentPosition, lookAhead: this.lookAhead,
      difficulty: this.difficulty, showingAnswer: this.showingAnswer,
      accuracy: this.total > 0 ? ((this.score / this.total) * 100).toFixed(0) : '0'
    };
  }
}

export class VisualizationTrainer {
  constructor() {
    this.viewTime = 5; // seconds to view
    this.currentFen = null;
    this.piecesHidden = false;
    this.score = 0;
    this.total = 0;
    this.active = false;
    this.timer = null;
    this.phase = 'viewing'; // 'viewing', 'answering', 'result'
    this.question = null;
    this.onUpdate = null;
    this.positions = [...TRAINING_POSITIONS];
  }

  start(viewSeconds = 5) {
    this.viewTime = viewSeconds;
    this.score = 0;
    this.total = 0;
    this.active = true;
    this.nextRound();
  }

  nextRound() {
    const pos = this.positions[Math.floor(Math.random() * this.positions.length)];
    this.currentFen = pos.fen;
    this.piecesHidden = false;
    this.phase = 'viewing';
    
    // Generate a question about the position
    const chess = new Chess(pos.fen);
    const questions = [
      { q: 'What is the best move?', a: pos.solution || 'N/A' },
      { q: `Whose turn is it?`, a: chess.turn() === 'w' ? 'White' : 'Black' },
      { q: 'Is the king in check?', a: chess.inCheck() ? 'Yes' : 'No' }
    ];
    this.question = questions[Math.floor(Math.random() * questions.length)];

    if (this.onUpdate) this.onUpdate(this.getState());

    // After viewTime seconds, hide pieces
    this.timer = setTimeout(() => {
      this.piecesHidden = true;
      this.phase = 'answering';
      if (this.onUpdate) this.onUpdate(this.getState());
    }, this.viewTime * 1000);
  }

  submitAnswer(answer) {
    if (this.phase !== 'answering') return;
    this.total++;
    const correct = answer.toLowerCase().trim() === this.question.a.toLowerCase().trim();
    if (correct) this.score++;
    this.phase = 'result';
    if (this.onUpdate) this.onUpdate({
      ...this.getState(), result: correct ? 'correct' : 'wrong',
      correctAnswer: this.question.a
    });
  }

  getState() {
    return {
      score: this.score, total: this.total, active: this.active,
      fen: this.currentFen, piecesHidden: this.piecesHidden,
      phase: this.phase, question: this.question,
      viewTime: this.viewTime,
      accuracy: this.total > 0 ? ((this.score / this.total) * 100).toFixed(0) : '0'
    };
  }

  end() {
    this.active = false;
    if (this.timer) clearTimeout(this.timer);
    if (this.onUpdate) this.onUpdate(this.getState());
  }
}
