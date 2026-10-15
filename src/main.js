/**
 * Libroverse - Perpustakaan Semesta Digital
 * Application Entry Point & Clean Architecture Orchestrator
 */

import { state } from './core/state.js';
import { BOOKS_DATA } from './data/books.js';
import { initCosmicCanvas } from './ui/canvas/cosmicCanvas.js';
import { applyLanguage, onLanguageChange, t } from './services/i18n/i18n.js';
import {
  renderGenrePills,
  filterAndRenderBooks,
  setupSearchAndFilters
} from './ui/catalogue/catalogueView.js';
import {
  openReaderModal,
  closeReaderModal,
  setupReaderControls,
  updateReaderLabels
} from './ui/reader/readerView.js';
import {
  closeBookDetailModal,
  setupBookDetailModalEvents
} from './ui/modals/bookDetailModal.js';
import {
  closeShelfDrawer,
  setupShelfEvents,
  registerShelfCatalogueRenderer
} from './ui/shelf/shelfView.js';
import { setupUploadModal } from './ui/modals/uploadModal.js';
import {
  startAudioPlayer,
  setupAudioPlayerControls,
  toggleAmbientSpaceAudio
} from './services/audio/audioService.js';
import { initUserBooksStorage } from './services/storage/indexedDb.js';
import { updateShelfBadge, onShelfChange } from './services/storage/shelfStorage.js';
import { showToast } from './utils/toast.js';

// ==========================================================================
// REACTIVE SUBSCRIBERS & ORCHESTRATION
// ==========================================================================
onLanguageChange(() => {
  renderGenrePills();
  filterAndRenderBooks();
  updateReaderLabels();
});

onShelfChange(() => {
  filterAndRenderBooks();
});

registerShelfCatalogueRenderer(filterAndRenderBooks);

// ==========================================================================
// PWA & SERVICE WORKER REGISTRATION
// ==========================================================================
function setupPwa() {
  const installBtn = document.getElementById('install-pwa-btn');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    state.deferredPwaPrompt = e;
    if (installBtn) installBtn.hidden = false;
  });

  installBtn?.addEventListener('click', async () => {
    if (state.deferredPwaPrompt) {
      state.deferredPwaPrompt.prompt();
      const choice = await state.deferredPwaPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        showToast('Terima kasih telah memasang Libroverse!', '🚀');
        installBtn.hidden = true;
      }
      state.deferredPwaPrompt = null;
    }
  });

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.log('SW registration note:', err);
    });
  }
}

// ==========================================================================
// APPLICATION INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Ensure all overlays and drawers are closed on startup
  closeReaderModal();
  closeBookDetailModal();
  closeShelfDrawer();

  // Initialize Canvas Background
  initCosmicCanvas();

  // Apply Language & Synchronize UI
  applyLanguage(state.currentLang);
  updateShelfBadge();

  // Setup UI Component Controllers
  setupReaderControls();
  setupAudioPlayerControls();
  setupBookDetailModalEvents();
  setupShelfEvents();
  setupSearchAndFilters();
  setupUploadModal();
  setupPwa();

  // Load user-uploaded books from IndexedDB and re-render catalogue
  await initUserBooksStorage(() => {
    filterAndRenderBooks();
  });

  // Ambient Audio Button
  document.getElementById('ambient-audio-btn')?.addEventListener('click', toggleAmbientSpaceAudio);

  // Hero Spotlight Buttons
  document.getElementById('spotlight-read-btn')?.addEventListener('click', () => {
    const book = state.books.find((b) => b.id === 'celestial-odyssey') || BOOKS_DATA.find((b) => b.id === 'celestial-odyssey');
    if (book) openReaderModal(book);
  });

  document.getElementById('spotlight-listen-btn')?.addEventListener('click', () => {
    const book = state.books.find((b) => b.id === 'celestial-odyssey') || BOOKS_DATA.find((b) => b.id === 'celestial-odyssey');
    if (book) startAudioPlayer(book);
  });

  // Scroll navbar blur effect
  window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 40) navbar?.classList.add('scrolled');
    else navbar?.classList.remove('scrolled');
  });

  // Language Dropdown Toggle
  const langBtn = document.getElementById('lang-btn');
  const langMenu = document.getElementById('lang-menu');
  langBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    langMenu.hidden = !langMenu.hidden;
  });

  document.querySelectorAll('.lang-option').forEach((opt) => {
    opt.addEventListener('click', () => {
      const lang = opt.dataset.lang;
      applyLanguage(lang);
      if (langMenu) langMenu.hidden = true;
      const langName = opt.textContent.trim();
      showToast(t('toast_lang_changed', { lang: langName }), '🌐');
    });
  });

  document.addEventListener('click', () => {
    if (langMenu) langMenu.hidden = true;
  });

  console.log('🪐 Libroverse initialized successfully with Clean Architecture!');
});
