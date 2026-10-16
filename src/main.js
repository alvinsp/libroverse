/**
 * Libroverse - Perpustakaan Semesta Digital
 * Application Entry Point & Clean Architecture Orchestrator
 */

import { state } from './core/state.js';
import { STORAGE_KEYS } from './core/constants.js';
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

  if ('serviceWorker' in navigator) {
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      // In local development, unregister service workers to avoid stale cache confusion
      navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) {
          reg.unregister();
        }
      });
      if ('caches' in window) {
        caches.keys().then((keys) => {
          for (const key of keys) caches.delete(key);
        });
      }
    } else if (location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        reg.update();
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              window.location.reload();
            }
          });
        });
      }).catch((err) => {
        console.log('SW registration note:', err);
      });
    }
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

  // Auto-Resume Last Reading Session (re-opens exact page if user exited browser while reading)
  try {
    const sessionStr = localStorage.getItem(STORAGE_KEYS.LAST_READ_SESSION);
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      if (session && session.autoResume && session.bookId) {
        const book = state.books.find((b) => b.id === session.bookId) || BOOKS_DATA.find((b) => b.id === session.bookId);
        if (book) {
          openReaderModal(book, session.pageIndex);
          showToast(t('reader_auto_resume_toast', { title: book.title, page: (session.pageIndex || 0) + 1 }), '🚀');
        }
      }
    }
  } catch (err) {
    console.warn('Auto-resume session note:', err);
  }

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
