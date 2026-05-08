export function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export function showModal(content) {
  const overlay = document.getElementById('modal-overlay');
  const contentEl = document.getElementById('modal-content');
  if (!overlay || !contentEl) return;
  contentEl.innerHTML = '';
  if (typeof content === 'string') {
    contentEl.innerHTML = content;
  } else {
    contentEl.appendChild(content);
  }
  overlay.classList.remove('hidden');
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) hideModal();
  });
}

export function hideModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.add('hidden');
}

export function formatEval(evaluation) {
  if (!evaluation) return '—';
  if (evaluation.type === 'mate') return `M${Math.abs(evaluation.score)}`;
  return evaluation.score >= 0 ? `+${evaluation.score.toFixed(1)}` : evaluation.score.toFixed(1);
}

export function squareToAlgebraic(row, col) {
  return String.fromCharCode(97 + col) + (8 - row);
}

export function algebraicToCoords(sq) {
  return { row: 8 - parseInt(sq[1]), col: sq.charCodeAt(0) - 97 };
}

export function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => showToast('Copied!', 'success'));
}

export function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
