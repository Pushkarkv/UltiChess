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
    let prevEval = 0.3; // Approx starting eval
    let prevType = 'cp';

    for (let i = 0; i < history.length; i++) {
      if (this.onProgress) this.onProgress(i, history.length);
      
      const fenBefore = chess.fen();
      chess.move(history[i].move);
      const fenAfter = chess.fen();

      // Use cached continuous evaluation if it exists and reached decent depth
      let score = 0;
      let type = 'cp';
      if (history[i].eval !== undefined && history[i].evalDepth >= 8) {
        score = history[i].eval;
        type = history[i].evalType || 'cp';
      } else {
        const evalResult = await this.getEval(fenAfter, 12);
        score = evalResult ? evalResult.score : 0;
        type = evalResult ? evalResult.type : 'cp';
      }
      
      const winBefore = this.getWinPercent(prevEval, prevType);
      const winAfter = this.getWinPercent(score, type);
      
      // Calculate loss in terms of Win%. Positive means loss for the side that moved.
      let loss = 0;
      if (history[i].color === 'w') {
        loss = winBefore - winAfter;
      } else {
        loss = winAfter - winBefore;
      }
      
      let classification = 'good';
      if (loss > 20) classification = 'blunder';
      else if (loss > 10) classification = 'mistake';
      else if (loss > 5) classification = 'inaccuracy';
      else if (loss < -5) classification = 'brilliant';
      else if (loss < -2) classification = 'great';
      else if (loss <= 2) classification = 'best';

      const accuracy = Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * Math.max(0, loss)) - 3.1669));

      this.results.push({
        index: i,
        san: history[i].san,
        color: history[i].color,
        eval: score,
        loss,
        accuracy,
        classification,
        fen: fenAfter
      });

      prevEval = score;
      prevType = type;
    }

    // Calculate accuracy
    const whiteResults = this.results.filter(r => r.color === 'w');
    const blackResults = this.results.filter(r => r.color === 'b');
    
    const calcAccuracy = (results) => {
      if (!results.length) return 100;
      const totalAcc = results.reduce((sum, r) => sum + r.accuracy, 0);
      return totalAcc / results.length;
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
    const counts = { brilliant: 0, great: 0, best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
    results.forEach(r => { if (counts[r.classification] !== undefined) counts[r.classification]++; });
    return counts;
  }

  getWinPercent(score, type) {
    if (type === 'mate') {
      return score > 0 ? 100 : 0;
    }
    const cp = score * 100;
    return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
  }
}
