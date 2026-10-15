import { state } from '../../core/state.js';
import { STORAGE_KEYS } from '../../core/constants.js';
import { showToast } from '../../utils/toast.js';
import { toggleBookInShelf, updateShelfBadge } from '../../services/storage/shelfStorage.js';
import { openReaderModal } from '../reader/readerView.js';
import { startAudioPlayer } from '../../services/audio/audioService.js';

let filterAndRenderCallback = null;

export function registerShelfCatalogueRenderer(fn) {
  filterAndRenderCallback = fn;
}

export function renderShelfDrawerList() {
  const listEl = document.getElementById('shelf-items-list');
  if (!listEl) return;

  let items = [...state.shelf];
  if (state.activeShelfTab !== 'all') {
    items = items.filter((i) => i.status === state.activeShelfTab);
  }

  const isEn = state.currentLang === 'en';
  if (items.length === 0) {
    listEl.innerHTML = `
      <div class="shelf-empty-box">
        <span style="font-size: 2.5rem;">🌌</span>
        <h4>${isEn ? 'Your bookshelf is empty' : 'Rak Kosmik masih kosong'}</h4>
        <p style="font-size: 0.85rem;">${isEn ? 'Click the star button on any book to add it to your personal shelf.' : 'Klik tombol bintang pada buku untuk menyimpannya ke rak baca pribadimu.'}</p>
      </div>
    `;
    return;
  }

  listEl.innerHTML = items
    .map((item) => {
      return `
      <div class="shelf-item-card">
        <img src="${item.cover || '/assets/libroverse-logo.jpg'}" alt="${item.title}" class="shelf-item-cover" />
        <div class="shelf-item-info">
          <h4 class="shelf-item-title">${item.title}</h4>
          <span class="shelf-item-author">${item.author}</span>
          <div class="shelf-item-actions">
            <button type="button" class="shelf-item-btn" data-shelf-read="${item.id}">${isEn ? 'Read' : 'Baca'}</button>
            <button type="button" class="shelf-item-btn" data-shelf-listen="${item.id}">${isEn ? 'Listen' : 'Dengar'}</button>
            <button type="button" class="shelf-item-remove-btn" data-shelf-remove="${item.id}">${isEn ? 'Remove' : 'Hapus'}</button>
          </div>
        </div>
      </div>
    `;
    })
    .join('');

  listEl.querySelectorAll('[data-shelf-read]').forEach((b) => {
    b.addEventListener('click', () => {
      const book = state.books.find((bk) => bk.id === b.dataset.shelfRead);
      if (book) {
        closeShelfDrawer();
        openReaderModal(book);
      }
    });
  });

  listEl.querySelectorAll('[data-shelf-listen]').forEach((b) => {
    b.addEventListener('click', () => {
      const book = state.books.find((bk) => bk.id === b.dataset.shelfListen);
      if (book) {
        closeShelfDrawer();
        startAudioPlayer(book);
      }
    });
  });

  listEl.querySelectorAll('[data-shelf-remove]').forEach((b) => {
    b.addEventListener('click', () => {
      const book = state.books.find((bk) => bk.id === b.dataset.shelfRemove);
      if (book) {
        toggleBookInShelf(book);
        renderShelfDrawerList();
        if (filterAndRenderCallback) filterAndRenderCallback();
      }
    });
  });
}

export function openShelfDrawer() {
  const drawer = document.getElementById('shelf-drawer');
  const backdrop = document.getElementById('shelf-drawer-backdrop');
  if (drawer && backdrop) {
    drawer.style.setProperty('display', 'flex', 'important');
    backdrop.style.setProperty('display', 'block', 'important');
    drawer.classList.add('active');
    backdrop.classList.add('active');
    drawer.hidden = false;
    backdrop.hidden = false;
    drawer.removeAttribute('hidden');
    backdrop.removeAttribute('hidden');
    renderShelfDrawerList();
  }
}

export function closeShelfDrawer() {
  const drawer = document.getElementById('shelf-drawer');
  const backdrop = document.getElementById('shelf-drawer-backdrop');
  if (drawer && backdrop) {
    drawer.style.setProperty('display', 'none', 'important');
    backdrop.style.setProperty('display', 'none', 'important');
    drawer.classList.remove('active');
    backdrop.classList.remove('active');
    drawer.hidden = true;
    backdrop.hidden = true;
    drawer.setAttribute('hidden', '');
    backdrop.setAttribute('hidden', '');
  }
}

export function setupShelfEvents() {
  const openBtn = document.getElementById('open-shelf-btn');
  const footerLink = document.getElementById('footer-shelf-link');
  const closeBtn = document.getElementById('shelf-close-btn');
  const backdrop = document.getElementById('shelf-drawer-backdrop');
  const clearAllBtn = document.getElementById('shelf-clear-all-btn');
  const browseMoreBtn = document.getElementById('shelf-browse-more-btn');

  openBtn?.addEventListener('click', openShelfDrawer);
  footerLink?.addEventListener('click', (e) => {
    e.preventDefault();
    openShelfDrawer();
  });
  closeBtn?.addEventListener('click', closeShelfDrawer);
  backdrop?.addEventListener('click', closeShelfDrawer);

  clearAllBtn?.addEventListener('click', () => {
    if (confirm('Yakin ingin mengosongkan seluruh isi Rak Kosmik?')) {
      state.shelf = [];
      localStorage.removeItem(STORAGE_KEYS.SHELF);
      updateShelfBadge();
      renderShelfDrawerList();
      if (filterAndRenderCallback) filterAndRenderCallback();
      showToast('Rak Kosmik berhasil dikosongkan', '🧹');
    }
  });

  browseMoreBtn?.addEventListener('click', () => {
    closeShelfDrawer();
    document.getElementById('katalog')?.scrollIntoView({ behavior: 'smooth' });
  });

  document.querySelectorAll('.shelf-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.activeShelfTab = btn.dataset.tab;
      document.querySelectorAll('.shelf-tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderShelfDrawerList();
    });
  });
}
