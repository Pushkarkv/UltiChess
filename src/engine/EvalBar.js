export class EvalBar {
  constructor() {
    this.barFill = document.getElementById('eval-bar-fill');
    this.scoreEl = document.getElementById('eval-score');
    this.currentPercent = 50;
  }

  update(evaluation) {
    if (!evaluation) return;
    let percent, display;
    
    if (evaluation.type === 'mate') {
      const mateIn = evaluation.score;
      percent = mateIn > 0 ? 100 : 0;
      display = `M${Math.abs(mateIn)}`;
    } else {
      const cp = evaluation.score; // in pawns (already divided by 100)
      // Sigmoid-like mapping: map cp to 0-100%
      percent = 50 + 50 * (2 / (1 + Math.exp(-0.4 * cp)) - 1);
      percent = Math.max(2, Math.min(98, percent));
      display = cp >= 0 ? `+${cp.toFixed(1)}` : cp.toFixed(1);
    }
    
    this.currentPercent = percent;
    if (this.barFill) {
      this.barFill.style.height = percent + '%';
      this.barFill.style.background = percent > 50 ? '#f0f0f0' : '#f0f0f0';
    }
    if (this.scoreEl) {
      this.scoreEl.textContent = display;
      this.scoreEl.style.color = percent >= 50 ? 'var(--color-text-primary)' : 'var(--color-text-secondary)';
    }
  }

  reset() {
    this.currentPercent = 50;
    if (this.barFill) this.barFill.style.height = '50%';
    if (this.scoreEl) this.scoreEl.textContent = '0.0';
  }
}
