export class Clock {
  constructor() {
    this.whiteTime = 600000; // 10 min in ms
    this.blackTime = 600000;
    this.increment = 0;
    this.activeSide = null; // 'w' or 'b'
    this.interval = null;
    this.lastTick = null;
    this.onUpdate = null;
    this.onTimeout = null;
    this.running = false;
  }

  configure(whiteMs, blackMs, incrementMs) {
    this.whiteTime = whiteMs;
    this.blackTime = blackMs;
    this.increment = incrementMs || 0;
    this.activeSide = null;
    this.running = false;
    this.update();
  }

  setPreset(name) {
    const presets = {
      'bullet-1': [60000, 60000, 0],
      'bullet-2': [120000, 120000, 1000],
      'blitz-3': [180000, 180000, 0],
      'blitz-3+2': [180000, 180000, 2000],
      'blitz-5': [300000, 300000, 0],
      'blitz-5+3': [300000, 300000, 3000],
      'rapid-10': [600000, 600000, 0],
      'rapid-10+5': [600000, 600000, 5000],
      'rapid-15+10': [900000, 900000, 10000],
      'classical-30': [1800000, 1800000, 0],
      'unlimited': [Infinity, Infinity, 0]
    };
    const p = presets[name] || presets['rapid-10'];
    this.configure(p[0], p[1], p[2]);
  }

  start(side) {
    this.activeSide = side;
    this.running = true;
    this.lastTick = Date.now();
    if (this.interval) clearInterval(this.interval);
    this.interval = setInterval(() => this.tick(), 100);
  }

  switchSide() {
    if (!this.running) return;
    this.tick(); // final tick for current side
    // Add increment
    if (this.activeSide === 'w') {
      this.whiteTime += this.increment;
    } else {
      this.blackTime += this.increment;
    }
    this.activeSide = this.activeSide === 'w' ? 'b' : 'w';
    this.lastTick = Date.now();
    this.update();
  }

  tick() {
    if (!this.running || !this.activeSide) return;
    const now = Date.now();
    const elapsed = now - this.lastTick;
    this.lastTick = now;

    if (this.activeSide === 'w') {
      this.whiteTime = Math.max(0, this.whiteTime - elapsed);
      if (this.whiteTime <= 0 && this.onTimeout) this.onTimeout('w');
    } else {
      this.blackTime = Math.max(0, this.blackTime - elapsed);
      if (this.blackTime <= 0 && this.onTimeout) this.onTimeout('b');
    }
    this.update();
  }

  stop() {
    this.running = false;
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
  }

  update() {
    if (this.onUpdate) {
      this.onUpdate({
        white: this.formatTime(this.whiteTime),
        black: this.formatTime(this.blackTime),
        whiteMs: this.whiteTime,
        blackMs: this.blackTime,
        active: this.activeSide
      });
    }
  }

  formatTime(ms) {
    if (ms === Infinity) return '∞';
    const totalSec = Math.ceil(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  reset() { this.stop(); this.configure(this.whiteTime, this.blackTime, this.increment); }
}
