import { state } from '../../core/state.js';
import { showToast } from '../../utils/toast.js';
import { getTranslatedGenre } from '../../services/i18n/i18n.js';
import { toggleBookInShelf } from '../../services/storage/shelfStorage.js';
import { openReaderModal } from '../reader/readerView.js';
import { startAudioPlayer } from '../../services/audio/audioService.js';

export function openBookDetailModal(book) {
  state.selectedBook = book;
  const modal = document.getElementById('book-detail-modal');
  const title = document.getElementById('detail-modal-title');
  const author = document.getElementById('detail-author-text');
  const genre = document.getElementById('detail-genre-pill');
  const rating = document.getElementById('detail-rating-text');
  const pages = document.getElementById('detail-pages-text');
  const readtime = document.getElementById('detail-readtime-text');
  const quote = document.getElementById('detail-quote-box');
  const synopsis = document.getElementById('detail-synopsis-text');
  const coverWrapper = document.getElementById('detail-cover-wrapper');
  const formatTags = document.getElementById('detail-format-tags');
  const shelfLabel = document.getElementById('detail-shelf-label');

  if (!modal || !book) return;

  const isEn = state.currentLang === 'en';
  title.textContent = book.title;
  author.textContent = `${isEn ? 'by' : 'oleh'} ${book.author}`;
  genre.textContent = getTranslatedGenre(book.genre);
  rating.textContent = `★ ${book.rating} (${book.reviewsCount} ${isEn ? 'reviews' : 'ulasan'})`;
  pages.textContent = `${book.pages} ${isEn ? 'Pages' : 'Halaman'}`;
  readtime.textContent = book.readingTime;
  quote.textContent = `"${book.quote || book.synopsis.slice(0, 120)}..."`;
  synopsis.textContent = book.synopsis;

  if (book.cover) {
    coverWrapper.innerHTML = `<img src="${book.cover}" alt="${book.title}" class="modal-cover-img" />`;
  } else {
    coverWrapper.innerHTML = `
      <div class="card-gradient-cover" style="background: ${book.gradientTheme || 'var(--bg-surface)'}">
        <span class="gradient-cover-icon">${book.iconSymbol || '📖'}</span>
        <div class="gradient-cover-meta">
          <h4 class="gradient-cover-title">${book.title}</h4>
          <span class="gradient-cover-author">${book.author}</span>
        </div>
      </div>
    `;
  }

  formatTags.innerHTML = (book.formats || ['epub'])
    .map((f) => `<span class="format-icon-tag">${f.toUpperCase()}</span>`)
    .join('');

  const isInShelf = state.shelf.some((i) => i.id === book.id);
  if (shelfLabel) {
    shelfLabel.textContent = isInShelf
      ? (isEn ? 'Remove from Shelf' : 'Hapus dari Rak')
      : (isEn ? 'Save to Shelf' : 'Simpan ke Rak');
  }

  modal.style.setProperty('display', 'flex', 'important');
  modal.classList.add('active');
  modal.hidden = false;
  modal.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';
}

export function closeBookDetailModal() {
  const modal = document.getElementById('book-detail-modal');
  if (modal) {
    modal.style.setProperty('display', 'none', 'important');
    modal.classList.remove('active');
    modal.hidden = true;
    modal.setAttribute('hidden', '');
  }
  document.body.style.overflow = '';
}

