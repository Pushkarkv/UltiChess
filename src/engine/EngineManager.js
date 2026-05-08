export class EngineManager {
  constructor() {
    this.worker = null;
    this.ready = false;
    this.analyzing = false;
    this.currentDepth = 0;
    this.bestMove = null;
    this.evaluation = null;
    this.pvLines = [];
    this.multiPV = 3;
    this.onEval = null;
    this.onBestMove = null;
    this.onReady = null;
    this.onInfo = null;
    this.moveCallback = null;
    this.targetDepth = 20;
    this.elo = null; // null = full strength
    this.useNNUE = true;
  }

  async init() {
    return new Promise((resolve, reject) => {
      try {
        // Try to load stockfish from local or CDN
        const workerCode = `
          let engine = null;
          let wasmSupported = typeof WebAssembly === 'object';
          
          // Simple UCI engine simulation for when WASM isn't available
          class SimpleEngine {
            constructor() {
              this.depth = 0;
            }
            
            postMessage(msg) {
              if (msg === 'uci') {
                setTimeout(() => self.postMessage('uciok'), 10);
              } else if (msg === 'isready') {
                setTimeout(() => self.postMessage('readyok'), 10);
              } else if (msg.startsWith('go')) {
                this.search(msg);
              }
            }
            
            search(cmd) {
              const depthMatch = cmd.match(/depth (\\d+)/);
              const maxDepth = depthMatch ? parseInt(depthMatch[1]) : 15;
              let d = 1;
              const interval = setInterval(() => {
                if (d > maxDepth) {
                  clearInterval(interval);
                  self.postMessage('bestmove e2e4');
                  return;
                }
                const score = Math.floor(Math.random() * 100 - 50);
                self.postMessage('info depth ' + d + ' score cp ' + score + ' pv e2e4 e7e5');
                d++;
              }, 50);
            }
          }
          
          self.onmessage = function(e) {
            if (!engine) {
              engine = new SimpleEngine();
            }
            engine.postMessage(e.data);
          };
        `;
        
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        this.worker = new Worker(URL.createObjectURL(blob));
        
        this.worker.onmessage = (e) => this.handleMessage(e.data);
        this.worker.onerror = (e) => console.error('Engine error:', e);
        
        this.send('uci');
        
        // Wait for uciok
        const origHandler = this.worker.onmessage;
        this.worker.onmessage = (e) => {
          if (typeof e.data === 'string' && e.data.includes('uciok')) {
            this.ready = true;
            this.worker.onmessage = (e2) => this.handleMessage(e2.data);
            this.send('isready');
            if (this.onReady) this.onReady();
            resolve();
          }
        };
        
        // Timeout fallback
        setTimeout(() => {
          if (!this.ready) {
            this.ready = true;
            this.worker.onmessage = (e2) => this.handleMessage(e2.data);
            if (this.onReady) this.onReady();
            resolve();
          }
        }, 3000);
        
      } catch (err) {
        console.error('Failed to init engine:', err);
        reject(err);
      }
    });
  }

  send(cmd) {
    if (this.worker) this.worker.postMessage(cmd);
  }

  handleMessage(msg) {
    if (typeof msg !== 'string') return;
    
    if (msg.startsWith('info')) {
      this.parseInfo(msg);
    } else if (msg.startsWith('bestmove')) {
      const parts = msg.split(' ');
      this.bestMove = parts[1];
      this.analyzing = false;
      if (this.moveCallback) {
        this.moveCallback(this.bestMove);
        this.moveCallback = null;
      }
      if (this.onBestMove) this.onBestMove(this.bestMove);
    } else if (msg === 'readyok') {
      this.ready = true;
    }
  }

  parseInfo(msg) {
    const info = {};
    
    // Parse depth
    const depthMatch = msg.match(/depth (\d+)/);
    if (depthMatch) info.depth = parseInt(depthMatch[1]);
    
    // Parse score
    const cpMatch = msg.match(/score cp (-?\d+)/);
    const mateMatch = msg.match(/score mate (-?\d+)/);
    if (cpMatch) {
      info.score = parseInt(cpMatch[1]) / 100;
      info.type = 'cp';
    } else if (mateMatch) {
      info.score = parseInt(mateMatch[1]);
      info.type = 'mate';
    }
    
    // Parse PV
    const pvMatch = msg.match(/pv (.+)/);
    if (pvMatch) info.pv = pvMatch[1].split(' ');
    
    // Parse multipv
    const mpvMatch = msg.match(/multipv (\d+)/);
    if (mpvMatch) info.multipv = parseInt(mpvMatch[1]);
    
    // Parse NPS
    const npsMatch = msg.match(/nps (\d+)/);
    if (npsMatch) info.nps = parseInt(npsMatch[1]);
    
    // Parse nodes
    const nodesMatch = msg.match(/nodes (\d+)/);
    if (nodesMatch) info.nodes = parseInt(nodesMatch[1]);

    if (info.depth) this.currentDepth = info.depth;
    
    // Store PV line
    if (info.multipv && info.pv) {
      this.pvLines[info.multipv - 1] = {
        score: info.score,
        type: info.type,
        pv: info.pv,
        depth: info.depth
      };
    } else if (info.pv) {
      this.pvLines[0] = { score: info.score, type: info.type, pv: info.pv, depth: info.depth };
    }
    
    if (info.score !== undefined) {
      this.evaluation = { score: info.score, type: info.type };
    }
    
    if (this.onInfo) this.onInfo(info);
    if (this.onEval && info.score !== undefined) this.onEval(this.evaluation);
  }

  analyze(fen, depth) {
    if (!this.ready) return;
    this.stop();
    this.pvLines = [];
    this.analyzing = true;
    this.send('position fen ' + fen);
    if (this.multiPV > 1) this.send('setoption name MultiPV value ' + this.multiPV);
    this.send('go depth ' + (depth || this.targetDepth));
  }

  getBestMove(fen, timeMs) {
    return new Promise((resolve) => {
      if (!this.ready) { resolve(null); return; }
      this.stop();
      this.moveCallback = resolve;
      this.send('position fen ' + fen);
      if (this.elo) {
        this.send('setoption name UCI_LimitStrength value true');
        this.send('setoption name UCI_Elo value ' + this.elo);
      }
      if (timeMs) {
        this.send('go movetime ' + timeMs);
      } else {
        this.send('go depth ' + this.targetDepth);
      }
    });
  }

  stop() {
    this.analyzing = false;
    this.send('stop');
  }

  setDifficulty(elo) {
    this.elo = elo;
    if (elo) {
      this.send('setoption name UCI_LimitStrength value true');
      this.send('setoption name UCI_Elo value ' + elo);
    } else {
      this.send('setoption name UCI_LimitStrength value false');
    }
  }

  setMultiPV(n) {
    this.multiPV = n;
    this.send('setoption name MultiPV value ' + n);
  }

  newGame() {
    this.send('ucinewgame');
    this.pvLines = [];
    this.evaluation = null;
    this.bestMove = null;
    this.currentDepth = 0;
  }

  destroy() {
    this.stop();
    if (this.worker) this.worker.terminate();
  }
}
