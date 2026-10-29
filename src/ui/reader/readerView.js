import { state } from '../../core/state.js';
import { STORAGE_KEYS } from '../../core/constants.js';
import { t } from '../../services/i18n/i18n.js';
import { escapeHtml } from '../../utils/domUtils.js';
import { showToast } from '../../utils/toast.js';
import { buildBookPages } from '../../services/parser/paginator.js';
import { addOrUpdateShelfStatus } from '../../services/storage/shelfStorage.js';
import {
  saveHighlight,
  deleteHighlight,
  updateHighlightNote,
  updateHighlightColor,
  getHighlightsForBook,
  updateHighlightsBadge
} from '../../services/storage/highlightStorage.js';

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
// BOOKMARK SYSTEM (RIBON, DRAWER, PERSISTENCE)
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
  const tocCountEl = document.getElementById('reader-toc-bookmark-count');
  const ribbon = document.getElementById('reader-corner-ribbon');
  const isBookmarked = isCurrentPageBookmarked();

  if (bookmarkBtn) {
    bookmarkBtn.classList.toggle('active', isBookmarked);
  }
  if (icon) {
    icon.textContent = isBookmarked ? '★' : '🔖';
  }
  if (ribbon) {
    ribbon.classList.toggle('active', isBookmarked);
    const ribbonIcon = ribbon.querySelector('.ribbon-icon');
    if (ribbonIcon) ribbonIcon.textContent = isBookmarked ? '★' : '🔖';
    ribbon.title = isBookmarked ? 'Halaman ini telah ditandai' : 'Tandai halaman ini (Bookmark)';
  }

  if (state.currentReadingBook) {
    const bookBookmarks = state.bookmarks.filter((b) => b.bookId === state.currentReadingBook.id);
    if (countEl) countEl.textContent = String(bookBookmarks.length);
    if (tocCountEl) tocCountEl.textContent = String(bookBookmarks.length);
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
    showToast(t('reader_bookmark_added') + ` (Halaman ${pageIdx + 1})`, '⭐');
  }

  localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(state.bookmarks));
  updateBookmarkUI();
  renderBookmarksList();
}

export function openBookmarksDrawer() {
  const drawer = document.getElementById('reader-bookmarks-drawer');
  const tocDrawer = document.getElementById('reader-toc-drawer');
  if (tocDrawer) tocDrawer.hidden = true;
  document.getElementById('reader-toc-btn')?.classList.remove('active');

  if (drawer) {
    drawer.hidden = false;
    renderBookmarksList();
  }
}

export function closeBookmarksDrawer() {
  const drawer = document.getElementById('reader-bookmarks-drawer');
  if (drawer) drawer.hidden = true;
}

