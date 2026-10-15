import { BOOKS_DATA, GENRES_LIST, STATS_DATA } from './data/books.js';
import JSZip from 'jszip';

// ==========================================================================
// STATE MANAGEMENT & LOCAL STORAGE
// ==========================================================================
const state = {
  books: [...BOOKS_DATA],
  filteredBooks: [...BOOKS_DATA],
  activeGenre: 'all',
  activeFormat: 'all',
  searchQuery: '',
  sortBy: 'popular',
  currentLang: 'id',
  
  // Reader State
  currentReadingBook: null,
  currentChapterIndex: 0,
  readerFontSize: parseInt(localStorage.getItem('libroverse_reader_fs') || '18', 10),
  readerFontFamily: localStorage.getItem('libroverse_reader_ff') || 'serif',
  readerTheme: localStorage.getItem('libroverse_reader_theme') || 'cosmic',

  // Audio Player State
  currentAudioBook: null,
  isPlayingAudio: false,
  audioProgress: 0,
  audioDuration: 320, // seconds
  audioSpeed: 1.0,
  audioVolume: 0.8,
  speechUtterance: null,

  // Ambient Space Synth
  isAmbientPlaying: false,
  audioContext: null,
  ambientOscillators: [],

  // Cosmic Shelf
  shelf: JSON.parse(localStorage.getItem('libroverse_shelf') || '[]'),
  activeShelfTab: 'all',

  // Selected Detail Modal Book
  selectedBook: null,
  deferredPwaPrompt: null
};

// ==========================================================================
// COSMIC BACKGROUND STARFIELD CANVAS ANIMATION
// ==========================================================================
function initCosmicCanvas() {
  const canvas = document.getElementById('cosmic-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const STAR_COUNT = Math.floor((width * height) / 8000);
  const stars = [];
  const colors = ['#ffffff', '#c084fc', '#38bdf8', '#fde047', '#f43f5e'];

  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.8 + 0.4,
      color: colors[Math.floor(Math.random() * colors.length)],
      baseAlpha: Math.random() * 0.7 + 0.3,
      twinkleSpeed: Math.random() * 0.03 + 0.005,
      angle: Math.random() * Math.PI * 2,
      speedX: (Math.random() - 0.5) * 0.15,
      speedY: (Math.random() - 0.5) * 0.15
    });
  }

  // Shooting Stars
  const shootingStars = [];
  function addShootingStar() {
    if (shootingStars.length < 2 && Math.random() < 0.02) {
      shootingStars.push({
        x: Math.random() * width * 0.8,
        y: Math.random() * height * 0.4,
        length: Math.random() * 120 + 80,
        speed: Math.random() * 12 + 10,
        opacity: 1,
        angle: Math.PI / 4 + (Math.random() - 0.5) * 0.2
      });
    }
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    // Draw Stars
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.angle += s.twinkleSpeed;
      const alpha = s.baseAlpha + Math.sin(s.angle) * 0.25;

      s.x += s.speedX;
      s.y += s.speedY;
      if (s.x < 0) s.x = width;
      if (s.x > width) s.x = 0;
      if (s.y < 0) s.y = height;
      if (s.y > height) s.y = 0;

      ctx.save();
      ctx.globalAlpha = Math.max(0.1, Math.min(1, alpha));
      ctx.fillStyle = s.color;
      ctx.shadowBlur = s.size > 1.2 ? 6 : 0;
      ctx.shadowColor = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw Subtle Constellation Lines
    ctx.save();
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.06)';
    ctx.lineWidth = 0.6;
    for (let i = 0; i < stars.length; i += 4) {
      for (let j = i + 1; j < Math.min(i + 5, stars.length); j++) {
        const dx = stars[i].x - stars[j].x;
        const dy = stars[i].y - stars[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 110) {
          ctx.beginPath();
          ctx.moveTo(stars[i].x, stars[i].y);
          ctx.lineTo(stars[j].x, stars[j].y);
          ctx.stroke();
        }
      }
    }
    ctx.restore();

    // Render Shooting Stars
    addShootingStar();
    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const ss = shootingStars[i];
      ss.x += Math.cos(ss.angle) * ss.speed;
      ss.y += Math.sin(ss.angle) * ss.speed;
      ss.opacity -= 0.02;

      if (ss.opacity <= 0) {
        shootingStars.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = ss.opacity;
      const grad = ctx.createLinearGradient(
        ss.x,
        ss.y,
        ss.x - Math.cos(ss.angle) * ss.length,
        ss.y - Math.sin(ss.angle) * ss.length
      );
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#c084fc');
      grad.addColorStop(1, 'transparent');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(ss.x, ss.y);
      ctx.lineTo(ss.x - Math.cos(ss.angle) * ss.length, ss.y - Math.sin(ss.angle) * ss.length);
      ctx.stroke();
      ctx.restore();
    }

    requestAnimationFrame(render);
  }

  render();
}

