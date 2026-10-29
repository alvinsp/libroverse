import { state } from '../../core/state.js';
import { STORAGE_KEYS } from '../../core/constants.js';

const listeners = [];

export function onHighlightsChange(callback) {
  if (typeof callback === 'function') {
    listeners.push(callback);
  }
}

function notifyListeners() {
  listeners.forEach((fn) => {
    try {
      fn(state.highlights);
    } catch (e) {
      console.warn('Highlights listener error:', e);
    }
  });
}

export function getAllHighlights() {
  return state.highlights || [];
}

export function getHighlightsForBook(bookId) {
  if (!bookId) return [];
  return (state.highlights || []).filter((h) => h.bookId === bookId);
}

export function saveHighlight(highlight) {
  if (!highlight || !highlight.id) return;
  const existingIdx = state.highlights.findIndex((h) => h.id === highlight.id);
  if (existingIdx >= 0) {
    state.highlights[existingIdx] = { ...state.highlights[existingIdx], ...highlight };
  } else {
    state.highlights.unshift(highlight);
  }
  localStorage.setItem(STORAGE_KEYS.HIGHLIGHTS, JSON.stringify(state.highlights));
  updateHighlightsBadge();
  notifyListeners();
}

export function updateHighlightNote(id, noteText) {
  const hl = state.highlights.find((h) => h.id === id);
  if (hl) {
    hl.note = (noteText || '').trim();
    hl.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.HIGHLIGHTS, JSON.stringify(state.highlights));
    updateHighlightsBadge();
    notifyListeners();
  }
}

export function updateHighlightColor(id, color) {
  const hl = state.highlights.find((h) => h.id === id);
  if (hl) {
    hl.color = color;
    hl.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.HIGHLIGHTS, JSON.stringify(state.highlights));
    notifyListeners();
  }
}

export function deleteHighlight(id) {
  state.highlights = state.highlights.filter((h) => h.id !== id);
  localStorage.setItem(STORAGE_KEYS.HIGHLIGHTS, JSON.stringify(state.highlights));
  updateHighlightsBadge();
  notifyListeners();
}

export function updateHighlightsBadge() {
  const badge = document.getElementById('reader-notes-count');
  if (!badge) return;
  if (!state.currentReadingBook) {
    badge.textContent = '0';
    return;
  }
  const count = getHighlightsForBook(state.currentReadingBook.id).length;
  badge.textContent = String(count);
  badge.classList.toggle('has-items', count > 0);
}
