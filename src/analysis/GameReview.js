import { Chess } from 'chess.js';

export class GameReview {
  constructor(engineManager) {
    this.engine = engineManager;
    this.results = [];
    this.onProgress = null;
    this.onComplete = null;
    this.reviewing = false;
  }

  async review(history) {
    if (this.reviewing || !history.length) return;
    this.reviewing = true;
    this.results = [];
    
    const chess = new Chess();
    let prevEval = 0;

    for (let i = 0; i < history.length; i++) {
      if (this.onProgress) this.onProgress(i, history.length);
      
      const fenBefore = chess.fen();
      chess.move(history[i].move);
      const fenAfter = chess.fen();

      // Use cached continuous evaluation if it exists and reached decent depth
      let score = 0;
      if (history[i].eval !== undefined && history[i].evalDepth >= 8) {
        score = history[i].eval;
      } else {
        const evalResult = await this.getEval(fenAfter, 12);
        score = evalResult ? evalResult.score : 0;
      }
      
      // For black's perspective, negate
      const adjustedScore = history[i].color === 'b' ? -score : score;
      const adjustedPrev = history[i].color === 'b' ? -prevEval : prevEval;
      
      // Calculate loss
      const loss = adjustedPrev - adjustedScore;
      
      let classification = 'good';
      if (loss > 3) classification = 'blunder';
      else if (loss > 1.5) classification = 'mistake';
      else if (loss > 0.5) classification = 'inaccuracy';
      else if (loss < -0.5) classification = 'great';
      else if (loss < -1) classification = 'brilliant';

      this.results.push({
        index: i,
        san: history[i].san,
        color: history[i].color,
        eval: score,
        loss,
        classification,
        fen: fenAfter
      });

      prevEval = score;
    }

    // Calculate accuracy
    const whiteResults = this.results.filter(r => r.color === 'w');
    const blackResults = this.results.filter(r => r.color === 'b');
    
    const calcAccuracy = (results) => {
      if (!results.length) return 100;
      const avgLoss = results.reduce((sum, r) => sum + Math.max(0, r.loss), 0) / results.length;
      return Math.max(0, Math.min(100, 100 - avgLoss * 15));
    };

    this.reviewing = false;
    const summary = {
      moves: this.results,
      whiteAccuracy: calcAccuracy(whiteResults).toFixed(1),
      blackAccuracy: calcAccuracy(blackResults).toFixed(1),
      whiteCounts: this.countClassifications(whiteResults),
      blackCounts: this.countClassifications(blackResults)
    };
    
    if (this.onComplete) this.onComplete(summary);
    return summary;
  }

  async getEval(fen, depth) {
    return new Promise((resolve) => {
      const origOnEval = this.engine.onEval;
      const origOnBestMove = this.engine.onBestMove;
      let lastEval = null;
      
      const timeout = setTimeout(() => {
        this.engine.onEval = origOnEval;
        this.engine.onBestMove = origOnBestMove;
        resolve(lastEval);
      }, 5000);
      
      this.engine.onEval = (ev) => { lastEval = ev; };
      this.engine.onBestMove = () => {
        clearTimeout(timeout);
        this.engine.onEval = origOnEval;
        this.engine.onBestMove = origOnBestMove;
        resolve(lastEval);
      };
      
      this.engine.analyze(fen, depth);
    });
  }

  countClassifications(results) {
    const counts = { brilliant: 0, great: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
    results.forEach(r => { if (counts[r.classification] !== undefined) counts[r.classification]++; });
    return counts;
  }
}
