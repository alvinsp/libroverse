import { state } from '../../core/state.js';
import { STORAGE_KEYS } from '../../core/constants.js';
import { t } from '../../services/i18n/i18n.js';
import { escapeHtml } from '../../utils/domUtils.js';
import { showToast } from '../../utils/toast.js';
import { buildBookPages } from '../../services/parser/paginator.js';
import { addOrUpdateShelfStatus } from '../../services/storage/shelfStorage.js';

// ============================================================================
// ZOOM MANAGEMENT (50% to 150%)
// ============================================================================
export function applyReaderZoom(zoomLevel, showNotice = false) {
  // Clamped between 0.50 (50%) and 1.50 (150%)
  const clampedZoom = Math.min(1.5, Math.max(0.5, Math.round(zoomLevel * 100) / 100));
  state.readerZoom = clampedZoom;
  localStorage.setItem(STORAGE_KEYS.READER_ZOOM, String(clampedZoom));

  const container = document.getElementById('reader-container');
  const bodyEl = document.getElementById('reader-body-content');
  const zoomValBtn = document.getElementById('reader-zoom-val');
  const quickZoom50 = document.getElementById('reader-quick-zoom-50');

  if (container) {
    container.style.setProperty('--reader-zoom', String(clampedZoom));
    container.classList.toggle('is-zoomed-out', clampedZoom <= 0.75);
  }
  if (bodyEl) {
    bodyEl.style.setProperty('--reader-zoom', String(clampedZoom));
  }
  if (zoomValBtn) {
    zoomValBtn.textContent = `${Math.round(clampedZoom * 100)}%`;
  }
  if (quickZoom50) {
    quickZoom50.classList.toggle('active', Math.abs(clampedZoom - 0.5) < 0.05);
  }

  if (showNotice) {
    showToast(
      Math.abs(clampedZoom - 0.5) < 0.05
        ? 'Zoom 50% diaktifkan (Mode Ringkas Layar HP) 🔍'
        : `Zoom Pembaca: ${Math.round(clampedZoom * 100)}%`,
      '🔍'
    );
  }
}

// ============================================================================
// BOOKMARK SYSTEM
// ============================================================================
export function isCurrentPageBookmarked() {
  if (!state.currentReadingBook) return false;
  return state.bookmarks.some(
    (b) => b.bookId === state.currentReadingBook.id && b.pageIndex === state.currentPageIndex
  );
}

export function updateBookmarkUI() {
  const bookmarkBtn = document.getElementById('reader-bookmark-btn');
  const icon = document.getElementById('reader-bookmark-icon');
  const countEl = document.getElementById('reader-bookmark-count');
  const isBookmarked = isCurrentPageBookmarked();

  if (bookmarkBtn) {
    bookmarkBtn.classList.toggle('active', isBookmarked);
  }
  if (icon) {
    icon.textContent = isBookmarked ? '★' : '🔖';
  }
  if (countEl && state.currentReadingBook) {
    const bookBookmarks = state.bookmarks.filter((b) => b.bookId === state.currentReadingBook.id);
    countEl.textContent = String(bookBookmarks.length);
  }
}

export function toggleCurrentPageBookmark() {
  if (!state.currentReadingBook) return;
  const book = state.currentReadingBook;
  const pageIdx = state.currentPageIndex;
  const existingIdx = state.bookmarks.findIndex(
    (b) => b.bookId === book.id && b.pageIndex === pageIdx
  );

  if (existingIdx > -1) {
    state.bookmarks.splice(existingIdx, 1);
    showToast(t('reader_bookmark_removed'), '🗑️');
  } else {
    const pageItem = book.pagesList ? book.pagesList[pageIdx] : null;
    const chTitle = pageItem ? pageItem.chapterTitle : (book.chapters?.[state.currentChapterIndex]?.title || 'Bab 1');
    const excerpt = pageItem?.contentHtml
      ? pageItem.contentHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 95) + '...'
      : `Halaman ${pageIdx + 1}`;

    state.bookmarks.push({
      id: `bm_${Date.now()}`,
      bookId: book.id,
      bookTitle: book.title,
      pageIndex: pageIdx,
      chapterIndex: state.currentChapterIndex,
      chapterTitle: chTitle,
      excerpt: excerpt,
      createdAt: new Date().toISOString()
    });
    showToast(t('reader_bookmark_added'), '⭐');
  }

  localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(state.bookmarks));
  updateBookmarkUI();
  renderBookmarksList();
}

