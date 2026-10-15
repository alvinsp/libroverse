import { state } from '../../core/state.js';
import { GENRES_LIST } from '../../data/books.js';
import { t, getTranslatedGenre } from '../../services/i18n/i18n.js';
import { showToast } from '../../utils/toast.js';
import { toggleBookInShelf, updateShelfBadge } from '../../services/storage/shelfStorage.js';
import { deleteBookFromDB } from '../../services/storage/indexedDb.js';
import { openBookDetailModal, triggerEbookDownload } from '../modals/bookDetailModal.js';
import { openReaderModal, closeReaderModal } from '../reader/readerView.js';
import { closeBookDetailModal } from '../modals/bookDetailModal.js';
import { closeShelfDrawer } from '../shelf/shelfView.js';

export function renderGenrePills() {
  const container = document.getElementById('genre-pills-list');
  if (!container) return;

  container.innerHTML = GENRES_LIST.map(
    (g) => `
    <button 
      type="button" 
      class="genre-pill ${state.activeGenre === g.id ? 'active' : ''}" 
      data-genre="${g.id}"
      role="tab"
      aria-selected="${state.activeGenre === g.id}">
      ${getTranslatedGenre(g.label)}
    </button>
  `
  ).join('');

  container.querySelectorAll('.genre-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.activeGenre = btn.dataset.genre;
      renderGenrePills();
      filterAndRenderBooks();
    });
  });
}

export function filterAndRenderBooks() {
  let list = [...state.books];

  // Genre filter (including 'pribadi' for user uploaded books)
  if (state.activeGenre === 'pribadi') {
    list = list.filter((b) => b.isUserUploaded);
  } else if (state.activeGenre !== 'all') {
    list = list.filter((b) => b.genre === state.activeGenre);
  }

  // Format filter
  if (state.activeFormat !== 'all') {
    list = list.filter((b) => b.formats && b.formats.includes(state.activeFormat));
  }

  // Search filter
  if (state.searchQuery.trim()) {
    const q = state.searchQuery.toLowerCase();
    list = list.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        (b.subtitle && b.subtitle.toLowerCase().includes(q)) ||
        b.author.toLowerCase().includes(q) ||
        (b.genre && b.genre.toLowerCase().includes(q)) ||
        (b.synopsis && b.synopsis.toLowerCase().includes(q))
    );
  }

  // Sorting
  if (state.sortBy === 'rating') {
    list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (state.sortBy === 'pages') {
    list.sort((a, b) => (b.pages || 0) - (a.pages || 0));
  } else if (state.sortBy === 'newest') {
    list.reverse();
  }

  state.filteredBooks = list;

  // Update counts with translation
  const countEl = document.getElementById('results-count-text');
  if (countEl) countEl.textContent = t('results_showing', { n: list.length });

  // Render Grid
  const grid = document.getElementById('books-grid');
  const empty = document.getElementById('empty-state');
  if (!grid || !empty) return;

  if (list.length === 0) {
    grid.innerHTML = '';
    empty.hidden = false;
    return;
  }

  empty.hidden = true;
  grid.innerHTML = list.map((book) => renderBookCardHTML(book)).join('');

  // Attach card event listeners
  attachBookCardListeners(grid);
}

export function renderBookCardHTML(book) {
  const isInShelf = state.shelf.some((item) => item.id === book.id);
  const coverHTML = book.cover
    ? `<img src="${book.cover}" alt="${book.coverAlt || book.title}" class="card-cover-img" loading="lazy" />`
    : `
      <div class="card-gradient-cover" style="background: ${book.gradientTheme || 'var(--bg-surface)'}">
        <span class="gradient-cover-icon">${book.iconSymbol || (book.isUserUploaded ? '📤' : '📖')}</span>
        <div class="gradient-cover-meta">
          <h4 class="gradient-cover-title">${book.title}</h4>
          <span class="gradient-cover-author">${book.author}</span>
        </div>
      </div>
    `;

  const formatsHTML = (book.formats || ['epub'])
    .map((f) => `<span class="format-icon-tag">${f.toUpperCase()}</span>`)
    .join('');

  const badgeHTML = book.isUserUploaded
    ? `<span class="card-badge personal-badge">${state.currentLang === 'en' ? 'Personal Book' : 'Koleksi Pribadi'}</span>`
    : (book.badge ? `<span class="card-badge">${book.badge}</span>` : '');

  const subtitleHTML = book.subtitle ? `<p class="card-subtitle">${book.subtitle}</p>` : '';
  const fileSizeHTML = book.fileSize ? `<span class="card-filesize">${book.fileSize}</span>` : `<span class="card-read-time">⏳ ${book.readingTime || 'Ebook'}</span>`;

  const deleteBtnHTML = book.isUserUploaded
    ? `<button type="button" class="card-delete-btn" data-action="delete-book" data-id="${book.id}" title="Hapus buku ini dari koleksi">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
      </button>`
    : '';

  return `
    <article class="book-card" data-id="${book.id}">
      <div class="card-cover-container" data-action="open-detail" data-id="${book.id}">
        ${coverHTML}
        ${badgeHTML}
      </div>

      <div class="card-info">
        <div class="card-genre-row">
          <span class="card-genre">${getTranslatedGenre(book.genre)}</span>
          <div class="card-formats">${formatsHTML}</div>
        </div>

        <h3 class="card-title" data-action="open-detail" data-id="${book.id}">${book.title}</h3>
        ${subtitleHTML}
        <span class="card-author">${book.author}</span>

        <div class="card-rating-row">
          <span class="card-rating-stars">★★★★★</span>
          <span class="card-rating-val">${book.rating || '5.0'}</span>
          ${fileSizeHTML}
        </div>
      </div>

      <div class="card-actions-row">
        <button type="button" class="card-read-primary-btn" data-action="read" data-id="${book.id}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          <span>${t('card_read')}</span>
        </button>

        <button type="button" class="card-dl-secondary-btn" data-action="download" data-id="${book.id}" title="Download Buku EPUB/PDF">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>${t('card_download')}</span>
        </button>

        <button 
          type="button" 
          class="card-action-icon-btn ${isInShelf ? 'in-shelf' : ''}" 
          data-action="toggle-shelf" 
          data-id="${book.id}"
          title="${isInShelf ? (state.currentLang === 'en' ? 'Remove from Shelf' : 'Hapus dari Rak Kosmik') : (state.currentLang === 'en' ? 'Save to Shelf' : 'Simpan ke Rak Kosmik')}">
          ${isInShelf ? '★' : '☆'}
        </button>

        ${deleteBtnHTML}
      </div>
    </article>
  `;
}

