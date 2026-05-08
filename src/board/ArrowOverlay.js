export class ArrowOverlay {
  constructor(svgId) {
    this.svg = document.getElementById(svgId);
    this.arrows = []; // { from, to, color }
    this.highlights = []; // { square, color }
    this.drawing = false;
    this.drawStart = null;
    this.squareSize = 0;
    this.isFlipped = false;
    this.boardSize = 8;
  }

  setSquareSize(size) { this.squareSize = size; }
  setFlipped(flipped) { this.isFlipped = flipped; }

  addArrow(from, to, color = 'rgba(0,180,0,0.7)') {
    // Remove duplicate
    this.arrows = this.arrows.filter(a => !(a.from === from && a.to === to));
    this.arrows.push({ from, to, color });
    this.render();
  }

  addEngineArrow(from, to) {
    this.addArrow(from, to, 'rgba(0,120,215,0.8)');
  }

  clearArrows() {
    this.arrows = [];
    this.highlights = [];
    this.render();
  }

  highlightSquare(square, color = 'rgba(235,97,80,0.5)') {
    const existing = this.highlights.findIndex(h => h.square === square);
    if (existing >= 0) this.highlights.splice(existing, 1);
    else this.highlights.push({ square, color });
    this.render();
  }

  squareToPixel(sq) {
    const col = sq.charCodeAt(0) - 97;
    const row = 8 - parseInt(sq[1]);
    const displayCol = this.isFlipped ? (7 - col) : col;
    const displayRow = this.isFlipped ? (7 - row) : row;
    return {
      x: displayCol * this.squareSize + this.squareSize / 2,
      y: displayRow * this.squareSize + this.squareSize / 2
    };
  }

  render() {
    if (!this.svg) return;
    this.svg.innerHTML = '';

    // Defs for arrowhead
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const colors = [...new Set(this.arrows.map(a => a.color))];
    colors.forEach((color, i) => {
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
      marker.setAttribute('id', `arrowhead-${i}`);
      marker.setAttribute('markerWidth', '12');
      marker.setAttribute('markerHeight', '8');
      marker.setAttribute('refX', '10');
      marker.setAttribute('refY', '4');
      marker.setAttribute('orient', 'auto');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M0,0 L12,4 L0,8 Z');
      path.setAttribute('fill', color);
      marker.appendChild(path);
      defs.appendChild(marker);
    });
    this.svg.appendChild(defs);

    // Square highlights
    this.highlights.forEach(h => {
      const col = h.square.charCodeAt(0) - 97;
      const row = 8 - parseInt(h.square[1]);
      const displayCol = this.isFlipped ? (7 - col) : col;
      const displayRow = this.isFlipped ? (7 - row) : row;
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', displayCol * this.squareSize);
      rect.setAttribute('y', displayRow * this.squareSize);
      rect.setAttribute('width', this.squareSize);
      rect.setAttribute('height', this.squareSize);
      rect.setAttribute('fill', h.color);
      this.svg.appendChild(rect);
    });

    // Arrows
    this.arrows.forEach((arrow, i) => {
      const from = this.squareToPixel(arrow.from);
      const to = this.squareToPixel(arrow.to);
      const colorIdx = colors.indexOf(arrow.color);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', from.x);
      line.setAttribute('y1', from.y);
      line.setAttribute('x2', to.x);
      line.setAttribute('y2', to.y);
      line.setAttribute('stroke', arrow.color);
      line.setAttribute('stroke-width', this.squareSize * 0.15);
      line.setAttribute('stroke-linecap', 'round');
      line.setAttribute('marker-end', `url(#arrowhead-${colorIdx})`);
      line.setAttribute('opacity', '0.8');
      this.svg.appendChild(line);
    });
  }
}
