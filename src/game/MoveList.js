export class MoveList {
  constructor(containerId, gameManager) {
    this.container = document.getElementById(containerId);
    this.game = gameManager;
    this.onMoveClick = null;
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = '';
    const history = this.game.getState().history;
    const currentIdx = this.game.getState().currentMoveIndex;

    for (let i = 0; i < history.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const row = document.createElement('div');
      row.className = 'move-row';

      const numEl = document.createElement('span');
      numEl.className = 'move-number';
      numEl.textContent = moveNum + '.';
      row.appendChild(numEl);

      const glyphMap = {
        brilliant: '!!', great: '!', best: '★', good: '✔',
        inaccuracy: '?!', mistake: '?', blunder: '??'
      };

      // White move
      const whiteCell = document.createElement('span');
      whiteCell.className = 'move-cell';
      whiteCell.textContent = history[i].san;
      whiteCell.dataset.index = i;
      if (i === currentIdx) whiteCell.classList.add('active');
      if (history[i].classification) {
        whiteCell.classList.add(history[i].classification);
        const text = glyphMap[history[i].classification] || '';
        if (text) whiteCell.innerHTML += `<span class="move-list-icon ${history[i].classification}">${text}</span>`;
      }
      whiteCell.addEventListener('click', () => {
        this.game.goToMove(i);
        if (this.onMoveClick) this.onMoveClick(i);
      });
      row.appendChild(whiteCell);

      // Black move
      if (i + 1 < history.length) {
        const blackCell = document.createElement('span');
        blackCell.className = 'move-cell';
        blackCell.textContent = history[i + 1].san;
        blackCell.dataset.index = i + 1;
        if (i + 1 === currentIdx) blackCell.classList.add('active');
        if (history[i + 1].classification) {
          blackCell.classList.add(history[i + 1].classification);
          const text = glyphMap[history[i + 1].classification] || '';
          if (text) blackCell.innerHTML += `<span class="move-list-icon ${history[i + 1].classification}">${text}</span>`;
        }
        blackCell.addEventListener('click', () => {
          this.game.goToMove(i + 1);
          if (this.onMoveClick) this.onMoveClick(i + 1);
        });
        row.appendChild(blackCell);
      }

      this.container.appendChild(row);
    }

    // Auto-scroll to current move
    const activeEl = this.container.querySelector('.move-cell.active');
    if (activeEl) activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}