export function triggerEbookDownload(book, format) {
  showToast(`Menyiapkan berkas ${format ? format.toUpperCase() : 'BUKU'} untuk "${book.title}"...`, '⏳');

  setTimeout(() => {
    // If book is a user-uploaded file with raw binary blob, download exact file
    if (book.rawFileBlob) {
      const ext = book.fileType || (book.formats && book.formats[0]) || format || 'epub';
      const blobUrl = URL.createObjectURL(book.rawFileBlob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${book.title.replace(/[^a-zA-Z0-9_\-\s]/g, '')}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      showToast(`Berhasil mengunduh berkas "${book.title}.${ext}"!`, '🎉');
      return;
    }

    // Generate valid downloadable blob content for built-in catalog
    let mimeType = 'text/plain';
    let fileExtension = format || 'epub';
    let fileContent = '';

    if (fileExtension === 'epub') {
      mimeType = 'application/epub+zip';
      fileContent = `LIBROVERSE EPUB PACKAGE\nTitle: ${book.title}\nSubtitle: ${book.subtitle || ''}\nAuthor: ${book.author}\nGenre: ${book.genre}\nRating: ${book.rating}\n\nSynopsis:\n${book.synopsis}\n\nQuote: "${book.quote || ''}"\n\n--- BAB PERTAMA ---\n${book.chapters[0]?.content || ''}\n\nDownloaded from Libroverse (https://libroverse.vercel.app/)`;
    } else {
      mimeType = 'application/pdf';
      fileContent = `%PDF-1.4\n1 0 obj << /Title (${book.title}) /Author (${book.author}) >> endobj\n2 0 obj << /Type /Catalog /Pages 3 0 R >> endobj\n3 0 obj << /Type /Pages /Kids [4 0 R] /Count 1 >> endobj\n4 0 obj << /Type /Page /Parent 3 0 R /Contents 5 0 R >> endobj\n5 0 obj << /Length 200 >> stream\nBT /F1 14 Tf 50 750 Td (${book.title}) Tj ET\nendstream\nendobj\nxref\n0 6\ntrailer << /Size 6 /Root 2 0 R >>\nstartxref\n400\n%%EOF`;
    }

    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${book.title.replace(/[^a-zA-Z0-9]/g, '_')}_Libroverse.${fileExtension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`Berhasil mengunduh "${book.title}.${fileExtension}"!`, '🎉');
  }, 700);
}

export function setupBookDetailModalEvents() {
  const modal = document.getElementById('book-detail-modal');
  const closeBtn = document.getElementById('detail-modal-close');
  const readBtn = document.getElementById('detail-read-btn');
  const listenBtn = document.getElementById('detail-listen-btn');
  const shelfBtn = document.getElementById('detail-toggle-shelf-btn');
  const dlEpub = document.getElementById('detail-download-epub');
  const dlPdf = document.getElementById('detail-download-pdf');
  const shareBtn = document.getElementById('detail-share-btn');

  closeBtn?.addEventListener('click', closeBookDetailModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeBookDetailModal();
  });

  readBtn?.addEventListener('click', () => {
    if (state.selectedBook) {
      closeBookDetailModal();
      openReaderModal(state.selectedBook);
    }
  });

  listenBtn?.addEventListener('click', () => {
    if (state.selectedBook) {
      closeBookDetailModal();
      startAudioPlayer(state.selectedBook);
    }
  });

  shelfBtn?.addEventListener('click', () => {
    if (state.selectedBook) {
      toggleBookInShelf(state.selectedBook);
      const isEn = state.currentLang === 'en';
      const isInShelf = state.shelf.some((i) => i.id === state.selectedBook.id);
      const shelfLabel = document.getElementById('detail-shelf-label');
      if (shelfLabel) {
        shelfLabel.textContent = isInShelf
          ? (isEn ? 'Remove from Shelf' : 'Hapus dari Rak')
          : (isEn ? 'Save to Shelf' : 'Simpan ke Rak');
      }
    }
  });

  dlEpub?.addEventListener('click', () => {
    if (state.selectedBook) triggerEbookDownload(state.selectedBook, 'epub');
  });

  dlPdf?.addEventListener('click', () => {
    if (state.selectedBook) triggerEbookDownload(state.selectedBook, 'pdf');
  });

  shareBtn?.addEventListener('click', () => {
    if (state.selectedBook) {
      if (navigator.share) {
        navigator.share({
          title: `Libroverse: ${state.selectedBook.title}`,
          text: `Baca buku gratis "${state.selectedBook.title}" oleh ${state.selectedBook.author} di Libroverse!`,
          url: window.location.href
        });
      } else {
        navigator.clipboard.writeText(window.location.href);
        showToast('Tautan buku disalin ke clipboard!', '🔗');
      }
    }
  });
}
