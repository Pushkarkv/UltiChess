import './styles/global.css';
import './styles/components.css';
import { GameManager } from './game/GameManager.js';
import { BoardRenderer } from './board/BoardRenderer.js';
import { SoundManager } from './game/SoundManager.js';
import { Clock } from './game/Clock.js';
import { MoveList } from './game/MoveList.js';
import { EngineManager } from './engine/EngineManager.js';
import { EvalBar } from './engine/EvalBar.js';
import { EvalGraph } from './analysis/EvalGraph.js';
import { GameReview } from './analysis/GameReview.js';
import { showToast, showModal, hideModal, copyToClipboard, downloadFile } from './ui/utils.js';
import { getPieceSVG } from './board/PieceRenderer.js';

class ChessApp {
  constructor() {
    this.game = new GameManager();
    this.board = null;
    this.sound = new SoundManager();
    this.clock = new Clock();
    this.moveList = null;
    this.engine = new EngineManager();
    this.evalBar = new EvalBar();
    this.evalGraph = new EvalGraph('eval-graph');
    this.review = null;
    this.engineActive = false;
    this.gameMode = 'human';
    this.engineColor = 'b';
    this.currentRoute = 'play';
    this.isDark = true;
  }

  async init() {
    this.sound.init();
    this.board = new BoardRenderer('chess-board', this.game);
    this.moveList = new MoveList('move-list', this.game);

    // Engine init
    try {
      await this.engine.init();
      this.review = new GameReview(this.engine);
    } catch (e) {
      console.warn('Engine init failed, running without engine:', e);
    }

    this.setupGameEvents();
    this.setupUIEvents();
    this.setupKeyboard();
    this.setupClock();
    this.setupPromotion();

    // Hide loading screen
    setTimeout(() => {
      const ls = document.getElementById('loading-screen');
      if (ls) { ls.classList.add('fade-out'); setTimeout(() => ls.remove(), 600); }
    }, 800);

    this.game.newGame();
    showToast('Welcome to Ultimate Chess!', 'info');
  }

  setupGameEvents() {
    this.game.on('positionchange', (state) => {
      this.board.update();
      this.moveList.render();
      this.updateStatus(state);
      if (this.engineActive) this.engine.analyze(state.fen, 20);
    });

    this.game.on('move', ({ move }) => {
      this.sound.playForMove(move);
      this.clock.switchSide();
      if (this.evalGraph) this.evalGraph.addEval(
        this.engine.evaluation ? this.engine.evaluation.score : 0,
        this.engine.evaluation ? this.engine.evaluation.type : 'cp'
      );
      // AI response
      if (this.gameMode === 'engine' && this.game.turn() === this.engineColor && !this.game.isGameOver()) {
        this.makeEngineMove();
      }
    });

    this.game.on('gameover', (result) => {
      this.clock.stop();
      this.sound.play('gameover');
      let msg = 'Game Over: ';
      msg += result.result + ' (' + result.reason + ')';
      showToast(msg, 'info', 5000);
      this.showGameOverModal(result);
    });

    this.board.onMoveAttempt = (move) => {};

    this.engine.onEval = (ev) => {
      this.evalBar.update(ev);
      
      // Real-time continuous review caching
      const state = this.game.getState();
      const currentIdx = state.currentMoveIndex - 1;
      if (currentIdx >= 0 && state.history[currentIdx]) {
        state.history[currentIdx].eval = ev.score;
        state.history[currentIdx].evalType = ev.type;
        state.history[currentIdx].evalDepth = this.engine.currentDepth;
      }
    };

    this.engine.onInfo = (info) => {
      if (info.depth) {
        const depthEl = document.getElementById('engine-depth');
        if (depthEl) depthEl.textContent = 'Depth: ' + info.depth;
      }
      if (info.nps) {
        const npsEl = document.getElementById('engine-nps');
        if (npsEl) npsEl.textContent = 'NPS: ' + (info.nps / 1000).toFixed(0) + 'k';
      }
      this.updateEngineLines();
    };
  }