// ==========================================================================
// TOAST NOTIFICATIONS
// ==========================================================================
function showToast(message, icon = '✨') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// ==========================================================================
// AMBIENT COSMIC AUDIO SYNTHESIZER (WEB AUDIO API)
// ==========================================================================
function toggleAmbientSpaceAudio() {
  const btn = document.getElementById('ambient-audio-btn');
  if (!state.isAmbientPlaying) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!state.audioContext) state.audioContext = new AudioCtx();
      if (state.audioContext.state === 'suspended') state.audioContext.resume();

      // Synthesize celestial harmony chord (root, fifth, octave: D minor space chord)
      const freqs = [146.83, 220.0, 293.66, 440.0, 659.25];
      state.ambientOscillators = freqs.map((f, i) => {
        const osc = state.audioContext.createOscillator();
        const gain = state.audioContext.createGain();
        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(f, state.audioContext.currentTime);

        // Soft celestial volume
        gain.gain.setValueAtTime(0.015, state.audioContext.currentTime);

        // Lowpass space filter
        const filter = state.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800 + i * 200, state.audioContext.currentTime);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(state.audioContext.destination);
        osc.start();
        return { osc, gain };
      });

      state.isAmbientPlaying = true;
      btn?.classList.add('active');
      showToast('Musik kosmik santai dinyalakan (Sintesis Semesta)', '🪐');
    } catch (e) {
      console.warn('AudioContext not allowed yet:', e);
    }
  } else {
    state.ambientOscillators.forEach(({ osc, gain }) => {
      try {
        gain.gain.setTargetAtTime(0, state.audioContext.currentTime, 0.5);
        setTimeout(() => osc.stop(), 500);
      } catch (_) {}
    });
    state.ambientOscillators = [];
    state.isAmbientPlaying = false;
    btn?.classList.remove('active');
    showToast('Musik kosmik dijeda', '🌙');
  }
}

