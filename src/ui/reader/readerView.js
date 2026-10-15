import { state } from '../../core/state.js';
import { STORAGE_KEYS } from '../../core/constants.js';
import { t } from '../../services/i18n/i18n.js';
import { escapeHtml } from '../../utils/domUtils.js';
import { showToast } from '../../utils/toast.js';
import { buildBookPages } from '../../services/parser/paginator.js';
import { addOrUpdateShelfStatus } from '../../services/storage/shelfStorage.js';

export function updateReaderLabels() {
  const modeLabel = document.getElementById('reader-mode-label');
  if (modeLabel) {
    modeLabel.textContent = state.readerMode === 'scroll' ? t('reader_mode_scroll') : t('reader_mode_pages');
  }
  const prevText = document.getElementById('reader-prev-btn-text');
  if (prevText) prevText.textContent = t('reader_prev');
  const nextText = document.getElementById('reader-next-btn-text');
  if (nextText) nextText.textContent = t('reader_next');
}

export function goToNextReaderPage() {
  const book = state.currentReadingBook;
  if (!book) return;

  if (book.fileType === 'pdf' || book.isPdf) return;

  if (state.readerMode === 'scroll') {
    if (state.currentChapterIndex < (book.chapters?.length || 1) - 1) {
      const nextChIdx = state.currentChapterIndex + 1;
      const targetPage = book.toc?.[nextChIdx]?.startPageIndex ?? 0;
      openReaderModal(book, targetPage);
    }
  } else {
    if (book.pagesList && state.currentPageIndex < book.pagesList.length - 1) {
      openReaderModal(book, state.currentPageIndex + 1);
    }
  }
}

export function goToPrevReaderPage() {
  const book = state.currentReadingBook;
  if (!book) return;

  if (book.fileType === 'pdf' || book.isPdf) return;

  if (state.readerMode === 'scroll') {
    if (state.currentChapterIndex > 0) {
      const prevChIdx = state.currentChapterIndex - 1;
      const targetPage = book.toc?.[prevChIdx]?.startPageIndex ?? 0;
      openReaderModal(book, targetPage);
    }
  } else {
    if (state.currentPageIndex > 0) {
      openReaderModal(book, state.currentPageIndex - 1);
    }
  }
}