  setupUIEvents() {
    // Sidebar nav
    document.querySelectorAll('.nav-item[data-route]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigate(el.dataset.route);
      });
    });

    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) sidebarToggle.addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('collapsed');
    });

    // Toolbar buttons
    this.bindBtn('btn-new-game', () => this.showNewGameModal());
    this.bindBtn('btn-flip', () => this.board.flip());
    this.bindBtn('btn-undo', () => this.game.undo());
    this.bindBtn('btn-redo', () => this.game.redo());
    this.bindBtn('btn-move-first', () => this.game.goToStart());
    this.bindBtn('btn-move-prev', () => this.game.undo());
    this.bindBtn('btn-move-next', () => this.game.redo());
    this.bindBtn('btn-move-last', () => this.game.goToEnd());

    // Panel tabs
    document.querySelectorAll('.panel-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.panel-content').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const panel = document.getElementById('panel-' + tab.dataset.tab);
        if (panel) panel.classList.add('active');
      });
    });

    // Engine toggle
    this.bindBtn('btn-toggle-engine', () => this.toggleEngine());

    // Review start
    this.bindBtn('btn-start-review', () => this.startReview());

    // Info buttons
    this.bindBtn('btn-copy-fen', () => copyToClipboard(this.game.fen()));
    this.bindBtn('btn-export-pgn', () => downloadFile('game.pgn', this.game.exportPGN()));
    this.bindBtn('btn-import-pgn', () => this.showImportPGNModal());
    this.bindBtn('btn-setup-pos', () => this.showFENModal());

    // Theme toggle
    this.bindBtn('btn-theme-toggle', () => this.toggleTheme());

    // Settings
    this.bindBtn('btn-settings', () => this.showSettingsModal());

    // Mobile menu
    this.bindBtn('btn-mobile-menu', () => {
      document.getElementById('sidebar').classList.toggle('collapsed');
    });
  }

  bindBtn(id, fn) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  }

  setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      switch(e.key) {
        case 'ArrowLeft': e.preventDefault(); this.game.undo(); break;
        case 'ArrowRight': e.preventDefault(); this.game.redo(); break;
        case 'Home': e.preventDefault(); this.game.goToStart(); break;
        case 'End': e.preventDefault(); this.game.goToEnd(); break;
        case 'f': this.board.flip(); break;
        case 'e': this.toggleEngine(); break;
      }
    });
  }

  setupClock() {
    this.clock.setPreset('rapid-10');
    this.clock.onUpdate = (data) => {
      const wClock = document.getElementById('clock-white');
      const bClock = document.getElementById('clock-black');
      if (wClock) {
        wClock.textContent = data.white;
        wClock.classList.toggle('active', data.active === 'w');
        wClock.classList.toggle('low-time', data.whiteMs < 30000);
      }
      if (bClock) {
        bClock.textContent = data.black;
        bClock.classList.toggle('active', data.active === 'b');
        bClock.classList.toggle('low-time', data.blackMs < 30000);
      }
    };
    this.clock.onTimeout = (side) => {
      showToast(`${side === 'w' ? 'White' : 'Black'} ran out of time!`, 'error');
    };
  }

  setupPromotion() {
    this.board.onPromotionNeeded = (from, to, callback) => {
      const color = this.game.turn();
      const pieces = ['q', 'r', 'b', 'n'];
      const picker = document.getElementById('promotion-picker');
      if (!picker) { callback('q'); return; }

      picker.innerHTML = '';
      picker.classList.remove('hidden');
      const { row, col } = this.board.fromSquareName(to);
      const displayCol = this.board.isFlipped ? 7 - col : col;
      const displayRow = this.board.isFlipped ? 7 - row : row;
      picker.style.left = (displayCol * this.board.squareSize) + 'px';
      picker.style.top = (displayRow * this.board.squareSize) + 'px';

      pieces.forEach(p => {
        const btn = document.createElement('div');
        btn.className = 'promo-piece';
        btn.innerHTML = getPieceSVG({ color, type: p });
        btn.addEventListener('click', () => {
          picker.classList.add('hidden');
          callback(p);
        });
        picker.appendChild(btn);
      });
    };
  }

  toggleEngine() {
    this.engineActive = !this.engineActive;
    const btn = document.getElementById('btn-toggle-engine');
    if (btn) btn.textContent = this.engineActive ? '⏹ Stop Engine' : '▶ Start Engine';
    if (this.engineActive) {
      this.engine.analyze(this.game.fen(), 20);
      showToast('Engine analysis started', 'success');
    } else {
      this.engine.stop();
      showToast('Engine stopped', 'info');
    }
  }

  updateEngineLines() {
    const container = document.getElementById('engine-lines');
    if (!container) return;
    container.innerHTML = '';
    this.engine.pvLines.forEach((line, i) => {
      if (!line) return;
      const el = document.createElement('div');
      el.className = 'engine-line';
      const evalSpan = document.createElement('span');
      evalSpan.className = 'line-eval ' + (line.score >= 0 ? 'positive' : 'negative');
      evalSpan.textContent = line.type === 'mate' ? `M${Math.abs(line.score)}` :
        (line.score >= 0 ? '+' : '') + line.score.toFixed(1);
      el.appendChild(evalSpan);
      const pvText = document.createElement('span');
      pvText.textContent = (line.pv || []).slice(0, 8).join(' ');
      el.appendChild(pvText);
      container.appendChild(el);
    });
    if (!this.engine.pvLines.length) {
      container.innerHTML = '<div class="engine-placeholder">Analyzing...</div>';
    }
  }

  updateStatus(state) {
    const el = document.getElementById('status-text');
    if (!el) return;
    if (state.isCheckmate) el.textContent = (state.turn === 'w' ? 'Black' : 'White') + ' wins by checkmate!';
    else if (state.isStalemate) el.textContent = 'Stalemate — Draw';
    else if (state.isDraw) el.textContent = 'Draw';
    else if (state.inCheck) el.textContent = (state.turn === 'w' ? 'White' : 'Black') + ' is in check!';
    else el.textContent = (state.turn === 'w' ? 'White' : 'Black') + ' to move';
  }

  async makeEngineMove() {
    const bestMove = await this.engine.getBestMove(this.game.fen(), 1000);
    if (bestMove && bestMove.length >= 4) {
      const from = bestMove.substring(0, 2);
      const to = bestMove.substring(2, 4);
      const promo = bestMove.length > 4 ? bestMove[4] : undefined;
      this.game.makeMove(from, to, promo);
    }
  }

  navigate(route) {
    this.currentRoute = route;
    document.querySelectorAll('.nav-item[data-route]').forEach(el => {
      el.classList.toggle('active', el.dataset.route === route);
    });
    const titles = {
      play: 'Play Chess', analyze: 'Analysis Board', review: 'Game Review',
      train: 'Training', battle: 'AI Battle Arena', variants: 'Chess Variants',
      puzzles: 'Puzzles'
    };
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = titles[route] || 'Play Chess';

    if (route === 'review') this.startReview();
    if (route === 'train') this.showTrainingMenu();
    if (route === 'battle') this.showBattleMenu();
  }

  showNewGameModal() {
    const html = `
      <h3 class="modal-title">New Game</h3>
      <div style="display:flex;flex-direction:column;gap:12px">
        <label style="font-size:14px;color:var(--color-text-secondary)">Game Mode</label>
        <select id="modal-mode" style="padding:8px;border-radius:8px">
          <option value="human">Human vs Human</option>
          <option value="engine">Play vs Engine</option>
          <option value="analysis">Analysis Mode</option>
        </select>
        <label style="font-size:14px;color:var(--color-text-secondary)">Play As</label>
        <select id="modal-color" style="padding:8px;border-radius:8px">
          <option value="w">White</option>
          <option value="b">Black</option>
        </select>
        <label style="font-size:14px;color:var(--color-text-secondary)">Engine Difficulty</label>
        <select id="modal-difficulty" style="padding:8px;border-radius:8px">
          <option value="">Full Strength</option>
          <option value="800">Beginner (800)</option>
          <option value="1200">Intermediate (1200)</option>
          <option value="1500">Club (1500)</option>
          <option value="1800">Advanced (1800)</option>
          <option value="2000">Expert (2000)</option>
          <option value="2500">Master (2500)</option>
        </select>
        <label style="font-size:14px;color:var(--color-text-secondary)">Time Control</label>
        <select id="modal-time" style="padding:8px;border-radius:8px">
          <option value="unlimited">Unlimited</option>
          <option value="bullet-1">Bullet 1+0</option>
          <option value="blitz-3+2">Blitz 3+2</option>
          <option value="blitz-5+3">Blitz 5+3</option>
          <option value="rapid-10" selected>Rapid 10+0</option>
          <option value="rapid-10+5">Rapid 10+5</option>
          <option value="rapid-15+10">Rapid 15+10</option>
          <option value="classical-30">Classical 30+0</option>
        </select>
      </div>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="document.getElementById('modal-overlay').classList.add('hidden')">Cancel</button>
        <button class="btn btn-primary" id="modal-start-game">Start Game</button>
      </div>
    `;
    showModal(html);
    setTimeout(() => {
      const startBtn = document.getElementById('modal-start-game');
      if (startBtn) startBtn.addEventListener('click', () => {
        const mode = document.getElementById('modal-mode').value;
        const color = document.getElementById('modal-color').value;
        const diff = document.getElementById('modal-difficulty').value;
        const time = document.getElementById('modal-time').value;
        this.gameMode = mode;
        this.engineColor = color === 'w' ? 'b' : 'w';
        if (diff) this.engine.setDifficulty(parseInt(diff));
        else this.engine.setDifficulty(null);
        this.clock.setPreset(time);
        this.evalGraph.clear();
        this.evalBar.reset();
        this.engine.newGame();
        this.game.newGame({ mode, color });
        if (time !== 'unlimited') this.clock.start('w');
        hideModal();
        this.sound.play('start');
        showToast('New game started!', 'success');
        if (mode === 'engine' && color === 'b') this.makeEngineMove();
      });
    }, 50);
  }

  showGameOverModal(result) {
    const html = `
      <h3 class="modal-title">Game Over</h3>
      <div style="text-align:center;padding:20px 0">
        <div style="font-size:48px;margin-bottom:12px">${result.result === '1-0' ? '♔' : result.result === '0-1' ? '♚' : '½'}</div>
        <div style="font-size:24px;font-weight:700;margin-bottom:8px">${result.result}</div>
        <div style="color:var(--color-text-secondary)">${result.reason}</div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-outline" id="modal-review-game">Review Game</button>
        <button class="btn btn-primary" id="modal-new-game">New Game</button>
      </div>
    `;
    showModal(html);
    setTimeout(() => {
      this.bindBtn('modal-review-game', () => { hideModal(); this.navigate('review'); });
      this.bindBtn('modal-new-game', () => { hideModal(); this.showNewGameModal(); });
    }, 50);
  }

  showImportPGNModal() {
    const html = `
      <h3 class="modal-title">Import PGN</h3>
      <textarea id="pgn-input" rows="10" style="width:100%;font-family:var(--font-mono);font-size:13px;resize:vertical" placeholder="Paste PGN here..."></textarea>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="document.getElementById('modal-overlay').classList.add('hidden')">Cancel</button>
        <button class="btn btn-primary" id="modal-load-pgn">Load</button>
      </div>
    `;
    showModal(html);
    setTimeout(() => {
      this.bindBtn('modal-load-pgn', () => {
        const pgn = document.getElementById('pgn-input').value;
        if (this.game.loadPGN(pgn)) { hideModal(); showToast('PGN loaded!', 'success'); }
        else showToast('Invalid PGN', 'error');
      });
    }, 50);
  }

  showFENModal() {
    const html = `
      <h3 class="modal-title">Setup Position</h3>
      <input id="fen-input" type="text" style="width:100%;font-family:var(--font-mono);font-size:13px" value="${this.game.fen()}" />
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="document.getElementById('modal-overlay').classList.add('hidden')">Cancel</button>
        <button class="btn btn-primary" id="modal-load-fen">Load FEN</button>
      </div>
    `;
    showModal(html);
    setTimeout(() => {
      this.bindBtn('modal-load-fen', () => {
        const fen = document.getElementById('fen-input').value;
        if (this.game.loadFEN(fen)) { hideModal(); showToast('Position loaded!', 'success'); }
        else showToast('Invalid FEN', 'error');
      });
    }, 50);
  }

  showSettingsModal() {
    const html = `
      <h3 class="modal-title">Settings</h3>
      <div style="display:flex;flex-direction:column;gap:16px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>Sound Effects</span>
          <button class="btn btn-sm btn-outline" id="setting-sound">${this.sound.enabled ? '🔊 On' : '🔇 Off'}</button>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>Analysis Lines</span>
          <select id="setting-multipv" style="padding:4px 8px;border-radius:6px">
            <option value="1" ${this.engine.multiPV===1?'selected':''}>1 line</option>
            <option value="3" ${this.engine.multiPV===3?'selected':''}>3 lines</option>
            <option value="5" ${this.engine.multiPV===5?'selected':''}>5 lines</option>
          </select>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>Engine Depth</span>
          <select id="setting-depth" style="padding:4px 8px;border-radius:6px">
            <option value="10">10</option>
            <option value="15">15</option>
            <option value="20" selected>20</option>
            <option value="25">25</option>
          </select>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-primary" onclick="document.getElementById('modal-overlay').classList.add('hidden')">Done</button>
      </div>
    `;
    showModal(html);
    setTimeout(() => {
      this.bindBtn('setting-sound', () => {
        const on = this.sound.toggle();
        const btn = document.getElementById('setting-sound');
        if (btn) btn.textContent = on ? '🔊 On' : '🔇 Off';
      });
      const mpv = document.getElementById('setting-multipv');
      if (mpv) mpv.addEventListener('change', () => this.engine.setMultiPV(parseInt(mpv.value)));
      const depth = document.getElementById('setting-depth');
      if (depth) depth.addEventListener('change', () => { this.engine.targetDepth = parseInt(depth.value); });
    }, 50);
  }

  toggleTheme() {
    this.isDark = !this.isDark;
    document.documentElement.setAttribute('data-theme', this.isDark ? 'dark' : 'light');
    const btn = document.getElementById('btn-theme-toggle');
    if (btn) btn.querySelector('.nav-icon').textContent = this.isDark ? '🌙' : '☀️';
  }

  async startReview() {
    if (!this.review || this.game.getState().history.length === 0) {
      showToast('Play a game first to review it!', 'info');
      return;
    }
    
    // Switch to Review tab
    document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel-content').forEach(p => p.classList.remove('active'));
    const reviewTab = document.getElementById('tab-review');
    const reviewPanel = document.getElementById('panel-review');
    if (reviewTab) reviewTab.classList.add('active');
    if (reviewPanel) reviewPanel.classList.add('active');
    
    const summaryEl = document.getElementById('review-summary-content');
    if (summaryEl) summaryEl.innerHTML = '<div class="engine-placeholder">Analyzing game...</div>';

    this.review.onProgress = (i, total) => {
      const el = document.getElementById('status-text');
      if (el) el.textContent = `Reviewing: ${i+1}/${total}`;
      if (summaryEl) summaryEl.innerHTML = `<div class="engine-placeholder">Analyzing move ${i+1} of ${total}...</div>`;
    };

    const summary = await this.review.review(this.game.getState().history);
    if (summary) {
      summary.moves.forEach((m, i) => {
        if (this.game.history[i]) this.game.history[i].classification = m.classification;
      });
      this.moveList.render();
      this.board.update();
      
      if (summaryEl) {
        summaryEl.innerHTML = `
          <div class="review-header">Game Review</div>
          <div class="accuracy-container">
            <div class="accuracy-circle">
              <span class="accuracy-value" style="color:var(--color-text-primary)">${summary.whiteAccuracy}%</span>
              <span class="accuracy-label">White Accuracy</span>
            </div>
            <div class="accuracy-circle">
              <span class="accuracy-value" style="color:var(--color-text-secondary)">${summary.blackAccuracy}%</span>
              <span class="accuracy-label">Black Accuracy</span>
            </div>
          </div>
          <div class="review-stats">
            <div class="stat-row">
              <span class="stat-label"><span class="move-list-icon brilliant">!!</span> Brilliant</span>
              <span class="stat-count">${summary.whiteCounts.brilliant} - ${summary.blackCounts.brilliant}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label"><span class="move-list-icon great">!</span> Great</span>
              <span class="stat-count">${summary.whiteCounts.great} - ${summary.blackCounts.great}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label"><span class="move-list-icon best">★</span> Best Move</span>
              <span class="stat-count">${summary.whiteCounts.best} - ${summary.blackCounts.best}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label"><span class="move-list-icon inaccuracy">?!</span> Inaccuracy</span>
              <span class="stat-count">${summary.whiteCounts.inaccuracy} - ${summary.blackCounts.inaccuracy}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label"><span class="move-list-icon mistake">?</span> Mistake</span>
              <span class="stat-count">${summary.whiteCounts.mistake} - ${summary.blackCounts.mistake}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label"><span class="move-list-icon blunder">??</span> Blunder</span>
              <span class="stat-count">${summary.whiteCounts.blunder} - ${summary.blackCounts.blunder}</span>
            </div>
          </div>
        `;
      }
    }
  }

  showTrainingMenu() {
    showToast('Training modes: Use keyboard shortcut "T" for quick access', 'info');
  }

  showBattleMenu() {
    showToast('AI Battle Arena — Coming in Phase 2!', 'info');
  }
}

// Boot the app
const app = new ChessApp();
app.init().catch(err => console.error('App init failed:', err));
