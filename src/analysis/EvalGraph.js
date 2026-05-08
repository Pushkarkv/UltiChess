export class EvalGraph {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.evaluations = [];
    this.onClick = null;
  }

  addEval(score, type) {
    this.evaluations.push({ score, type });
    this.draw();
  }

  setEvals(evals) {
    this.evaluations = evals;
    this.draw();
  }

  clear() {
    this.evaluations = [];
    this.draw();
  }

  draw() {
    if (!this.ctx || !this.canvas) return;
    const w = this.canvas.width = this.canvas.offsetWidth * 2;
    const h = this.canvas.height = this.canvas.offsetHeight * 2;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-bg-tertiary').trim() || '#1a1a28';
    ctx.fillRect(0, 0, w, h);

    // Center line
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    if (this.evaluations.length < 2) return;

    const maxCp = 5; // clamp at +/- 5 pawns
    const stepX = w / Math.max(this.evaluations.length - 1, 1);

    // Draw fill
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    this.evaluations.forEach((ev, i) => {
      let y;
      if (ev.type === 'mate') {
        y = ev.score > 0 ? 4 : h - 4;
      } else {
        const clamped = Math.max(-maxCp, Math.min(maxCp, ev.score));
        y = h / 2 - (clamped / maxCp) * (h / 2 - 4);
      }
      ctx.lineTo(i * stepX, y);
    });
    ctx.lineTo(w, h / 2);
    ctx.closePath();

    // Gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(240,240,240,0.3)');
    grad.addColorStop(0.5, 'rgba(240,240,240,0.05)');
    grad.addColorStop(1, 'rgba(50,50,50,0.3)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Draw line
    ctx.beginPath();
    this.evaluations.forEach((ev, i) => {
      let y;
      if (ev.type === 'mate') {
        y = ev.score > 0 ? 4 : h - 4;
      } else {
        const clamped = Math.max(-maxCp, Math.min(maxCp, ev.score));
        y = h / 2 - (clamped / maxCp) * (h / 2 - 4);
      }
      if (i === 0) ctx.moveTo(i * stepX, y);
      else ctx.lineTo(i * stepX, y);
    });
    ctx.strokeStyle = '#6c5ce7';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
