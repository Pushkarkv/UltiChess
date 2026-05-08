export class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.3;
  }

  init() {
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.enabled = false; }
  }

  play(type) {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    gain.gain.value = this.volume;

    const configs = {
      move: { freq: 400, dur: 0.06, type: 'sine' },
      capture: { freq: 250, dur: 0.1, type: 'triangle' },
      check: { freq: 550, dur: 0.12, type: 'square' },
      castle: { freq: 350, dur: 0.15, type: 'sine' },
      promote: { freq: 600, dur: 0.15, type: 'sine' },
      gameover: { freq: 200, dur: 0.3, type: 'sawtooth' },
      illegal: { freq: 150, dur: 0.08, type: 'square' },
      start: { freq: 440, dur: 0.1, type: 'sine' }
    };

    const cfg = configs[type] || configs.move;
    osc.type = cfg.type;
    osc.frequency.value = cfg.freq;
    gain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + cfg.dur);
    osc.start();
    osc.stop(this.ctx.currentTime + cfg.dur + 0.05);
  }

  playForMove(move) {
    if (!move) return;
    if (move.san && move.san.includes('#')) { this.play('gameover'); return; }
    if (move.san && move.san.includes('+')) { this.play('check'); return; }
    if (move.flags && (move.flags.includes('k') || move.flags.includes('q'))) { this.play('castle'); return; }
    if (move.flags && move.flags.includes('p')) { this.play('promote'); return; }
    if (move.captured) { this.play('capture'); return; }
    this.play('move');
  }

  toggle() { this.enabled = !this.enabled; return this.enabled; }
  setVolume(v) { this.volume = Math.max(0, Math.min(1, v)); }
}