// ==========================================================================
// CATALOG RENDERING & FILTERING
// ==========================================================================
function renderGenrePills() {
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
      ${g.label}
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

function filterAndRenderBooks() {
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

  // Update counts
  const countEl = document.getElementById('results-count-text');
  if (countEl) countEl.textContent = `Menampilkan ${list.length} buku kosmik`;

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

function renderBookCardHTML(book) {
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
    ? `<span class="card-badge personal-badge">Koleksi Pribadi</span>`
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
          <span class="card-genre">${book.genre}</span>
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
          <span>Baca Online</span>
        </button>

        <button type="button" class="card-dl-secondary-btn" data-action="download" data-id="${book.id}" title="Download Buku EPUB/PDF">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>Unduh</span>
        </button>

        <button 
          type="button" 
          class="card-action-icon-btn ${isInShelf ? 'in-shelf' : ''}" 
          data-action="toggle-shelf" 
          data-id="${book.id}"
          title="${isInShelf ? 'Hapus dari Rak Kosmik' : 'Simpan ke Rak Kosmik'}">
          ${isInShelf ? '★' : '☆'}
        </button>

        ${deleteBtnHTML}
      </div>
    </article>
  `;
}

function attachBookCardListeners(container) {
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
      if (book) toggleBookInShelf(book);
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

// ==========================================================================
// IN-BROWSER EBOOK READER
// ==========================================================================
function openReaderModal(book, chapterIndex = 0) {
  state.currentReadingBook = book;
  state.currentChapterIndex = chapterIndex;

  const modal = document.getElementById('reader-modal');
  const container = document.getElementById('reader-container');
  const titleEl = document.getElementById('reader-book-title');
  const chapterNameEl = document.getElementById('reader-chapter-name');
  const bodyEl = document.getElementById('reader-body-content');
  const prevBtn = document.getElementById('reader-prev-chapter');
  const nextBtn = document.getElementById('reader-next-chapter');
  const pageCounterEl = document.getElementById('reader-page-counter');
  const fontValEl = document.getElementById('reader-font-val');

  if (!modal || !book) return;

  // Apply theme & font preferences
  container.setAttribute('data-theme', state.readerTheme);
  bodyEl.setAttribute('data-family', state.readerFontFamily);
  bodyEl.style.fontSize = `${state.readerFontSize}px`;
  if (fontValEl) fontValEl.textContent = `${state.readerFontSize}px`;

  // Update theme button states
  document.querySelectorAll('.reader-theme-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.theme === state.readerTheme);
  });

  const fontFamLabel = document.getElementById('font-family-label');
  if (fontFamLabel) fontFamLabel.textContent = state.readerFontFamily === 'serif' ? 'Serif' : 'Sans';

  titleEl.textContent = book.title;

  // Handle PDF Reading
  if (book.fileType === 'pdf' || book.isPdf) {
    let pdfUrl = book.pdfUrl;
    if (!pdfUrl && book.rawFileBlob) {
      pdfUrl = URL.createObjectURL(book.rawFileBlob);
      book.pdfUrl = pdfUrl;
    }
    chapterNameEl.textContent = 'Dokumen PDF Lengkap';
    pageCounterEl.textContent = 'PDF Reader';
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    bodyEl.innerHTML = `
      <div class="reader-pdf-container">
        <div class="reader-pdf-toolbar">
          <span>Format: Dokumen PDF Asli (${book.fileSize || 'PDF'})</span>
          <a href="${pdfUrl}" target="_blank" download="${book.title}.pdf">↗ Buka PDF di Tab Baru / Unduh</a>
        </div>
        <iframe src="${pdfUrl}#toolbar=1" class="reader-pdf-frame" title="${book.title}"></iframe>
      </div>
    `;
  } else {
    // Handle EPUB / Text Reading
    const totalChapters = (book.chapters && book.chapters.length) || 1;
    const chapter = (book.chapters && book.chapters[chapterIndex]) || {
      title: `Bab ${chapterIndex + 1}`,
      content: book.synopsis || 'Selamat membaca buku di Libroverse.'
    };

    chapterNameEl.textContent = chapter.title;
    pageCounterEl.textContent = `Bab ${chapterIndex + 1} dari ${totalChapters}`;

    if (chapter.isHtml) {
      bodyEl.innerHTML = `
        <h3>${chapter.title}</h3>
        <div class="epub-rendered-content">${chapter.content}</div>
      `;
    } else {
      bodyEl.innerHTML = `
        <h3>${chapter.title}</h3>
        ${chapter.content
          .split('\n\n')
          .map((p) => `<p>${p}</p>`)
          .join('')}
      `;
    }

    prevBtn.disabled = chapterIndex === 0;
    nextBtn.disabled = chapterIndex >= totalChapters - 1;
  }

  bodyEl.scrollTop = 0;
  modal.style.setProperty('display', 'flex', 'important');
  modal.classList.add('active');
  modal.hidden = false;
  modal.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';

  // Mark book as currently reading in shelf
  addOrUpdateShelfStatus(book, 'reading');
  showToast(`Membuka "${book.title}" di pembaca kosmik`, '📖');
}

function closeReaderModal() {
  const modal = document.getElementById('reader-modal');
  if (modal) {
    modal.style.setProperty('display', 'none', 'important');
    modal.classList.remove('active');
    modal.hidden = true;
    modal.setAttribute('hidden', '');
  }
  document.body.style.overflow = '';
}

function setupReaderControls() {
  const modal = document.getElementById('reader-modal');
  const bodyEl = document.getElementById('reader-body-content');
  const progressBar = document.getElementById('reader-progress-bar');
  const closeBtn = document.getElementById('reader-close-btn');
  const fontDec = document.getElementById('reader-font-dec');
  const fontInc = document.getElementById('reader-font-inc');
  const fontFamBtn = document.getElementById('reader-font-family-btn');
  const prevChapter = document.getElementById('reader-prev-chapter');
  const nextChapter = document.getElementById('reader-next-chapter');

  closeBtn?.addEventListener('click', closeReaderModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeReaderModal();
  });

  // Track scroll progress
  bodyEl?.addEventListener('scroll', () => {
    const total = bodyEl.scrollHeight - bodyEl.clientHeight;
    const current = bodyEl.scrollTop;
    const pct = total > 0 ? (current / total) * 100 : 0;
    if (progressBar) progressBar.style.width = `${pct}%`;
  });

  // Font sizing
  fontDec?.addEventListener('click', () => {
    if (state.readerFontSize > 14) {
      state.readerFontSize -= 2;
      localStorage.setItem('libroverse_reader_fs', state.readerFontSize);
      bodyEl.style.fontSize = `${state.readerFontSize}px`;
      document.getElementById('reader-font-val').textContent = `${state.readerFontSize}px`;
    }
  });

  fontInc?.addEventListener('click', () => {
    if (state.readerFontSize < 28) {
      state.readerFontSize += 2;
      localStorage.setItem('libroverse_reader_fs', state.readerFontSize);
      bodyEl.style.fontSize = `${state.readerFontSize}px`;
      document.getElementById('reader-font-val').textContent = `${state.readerFontSize}px`;
    }
  });

  // Font Family
  fontFamBtn?.addEventListener('click', () => {
    state.readerFontFamily = state.readerFontFamily === 'serif' ? 'sans' : 'serif';
    localStorage.setItem('libroverse_reader_ff', state.readerFontFamily);
    bodyEl.setAttribute('data-family', state.readerFontFamily);
    document.getElementById('font-family-label').textContent =
      state.readerFontFamily === 'serif' ? 'Serif' : 'Sans';
  });

  // Theme switches
  document.querySelectorAll('.reader-theme-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.readerTheme = btn.dataset.theme;
      localStorage.setItem('libroverse_reader_theme', state.readerTheme);
      document.getElementById('reader-container').setAttribute('data-theme', state.readerTheme);
      document.querySelectorAll('.reader-theme-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Chapters
  prevChapter?.addEventListener('click', () => {
    if (state.currentReadingBook && state.currentChapterIndex > 0) {
      openReaderModal(state.currentReadingBook, state.currentChapterIndex - 1);
    }
  });

  nextChapter?.addEventListener('click', () => {
    if (
      state.currentReadingBook &&
      state.currentChapterIndex < state.currentReadingBook.chapters.length - 1
    ) {
      openReaderModal(state.currentReadingBook, state.currentChapterIndex + 1);
    }
  });
}

// ==========================================================================
// STICKY COSMIC AUDIO PLAYER (WITH SPEECH SYNTHESIS)
// ==========================================================================
function startAudioPlayer(book) {
  state.currentAudioBook = book;
  const bar = document.getElementById('audio-player-bar');
  const thumb = document.getElementById('audio-thumb-img');
  const title = document.getElementById('audio-title-text');
  const author = document.getElementById('audio-author-text');
  const totalTime = document.getElementById('audio-total-time');

  if (!bar || !book) return;

  bar.hidden = false;
  if (thumb) thumb.src = book.cover || '/assets/libroverse-logo.jpg';
  if (title) title.textContent = book.title;
  if (author) author.textContent = `${book.author} • Narasi Studio`;
  if (totalTime) totalTime.textContent = book.audioDuration || '05:20';

  playAudioNarrator();
  showToast(`Memutar narasi kosmik "${book.title}"`, '🎧');
}

function playAudioNarrator() {
  const bar = document.getElementById('audio-player-bar');
  const playIcon = document.getElementById('audio-play-icon');
  const pauseIcon = document.getElementById('audio-pause-icon');

  if (!state.currentAudioBook) return;

  // Browser Speech Synthesis for Real Audio Experience
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // Reset previous speech
    const textToRead = `${state.currentAudioBook.title}. Oleh ${state.currentAudioBook.author}. ${state.currentAudioBook.synopsis}`;
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = state.currentAudioBook.language === 'en' ? 'en-US' : 'id-ID';
    utterance.rate = state.audioSpeed;
    utterance.volume = state.audioVolume;

    utterance.onend = () => {
      pauseAudioNarrator();
    };

    window.speechSynthesis.speak(utterance);
    state.speechUtterance = utterance;
  }

  state.isPlayingAudio = true;
  bar?.classList.add('playing');
  if (playIcon) playIcon.hidden = true;
  if (pauseIcon) pauseIcon.hidden = false;
}

function pauseAudioNarrator() {
  const bar = document.getElementById('audio-player-bar');
  const playIcon = document.getElementById('audio-play-icon');
  const pauseIcon = document.getElementById('audio-pause-icon');

  if ('speechSynthesis' in window) {
    window.speechSynthesis.pause();
  }

  state.isPlayingAudio = false;
  bar?.classList.remove('playing');
  if (playIcon) playIcon.hidden = false;
  if (pauseIcon) pauseIcon.hidden = true;
}

function setupAudioPlayerControls() {
  const playToggle = document.getElementById('audio-play-toggle');
  const rewindBtn = document.getElementById('audio-rewind-btn');
  const forwardBtn = document.getElementById('audio-forward-btn');
  const speedBtn = document.getElementById('audio-speed-btn');
  const volSlider = document.getElementById('audio-volume-slider');
  const closeBtn = document.getElementById('audio-bar-close');

  playToggle?.addEventListener('click', () => {
    if (state.isPlayingAudio) pauseAudioNarrator();
    else playAudioNarrator();
  });

  rewindBtn?.addEventListener('click', () => {
    showToast('Mundur 15 detik', '⏪');
  });

  forwardBtn?.addEventListener('click', () => {
    showToast('Maju 15 detik', '⏩');
  });

  speedBtn?.addEventListener('click', () => {
    const speeds = [1.0, 1.25, 1.5, 2.0];
    const currentIndex = speeds.indexOf(state.audioSpeed);
    state.audioSpeed = speeds[(currentIndex + 1) % speeds.length];
    speedBtn.textContent = `${state.audioSpeed.toFixed(1)}x`;

    if ('speechSynthesis' in window && state.isPlayingAudio) {
      playAudioNarrator();
    }
  });

  volSlider?.addEventListener('input', (e) => {
    state.audioVolume = parseFloat(e.target.value);
  });

  closeBtn?.addEventListener('click', () => {
    pauseAudioNarrator();
    const bar = document.getElementById('audio-player-bar');
    if (bar) bar.hidden = true;
  });
}

// ==========================================================================
// BOOK DETAIL POPUP MODAL
// ==========================================================================
function openBookDetailModal(book) {
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

  title.textContent = book.title;
  author.textContent = `oleh ${book.author}`;
  genre.textContent = book.genre;
  rating.textContent = `★ ${book.rating} (${book.reviewsCount} ulasan)`;
  pages.textContent = `${book.pages} Halaman`;
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

  formatTags.innerHTML = book.formats
    .map((f) => `<span class="format-icon-tag">${f.toUpperCase()}</span>`)
    .join('');

  const isInShelf = state.shelf.some((i) => i.id === book.id);
  if (shelfLabel) shelfLabel.textContent = isInShelf ? 'Hapus dari Rak' : 'Simpan ke Rak';

  modal.style.setProperty('display', 'flex', 'important');
  modal.classList.add('active');
  modal.hidden = false;
  modal.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';
}

function closeBookDetailModal() {
  const modal = document.getElementById('book-detail-modal');
  if (modal) {
    modal.style.setProperty('display', 'none', 'important');
    modal.classList.remove('active');
    modal.hidden = true;
    modal.setAttribute('hidden', '');
  }
  document.body.style.overflow = '';
}

function setupBookDetailModalEvents() {
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
      const isInShelf = state.shelf.some((i) => i.id === state.selectedBook.id);
      document.getElementById('detail-shelf-label').textContent = isInShelf
        ? 'Hapus dari Rak'
        : 'Simpan ke Rak';
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

// ==========================================================================
// REAL EBOOK & PDF DOWNLOAD GENERATOR
// ==========================================================================
function triggerEbookDownload(book, format) {
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

// ==========================================================================
// MY COSMIC SHELF DRAWER & STORAGE
// ==========================================================================
function updateShelfBadge() {
  const badge = document.getElementById('shelf-badge-count');
  const tabCount = document.getElementById('shelf-tab-count');
  if (badge) badge.textContent = state.shelf.length;
  if (tabCount) tabCount.textContent = state.shelf.length;
}

function toggleBookInShelf(book) {
  const index = state.shelf.findIndex((i) => i.id === book.id);
  if (index > -1) {
    state.shelf.splice(index, 1);
    showToast(`Dihapus dari Rak Kosmik: "${book.title}"`, '🗑️');
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
    showToast(`Disimpan ke Rak Kosmik: "${book.title}"`, '⭐');
  }

  localStorage.setItem('libroverse_shelf', JSON.stringify(state.shelf));
  updateShelfBadge();
  filterAndRenderBooks(); // re-render to update star state
  renderShelfDrawerList();
}

function addOrUpdateShelfStatus(book, status = 'reading') {
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
  localStorage.setItem('libroverse_shelf', JSON.stringify(state.shelf));
  updateShelfBadge();
  renderShelfDrawerList();
}

function renderShelfDrawerList() {
  const listEl = document.getElementById('shelf-items-list');
  if (!listEl) return;

  let items = [...state.shelf];
  if (state.activeShelfTab !== 'all') {
    items = items.filter((i) => i.status === state.activeShelfTab);
  }

  if (items.length === 0) {
    listEl.innerHTML = `
      <div class="shelf-empty-box">
        <span style="font-size: 2.5rem;">🌌</span>
        <h4>Rak Kosmik masih kosong</h4>
        <p style="font-size: 0.85rem;">Klik tombol bintang pada buku untuk menyimpannya ke rak baca pribadimu.</p>
      </div>
    `;
    return;
  }

  listEl.innerHTML = items
    .map((item) => {
      const fullBook = state.books.find((b) => b.id === item.id) || {};
      return `
      <div class="shelf-item-card">
        <img src="${item.cover || '/assets/libroverse-logo.jpg'}" alt="${item.title}" class="shelf-item-cover" />
        <div class="shelf-item-info">
          <h4 class="shelf-item-title">${item.title}</h4>
          <span class="shelf-item-author">${item.author}</span>
          <div class="shelf-item-actions">
            <button type="button" class="shelf-item-btn" data-shelf-read="${item.id}">Baca</button>
            <button type="button" class="shelf-item-btn" data-shelf-listen="${item.id}">Dengar</button>
            <button type="button" class="shelf-item-remove-btn" data-shelf-remove="${item.id}">Hapus</button>
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
      if (book) toggleBookInShelf(book);
    });
  });
}

