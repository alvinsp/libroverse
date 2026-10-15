import { state } from '../../core/state.js';
import { STORAGE_KEYS } from '../../core/constants.js';
import { showToast } from '../../utils/toast.js';

let shelfChangeListeners = [];

export function onShelfChange(callback) {
  if (typeof callback === 'function') {
    shelfChangeListeners.push(callback);
  }
}

function notifyShelfChange() {
  shelfChangeListeners.forEach((cb) => cb(state.shelf));
}

export function updateShelfBadge() {
  const badge = document.getElementById('shelf-badge-count');
  const tabCount = document.getElementById('shelf-tab-count');
  if (badge) badge.textContent = state.shelf.length;
  if (tabCount) tabCount.textContent = state.shelf.length;
}

export function toggleBookInShelf(book) {
  const index = state.shelf.findIndex((i) => i.id === book.id);
  const isEn = state.currentLang === 'en';

  if (index > -1) {
    state.shelf.splice(index, 1);
    showToast(isEn ? `Removed from Shelf: "${book.title}"` : `Dihapus dari Rak Kosmik: "${book.title}"`, '🗑️');
  } else {
    state.shelf.push({
      id: book.id,
      title: book.title,
      author: book.author,
      cover: book.cover,
      status: 'saved',
      progress: 0,
      addedAt: new Date().toISOString()
    });
    showToast(isEn ? `Saved to Shelf: "${book.title}"` : `Disimpan ke Rak Kosmik: "${book.title}"`, '⭐');
  }

  localStorage.setItem(STORAGE_KEYS.SHELF, JSON.stringify(state.shelf));
  updateShelfBadge();
  notifyShelfChange();
}

export function addOrUpdateShelfStatus(book, status = 'reading') {
  const item = state.shelf.find((i) => i.id === book.id);
  if (item) {
    item.status = status;
  } else {
    state.shelf.push({
      id: book.id,
      title: book.title,
      author: book.author,
      cover: book.cover,
      status: status,
      progress: 25,
      addedAt: new Date().toISOString()
    });
  }
  localStorage.setItem(STORAGE_KEYS.SHELF, JSON.stringify(state.shelf));
  updateShelfBadge();
  notifyShelfChange();
}