export function renderBookmarksList() {
  const listEl = document.getElementById('reader-bookmarks-list');
  if (!listEl || !state.currentReadingBook) return;

  const bookBookmarks = state.bookmarks.filter((b) => b.bookId === state.currentReadingBook.id);
  if (bookBookmarks.length === 0) {
    listEl.innerHTML = `
      <div class="reader-empty-state">
        <span class="empty-icon">🔖</span>
        <p>${t('reader_no_bookmarks')}</p>
      </div>
    `;
    return;
  }

  listEl.innerHTML = bookBookmarks
    .map(
      (bm) => `
      <div class="reader-bookmark-item" data-page="${bm.pageIndex}">
        <div class="reader-bookmark-info">
          <div class="reader-bookmark-title">
            <span class="bookmark-icon">★</span>
            <span class="bookmark-chapter">${escapeHtml(bm.chapterTitle)}</span>
            <span class="reader-toc-page-badge">${state.currentLang === 'en' ? 'Page' : 'Hal.'} ${bm.pageIndex + 1}</span>
          </div>
          <p class="reader-bookmark-snippet">"${escapeHtml(bm.excerpt)}"</p>
        </div>
        <button type="button" class="reader-bookmark-del-btn" data-bm-id="${bm.id}" title="Hapus Bookmark">✕</button>
      </div>
    `
    )
    .join('');

  listEl.querySelectorAll('.reader-bookmark-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.reader-bookmark-del-btn')) return;
      const targetP = parseInt(item.dataset.page, 10);
      if (!isNaN(targetP)) {
        openReaderModal(state.currentReadingBook, targetP);
        const drawer = document.getElementById('reader-toc-drawer');
        if (drawer) drawer.hidden = true;
        document.getElementById('reader-toc-btn')?.classList.remove('active');
      }
    });
  });

  listEl.querySelectorAll('.reader-bookmark-del-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const bmId = btn.dataset.bmId;
      state.bookmarks = state.bookmarks.filter((b) => b.id !== bmId);
      localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(state.bookmarks));
      updateBookmarkUI();
      renderBookmarksList();
      showToast(t('reader_bookmark_removed'), '🗑️');
    });
  });
}

// ============================================================================
// IN-READER SEARCH SYSTEM
// ============================================================================
export function clearSearchHighlights() {
  const bodyEl = document.getElementById('reader-body-content');
  if (!bodyEl) return;
  bodyEl.querySelectorAll('mark.reader-search-highlight').forEach((mark) => {
    const parent = mark.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(mark.textContent), mark);
      parent.normalize();
    }
  });
}