function openShelfDrawer() {
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

function closeShelfDrawer() {
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

function setupShelfEvents() {
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
      localStorage.removeItem('libroverse_shelf');
      updateShelfBadge();
      renderShelfDrawerList();
      filterAndRenderBooks();
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

// ==========================================================================
// GLOBAL SEARCH & SHORTCUTS
// ==========================================================================
function setupSearchAndFilters() {
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

// ==========================================================================
// INDEXEDDB STORAGE FOR PERSONAL USER BOOKS (EPUB & PDF)
// ==========================================================================
const DB_NAME = 'libroverse_db';
const DB_VERSION = 1;
const STORE_NAME = 'user_books';

function openUserBookDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveBookToDB(book) {
  try {
    const db = await openUserBookDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const bookToSave = { ...book };
      delete bookToSave.pdfUrl; // Revokeable Blob URL
      store.put(bookToSave);
      tx.oncomplete = () => resolve(book);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB save fallback:', err);
    return book;
  }
}

async function getAllBooksFromDB() {
  try {
    const db = await openUserBookDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB read fallback:', err);
    return [];
  }
}

async function deleteBookFromDB(id) {
  try {
    const db = await openUserBookDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB delete error:', err);
  }
}

async function initUserBooksStorage() {
  try {
    const storedBooks = await getAllBooksFromDB();
    if (storedBooks && storedBooks.length > 0) {
      storedBooks.sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0));
      // Prepend stored user books to state.books
      state.books = [...storedBooks, ...BOOKS_DATA];
      filterAndRenderBooks();
    }
  } catch (e) {
    console.log('User books init error:', e);
  }
}

function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

// ==========================================================================
// IN-BROWSER EPUB PARSER (POWERED BY JSZip)
// ==========================================================================
async function parseEpubFile(file) {
  const zip = await JSZip.loadAsync(file);

  // 1. Locate container.xml to find the OPF package path
  const containerXml = await zip.file('META-INF/container.xml')?.async('text');
  if (!containerXml) {
    throw new Error('Berkas EPUB tidak memiliki META-INF/container.xml');
  }

  const parser = new DOMParser();
  const containerDoc = parser.parseFromString(containerXml, 'application/xml');
  const rootfile = containerDoc.querySelector('rootfile');
  const opfPath = rootfile?.getAttribute('full-path') || 'content.opf';
  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

  // 2. Read OPF file
  const opfXml = await zip.file(opfPath)?.async('text');
  if (!opfXml) {
    throw new Error('Gagal membaca paket metadata OPF EPUB');
  }

  const opfDoc = parser.parseFromString(opfXml, 'application/xml');
  const rawTitle = opfDoc.querySelector('title')?.textContent?.trim();
  const title = rawTitle || file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  const author = opfDoc.querySelector('creator')?.textContent?.trim() || 'Koleksi Pengguna';
  const language = opfDoc.querySelector('language')?.textContent?.trim() || 'id';
  const description =
    opfDoc.querySelector('description')?.textContent?.trim() ||
    'Buku digital koleksi pribadi yang diunggah ke Libroverse.';

  // 3. Extract Cover Image
  let coverDataUrl = null;
  const manifestItems = Array.from(opfDoc.querySelectorAll('manifest > item'));
  const coverItem = manifestItems.find((it) => {
    const props = it.getAttribute('properties') || '';
    const id = (it.getAttribute('id') || '').toLowerCase();
    const mediaType = it.getAttribute('media-type') || '';
    return (
      props.includes('cover-image') ||
      id.includes('cover') ||
      (mediaType.startsWith('image/') && (id.includes('thumb') || id.includes('front')))
    );
  });

  if (coverItem) {
    const href = coverItem.getAttribute('href');
    const fullPath = opfDir + href;
    const coverZipEntry = zip.file(fullPath) || zip.file(href);
    if (coverZipEntry) {
      const blob = await coverZipEntry.async('blob');
      coverDataUrl = await blobToDataUrl(blob);
    }
  }

  // 4. Extract Chapters
  const spineItemrefs = Array.from(opfDoc.querySelectorAll('spine > itemref'));
  const chapters = [];

  for (let i = 0; i < Math.min(spineItemrefs.length, 60); i++) {
    const idref = spineItemrefs[i].getAttribute('idref');
    const item = manifestItems.find((it) => it.getAttribute('id') === idref);
    if (item) {
      const href = item.getAttribute('href');
      const chPath = opfDir + href;
      const chFile = zip.file(chPath) || zip.file(href);
      if (chFile) {
        const rawHtml = await chFile.async('text');
        const chDoc = parser.parseFromString(rawHtml, 'text/html');

        // Sanitize scripts and styles
        chDoc.querySelectorAll('script, style, link, meta').forEach((el) => el.remove());

        const heading =
          chDoc.querySelector('h1, h2, h3, title')?.textContent?.trim() || `Bab ${i + 1}`;
        const bodyText = chDoc.body ? chDoc.body.innerHTML : rawHtml;
        const plainText = chDoc.body ? chDoc.body.textContent.trim() : '';

        if (plainText.length > 20) {
          chapters.push({
            title: heading,
            content: bodyText,
            isHtml: true
          });
        }
      }
    }
  }

  // Fallback: Read any HTML or XHTML files if spine was empty
  if (chapters.length === 0) {
    const htmlFiles = Object.keys(zip.files).filter(
      (n) => (n.endsWith('.html') || n.endsWith('.xhtml') || n.endsWith('.htm')) && !n.includes('cover')
    );
    for (let i = 0; i < Math.min(htmlFiles.length, 40); i++) {
      const rawHtml = await zip.file(htmlFiles[i]).async('text');
      const doc = parser.parseFromString(rawHtml, 'text/html');
      doc.querySelectorAll('script, style, link').forEach((el) => el.remove());
      const title = doc.querySelector('h1, h2, title')?.textContent?.trim() || `Bagian ${i + 1}`;
      chapters.push({
        title,
        content: doc.body ? doc.body.innerHTML : rawHtml,
        isHtml: true
      });
    }
  }

  if (chapters.length === 0) {
    chapters.push({
      title: 'Bab Pembuka',
      content: `<p>Berhasil mengekstrak ${file.name}. Selamat membaca di pembaca Libroverse.</p>`,
      isHtml: true
    });
  }

  return {
    title,
    author,
    language,
    description,
    coverDataUrl,
    chapters
  };
}

// ==========================================================================
// UPLOAD MODAL EVENT CONTROLLER
// ==========================================================================
let pendingUploadedBook = null;

function setupUploadModal() {
  const modal = document.getElementById('upload-modal');
  const openBtn = document.getElementById('open-upload-btn');
  const heroBtn = document.getElementById('hero-upload-btn');
  const closeBtn = document.getElementById('upload-modal-close');
  const dropzone = document.getElementById('upload-dropzone');
  const fileInput = document.getElementById('book-file-input');
  const browseBtn = document.getElementById('dropzone-browse-btn');
  const loadingBox = document.getElementById('upload-loading-box');
  const loadingText = document.getElementById('upload-loading-text');
  const previewBox = document.getElementById('upload-preview-box');
  const previewTitle = document.getElementById('preview-book-title');
  const previewMeta = document.getElementById('preview-book-meta');
  const previewThumb = document.getElementById('preview-cover-thumb');
  const inputTitle = document.getElementById('upload-input-title');
  const inputAuthor = document.getElementById('upload-input-author');
  const inputGenre = document.getElementById('upload-input-genre');
  const saveShelfBtn = document.getElementById('preview-save-shelf-btn');
  const readNowBtn = document.getElementById('preview-read-now-btn');

  function openModal() {
    if (!modal) return;
    modal.style.setProperty('display', 'flex', 'important');
    modal.classList.add('active');
    modal.hidden = false;
    modal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    resetUploadUI();
  }

  function closeModal() {
    if (!modal) return;
    modal.style.setProperty('display', 'none', 'important');
    modal.classList.remove('active');
    modal.hidden = true;
    modal.setAttribute('hidden', '');
    document.body.style.overflow = '';
    resetUploadUI();
  }

  function resetUploadUI() {
    pendingUploadedBook = null;
    if (fileInput) fileInput.value = '';
    if (loadingBox) loadingBox.hidden = true;
    if (previewBox) previewBox.hidden = true;
    if (dropzone) dropzone.hidden = false;
  }

  openBtn?.addEventListener('click', openModal);
  heroBtn?.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  browseBtn?.addEventListener('click', () => fileInput?.click());
  dropzone?.addEventListener('click', (e) => {
    if (e.target !== browseBtn) fileInput?.click();
  });

  // Drag & drop highlight
  ['dragenter', 'dragover'].forEach((eventName) => {
    dropzone?.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropzone?.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
    });
  });

  dropzone?.addEventListener('drop', (e) => {
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFileSelected(files[0]);
    }
  });

  fileInput?.addEventListener('change', (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelected(files[0]);
    }
  });

  async function handleFileSelected(file) {
    const fileName = file.name.toLowerCase();
    const isEpub = fileName.endsWith('.epub');
    const isPdf = fileName.endsWith('.pdf');
    const isTxt = fileName.endsWith('.txt');

    if (!isEpub && !isPdf && !isTxt) {
      showToast('Format tidak didukung. Harap upload berkas .EPUB, .PDF, atau .TXT', '⚠️');
      return;
    }

    if (dropzone) dropzone.hidden = true;
    if (loadingBox) {
      loadingBox.hidden = false;
      if (loadingText) loadingText.textContent = `Memproses dan membaca "${file.name}"...`;
    }

    try {
      let bookData = {};

      if (isEpub) {
        if (loadingText) loadingText.textContent = `Mengekstrak paket buku EPUB dengan JSZip...`;
        bookData = await parseEpubFile(file);
      } else if (isPdf) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        bookData = {
          title: cleanName,
          author: 'Koleksi PDF Pribadi',
          language: 'id',
          description: `Dokumen PDF pribadi: ${file.name}.`,
          coverDataUrl: null,
          chapters: [],
          isPdf: true
        };
      } else if (isTxt) {
        const text = await file.text();
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        bookData = {
          title: cleanName,
          author: 'Teks Pribadi',
          language: 'id',
          description: text.slice(0, 200) + '...',
          coverDataUrl: null,
          chapters: [{ title: 'Bab 1', content: text, isHtml: false }]
        };
      }

      const fileExt = isEpub ? 'epub' : isPdf ? 'pdf' : 'txt';
      const formattedSize = formatBytes(file.size);

      pendingUploadedBook = {
        id: 'user-' + Date.now(),
        title: bookData.title || file.name,
        subtitle: isPdf ? 'Dokumen PDF Pribadi' : 'Buku Digital Unggahan Anda',
        author: bookData.author || 'Pengarang Pribadi',
        genre: 'Koleksi Pribadi',
        language: bookData.language || 'id',
        langLabel: 'Pribadi',
        rating: 5.0,
        reviewsCount: 1,
        pages: isPdf ? 1 : Math.max(1, (bookData.chapters || []).length * 15),
        fileSize: `${formattedSize} ${fileExt.toUpperCase()}`,
        readingTime: `${Math.max(5, Math.round(file.size / 40000))} mnt baca`,
        formats: [fileExt],
        fileType: fileExt,
        isPdf: isPdf,
        badge: 'Koleksi Pribadi',
        featured: false,
        cover: bookData.coverDataUrl || null,
        coverAlt: `Sampul buku ${bookData.title}`,
        synopsis: bookData.description || 'Buku digital koleksi pribadi.',
        quote: 'Setiap buku yang kamu baca adalah jendela semesta baru.',
        chapters: bookData.chapters || [],
        rawFileBlob: file,
        isUserUploaded: true,
        uploadedAt: new Date().toISOString()
      };

      // Show Preview UI
      if (loadingBox) loadingBox.hidden = true;
      if (previewBox) previewBox.hidden = false;

      if (previewTitle) previewTitle.textContent = pendingUploadedBook.title;
      if (previewMeta) previewMeta.textContent = `${pendingUploadedBook.fileSize} • Siap disimpan & dibaca`;
      if (previewThumb) {
        if (pendingUploadedBook.cover) {
          previewThumb.innerHTML = `<img src="${pendingUploadedBook.cover}" style="width: 44px; height: 60px; object-fit: cover; border-radius: 6px;" alt="Cover" />`;
        } else {
          previewThumb.innerHTML = isPdf ? '📄' : '📚';
        }
      }

      if (inputTitle) inputTitle.value = pendingUploadedBook.title;
      if (inputAuthor) inputAuthor.value = pendingUploadedBook.author;
      if (inputGenre) inputGenre.value = 'Koleksi Pribadi';

      showToast(`Berhasil membaca "${file.name}"!`, '✨');
    } catch (err) {
      console.error('Error parsing book file:', err);
      if (loadingBox) loadingBox.hidden = true;
      if (dropzone) dropzone.hidden = false;
      showToast(`Gagal membaca berkas: ${err.message}`, '❌');
    }
  }

  function commitEditedMetadata() {
    if (!pendingUploadedBook) return;
    if (inputTitle && inputTitle.value.trim()) {
      pendingUploadedBook.title = inputTitle.value.trim();
    }
    if (inputAuthor && inputAuthor.value.trim()) {
      pendingUploadedBook.author = inputAuthor.value.trim();
    }
    if (inputGenre && inputGenre.value) {
      pendingUploadedBook.genre = inputGenre.value;
    }
  }

  // Save to Collection & Shelf
  saveShelfBtn?.addEventListener('click', async () => {
    if (!pendingUploadedBook) return;
    commitEditedMetadata();

    // Persist to IndexedDB
    await saveBookToDB(pendingUploadedBook);

    // Add to active state
    state.books.unshift(pendingUploadedBook);
    addOrUpdateShelfStatus(pendingUploadedBook, 'saved');
    filterAndRenderBooks();

    closeModal();
    showToast(`Buku "${pendingUploadedBook.title}" berhasil ditambahkan ke koleksi Anda! 🚀`, '📚');
  });

  // Read Now Directly
  readNowBtn?.addEventListener('click', async () => {
    if (!pendingUploadedBook) return;
    commitEditedMetadata();

    const bookToOpen = pendingUploadedBook;
    await saveBookToDB(bookToOpen);

    state.books.unshift(bookToOpen);
    addOrUpdateShelfStatus(bookToOpen, 'reading');
    filterAndRenderBooks();

    closeModal();
    openReaderModal(bookToOpen, 0);
  });
}

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
// INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Ensure all overlays and drawers are strictly closed on startup
  closeReaderModal();
  closeBookDetailModal();
  closeShelfDrawer();

  initCosmicCanvas();
  renderGenrePills();
  filterAndRenderBooks();
  updateShelfBadge();

  setupReaderControls();
  setupAudioPlayerControls();
  setupBookDetailModalEvents();
  setupShelfEvents();
  setupSearchAndFilters();
  setupUploadModal();
  setupPwa();

  // Load user uploaded books from IndexedDB
  await initUserBooksStorage();

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
      state.currentLang = opt.dataset.lang;
      document.getElementById('current-lang-code').textContent = opt.dataset.lang.toUpperCase();
      document.getElementById('current-lang-flag').textContent = opt.querySelector('.flag').textContent;
      document.querySelectorAll('.lang-option').forEach((o) => o.classList.remove('active'));
      opt.classList.add('active');
      langMenu.hidden = true;
      showToast(`Bahasa diganti ke ${opt.textContent.trim()}`, '🌐');
    });
  });

  document.addEventListener('click', () => {
    if (langMenu) langMenu.hidden = true;
  });

  console.log('🪐 Libroverse initialized successfully. Personal book upload & IndexedDB active!');
});