export function attachBookCardListeners(container) {
  container.querySelectorAll('[data-action="open-detail"]').forEach((el) => {
    el.addEventListener('click', () => {
      const book = state.books.find((b) => b.id === el.dataset.id);
      if (book) openBookDetailModal(book);
    });
  });

  container.querySelectorAll('[data-action="read"]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const book = state.books.find((b) => b.id === el.dataset.id);
      if (book) openReaderModal(book);
    });
  });

  container.querySelectorAll('[data-action="download"]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const book = state.books.find((b) => b.id === el.dataset.id);
      if (book) triggerEbookDownload(book, (book.formats && book.formats[0]) || 'epub');
    });
  });

  container.querySelectorAll('[data-action="toggle-shelf"]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const book = state.books.find((b) => b.id === el.dataset.id);
      if (book) {
        toggleBookInShelf(book);
        filterAndRenderBooks();
      }
    });
  });

  container.querySelectorAll('[data-action="delete-book"]').forEach((el) => {
    el.addEventListener('click', async (e) => {
      e.stopPropagation();
      const bookId = el.dataset.id;
      const book = state.books.find((b) => b.id === bookId);
      if (!book) return;
      if (confirm(`Hapus "${book.title}" dari koleksi pribadi Anda?`)) {
        await deleteBookFromDB(bookId);
        state.books = state.books.filter((b) => b.id !== bookId);
        state.shelf = state.shelf.filter((item) => item.id !== bookId);
        localStorage.setItem('libroverse_shelf', JSON.stringify(state.shelf));
        updateShelfBadge();
        filterAndRenderBooks();
        showToast(`Buku "${book.title}" berhasil dihapus dari koleksi`, '🗑');
      }
    });
  });
}

export function setupSearchAndFilters() {
  const navInput = document.getElementById('global-search-input');
  const heroInput = document.getElementById('hero-prompt-input');
  const heroSubmit = document.getElementById('hero-submit-btn');
  const clearBtn = document.getElementById('search-clear-btn');
  const sortSelect = document.getElementById('sort-select');
  const resetBtn = document.getElementById('reset-filters-btn');

  function handleSearch(val) {
    state.searchQuery = val;
    if (navInput && navInput.value !== val) navInput.value = val;
    if (heroInput && heroInput.value !== val) heroInput.value = val;
    if (clearBtn) clearBtn.hidden = !val;

    filterAndRenderBooks();
  }

  navInput?.addEventListener('input', (e) => handleSearch(e.target.value));
  heroInput?.addEventListener('input', (e) => handleSearch(e.target.value));

  heroSubmit?.addEventListener('click', () => {
    handleSearch(heroInput.value);
    document.getElementById('katalog')?.scrollIntoView({ behavior: 'smooth' });
  });

  heroInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleSearch(heroInput.value);
      document.getElementById('katalog')?.scrollIntoView({ behavior: 'smooth' });
    }
  });

  clearBtn?.addEventListener('click', () => {
    handleSearch('');
    navInput?.focus();
  });

  // Global '/' keyboard shortcut
  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== navInput && document.activeElement !== heroInput) {
      e.preventDefault();
      navInput?.focus();
      navInput?.select();
    } else if (e.key === 'Escape') {
      closeReaderModal();
      closeBookDetailModal();
      closeShelfDrawer();
    }
  });

  // Quick Mood Chips
  document.querySelectorAll('.quick-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const query = chip.dataset.query;
      handleSearch(query);
      document.getElementById('katalog')?.scrollIntoView({ behavior: 'smooth' });
      showToast(`Mencari buku dengan tema "${chip.textContent.trim()}"`, '🚀');
    });
  });

  // Format Filter Buttons
  document.querySelectorAll('.format-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.activeFormat = btn.dataset.format;
      document.querySelectorAll('.format-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      filterAndRenderBooks();
    });
  });

  // Sort Select
  sortSelect?.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    filterAndRenderBooks();
  });

  // Reset Filters
  resetBtn?.addEventListener('click', () => {
    state.activeGenre = 'all';
    state.activeFormat = 'all';
    state.searchQuery = '';
    state.sortBy = 'popular';
    if (navInput) navInput.value = '';
    if (heroInput) heroInput.value = '';
    renderGenrePills();
    filterAndRenderBooks();
    showToast('Semua filter berhasil direset', '🔄');
  });

  // Sastra Nusantara Banner Action
  document.getElementById('explore-nusantara-btn')?.addEventListener('click', () => {
    state.activeGenre = 'Sastra Nusantara';
    renderGenrePills();
    filterAndRenderBooks();
    document.getElementById('katalog')?.scrollIntoView({ behavior: 'smooth' });
  });

  // Newsletter Form
  document.getElementById('newsletter-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('newsletter-email')?.value;
    showToast(`Terima kasih! ${email} telah terdaftar dalam Surat Semesta.`, '💌');
    e.target.reset();
  });
}