export function openReaderModal(book, targetPageIndex = 0) {
  if (!book) return;
  state.currentReadingBook = book;

  // Build pages list if not present
  buildBookPages(book);

  const modal = document.getElementById('reader-modal');
  const container = document.getElementById('reader-container');
  const titleEl = document.getElementById('reader-book-title');
  const chapterNameEl = document.getElementById('reader-chapter-name');
  const bodyEl = document.getElementById('reader-body-content');
  const prevBtn = document.getElementById('reader-prev-chapter');
  const nextBtn = document.getElementById('reader-next-chapter');
  const prevText = document.getElementById('reader-prev-btn-text');
  const nextText = document.getElementById('reader-next-btn-text');
  const pageCounterEl = document.getElementById('reader-page-counter');
  const jumpInput = document.getElementById('reader-jump-input');
  const progressBar = document.getElementById('reader-progress-bar');
  const fontValEl = document.getElementById('reader-font-val');
  const fontFamLabel = document.getElementById('font-family-label');
  const modeLabel = document.getElementById('reader-mode-label');
  const tocListEl = document.getElementById('reader-toc-list');
  const tocBtn = document.getElementById('reader-toc-btn');

  if (!modal) return;

  // Apply theme & font preferences
  container?.setAttribute('data-theme', state.readerTheme);
  bodyEl?.setAttribute('data-family', state.readerFontFamily);
  if (bodyEl) bodyEl.style.fontSize = `${state.readerFontSize}px`;
  if (fontValEl) fontValEl.textContent = `${state.readerFontSize}px`;
  if (fontFamLabel) fontFamLabel.textContent = state.readerFontFamily === 'serif' ? 'Serif' : 'Sans';

  if (modeLabel) {
    modeLabel.textContent = state.readerMode === 'page' ? '📖 Halaman' : '📜 Mode Gulir';
  }

  // Update theme buttons
  document.querySelectorAll('.reader-theme-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.theme === state.readerTheme);
  });

  if (titleEl) titleEl.textContent = book.title;

  // Handle PDF reading
  if (book.fileType === 'pdf' || book.isPdf) {
    let pdfUrl = book.pdfUrl;
    if (!pdfUrl && book.rawFileBlob) {
      pdfUrl = URL.createObjectURL(book.rawFileBlob);
      book.pdfUrl = pdfUrl;
    }
    if (chapterNameEl) chapterNameEl.textContent = 'Dokumen PDF Lengkap';
    if (pageCounterEl) pageCounterEl.textContent = 'PDF Reader';
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
    if (bodyEl) {
      bodyEl.innerHTML = `
        <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1rem;">
          <iframe src="${pdfUrl}" style="width: 100%; height: 80vh; border: none; border-radius: 8px; background: #fff;" title="PDF Preview"></iframe>
        </div>
      `;
    }
  } else {
    const totalPages = (book.pagesList && book.pagesList.length) || 1;
    const clampedIndex = Math.max(0, Math.min(targetPageIndex, totalPages - 1));
    state.currentPageIndex = clampedIndex;

    const pageItem = book.pagesList ? book.pagesList[clampedIndex] : null;
    const currentChapterIdx = pageItem ? pageItem.chapterIndex : 0;
    state.currentChapterIndex = currentChapterIdx;

    const chapterTitle = pageItem ? pageItem.chapterTitle : (book.chapters?.[0]?.title || 'Bab 1');
    if (chapterNameEl) chapterNameEl.textContent = chapterTitle;

    // Progress bar calculation
    const progressPct = totalPages > 1 ? (clampedIndex / (totalPages - 1)) * 100 : 100;
    if (progressBar) progressBar.style.width = `${Math.min(100, Math.max(0, progressPct))}%`;

    // Jump Input & Page Counter
    if (jumpInput) {
      jumpInput.min = '1';
      jumpInput.max = String(totalPages);
      jumpInput.value = String(clampedIndex + 1);
    }

    if (state.readerMode === 'scroll') {
      // Continuous Scroll Mode: Show full current chapter in clean paper canvas
      const ch = book.chapters?.[currentChapterIdx] || { title: chapterTitle, content: pageItem?.contentHtml || '' };
      const isEn = state.currentLang === 'en';
      const nextCh = book.chapters?.[currentChapterIdx + 1];
      const nextBtnLabel = nextCh
        ? (isEn ? 'Next: ' : 'Bab Berikutnya: ') + escapeHtml(nextCh.title)
        : (isEn ? 'Next Chapter' : 'Bab Berikutnya');
      const prevBtnLabel = isEn ? 'Previous Chapter' : 'Bab Sebelumnya';
      const readPctLabel = `${Math.round(progressPct)}% ${t('reader_completed')}`;
      const readChapLabel = `${isEn ? 'Chapter' : 'Bab'} ${currentChapterIdx + 1} ${isEn ? 'of' : 'dari'} ${book.chapters?.length || 1}`;

      if (pageCounterEl) {
        pageCounterEl.textContent = `${readChapLabel} • ${isEn ? 'Scroll Mode' : 'Mode Gulir'}`;
      }
      if (prevText) prevText.textContent = isEn ? 'Previous' : 'Bab Sebelumnya';
      if (nextText) nextText.textContent = isEn ? 'Next' : 'Bab Berikutnya';
      if (prevBtn) prevBtn.disabled = currentChapterIdx === 0;
      if (nextBtn) nextBtn.disabled = currentChapterIdx >= (book.chapters?.length || 1) - 1;

      if (bodyEl) {
        bodyEl.innerHTML = `
          <article class="reader-paper">
            <div class="reader-eyebrow">
              <span>${escapeHtml(book.title)}</span>
              <span aria-hidden="true">·</span>
              <span>${readChapLabel}</span>
            </div>
            <h1 class="reader-h1">${escapeHtml(ch.title)}</h1>
            <div class="epub-rendered-content">
              ${ch.content || ''}
            </div>
            <nav class="reader-turn-bar" aria-label="Navigasi bab pembaca">
              <button type="button" class="reader-turn-btn" data-turn="prev" ${currentChapterIdx === 0 ? 'disabled' : ''}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m15 18-6-6 6-6"/></svg>
                <span>${prevBtnLabel}</span>
              </button>
              <div class="reader-turn-read-meta">
                <span class="read-pct-badge">${readPctLabel}</span>
                <span class="read-chap-indicator">${readChapLabel}</span>
              </div>
              <button type="button" class="reader-turn-btn reader-turn-btn--primary" data-turn="next" ${currentChapterIdx >= (book.chapters?.length || 1) - 1 ? 'disabled' : ''}>
                <span>${nextBtnLabel}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </nav>
          </article>
        `;
        bodyEl.querySelectorAll('.reader-turn-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            if (btn.dataset.turn === 'prev') goToPrevReaderPage();
            if (btn.dataset.turn === 'next') goToNextReaderPage();
          });
        });
      }
    } else {
      // Clean Page-By-Page Reading Mode in Paper Canvas
      const isEn = state.currentLang === 'en';
      const readPageLabel = `${isEn ? 'Page' : 'Halaman'} ${clampedIndex + 1} ${isEn ? 'of' : 'dari'} ${totalPages}`;
      const prevPageLabel = isEn ? 'Previous Page' : 'Halaman Sebelumnya';
      const isLastPageOfChapter = pageItem && pageItem.pageInChapter === pageItem.totalInChapter;
      const nextCh = book.chapters?.[currentChapterIdx + 1];
      const nextPageLabel = isLastPageOfChapter && nextCh
        ? (isEn ? 'Next: ' : 'Bab Berikutnya: ') + escapeHtml(nextCh.title)
        : (isEn ? 'Next Page' : 'Halaman Berikutnya');
      const readPctLabel = `${Math.round(progressPct)}% ${t('reader_completed')}`;

      if (pageCounterEl) {
        pageCounterEl.textContent = `${readPageLabel} • ${chapterTitle}`;
      }
      if (prevText) prevText.textContent = t('reader_prev');
      if (nextText) nextText.textContent = t('reader_next');
      if (prevBtn) prevBtn.disabled = clampedIndex === 0;
      if (nextBtn) nextBtn.disabled = clampedIndex >= totalPages - 1;

      if (bodyEl && pageItem) {
        bodyEl.innerHTML = `
          <article class="reader-paper">
            <div class="reader-eyebrow">
              <span>${escapeHtml(book.title)}</span>
              <span aria-hidden="true">·</span>
              <span>${readPageLabel}</span>
            </div>
            <h1 class="reader-h1">${escapeHtml(pageItem.chapterTitle)}</h1>
            <div class="epub-rendered-content reader-page-content">
              ${pageItem.contentHtml}
            </div>
            <nav class="reader-turn-bar" aria-label="Navigasi halaman pembaca">
              <button type="button" class="reader-turn-btn" data-turn="prev" ${clampedIndex === 0 ? 'disabled' : ''}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m15 18-6-6 6-6"/></svg>
                <span>${prevPageLabel}</span>
              </button>
              <div class="reader-turn-read-meta">
                <span class="read-pct-badge">${readPctLabel}</span>
                <span class="read-chap-indicator">${isEn ? 'Page' : 'Hal.'} ${clampedIndex + 1}/${totalPages}</span>
              </div>
              <button type="button" class="reader-turn-btn reader-turn-btn--primary" data-turn="next" ${clampedIndex >= totalPages - 1 ? 'disabled' : ''}>
                <span>${nextPageLabel}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </nav>
          </article>
        `;
        bodyEl.querySelectorAll('.reader-turn-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            if (btn.dataset.turn === 'prev') goToPrevReaderPage();
            if (btn.dataset.turn === 'next') goToNextReaderPage();
          });
        });
      }
    }

    // Populate Table of Contents Drawer with Two-Tier Hierarchy
    if (tocListEl && book.toc) {
      tocListEl.innerHTML = book.toc
        .map((item) => {
          const isCurrentCh = item.chapterIndex === currentChapterIdx;
          const depth = item.depth || 1;
          return `
            <div class="reader-toc-item ${isCurrentCh ? 'active' : ''}" data-depth="${depth}" data-toc-page="${item.startPageIndex}">
              <span class="reader-toc-item-title">${escapeHtml(item.title)}</span>
              <span class="reader-toc-page-badge">${state.currentLang === 'en' ? 'Page' : 'Hal.'} ${item.startPageIndex + 1}</span>
            </div>
          `;
        })
        .join('');

      tocListEl.querySelectorAll('.reader-toc-item').forEach((el) => {
        el.addEventListener('click', () => {
          const targetP = parseInt(el.dataset.tocPage, 10);
          if (!isNaN(targetP)) {
            openReaderModal(book, targetP);
            const drawer = document.getElementById('reader-toc-drawer');
            if (drawer) drawer.hidden = true;
            tocBtn?.classList.remove('active');
          }
        });
      });
    }
  }

  if (bodyEl) bodyEl.scrollTop = 0;
  modal.style.setProperty('display', 'flex', 'important');
  modal.classList.add('active');
  modal.hidden = false;
  modal.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';

  // Mark book as currently reading in shelf
  addOrUpdateShelfStatus(book, 'reading');
  showToast(`Membuka "${book.title}" di pembaca kosmik`, '📖');
}