export function applySearchHighlightOnCurrentPage() {
  clearSearchHighlights();
  if (!state.readerSearchQuery) return;

  const contentEl = document.querySelector('.epub-rendered-content');
  if (!contentEl) return;

  const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT, null, false);
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    textNodes.push(node);
  }

  const query = state.readerSearchQuery;
  let firstMark = null;

  textNodes.forEach((textNode) => {
    const text = textNode.nodeValue;
    const lower = text.toLowerCase();
    const idx = lower.indexOf(query);
    if (idx !== -1) {
      const parent = textNode.parentNode;
      if (!parent || parent.nodeName === 'SCRIPT' || parent.nodeName === 'STYLE' || parent.nodeName === 'MARK') return;
      const frag = document.createDocumentFragment();
      let lastIdx = 0;
      let cur = idx;
      while (cur !== -1) {
        frag.appendChild(document.createTextNode(text.substring(lastIdx, cur)));
        const mark = document.createElement('mark');
        mark.className = 'reader-search-highlight';
        mark.textContent = text.substring(cur, cur + query.length);
        if (!firstMark) firstMark = mark;
        frag.appendChild(mark);
        lastIdx = cur + query.length;
        cur = lower.indexOf(query, lastIdx);
      }
      frag.appendChild(document.createTextNode(text.substring(lastIdx)));
      parent.replaceChild(frag, textNode);
    }
  });

  const allHighlights = contentEl.querySelectorAll('mark.reader-search-highlight');
  allHighlights.forEach((h, i) => {
    h.classList.toggle('reader-search-highlight--active', i === 0);
  });
  if (allHighlights[0]) {
    allHighlights[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

export function jumpToSearchResult(index) {
  if (index < 0 || index >= state.readerSearchResults.length) return;
  state.currentSearchResultIndex = index;
  const target = state.readerSearchResults[index];
  const searchStats = document.getElementById('reader-search-stats');

  if (searchStats) {
    searchStats.textContent = `${index + 1} / ${state.readerSearchResults.length}`;
  }

  if (target.pageIndex !== state.currentPageIndex) {
    openReaderModal(state.currentReadingBook, target.pageIndex);
  } else {
    applySearchHighlightOnCurrentPage();
  }
}

export function performInReaderSearch(query) {
  state.readerSearchQuery = query.trim().toLowerCase();
  const searchStats = document.getElementById('reader-search-stats');
  const prevBtn = document.getElementById('reader-search-prev-btn');
  const nextBtn = document.getElementById('reader-search-next-btn');
  const book = state.currentReadingBook;

  if (!query || !book || !book.pagesList) {
    state.readerSearchResults = [];
    state.currentSearchResultIndex = -1;
    if (searchStats) searchStats.textContent = '0/0';
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
    clearSearchHighlights();
    return;
  }

  // Scan all pages for matches
  const results = [];
  book.pagesList.forEach((page, pIdx) => {
    const text = page.contentHtml ? page.contentHtml.replace(/<[^>]+>/g, ' ') : '';
    let matchIdx = text.toLowerCase().indexOf(state.readerSearchQuery);
    while (matchIdx !== -1) {
      results.push({ pageIndex: pIdx, matchOffset: matchIdx });
      matchIdx = text.toLowerCase().indexOf(state.readerSearchQuery, matchIdx + state.readerSearchQuery.length);
    }
  });

  state.readerSearchResults = results;
  if (results.length > 0) {
    let startIdx = results.findIndex((r) => r.pageIndex >= state.currentPageIndex);
    if (startIdx === -1) startIdx = 0;
    state.currentSearchResultIndex = startIdx;
    if (prevBtn) prevBtn.disabled = false;
    if (nextBtn) nextBtn.disabled = false;
    jumpToSearchResult(startIdx);
  } else {
    state.currentSearchResultIndex = -1;
    if (searchStats) searchStats.textContent = t('reader_search_not_found');
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
    clearSearchHighlights();
  }
}

// ============================================================================
// LABELS & PAGE TURNING
// ============================================================================
export function updateReaderLabels() {
  const modeLabel = document.getElementById('reader-mode-label');
  if (modeLabel) {
    modeLabel.textContent = state.readerMode === 'scroll' ? t('reader_mode_scroll') : t('reader_mode_pages');
  }
  const prevText = document.getElementById('reader-prev-btn-text');
  if (prevText) prevText.textContent = t('reader_prev');
  const nextText = document.getElementById('reader-next-btn-text');
  if (nextText) nextText.textContent = t('reader_next');

  const searchInput = document.getElementById('reader-search-input');
  if (searchInput) searchInput.placeholder = t('reader_search_ph');

  updateBookmarkUI();
  renderBookmarksList();
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

// ============================================================================
// MAIN READER MODAL OPEN
// ============================================================================
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

  // Apply zoom preference (allows down to 50%)
  applyReaderZoom(state.readerZoom || 1.0);

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
        <div class="reader-pdf-container">
          <div class="reader-pdf-actions">
            <a href="${pdfUrl}" target="_blank" rel="noopener noreferrer" class="reader-pdf-btn">
              <span>${t('pdf_open_new_tab')}</span>
            </a>
            <a href="${pdfUrl}" download="${escapeHtml(book.title)}.pdf" class="reader-pdf-btn reader-pdf-btn--primary">
              <span>${t('pdf_download')}</span>
            </a>
          </div>
          <div class="reader-pdf-frame-wrap">
            <iframe src="${pdfUrl}" class="reader-pdf-iframe" title="PDF Preview"></iframe>
          </div>
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
          <article class="reader-paper ${pageItem.pageInChapter > 1 ? 'is-continuation-page' : ''}">
            <div class="reader-eyebrow">
              <span>${escapeHtml(pageItem.pageInChapter > 1 ? pageItem.chapterTitle : book.title)}</span>
              <span aria-hidden="true">·</span>
              <span>${readPageLabel}</span>
            </div>
            ${pageItem.pageInChapter === 1 ? `<h1 class="reader-h1">${escapeHtml(pageItem.chapterTitle)}</h1>` : ''}
            <div class="epub-rendered-content reader-page-content ${pageItem.pageInChapter > 1 ? 'is-continuation-content' : ''}">
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

  // Update Bookmark UI
  updateBookmarkUI();
  renderBookmarksList();

  // Re-apply search highlight if searching
  if (state.readerSearchQuery) {
    applySearchHighlightOnCurrentPage();
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
  const searchBar = document.getElementById('reader-search-bar');
  const searchBtn = document.getElementById('reader-search-btn');

  if (tocDrawer) tocDrawer.hidden = true;
  if (tocBtn) tocBtn.classList.remove('active');
  if (searchBar) searchBar.hidden = true;
  if (searchBtn) searchBtn.classList.remove('active');

  clearSearchHighlights();

  if (modal) {
    modal.style.setProperty('display', 'none', 'important');
    modal.classList.remove('active');
    modal.hidden = true;
    modal.setAttribute('hidden', '');
  }
  document.body.style.overflow = '';
}

// ============================================================================
// SETUP CONTROLS & LISTENERS
// ============================================================================
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

  // Zoom controls
  const zoomDec = document.getElementById('reader-zoom-dec');
  const zoomInc = document.getElementById('reader-zoom-inc');
  const zoomVal = document.getElementById('reader-zoom-val');
  const quickZoom50 = document.getElementById('reader-quick-zoom-50');

  // Bookmark controls
  const bookmarkBtn = document.getElementById('reader-bookmark-btn');
  const tabChapters = document.getElementById('reader-toc-tab-chapters');
  const tabBookmarks = document.getElementById('reader-toc-tab-bookmarks');
  const tocList = document.getElementById('reader-toc-list');
  const bookmarksList = document.getElementById('reader-bookmarks-list');

  // Search controls
  const searchBtn = document.getElementById('reader-search-btn');
  const searchBar = document.getElementById('reader-search-bar');
  const searchInput = document.getElementById('reader-search-input');
  const searchPrevBtn = document.getElementById('reader-search-prev-btn');
  const searchNextBtn = document.getElementById('reader-search-next-btn');
  const searchCloseBtn = document.getElementById('reader-search-close-btn');

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
      if (willShow) {
        renderBookmarksList();
      }
    }
  });

  tocCloseBtn?.addEventListener('click', () => {
    if (tocDrawer) {
      tocDrawer.hidden = true;
      tocBtn?.classList.remove('active');
    }
  });

  // Drawer Tabs switching (Chapters vs Bookmarks)
  tabChapters?.addEventListener('click', () => {
    tabChapters.classList.add('active');
    tabBookmarks?.classList.remove('active');
    if (tocList) tocList.hidden = false;
    if (bookmarksList) bookmarksList.hidden = true;
  });

  tabBookmarks?.addEventListener('click', () => {
    tabBookmarks.classList.add('active');
    tabChapters?.classList.remove('active');
    if (tocList) tocList.hidden = true;
    if (bookmarksList) {
      bookmarksList.hidden = false;
      renderBookmarksList();
    }
  });

  // Bookmark Toggle Button
  bookmarkBtn?.addEventListener('click', toggleCurrentPageBookmark);

  // Zoom Controllers (down to 50%!)
  zoomDec?.addEventListener('click', () => {
    applyReaderZoom(state.readerZoom - 0.15, true);
  });

  zoomInc?.addEventListener('click', () => {
    applyReaderZoom(state.readerZoom + 0.15, true);
  });

  zoomVal?.addEventListener('click', () => {
    // Toggle between 100% and 50%
    const nextZoom = Math.abs(state.readerZoom - 1.0) < 0.05 ? 0.50 : 1.0;
    applyReaderZoom(nextZoom, true);
  });

  quickZoom50?.addEventListener('click', () => {
    // Quick Mobile 50% Zoom Toggle
    const nextZoom = Math.abs(state.readerZoom - 0.50) < 0.05 ? 1.0 : 0.50;
    applyReaderZoom(nextZoom, true);
  });

  // In-Reader Search Listeners
  searchBtn?.addEventListener('click', () => {
    if (!searchBar) return;
    const willShow = searchBar.hidden;
    searchBar.hidden = !willShow;
    searchBtn.classList.toggle('active', willShow);
    if (willShow) {
      searchInput?.focus();
      if (searchInput && searchInput.value) {
        performInReaderSearch(searchInput.value);
      }
    } else {
      clearSearchHighlights();
    }
  });

  searchCloseBtn?.addEventListener('click', () => {
    if (searchBar) searchBar.hidden = true;
    searchBtn?.classList.remove('active');
    if (searchInput) searchInput.value = '';
    clearSearchHighlights();
    state.readerSearchQuery = '';
    state.readerSearchResults = [];
    state.currentSearchResultIndex = -1;
  });

  let searchTimeout = null;
  searchInput?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      performInReaderSearch(e.target.value);
    }, 220);
  });

  searchPrevBtn?.addEventListener('click', () => {
    if (state.readerSearchResults.length > 0) {
      const prevIdx =
        (state.currentSearchResultIndex - 1 + state.readerSearchResults.length) %
        state.readerSearchResults.length;
      jumpToSearchResult(prevIdx);
    }
  });

  searchNextBtn?.addEventListener('click', () => {
    if (state.readerSearchResults.length > 0) {
      const nextIdx = (state.currentSearchResultIndex + 1) % state.readerSearchResults.length;
      jumpToSearchResult(nextIdx);
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
    if (document.activeElement === jumpInput || document.activeElement === searchInput) {
      if (e.key === 'Escape' && document.activeElement === searchInput) {
        if (searchBar) searchBar.hidden = true;
        searchBtn?.classList.remove('active');
      }
      return;
    }

    if (e.key === 'ArrowRight' || e.key === 'PageDown') {
      e.preventDefault();
      goToNextReaderPage();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      goToPrevReaderPage();
    } else if (e.key === 'Escape') {
      closeReaderModal();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      searchBtn?.click();
    }
  });

  // Mobile Touch Gestures: Single finger for Page Turning, Two fingers for Pinch-to-Zoom (50% to 150%)
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;
  let isPinching = false;
  let initialPinchDistance = 0;
  let initialPinchZoom = 1.0;

  bodyEl?.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches.length === 2) {
      isPinching = true;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      initialPinchDistance = Math.hypot(dx, dy);
      initialPinchZoom = state.readerZoom || 1.0;
    } else if (e.touches && e.touches.length === 1) {
      isPinching = false;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    }
  }, { passive: true });

  bodyEl?.addEventListener('touchmove', (e) => {
    if (isPinching && e.touches && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      if (initialPinchDistance > 10) {
        const factor = currentDist / initialPinchDistance;
        const targetZoom = Math.min(1.5, Math.max(0.5, Math.round(initialPinchZoom * factor * 100) / 100));
        applyReaderZoom(targetZoom);
      }
    }
  }, { passive: true });

  bodyEl?.addEventListener('touchend', (e) => {
    if (isPinching && (!e.touches || e.touches.length < 2)) {
      isPinching = false;
      applyReaderZoom(state.readerZoom, true);
      return;
    }

    if (!isPinching && e.changedTouches && e.changedTouches.length === 1 && state.readerMode === 'page') {
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