export function renderBookmarksList() {
  const listContainers = [
    document.getElementById('reader-bookmarks-modal-list'),
    document.getElementById('reader-bookmarks-list')
  ].filter(Boolean);

  if (listContainers.length === 0 || !state.currentReadingBook) return;

  const bookBookmarks = state.bookmarks.filter((b) => b.bookId === state.currentReadingBook.id);

  listContainers.forEach((listEl) => {
    if (bookBookmarks.length === 0) {
      listEl.innerHTML = `
        <div class="reader-empty-state">
          <span class="empty-icon">🔖</span>
          <p>${t('reader_no_bookmarks')}</p>
          <span style="font-size: 0.75rem; opacity: 0.7;">Tekan tombol "🔖 Tandai" di atas atau pita sudut halaman untuk menyimpan halaman favoritmu.</span>
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
          closeBookmarksDrawer();
          const tocDrawer = document.getElementById('reader-toc-drawer');
          if (tocDrawer) tocDrawer.hidden = true;
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
  });
}

// ============================================================================
// HIGHLIGHTS & NOTES SYSTEM
// ============================================================================
let activeSelectionRange = null;
let activeSelectedText = '';
let activeModalHighlight = null;
let activeModalColor = 'gold';
let activeNotesTab = 'all';

export function highlightTextInContainer(container, highlight) {
  if (!container || !highlight || !highlight.text) return false;
  if (container.querySelector(`[data-highlight-id="${highlight.id}"]`)) return true;

  const targetText = highlight.text.trim();
  if (targetText.length < 2) return false;

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    if (node.parentElement?.closest('.reader-highlight, .reader-highlight-note-badge, button, nav')) continue;
    textNodes.push(node);
  }

  // Exact match within single text node
  for (const tNode of textNodes) {
    const content = tNode.nodeValue || '';
    const idx = content.indexOf(targetText);
    if (idx !== -1) {
      const before = content.substring(0, idx);
      const matched = content.substring(idx, idx + targetText.length);
      const after = content.substring(idx + targetText.length);

      const mark = document.createElement('mark');
      mark.className = `reader-highlight reader-highlight--${highlight.color || 'gold'} ${highlight.note ? 'has-note' : ''}`;
      mark.dataset.highlightId = highlight.id;
      mark.textContent = matched;

      if (highlight.note) {
        const badge = document.createElement('span');
        badge.className = 'reader-highlight-note-badge';
        badge.textContent = '💬';
        badge.title = 'Lihat Catatan';
        mark.appendChild(badge);
      }

      const parent = tNode.parentNode;
      if (after) parent.insertBefore(document.createTextNode(after), tNode.nextSibling);
      parent.insertBefore(mark, tNode.nextSibling);
      tNode.nodeValue = before;
      return true;
    }
  }

  // Whitespace-normalized fallback
  const normTarget = targetText.replace(/\s+/g, ' ').toLowerCase();
  for (const tNode of textNodes) {
    const content = tNode.nodeValue || '';
    const normContent = content.replace(/\s+/g, ' ').toLowerCase();
    const idx = normContent.indexOf(normTarget);
    if (idx !== -1) {
      const mark = document.createElement('mark');
      mark.className = `reader-highlight reader-highlight--${highlight.color || 'gold'} ${highlight.note ? 'has-note' : ''}`;
      mark.dataset.highlightId = highlight.id;
      mark.textContent = content.substring(idx, idx + targetText.length);

      if (highlight.note) {
        const badge = document.createElement('span');
        badge.className = 'reader-highlight-note-badge';
        badge.textContent = '💬';
        badge.title = 'Lihat Catatan';
        mark.appendChild(badge);
      }

      const before = content.substring(0, idx);
      const after = content.substring(idx + targetText.length);
      const parent = tNode.parentNode;
      if (after) parent.insertBefore(document.createTextNode(after), tNode.nextSibling);
      parent.insertBefore(mark, tNode.nextSibling);
      tNode.nodeValue = before;
      return true;
    }
  }

  return false;
}

export function applyHighlightsOnCurrentPage() {
  if (!state.currentReadingBook) return;
  const bookId = state.currentReadingBook.id;
  const pageIdx = state.currentPageIndex;
  const chapterIdx = state.currentChapterIndex;

  const bookHighlights = getHighlightsForBook(bookId);
  const relevantHighlights = bookHighlights.filter((h) => {
    if (state.readerMode === 'scroll') {
      return h.chapterIndex === chapterIdx;
    }
    return h.pageIndex === pageIdx || h.chapterIndex === chapterIdx;
  });

  const contentWrap = document.querySelector('#reader-body-content .epub-rendered-content');
  if (!contentWrap || relevantHighlights.length === 0) return;

  relevantHighlights.forEach((hl) => {
    highlightTextInContainer(contentWrap, hl);
  });

  // Attach click listener to each mark element
  contentWrap.querySelectorAll('.reader-highlight').forEach((mark) => {
    mark.addEventListener('click', (e) => {
      e.stopPropagation();
      const hlId = mark.dataset.highlightId;
      const found = state.highlights.find((h) => h.id === hlId);
      if (found) {
        openNoteModal(found, false);
      }
    });
  });
}

export function showSelectionToolbar(rect) {
  const toolbar = document.getElementById('reader-selection-toolbar');
  const container = document.getElementById('reader-container');
  if (!toolbar || !container) return;

  const contRect = container.getBoundingClientRect();
  toolbar.hidden = false;

  const toolbarWidth = 260;
  const toolbarHeight = 44;
  let top = rect.top - contRect.top - toolbarHeight - 12;
  let left = rect.left - contRect.left + (rect.width / 2) - (toolbarWidth / 2);

  if (top < 10) {
    top = rect.bottom - contRect.top + 10;
  }
  left = Math.max(10, Math.min(contRect.width - toolbarWidth - 10, left));

  toolbar.style.top = `${Math.round(top)}px`;
  toolbar.style.left = `${Math.round(left)}px`;
}

export function hideSelectionToolbar() {
  const toolbar = document.getElementById('reader-selection-toolbar');
  if (toolbar) toolbar.hidden = true;
  activeSelectionRange = null;
  activeSelectedText = '';
}

export function applyHighlightFromSelection(color = 'gold') {
  if (!activeSelectedText || !state.currentReadingBook) return;

  const chapterTitle =
    state.currentReadingBook.pagesList?.[state.currentPageIndex]?.chapterTitle ||
    state.currentReadingBook.chapters?.[state.currentChapterIndex]?.title ||
    'Bab 1';

  const newHighlight = {
    id: 'hl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    bookId: state.currentReadingBook.id,
    chapterIndex: state.currentChapterIndex,
    pageIndex: state.currentPageIndex,
    chapterTitle: chapterTitle,
    text: activeSelectedText,
    color: color,
    note: '',
    createdAt: new Date().toISOString()
  };

  saveHighlight(newHighlight);
  hideSelectionToolbar();
  window.getSelection()?.removeAllRanges();

  applyHighlightsOnCurrentPage();
  updateHighlightsBadge();
  renderNotesList();
  showToast(t('reader_highlight_saved'), '✨');
}

export function openNoteModal(highlight, isNew = false) {
  activeModalHighlight = highlight;
  activeModalColor = highlight.color || 'gold';

  const modal = document.getElementById('reader-note-modal');
  const quoteEl = document.getElementById('reader-note-quote-text');
  const textarea = document.getElementById('reader-note-textarea');
  const deleteBtn = document.getElementById('reader-note-delete-btn');
  const titleEl = document.getElementById('reader-note-modal-title');

  if (!modal) return;

  if (titleEl) {
    titleEl.textContent = isNew ? t('reader_note_add') : t('reader_note_edit');
  }
  if (quoteEl) {
    quoteEl.textContent = `“${highlight.text}”`;
  }
  if (textarea) {
    textarea.value = highlight.note || '';
  }
  if (deleteBtn) {
    deleteBtn.hidden = isNew;
  }

  modal.querySelectorAll('.reader-note-color-picker .hl-color-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.color === activeModalColor);
  });

  modal.hidden = false;
  setTimeout(() => textarea?.focus(), 60);
}

export function closeNoteModal() {
  const modal = document.getElementById('reader-note-modal');
  if (modal) modal.hidden = true;
  activeModalHighlight = null;
}

export function openNotesDrawer() {
  const drawer = document.getElementById('reader-notes-drawer');
  const tocDrawer = document.getElementById('reader-toc-drawer');
  const bookmarksDrawer = document.getElementById('reader-bookmarks-drawer');
  if (tocDrawer) tocDrawer.hidden = true;
  if (bookmarksDrawer) bookmarksDrawer.hidden = true;
  document.getElementById('reader-toc-btn')?.classList.remove('active');

  if (drawer) {
    drawer.hidden = false;
    renderNotesList();
  }
}

export function closeNotesDrawer() {
  const drawer = document.getElementById('reader-notes-drawer');
  if (drawer) drawer.hidden = true;
}

export function renderNotesList() {
  const listEl = document.getElementById('reader-notes-list');
  if (!listEl || !state.currentReadingBook) return;

  const allHls = getHighlightsForBook(state.currentReadingBook.id);
  const filtered = activeNotesTab === 'with-notes'
    ? allHls.filter((h) => h.note && h.note.trim().length > 0)
    : allHls;

  const tabAllSpan = document.querySelector('#reader-notes-tab-all span');
  const tabNotesSpan = document.querySelector('#reader-notes-tab-with-notes span');
  if (tabAllSpan) tabAllSpan.textContent = t('reader_notes_tab_all', { total: allHls.length });
  if (tabNotesSpan) {
    const withNotesCount = allHls.filter((h) => h.note && h.note.trim().length > 0).length;
    tabNotesSpan.textContent = t('reader_notes_tab_with_notes', { total: withNotesCount });
  }

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="reader-empty-state">
        <span class="empty-icon">📝</span>
        <p>${t('reader_notes_empty')}</p>
        <span style="font-size: 0.75rem; opacity: 0.7;">Sorot teks di buku untuk menandai kutipan penting atau menambahkan catatan refleksi.</span>
      </div>
    `;
    return;
  }

  const isEn = state.currentLang === 'en';
  listEl.innerHTML = filtered.map((hl) => {
    const colorLabel = t(`reader_highlight_color_${hl.color}`) || hl.color;
    return `
      <div class="reader-note-item" data-hl-id="${hl.id}" data-page="${hl.pageIndex}">
        <div class="reader-note-item-header">
          <span class="hl-badge hl-badge--${hl.color}">${colorLabel}</span>
          <span class="reader-toc-page-badge">${isEn ? 'Page' : 'Hal.'} ${(hl.pageIndex || 0) + 1}</span>
        </div>
        <blockquote class="reader-note-item-quote">"${escapeHtml(hl.text)}"</blockquote>
        ${hl.note ? `
          <div class="reader-note-item-body">
            <span class="note-quote-icon">💭</span>
            <p class="note-text">${escapeHtml(hl.note)}</p>
          </div>
        ` : ''}
        <div class="reader-note-item-actions">
          <button type="button" class="reader-note-item-btn" data-action="jump" title="Lompat ke Halaman">
            <span>↗ ${isEn ? 'Jump' : 'Lompat'}</span>
          </button>
          <button type="button" class="reader-note-item-btn" data-action="edit" title="Edit Catatan">
            <span>✏️ ${isEn ? 'Edit' : 'Catat'}</span>
          </button>
          <button type="button" class="reader-note-item-btn reader-note-item-btn--del" data-action="delete" title="Hapus">
            <span>🗑️</span>
          </button>
        </div>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('.reader-note-item').forEach((item) => {
    const hlId = item.dataset.hlId;
    const pageIdx = parseInt(item.dataset.page, 10);
    const hl = state.highlights.find((h) => h.id === hlId);

    item.querySelector('[data-action="jump"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!isNaN(pageIdx)) {
        openReaderModal(state.currentReadingBook, pageIdx);
        closeNotesDrawer();
      }
    });

    item.querySelector('[data-action="edit"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (hl) openNoteModal(hl, false);
    });

    item.querySelector('[data-action="delete"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (hl && confirm(isEn ? 'Delete this highlight and note?' : 'Hapus sorotan dan catatan ini?')) {
        deleteHighlight(hl.id);
        renderNotesList();
        openReaderModal(state.currentReadingBook, state.currentPageIndex);
        showToast(t('reader_highlight_removed'), '🗑️');
      }
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
  updateHighlightsBadge();
  renderNotesList();
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
// MAIN READER MODAL OPEN & PROGRESS AUTO-RESUME
// ============================================================================
export function openReaderModal(book, targetPageIndex = null) {
  if (!book) return;
  state.currentReadingBook = book;

  // Build pages list if not present
  buildBookPages(book);

  // Auto-resume check if targetPageIndex is null
  if (targetPageIndex === null || targetPageIndex === undefined) {
    const savedProgressStr = localStorage.getItem(`${STORAGE_KEYS.BOOK_PROGRESS_PREFIX}${book.id}`);
    if (savedProgressStr) {
      try {
        const p = JSON.parse(savedProgressStr);
        if (typeof p.pageIndex === 'number') {
          targetPageIndex = p.pageIndex;
        }
      } catch (e) {}
    }
    if (targetPageIndex === null || targetPageIndex === undefined) {
      targetPageIndex = 0;
    }
  }

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

  if (!modal) return;

  // On mobile devices, ensure default font size is comfortable (14px - 16px)
  const isMobile = window.innerWidth <= 768;
  if (isMobile && state.readerFontSize > 16) {
    state.readerFontSize = 14;
    localStorage.setItem(STORAGE_KEYS.READER_FONT_SIZE, '14');
  }

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

    // Save reading progress & active session for instant auto-resume on reload/reopen
    const sessionData = {
      bookId: book.id,
      pageIndex: clampedIndex,
      chapterIndex: currentChapterIdx,
      readerMode: state.readerMode,
      autoResume: true,
      timestamp: Date.now()
    };
    localStorage.setItem(STORAGE_KEYS.LAST_READ_SESSION, JSON.stringify(sessionData));
    localStorage.setItem(
      `${STORAGE_KEYS.BOOK_PROGRESS_PREFIX}${book.id}`,
      JSON.stringify({
        pageIndex: clampedIndex,
        chapterIndex: currentChapterIdx,
        timestamp: Date.now()
      })
    );

    // Progress bar calculation
    const progressPct = totalPages > 1 ? (clampedIndex / (totalPages - 1)) * 100 : 100;
    if (progressBar) progressBar.style.width = `${Math.min(100, Math.max(0, progressPct))}%`;

    // Jump Input & Page Counter
    if (jumpInput) {
      jumpInput.min = '1';
      jumpInput.max = String(totalPages);
      jumpInput.value = String(clampedIndex + 1);
    }

    const isCurrentBookmarked = isCurrentPageBookmarked();

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
        pageCounterEl.innerHTML = `<span class="page-count-main">${readChapLabel}</span><span class="page-chap-sub"> • ${isEn ? 'Scroll Mode' : 'Mode Gulir'}</span>`;
      }
      if (prevText) prevText.textContent = isEn ? 'Previous' : 'Bab Sebelumnya';
      if (nextText) nextText.textContent = isEn ? 'Next' : 'Bab Berikutnya';
      if (prevBtn) prevBtn.disabled = currentChapterIdx === 0;
      if (nextBtn) nextBtn.disabled = currentChapterIdx >= (book.chapters?.length || 1) - 1;

      if (bodyEl) {
        bodyEl.innerHTML = `
          <article class="reader-paper">
            <button type="button" class="reader-corner-ribbon ${isCurrentBookmarked ? 'active' : ''}" id="reader-corner-ribbon" title="${isCurrentBookmarked ? 'Halaman ini ditandai' : 'Tandai halaman ini'}">
              <span class="ribbon-icon">${isCurrentBookmarked ? '★' : '🔖'}</span>
            </button>
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
        document.getElementById('reader-corner-ribbon')?.addEventListener('click', toggleCurrentPageBookmark);
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
        pageCounterEl.innerHTML = `<span class="page-count-main">${readPageLabel}</span><span class="page-chap-sub"> • ${escapeHtml(chapterTitle)}</span>`;
      }
      if (prevText) prevText.textContent = t('reader_prev');
      if (nextText) nextText.textContent = t('reader_next');
      if (prevBtn) prevBtn.disabled = clampedIndex === 0;
      if (nextBtn) nextBtn.disabled = clampedIndex >= totalPages - 1;

      if (bodyEl && pageItem) {
        bodyEl.innerHTML = `
          <article class="reader-paper ${pageItem.pageInChapter > 1 ? 'is-continuation-page' : ''}">
            <button type="button" class="reader-corner-ribbon ${isCurrentBookmarked ? 'active' : ''}" id="reader-corner-ribbon" title="${isCurrentBookmarked ? 'Halaman ini ditandai' : 'Tandai halaman ini'}">
              <span class="ribbon-icon">${isCurrentBookmarked ? '★' : '🔖'}</span>
            </button>
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
        document.getElementById('reader-corner-ribbon')?.addEventListener('click', toggleCurrentPageBookmark);
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
            document.getElementById('reader-toc-btn')?.classList.remove('active');
          }
        });
      });
    }
  }

  // Update Bookmark UI
  updateBookmarkUI();
  renderBookmarksList();

  // Apply Highlights & Notes to active page
  applyHighlightsOnCurrentPage();
  updateHighlightsBadge();
  renderNotesList();

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
}

export function closeReaderModal({ explicitUserClose = false } = {}) {
  const modal = document.getElementById('reader-modal');
  const tocDrawer = document.getElementById('reader-toc-drawer');
  const tocBtn = document.getElementById('reader-toc-btn');
  const searchBar = document.getElementById('reader-search-bar');
  const searchBtn = document.getElementById('reader-search-btn');
  const bookmarksDrawer = document.getElementById('reader-bookmarks-drawer');
  const notesDrawer = document.getElementById('reader-notes-drawer');
  const selectionToolbar = document.getElementById('reader-selection-toolbar');
  const noteModal = document.getElementById('reader-note-modal');

  if (tocDrawer) tocDrawer.hidden = true;
  if (tocBtn) tocBtn.classList.remove('active');
  if (searchBar) searchBar.hidden = true;
  if (searchBtn) searchBtn.classList.remove('active');
  if (bookmarksDrawer) bookmarksDrawer.hidden = true;
  if (notesDrawer) notesDrawer.hidden = true;
  if (selectionToolbar) selectionToolbar.hidden = true;
  if (noteModal) noteModal.hidden = true;

  clearSearchHighlights();

  // Mark session as not actively opened ONLY when user explicitly closes the reader (e.g. clicking ✕ or pressing Escape)
  if (explicitUserClose) {
    const lastSessionStr = localStorage.getItem(STORAGE_KEYS.LAST_READ_SESSION);
    if (lastSessionStr) {
      try {
        const s = JSON.parse(lastSessionStr);
        s.autoResume = false;
        localStorage.setItem(STORAGE_KEYS.LAST_READ_SESSION, JSON.stringify(s));
      } catch (e) {}
    }
  }

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
  const bookmarksListBtn = document.getElementById('reader-bookmarks-list-btn');
  const bookmarksDrawer = document.getElementById('reader-bookmarks-drawer');
  const bookmarksCloseBtn = document.getElementById('reader-bookmarks-close-btn');
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

  closeBtn?.addEventListener('click', () => closeReaderModal({ explicitUserClose: true }));
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeReaderModal({ explicitUserClose: true });
  });

  // Table of Contents Drawer Toggle
  tocBtn?.addEventListener('click', () => {
    if (tocDrawer) {
      const willShow = tocDrawer.hidden;
      tocDrawer.hidden = !willShow;
      tocBtn.classList.toggle('active', willShow);
      if (willShow) {
        closeBookmarksDrawer();
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

  // Dedicated Bookmarks Drawer Toggle
  bookmarksListBtn?.addEventListener('click', () => {
    if (bookmarksDrawer) {
      const willShow = bookmarksDrawer.hidden;
      bookmarksDrawer.hidden = !willShow;
      if (willShow) {
        if (tocDrawer) tocDrawer.hidden = true;
        tocBtn?.classList.remove('active');
        renderBookmarksList();
      }
    }
  });

  bookmarksCloseBtn?.addEventListener('click', closeBookmarksDrawer);

  // Highlights & Notes Drawer Toggle
  const notesBtn = document.getElementById('reader-notes-btn');
  const notesDrawer = document.getElementById('reader-notes-drawer');
  const notesCloseBtn = document.getElementById('reader-notes-close-btn');
  const tabNotesAll = document.getElementById('reader-notes-tab-all');
  const tabNotesWithNotes = document.getElementById('reader-notes-tab-with-notes');

  notesBtn?.addEventListener('click', () => {
    if (notesDrawer) {
      const willShow = notesDrawer.hidden;
      notesDrawer.hidden = !willShow;
      if (willShow) {
        if (tocDrawer) tocDrawer.hidden = true;
        if (bookmarksDrawer) bookmarksDrawer.hidden = true;
        tocBtn?.classList.remove('active');
        renderNotesList();
      }
    }
  });

  notesCloseBtn?.addEventListener('click', closeNotesDrawer);

  tabNotesAll?.addEventListener('click', () => {
    activeNotesTab = 'all';
    tabNotesAll.classList.add('active');
    tabNotesWithNotes?.classList.remove('active');
    renderNotesList();
  });

  tabNotesWithNotes?.addEventListener('click', () => {
    activeNotesTab = 'with-notes';
    tabNotesWithNotes.classList.add('active');
    tabNotesAll?.classList.remove('active');
    renderNotesList();
  });

  // Floating Selection Toolbar Listeners
  const selectionToolbar = document.getElementById('reader-selection-toolbar');
  const selectionCloseBtn = document.getElementById('selection-toolbar-close-btn');
  const selectionAddNoteBtn = document.getElementById('selection-add-note-btn');

  selectionCloseBtn?.addEventListener('click', hideSelectionToolbar);

  selectionToolbar?.querySelectorAll('.selection-colors .hl-color-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const color = btn.dataset.color || 'gold';
      applyHighlightFromSelection(color);
    });
  });

  selectionAddNoteBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!activeSelectedText || !state.currentReadingBook) return;
    const tempHighlight = {
      id: 'hl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      bookId: state.currentReadingBook.id,
      chapterIndex: state.currentChapterIndex,
      pageIndex: state.currentPageIndex,
      chapterTitle:
        state.currentReadingBook.pagesList?.[state.currentPageIndex]?.chapterTitle ||
        state.currentReadingBook.chapters?.[state.currentChapterIndex]?.title ||
        'Bab 1',
      text: activeSelectedText,
      color: 'gold',
      note: '',
      createdAt: new Date().toISOString()
    };
    hideSelectionToolbar();
    openNoteModal(tempHighlight, true);
  });

  // Note Modal Listeners
  const noteModal = document.getElementById('reader-note-modal');
  const noteModalClose = document.getElementById('reader-note-modal-close');
  const noteCancelBtn = document.getElementById('reader-note-cancel-btn');
  const noteSaveBtn = document.getElementById('reader-note-save-btn');
  const noteDeleteBtn = document.getElementById('reader-note-delete-btn');
  const noteTextarea = document.getElementById('reader-note-textarea');

  noteModalClose?.addEventListener('click', closeNoteModal);
  noteCancelBtn?.addEventListener('click', closeNoteModal);

  noteModal?.querySelectorAll('.reader-note-color-picker .hl-color-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      activeModalColor = btn.dataset.color || 'gold';
      noteModal.querySelectorAll('.reader-note-color-picker .hl-color-btn').forEach((b) => {
        b.classList.toggle('active', b === btn);
      });
    });
  });

  noteSaveBtn?.addEventListener('click', () => {
    if (!activeModalHighlight) return;
    activeModalHighlight.color = activeModalColor;
    activeModalHighlight.note = (noteTextarea?.value || '').trim();
    saveHighlight(activeModalHighlight);
    closeNoteModal();
    applyHighlightsOnCurrentPage();
    updateHighlightsBadge();
    renderNotesList();
    showToast(t('reader_note_saved'), '📝');
  });

  noteDeleteBtn?.addEventListener('click', () => {
    if (!activeModalHighlight) return;
    deleteHighlight(activeModalHighlight.id);
    closeNoteModal();
    openReaderModal(state.currentReadingBook, state.currentPageIndex);
    showToast(t('reader_highlight_removed'), '🗑️');
  });

  // Text selection handler on reader body
  function checkSelection() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      return;
    }
    const text = sel.toString().trim();
    if (text.length < 2) return;

    const range = sel.getRangeAt(0);
    const contentEl = document.querySelector('#reader-body-content .epub-rendered-content');
    if (!contentEl || !contentEl.contains(range.commonAncestorContainer)) return;

    activeSelectionRange = range.cloneRange();
    activeSelectedText = text;
    const rect = range.getBoundingClientRect();
    showSelectionToolbar(rect);
  }

  bodyEl?.addEventListener('mouseup', () => {
    setTimeout(checkSelection, 20);
  });

  bodyEl?.addEventListener('touchend', () => {
    setTimeout(checkSelection, 100);
  });

  // Close selection toolbar when clicking outside
  document.addEventListener('mousedown', (e) => {
    if (
      !e.target.closest('#reader-selection-toolbar') &&
      !e.target.closest('#reader-note-modal') &&
      !e.target.closest('.reader-highlight')
    ) {
      if (selectionToolbar && !selectionToolbar.hidden) {
        hideSelectionToolbar();
      }
    }
  });

  // Drawer Tabs switching inside TOC drawer
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
    if (state.readerFontSize > 12) {
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
      closeReaderModal({ explicitUserClose: true });
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