export function closeReaderModal() {
  const modal = document.getElementById('reader-modal');
  const tocDrawer = document.getElementById('reader-toc-drawer');
  const tocBtn = document.getElementById('reader-toc-btn');

  if (tocDrawer) tocDrawer.hidden = true;
  if (tocBtn) tocBtn.classList.remove('active');

  if (modal) {
    modal.style.setProperty('display', 'none', 'important');
    modal.classList.remove('active');
    modal.hidden = true;
    modal.setAttribute('hidden', '');
  }
  document.body.style.overflow = '';
}

export function setupReaderControls() {
  const modal = document.getElementById('reader-modal');
  const bodyEl = document.getElementById('reader-body-content');
  const progressBar = document.getElementById('reader-progress-bar');
  const closeBtn = document.getElementById('reader-close-btn');
  const fontDec = document.getElementById('reader-font-dec');
  const fontInc = document.getElementById('reader-font-inc');
  const fontFamBtn = document.getElementById('reader-font-family-btn');
  const prevBtn = document.getElementById('reader-prev-chapter');
  const nextBtn = document.getElementById('reader-next-chapter');
  const tocBtn = document.getElementById('reader-toc-btn');
  const tocDrawer = document.getElementById('reader-toc-drawer');
  const tocCloseBtn = document.getElementById('reader-toc-close-btn');
  const modeBtn = document.getElementById('reader-mode-btn');
  const jumpInput = document.getElementById('reader-jump-input');
  const expandBtn = document.getElementById('reader-expand-btn');
  const container = document.getElementById('reader-container');
  const expandIcon = document.getElementById('reader-expand-icon');
  const compressIcon = document.getElementById('reader-compress-icon');

  // Restore expanded state if user previously maximized reader canvas
  const isInitiallyExpanded = localStorage.getItem('libroverse_reader_expanded') === 'true';
  if (isInitiallyExpanded) {
    modal?.classList.add('is-expanded');
    container?.classList.add('is-expanded');
    if (expandIcon) expandIcon.hidden = true;
    if (compressIcon) compressIcon.hidden = false;
  }

  expandBtn?.addEventListener('click', () => {
    const isNowExpanded = container?.classList.toggle('is-expanded');
    modal?.classList.toggle('is-expanded', isNowExpanded);
    if (expandIcon) expandIcon.hidden = isNowExpanded;
    if (compressIcon) compressIcon.hidden = !isNowExpanded;
    localStorage.setItem('libroverse_reader_expanded', String(isNowExpanded));
    showToast(
      isNowExpanded ? 'Mode Layar Penuh diaktifkan' : 'Mode Layar Normal aktif',
      isNowExpanded ? '⛶' : '📖'
    );
  });

  closeBtn?.addEventListener('click', closeReaderModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeReaderModal();
  });

  // Table of Contents Drawer Toggle
  tocBtn?.addEventListener('click', () => {
    if (tocDrawer) {
      const willShow = tocDrawer.hidden;
      tocDrawer.hidden = !willShow;
      tocBtn.classList.toggle('active', willShow);
    }
  });

  tocCloseBtn?.addEventListener('click', () => {
    if (tocDrawer) {
      tocDrawer.hidden = true;
      tocBtn?.classList.remove('active');
    }
  });

  // Reading Mode Toggle
  modeBtn?.addEventListener('click', () => {
    state.readerMode = state.readerMode === 'page' ? 'scroll' : 'page';
    localStorage.setItem(STORAGE_KEYS.READER_MODE, state.readerMode);
    if (state.currentReadingBook) {
      openReaderModal(state.currentReadingBook, state.currentPageIndex);
    }
    showToast(
      state.readerMode === 'page' ? 'Mode Halaman Buku aktif' : 'Mode Gulir Dokumen aktif',
      state.readerMode === 'page' ? '📖' : '📜'
    );
  });

  // Jump to Page Input
  function handleJump() {
    if (!state.currentReadingBook || !state.currentReadingBook.pagesList) return;
    const target = parseInt(jumpInput?.value, 10);
    const total = state.currentReadingBook.pagesList.length;
    if (!isNaN(target) && target >= 1 && target <= total) {
      openReaderModal(state.currentReadingBook, target - 1);
    } else if (jumpInput) {
      jumpInput.value = String(state.currentPageIndex + 1);
    }
  }

  jumpInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleJump();
    }
  });
  jumpInput?.addEventListener('change', handleJump);

  // Track scroll progress in Scroll Mode
  bodyEl?.addEventListener('scroll', () => {
    if (state.readerMode === 'scroll') {
      const total = bodyEl.scrollHeight - bodyEl.clientHeight;
      const current = bodyEl.scrollTop;
      const pct = total > 0 ? (current / total) * 100 : 0;
      if (progressBar) progressBar.style.width = `${pct}%`;
    }
  });

  // Font sizing
  fontDec?.addEventListener('click', () => {
    if (state.readerFontSize > 14) {
      state.readerFontSize -= 2;
      localStorage.setItem(STORAGE_KEYS.READER_FONT_SIZE, state.readerFontSize);
      bodyEl.style.fontSize = `${state.readerFontSize}px`;
      document.getElementById('reader-font-val').textContent = `${state.readerFontSize}px`;
    }
  });

  fontInc?.addEventListener('click', () => {
    if (state.readerFontSize < 28) {
      state.readerFontSize += 2;
      localStorage.setItem(STORAGE_KEYS.READER_FONT_SIZE, state.readerFontSize);
      bodyEl.style.fontSize = `${state.readerFontSize}px`;
      document.getElementById('reader-font-val').textContent = `${state.readerFontSize}px`;
    }
  });

  // Font Family
  fontFamBtn?.addEventListener('click', () => {
    state.readerFontFamily = state.readerFontFamily === 'serif' ? 'sans' : 'serif';
    localStorage.setItem(STORAGE_KEYS.READER_FONT_FAMILY, state.readerFontFamily);
    bodyEl.setAttribute('data-family', state.readerFontFamily);
    document.getElementById('font-family-label').textContent =
      state.readerFontFamily === 'serif' ? 'Serif' : 'Sans';
  });

  // Theme switches
  document.querySelectorAll('.reader-theme-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.readerTheme = btn.dataset.theme;
      localStorage.setItem(STORAGE_KEYS.READER_THEME, state.readerTheme);
      document.getElementById('reader-container').setAttribute('data-theme', state.readerTheme);
      document.querySelectorAll('.reader-theme-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Previous & Next navigation
  prevBtn?.addEventListener('click', goToPrevReaderPage);
  nextBtn?.addEventListener('click', goToNextReaderPage);

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    const readerModal = document.getElementById('reader-modal');
    if (!readerModal || readerModal.hidden || readerModal.style.display === 'none') return;
    if (document.activeElement === jumpInput) return;

    if (e.key === 'ArrowRight' || e.key === 'PageDown') {
      e.preventDefault();
      goToNextReaderPage();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      goToPrevReaderPage();
    }
  });

  // Mobile Touch Swipe Gesture for Natural Page Turning
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;

  bodyEl?.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    }
  }, { passive: true });

  bodyEl?.addEventListener('touchend', (e) => {
    if (e.changedTouches && e.changedTouches.length === 1 && state.readerMode === 'page') {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const diffX = touchEndX - touchStartX;
      const diffY = touchEndY - touchStartY;
      const duration = Date.now() - touchStartTime;

      // Swiped at least 45px horizontally and gesture was faster than 550ms
      if (duration < 550 && Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY) * 1.3) {
        if (diffX < 0) {
          goToNextReaderPage();
        } else {
          goToPrevReaderPage();
        }
      }
    }
  }, { passive: true });
}
