import JSZip from 'jszip';
import { BOOKS_DATA, GENRES_LIST } from './data/books.js';

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
  currentLang: localStorage.getItem('libroverse_lang') || 'id',

  // Reader State
  currentReadingBook: null,
  currentChapterIndex: 0,
  currentPageIndex: 0,
  readerMode: localStorage.getItem('libroverse_reader_mode') || 'page',
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
// INTERNATIONALIZATION (i18n) DICTIONARY & MULTI-LANGUAGE SYSTEM
// ==========================================================================
const I18N_DICT = {
  id: {
    lang_name: 'Bahasa Indonesia',
    search_placeholder: "Cari judul, penulis, rasi genre... (Tekan '/' untuk cari)",
    ambient_music: 'Musik Kosmik',
    ambient_music_title: 'Nyalakan Musik Semesta Santai',
    upload_btn: 'Upload EPUB/PDF',
    shelf_btn: 'Rak Kosmik',
    install_app: 'Pasang App',
    hero_badge: 'Gerbang Literasi Bebas Tanpa Batas',
    hero_badge_pill: 'Gratis Selamanya',
    hero_title: 'Jelajahi Semesta Buku di <br /><span class="gradient-text">Libroverse</span>',
    hero_subtitle: 'Temukan ribuan karya sastra dunia, fiksi ilmiah antariksa, cerita nusantara, dan audiobook memukau. Baca daring langsung di peramban atau unduh file bersih <strong>EPUB & PDF</strong> kapan saja.',
    hero_prompt_placeholder: 'Ketik alur cerita yang kamu bayangkan, suasana hati, atau tokoh impian...',
    explore_btn: 'Jelajahi',
    inspiration_label: 'Inspirasi Galaksi:',
    hero_upload_action: '📤 Upload Koleksi Buku Saya (EPUB / PDF)',
    stat_books: 'Buku Digital Gratis',
    stat_audio: 'Audiobook Bersuara',
    stat_lang: 'Bahasa Dunia',
    stat_legal: 'Domain Publik & Legal',
    spotlight_badge: '★ Sorotan Bintang Hari Ini',
    read_sample: 'Baca Cuplikan',
    play_audio: 'Putar Audio',
    catalogue_kicker: '✦ Rasi Bintang Pustaka',
    catalogue_title: 'Jelajahi Koleksi Semesta',
    format_all: 'Semua Format',
    format_epub: '📖 EPUB',
    format_pdf: '📄 PDF',
    format_audio: '🎧 Audiobook',
    sort_popular: 'Paling Populer',
    sort_rating: 'Rating Tertinggi',
    sort_newest: 'Buku Terbaru',
    sort_pages: 'Halaman Terpanjang',
    results_showing: 'Menampilkan {n} buku kosmik',
    empty_title: 'Tidak ada bintang di koordinat ini',
    empty_text: 'Coba ubah kata kunci pencarian atau reset filter genre untuk menemukan buku lainnya.',
    reset_filters: 'Reset Semua Filter',
    curated_badge: '🌴 Mahakarya Nusantara',
    curated_title: 'Warisan Sastra & Cerita Kepulauan Langit',
    curated_desc: 'Dari hikayat pelaut Nusantara yang membaca arah lewat rasi bintang pari, hingga fiksi spekulatif masa depan pulau-pulau melayang. Nikmati karya sastra Indonesia pilihan dengan narasi suara berkualitas studio.',
    curated_btn: 'Telusuri Koleksi Nusantara',
    newsletter_title: 'Dapatkan Kiriman Bintang Buku Baru',
    newsletter_desc: 'Satu surat semesta setiap minggu berisi rekomendasi buku gratis terbaik, ulasan astronomis, dan rilis audiobook terbaru langsung ke kotak masukmu.',
    newsletter_btn: 'Berlangganan',
    newsletter_ph: 'Ketik alamat email kosmikmu...',
    newsletter_notice: 'Bebas spam. Berhenti berlangganan kapan pun dengan sekali klik.',
    footer_tagline: 'Perpustakaan digital lintas galaksi. Membuka akses buku berkualitas untuk semua insan di muka bumi dan sekitarnya.',
    footer_status: 'Semua Sistem Kosmik Online di Vercel',
    footer_col_nav: 'Navigasi Pustaka',
    footer_col_format: 'Format File',
    footer_col_license: 'Kebijakan & Lisensi',
    footer_copyright: '© 2026 Libroverse. Dirancang dengan cinta kosmik untuk pembaca semesta.',
    reader_toc: '📑 Daftar Isi',
    reader_toc_header: '📑 Daftar Isi & Bab',
    reader_mode_pages: '📖 Halaman',
    reader_mode_scroll: '📜 Mode Gulir',
    reader_prev: 'Sebelumnya',
    reader_next: 'Berikutnya',
    reader_jump: 'Lompat:',
    reader_chapter_prev: '← Bab Sebelumnya',
    reader_chapter_next: 'Bab Berikutnya →',
    reader_completed: 'selesai',
    reader_chapter_of: 'Bab {cur} dari {total}',
    shelf_title: 'Rak Kosmik Saya',
    shelf_all: 'Semua Buku',
    shelf_reading: 'Sedang Dibaca',
    shelf_finished: 'Selesai',
    shelf_clear: 'Kosongkan Rak',
    shelf_browse: 'Tambah Buku Baru',
    detail_read: 'Baca Sekarang',
    detail_listen: 'Dengarkan Audiobook',
    detail_save: 'Simpan ke Rak',
    detail_saved: 'Tersimpan di Rak',
    synopsis_title: 'Sinopsis Semesta',
    download_label: 'Unduh Gratis:',
    upload_modal_title: 'Upload Buku EPUB / PDF / TXT',
    dropzone_title: 'Seret & lepas berkas buku ke sini',
    dropzone_sub: 'Mendukung format EPUB, PDF, dan TXT (Maks. 50 MB)',
    browse_files: 'Pilih Berkas dari Perangkat',
    upload_label_title: 'Judul Buku (Title):',
    upload_label_author: 'Penulis (Author):',
    upload_label_genre: 'Kategori / Rak:',
    upload_save_btn: '💾 Simpan ke Koleksi Saya',
    upload_read_btn: '📖 Baca Sekarang',
    card_read: 'Baca Online',
    card_audio: 'Audio',
    card_download: 'Unduh',
    card_save: 'Simpan',
    card_saved: 'Tersimpan',
    audio_playing: 'Memutar narasi kosmik "{title}"',
    toast_lang_changed: 'Bahasa diganti ke {lang}'
  },
  en: {
    lang_name: 'English',
    search_placeholder: "Search titles, authors, genres... (Press '/' to search)",
    ambient_music: 'Cosmic Audio',
    ambient_music_title: 'Play Relaxing Ambient Chimes',
    upload_btn: 'Upload EPUB/PDF',
    shelf_btn: 'My Bookshelf',
    install_app: 'Install App',
    hero_badge: 'Limitless Open Literature Gateway',
    hero_badge_pill: 'Forever Free',
    hero_title: 'Explore the Universe of Books on <br /><span class="gradient-text">Libroverse</span>',
    hero_subtitle: 'Discover thousands of world classics, space science fiction, cultural lore, and narrated audiobooks. Read directly in your browser or download clean <strong>EPUB & PDF</strong> files anytime.',
    hero_prompt_placeholder: 'Type a story plot you imagine, a mood, or a character archetype...',
    explore_btn: 'Explore',
    inspiration_label: 'Galaxy Inspiration:',
    hero_upload_action: '📤 Upload My Personal Book (EPUB / PDF)',
    stat_books: 'Free Digital Books',
    stat_audio: 'Narrated Audiobooks',
    stat_lang: 'World Languages',
    stat_legal: 'Public Domain & Legal',
    spotlight_badge: '★ Curator\'s Star Spotlight Today',
    read_sample: 'Read Preview',
    play_audio: 'Play Audio',
    catalogue_kicker: '✦ Constellation Catalog',
    catalogue_title: 'Explore the Universal Collection',
    format_all: 'All Formats',
    format_epub: '📖 EPUB',
    format_pdf: '📄 PDF',
    format_audio: '🎧 Audiobook',
    sort_popular: 'Most Popular',
    sort_rating: 'Highest Rated',
    sort_newest: 'Newest Arrivals',
    sort_pages: 'Most Pages',
    results_showing: 'Showing {n} cosmic books',
    empty_title: 'No stars found at these coordinates',
    empty_text: 'Try changing your search keywords or resetting genre filters to find more books.',
    reset_filters: 'Reset All Filters',
    curated_badge: '🌴 Indonesian Literature Masterpiece',
    curated_title: 'Maritime Heritage & Sky Island Tales',
    curated_desc: 'From ancient maritime epics navigating by the Southern Cross, to speculative fiction of floating islands. Enjoy curated Indonesian literature with studio-quality audio narration.',
    curated_btn: 'Browse Nusantara Collection',
    newsletter_title: 'Get New Book Deliveries in Orbit',
    newsletter_desc: 'One cosmic dispatch every week with the finest free book recommendations, literary reviews, and audiobook releases sent directly to your inbox.',
    newsletter_btn: 'Subscribe',
    newsletter_ph: 'Enter your stellar email address...',
    newsletter_notice: 'Zero spam. Unsubscribe at any time with a single click.',
    footer_tagline: 'An intergalactic digital library. Opening free access to inspiring literature for all curious minds across the universe.',
    footer_status: 'All Cosmic Systems Online on Vercel',
    footer_col_nav: 'Library Navigation',
    footer_col_format: 'File Formats',
    footer_col_license: 'Policy & Licenses',
    footer_copyright: '© 2026 Libroverse. Crafted with cosmic love for stargazing readers everywhere.',
    reader_toc: '📑 Table of Contents',
    reader_toc_header: '📑 Table of Contents & Chapters',
    reader_mode_pages: '📖 Pages',
    reader_mode_scroll: '📜 Scroll Mode',
    reader_prev: 'Previous',
    reader_next: 'Next',
    reader_jump: 'Jump:',
    reader_chapter_prev: '← Previous Chapter',
    reader_chapter_next: 'Next Chapter →',
    reader_completed: 'completed',
    reader_chapter_of: 'Chapter {cur} of {total}',
    shelf_title: 'My Cosmic Bookshelf',
    shelf_all: 'All Books',
    shelf_reading: 'Currently Reading',
    shelf_finished: 'Finished',
    shelf_clear: 'Clear Shelf',
    shelf_browse: 'Add New Books',
    detail_read: 'Read Now',
    detail_listen: 'Listen to Audiobook',
    detail_save: 'Save to Shelf',
    detail_saved: 'Saved in Shelf',
    synopsis_title: 'Universal Synopsis',
    download_label: 'Free Download:',
    upload_modal_title: 'Upload EPUB / PDF / TXT Book',
    dropzone_title: 'Drag & drop your book file here',
    dropzone_sub: 'Supports EPUB, PDF, and TXT formats (Max 50 MB)',
    browse_files: 'Browse File from Device',
    upload_label_title: 'Book Title:',
    upload_label_author: 'Author / Creator:',
    upload_label_genre: 'Category / Shelf:',
    upload_save_btn: '💾 Save to My Collection',
    upload_read_btn: '📖 Read Now',
    card_read: 'Read Online',
    card_audio: 'Audio',
    card_download: 'Download',
    card_save: 'Save',
    card_saved: 'Saved',
    audio_playing: 'Playing cosmic narration "{title}"',
    toast_lang_changed: 'Language switched to {lang}'
  }
};

function t(key, params = {}) {
  const lang = state.currentLang || 'id';
  let str = I18N_DICT[lang]?.[key] || I18N_DICT.en?.[key] || I18N_DICT.id?.[key] || key;
  Object.keys(params).forEach((k) => {
    str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), params[k]);
  });
  return str;
}

function getTranslatedGenre(genre, lang = state.currentLang) {
  if (!genre) return '';
  if (lang !== 'en') return genre;
  const genreMap = {
    'Semua': 'All',
    'Filsafat & Sains': 'Philosophy & Science',
    'Klasik Dunia': 'World Classics',
    'Sastra Indonesia': 'Indonesian Literature',
    'Self Development': 'Self Development',
    'Psikologi & Parenting': 'Psychology & Parenting',
    'Sci-Fi & Antariksa': 'Sci-Fi & Space',
    'Koleksi Pribadi': 'Personal Collection',
    'Misteri & Thriller': 'Mystery & Thriller',
    'Fantasi Epik': 'Epic Fantasy'
  };
  return genreMap[genre] || genre;
}

function applyLanguage(lang = 'id') {
  if (!I18N_DICT[lang] && lang !== 'bn' && lang !== 'es' && lang !== 'jp') {
    lang = 'id';
  }
  state.currentLang = lang;
  localStorage.setItem('libroverse_lang', lang);
  document.documentElement.lang = lang;

  // Update switcher flag & label
  const flagMap = { id: '🇮🇩', en: '🇬🇧', bn: '🇧🇩', es: '🇪🇸', jp: '🇯🇵' };
  const flagEl = document.getElementById('current-lang-flag');
  const codeEl = document.getElementById('current-lang-code');
  if (flagEl) flagEl.textContent = flagMap[lang] || '🌐';
  if (codeEl) codeEl.textContent = lang.toUpperCase();

  document.querySelectorAll('.lang-option').forEach((opt) => {
    opt.classList.toggle('active', opt.dataset.lang === lang);
  });

  // Update declarative data-i18n attributes in the DOM
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    const key = el.getAttribute('data-i18n-html');
    el.innerHTML = t(key);
  });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
    const key = el.getAttribute('data-i18n-ph');
    el.setAttribute('placeholder', t(key));
  });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    el.setAttribute('title', t(key));
  });

  // Update Sort select option labels
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    const sortKeys = ['popular', 'rating', 'newest', 'pages'];
    sortKeys.forEach((k) => {
      const opt = sortSelect.querySelector(`option[value="${k}"]`);
      if (opt) opt.textContent = t(`sort_${k}`);
    });
  }

  // Re-render dynamic sections with new language
  renderGenrePills();
  filterAndRenderBooks();

  // Update reader labels if open
  updateReaderLabels();
}

function updateReaderLabels() {
  const modeLabel = document.getElementById('reader-mode-label');
  if (modeLabel) {
    modeLabel.textContent = state.readerMode === 'scroll' ? t('reader_mode_scroll') : t('reader_mode_pages');
  }
  const prevText = document.getElementById('reader-prev-btn-text');
  if (prevText) prevText.textContent = t('reader_prev');
  const nextText = document.getElementById('reader-next-btn-text');
  if (nextText) nextText.textContent = t('reader_next');
}

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
      } catch (_) { }
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
// IN-BROWSER EBOOK READER & MULTI-PAGE ENGINE
// ==========================================================================
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizePosixPath(baseDir, relativePath) {
  if (!relativePath) return '';
  let clean = relativePath.split('#')[0].split('?')[0];
  try {
    clean = decodeURIComponent(clean);
  } catch (e) { }
  clean = clean.replace(/\\/g, '/');
  if (clean.startsWith('/')) {
    clean = clean.replace(/^\/+/, '');
  } else if (baseDir) {
    clean = (baseDir.endsWith('/') ? baseDir : baseDir + '/') + clean;
  }
  const parts = clean.split('/');
  const stack = [];
  for (const p of parts) {
    if (!p || p === '.') continue;
    if (p === '..') {
      if (stack.length > 0) stack.pop();
    } else {
      stack.push(p);
    }
  }
  return stack.join('/');
}

function resolveZipEntry(zip, opfDir, href) {
  if (!href || !zip) return null;
  const target = normalizePosixPath(opfDir, href);
  let entry = zip.file(target);
  if (entry) return entry;

  const rawClean = normalizePosixPath('', href);
  entry = zip.file(rawClean);
  if (entry) return entry;

  const lowerTarget = target.toLowerCase();
  const baseName = target.split('/').pop().toLowerCase();
  const allKeys = Object.keys(zip.files);

  const matchedKey = allKeys.find((k) => k.toLowerCase() === lowerTarget);
  if (matchedKey) return zip.file(matchedKey);

  const matchedEndKey = allKeys.find(
    (k) => k.toLowerCase().endsWith('/' + baseName) || k.toLowerCase() === baseName
  );
  if (matchedEndKey) return zip.file(matchedEndKey);

  return null;
}

function paginateHtmlContent(html, wordsPerPage = 380) {
  if (!html || !html.trim()) return ['<p><em>Halaman kosong.</em></p>'];

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const container = doc.body.firstElementChild || doc.body;

    const children = Array.from(container.children);
    if (children.length === 0) {
      const rawText = container.textContent || html;
      const paragraphs = rawText.split(/\n\s*\n+/).filter((p) => p.trim().length > 0);
      if (paragraphs.length <= 1) {
        const words = rawText.trim().split(/\s+/).filter(Boolean);
        if (words.length <= wordsPerPage) {
          return [`<p>${escapeHtml(rawText)}</p>`];
        }
        const pages = [];
        for (let i = 0; i < words.length; i += wordsPerPage) {
          const chunk = words.slice(i, i + wordsPerPage).join(' ');
          pages.push(`<p>${escapeHtml(chunk)}</p>`);
        }
        return pages.length > 0 ? pages : [html];
      }
      const reconstituted = paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('');
      return paginateHtmlContent(reconstituted, wordsPerPage);
    }

    const pages = [];
    let currentBlocks = [];
    let currentWordCount = 0;

    for (const el of children) {
      const isPageBreak =
        el.tagName.toLowerCase() === 'hr' ||
        el.classList.contains('pagebreak') ||
        el.getAttribute('epub:type') === 'pagebreak';

      if (isPageBreak && currentBlocks.length > 0) {
        pages.push(currentBlocks.map((b) => b.outerHTML).join(''));
        currentBlocks = [];
        currentWordCount = 0;
        continue;
      }

      const text = el.textContent || '';
      const wordCount = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;

      if (wordCount > 500) {
        if (currentBlocks.length > 0) {
          pages.push(currentBlocks.map((b) => b.outerHTML).join(''));
          currentBlocks = [];
          currentWordCount = 0;
        }

        const sentences = text.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g) || [text];
        let subSentences = [];
        let subCount = 0;

        for (const sent of sentences) {
          const sWords = sent.trim().split(/\s+/).filter(Boolean).length;
          if (subCount + sWords > wordsPerPage && subSentences.length > 0) {
            pages.push(`<p>${escapeHtml(subSentences.join(' ').trim())}</p>`);
            subSentences = [sent];
            subCount = sWords;
          } else {
            subSentences.push(sent);
            subCount += sWords;
          }
        }
        if (subSentences.length > 0) {
          pages.push(`<p>${escapeHtml(subSentences.join(' ').trim())}</p>`);
        }
        continue;
      }

      if (currentWordCount + wordCount > wordsPerPage && currentWordCount >= 160) {
        pages.push(currentBlocks.map((b) => b.outerHTML).join(''));
        currentBlocks = [el];
        currentWordCount = wordCount;
      } else {
        currentBlocks.push(el);
        currentWordCount += wordCount;
      }
    }

    if (currentBlocks.length > 0) {
      pages.push(currentBlocks.map((b) => b.outerHTML).join(''));
    }

    return pages.length > 0 ? pages : [html];
  } catch (err) {
    console.warn('Pagination parsing error:', err);
    return [html];
  }
}

function buildBookPages(book) {
  if (!book) return [];
  if (book.pagesList && book.pagesList.length > 0) {
    return book.pagesList;
  }

  // Smart splitting pass: Check if chapters contain sub-sections matching the book's Table of Contents or headings
  const initialChapters = book.chapters || [];
  const expandedChapters = [];

  // Gather known TOC titles from book
  const knownTocTitles = [];
  initialChapters.forEach((c) => {
    if (c.title) knownTocTitles.push(c.title);
  });
  // Check if any chapter is a Table of Contents ("Contents" / "Daftar Isi")
  initialChapters.forEach((c) => {
    if (/(?:contents|table of contents|daftar isi)/i.test(c.title || '')) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(c.content || '', 'text/html');
      doc.querySelectorAll('li, a, p').forEach((el) => {
        const t = el.textContent.trim();
        if (t.length >= 3 && t.length <= 120 && !knownTocTitles.includes(t)) {
          knownTocTitles.push(t);
        }
      });
    }
  });

  initialChapters.forEach((ch, idx) => {
    if (ch.isHtml) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(ch.content || '', 'text/html');
      const splits = splitHtmlByTocOrHeadings(doc, knownTocTitles);
      if (splits && splits.length > 1) {
        splits.forEach((s) => expandedChapters.push(s));
      } else {
        expandedChapters.push(ch);
      }
    } else {
      const splits = parseTextIntoChapters(ch.content, ch.title || `Bab ${idx + 1}`);
      if (splits && splits.length > 1) {
        splits.forEach((s) => expandedChapters.push(s));
      } else {
        expandedChapters.push(ch);
      }
    }
  });

  book.chapters = expandedChapters;
  const chapters = expandedChapters;
  const pagesList = [];
  const toc = [];

  chapters.forEach((ch, chIdx) => {
    const chTitle = ch.title || `Bab ${chIdx + 1}`;
    const startPageIndex = pagesList.length;

    let chPages = [];
    if (ch.isHtml) {
      chPages = paginateHtmlContent(ch.content, 380);
    } else {
      const rawParas = (ch.content || '').split('\n\n').filter((p) => p.trim().length > 0);
      const htmlContent = rawParas
        .map((p) => {
          const trimmed = p.trim();
          if (trimmed.startsWith('[Exercise:') || trimmed.startsWith('Exercise:') || trimmed.startsWith('Latihan:')) {
            const labelMatch = trimmed.match(/^\[?(Exercise:[^\]\n]+|Latihan:[^\]\n]+)\]?/i);
            const label = labelMatch ? labelMatch[1] : 'Exercise';
            const body = trimmed.replace(/^\[?(Exercise:[^\]\n]+|Latihan:[^\]\n]+)\]?\s*/i, '');
            return `
              <div class="reader-exercise-box">
                <div class="reader-exercise-badge">💡 ${escapeHtml(label)}</div>
                ${body ? `<p class="reader-exercise-text">${escapeHtml(body)}</p>` : ''}
              </div>
            `;
          }
          return `<p>${escapeHtml(p)}</p>`;
        })
        .join('');
      chPages = paginateHtmlContent(htmlContent, 380);
    }

    if (chPages.length === 0) {
      chPages = ['<p><em>Tidak ada konten di bab ini.</em></p>'];
    }

    const isMajorPart =
      /^(part|bagian|book|jilid|volume|act|bab\s+\d+|chapter\s+\d+|introduction|dedication|foreword|prologue|epilogue|appendix|appendices|about\s+the\s+author)/i.test(
        chTitle.trim()
      );
    const depth = isMajorPart ? 1 : 2;

    chPages.forEach((pageHtml, pIdx) => {
      pagesList.push({
        globalPageIndex: pagesList.length,
        chapterIndex: chIdx,
        chapterTitle: chTitle,
        pageInChapter: pIdx + 1,
        totalInChapter: chPages.length,
        contentHtml: pageHtml
      });
    });

    toc.push({
      chapterIndex: chIdx,
      title: chTitle,
      startPageIndex: startPageIndex,
      totalPages: chPages.length,
      depth: depth
    });
  });

  if (pagesList.length === 0) {
    pagesList.push({
      globalPageIndex: 0,
      chapterIndex: 0,
      chapterTitle: book.title || 'Halaman Pembuka',
      pageInChapter: 1,
      totalInChapter: 1,
      contentHtml: `<p>${escapeHtml(book.synopsis || 'Selamat membaca di Libroverse.')}</p>`
    });
    toc.push({
      chapterIndex: 0,
      title: book.title || 'Halaman Pembuka',
      startPageIndex: 0,
      totalPages: 1,
      depth: 1
    });
  }

  book.pagesList = pagesList;
  book.totalPages = pagesList.length;
  book.toc = toc;
  return pagesList;
}

function goToNextReaderPage() {
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

function goToPrevReaderPage() {
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

function openReaderModal(book, targetPageIndex = 0) {
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
        <div class="reader-pdf-container">
          <div class="reader-pdf-toolbar">
            <span>Format: Dokumen PDF Asli (${book.fileSize || 'PDF'})</span>
            <a href="${pdfUrl}" target="_blank" download="${book.title}.pdf">↗ Buka PDF di Tab Baru / Unduh</a>
          </div>
          <iframe src="${pdfUrl}#toolbar=1" class="reader-pdf-frame" title="${book.title}"></iframe>
        </div>
      `;
    }
  } else {
    // Handle EPUB & Paginated Content
    const totalPages = book.pagesList ? book.pagesList.length : 1;
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
              <span class="reader-toc-page-badge">Hal. ${item.startPageIndex + 1}</span>
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

function closeReaderModal() {
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

function setupReaderControls() {
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
    localStorage.setItem('libroverse_reader_mode', state.readerMode);
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
          // Swipe left -> next page
          goToNextReaderPage();
        } else {
          // Swipe right -> previous page
          goToPrevReaderPage();
        }
      }
    }
  }, { passive: true });
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

  formatTags.innerHTML = book.formats
    .map((f) => `<span class="format-icon-tag">${f.toUpperCase()}</span>`)
    .join('');

  const isInShelf = state.shelf.some((i) => i.id === book.id);
  if (shelfLabel) shelfLabel.textContent = isInShelf ? (isEn ? 'Remove from Shelf' : 'Hapus dari Rak') : (isEn ? 'Save to Shelf' : 'Simpan ke Rak');

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
      const fullBook = state.books.find((b) => b.id === item.id) || {};
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
      // Prepend stored user books to state.books, ensuring paginated pages exist
      storedBooks.forEach((b) => {
        if (!b.pagesList || b.pagesList.length === 0) {
          buildBookPages(b);
        }
      });
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
// SMART CONTENT / TABLE OF CONTENTS (TOC) SPLITTING ENGINE
// ==========================================================================
function normalizeTitle(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^\w\s\d]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Splits an HTML document into multiple chapters if elements match entries from
 * the book's Table of Contents ("Contents"), or denote distinct section headings.
 * Matching text becomes the title of the next chapter.
 */
function splitHtmlByTocOrHeadings(chDoc, tocTitles = []) {
  if (!chDoc || !chDoc.body) return null;

  const normTocMap = new Map();
  tocTitles.forEach((t) => {
    const raw = t.trim();
    const norm = normalizeTitle(raw);
    if (norm.length >= 3) {
      normTocMap.set(norm, raw);
    }
  });

  // Unwrap single outer containers (e.g. body > section or body > div)
  let root = chDoc.body;
  while (
    root.children.length === 1 &&
    ['section', 'div', 'main', 'article'].includes(root.firstElementChild.tagName.toLowerCase())
  ) {
    root = root.firstElementChild;
  }

  const childNodes = Array.from(root.childNodes).filter((n) => {
    return n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0);
  });

  if (childNodes.length === 0) return null;

  const boundaryIndices = [];

  childNodes.forEach((node, idx) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node;
    const tag = el.tagName.toLowerCase();
    const cleanText = el.textContent.trim();

    // Check heading inside el or el itself
    const headingEl = el.querySelector('h1, h2, h3, h4, [class*="title"], [class*="heading"]');
    const targetText = headingEl ? headingEl.textContent.trim() : cleanText;
    const norm = normalizeTitle(targetText);

    let matchedTitle = null;

    // 1. Direct or fuzzy match with known Table of Contents item ("content")
    if (normTocMap.has(norm)) {
      matchedTitle = normTocMap.get(norm);
    } else {
      for (const [nKey, origTitle] of normTocMap.entries()) {
        if (norm.length >= 4 && nKey.length >= 4) {
          if (norm === nKey || norm.startsWith(nKey) || nKey.startsWith(norm)) {
            matchedTitle = origTitle;
            break;
          }
        }
      }
    }

    // 2. Fallback: Check explicit heading tags (h1, h2, h3)
    if (!matchedTitle && (tag === 'h1' || tag === 'h2' || tag === 'h3' || headingEl)) {
      if (targetText.length >= 3 && targetText.length <= 120) {
        matchedTitle = targetText;
      }
    }

    // 3. Fallback: Check standard chapter patterns in text
    if (!matchedTitle && (tag.startsWith('h') || tag === 'p' || tag === 'div')) {
      if (/^(part|bagian|book|jilid|chapter|bab|act|scene)\s+[\d\w]+/i.test(targetText) && targetText.length <= 120) {
        matchedTitle = targetText;
      }
    }

    if (matchedTitle) {
      boundaryIndices.push({
        index: idx,
        title: matchedTitle,
        element: el
      });
    }
  });

  if (boundaryIndices.length === 0) {
    return null;
  }

  // If exactly 1 boundary at start, treat that boundary title as the chapter title
  const firstBoundaryIdx = boundaryIndices[0].index;
  if (boundaryIndices.length === 1 && firstBoundaryIdx === 0) {
    return [{
      title: boundaryIndices[0].title,
      content: root.innerHTML,
      isHtml: true
    }];
  }

  const splitChapters = [];

  // Content before first boundary (frontmatter, dedication, or intro)
  if (firstBoundaryIdx > 0) {
    const preContainer = document.createElement('div');
    for (let i = 0; i < firstBoundaryIdx; i++) {
      preContainer.appendChild(childNodes[i].cloneNode(true));
    }
    const preText = preContainer.textContent.trim();
    if (preText.length > 20 || preContainer.querySelector('img')) {
      splitChapters.push({
        title: 'Halaman Pembuka',
        content: preContainer.innerHTML,
        isHtml: true
      });
    }
  }

  // Chapters from each boundary
  for (let b = 0; b < boundaryIndices.length; b++) {
    const curr = boundaryIndices[b];
    const nextIdx = b < boundaryIndices.length - 1 ? boundaryIndices[b + 1].index : childNodes.length;

    const chContainer = document.createElement('div');
    for (let i = curr.index; i < nextIdx; i++) {
      chContainer.appendChild(childNodes[i].cloneNode(true));
    }

    splitChapters.push({
      title: curr.title,
      content: chContainer.innerHTML,
      isHtml: true
    });
  }

  return splitChapters.length > 0 ? splitChapters : null;
}

/**
 * Parses raw text into chapters by matching Table of Contents entries ("Contents")
 * or standard chapter headers.
 */
function parseTextIntoChapters(text, defaultTitle = 'Bab') {
  if (!text) return [{ title: defaultTitle, content: '', isHtml: false }];

  const lines = text.split(/\r?\n/);
  const tocTitles = [];

  // 1. Look for a "Contents", "Table of Contents", or "Daftar Isi" block
  let inToc = false;
  let tocEndLine = -1;

  for (let i = 0; i < Math.min(lines.length, 250); i++) {
    const line = lines[i].trim();
    if (!inToc) {
      if (/^(contents|table of contents|daftar isi|isi buku)/i.test(line)) {
        inToc = true;
        continue;
      }
    } else {
      if (line.length === 0) {
        if (tocTitles.length > 2) {
          tocEndLine = i;
          break;
        }
      } else if (line.length > 2 && line.length < 100) {
        const cleanT = line.replace(/^\d+[\.\)]\s*/, '').replace(/\.{2,}\s*\d+$/, '').trim();
        if (cleanT.length >= 3) {
          tocTitles.push(cleanT);
        }
      }
    }
  }

  const normTocMap = new Map();
  tocTitles.forEach((t) => {
    const norm = normalizeTitle(t);
    if (norm.length >= 3) normTocMap.set(norm, t);
  });

  const chapters = [];
  let currentTitle = defaultTitle;
  let currentLines = [];

  const startLine = tocEndLine > 0 ? tocEndLine : 0;

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const norm = normalizeTitle(trimmed);

    let isBoundary = false;
    let matchedTitle = null;

    if (normTocMap.has(norm)) {
      isBoundary = true;
      matchedTitle = normTocMap.get(norm);
    } else if (trimmed.length > 2 && trimmed.length < 90) {
      for (const [nKey, origTitle] of normTocMap.entries()) {
        if (norm.length >= 5 && nKey.length >= 5 && (norm === nKey || norm.startsWith(nKey) || nKey.startsWith(norm))) {
          isBoundary = true;
          matchedTitle = origTitle;
          break;
        }
      }
      if (!isBoundary && /^(?:bab|chapter|part|bagian|act|scene)\s+[\d\w]+/i.test(trimmed)) {
        isBoundary = true;
        matchedTitle = trimmed;
      }
    }

    if (isBoundary) {
      if (currentLines.length > 0) {
        chapters.push({
          title: currentTitle,
          content: currentLines.join('\n'),
          isHtml: false
        });
      }
      currentTitle = matchedTitle || trimmed;
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0) {
    chapters.push({
      title: currentTitle,
      content: currentLines.join('\n'),
      isHtml: false
    });
  }

  // Fallback pagination if entire file was unformatted wall of text
  if (chapters.length <= 1 && lines.length > 250) {
    const chunked = [];
    const chunkSize = 200;
    for (let i = 0; i < lines.length; i += chunkSize) {
      const slice = lines.slice(i, i + chunkSize);
      chunked.push({
        title: `${defaultTitle} ${chunked.length + 1}`,
        content: slice.join('\n'),
        isHtml: false
      });
    }
    return chunked;
  }

  return chapters.length > 0 ? chapters : [{ title: defaultTitle, content: text, isHtml: false }];
}

// ==========================================================================
// IN-BROWSER EPUB PARSER (POWERED BY JSZip)
// ==========================================================================
async function parseEpubFile(file) {
  const zip = await JSZip.loadAsync(file);

  // 1. Locate container.xml to find the OPF package path
  const containerEntry =
    zip.file('META-INF/container.xml') ||
    zip.file('meta-inf/container.xml') ||
    resolveZipEntry(zip, '', 'META-INF/container.xml');

  if (!containerEntry) {
    throw new Error('Berkas EPUB tidak memiliki META-INF/container.xml');
  }

  const containerXml = await containerEntry.async('text');
  const parser = new DOMParser();
  const containerDoc = parser.parseFromString(containerXml, 'application/xml');
  const rootfiles = containerDoc.getElementsByTagName('rootfile');
  const opfPath =
    (rootfiles.length > 0 && rootfiles[0].getAttribute('full-path')) ||
    containerDoc.querySelector('rootfile')?.getAttribute('full-path') ||
    'content.opf';

  const opfEntry = resolveZipEntry(zip, '', opfPath);
  if (!opfEntry) {
    throw new Error(`Gagal menemukan paket metadata OPF EPUB di "${opfPath}"`);
  }

  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

  // 2. Read OPF file with namespace-resilient tag extraction
  const opfXml = await opfEntry.async('text');
  const opfDoc = parser.parseFromString(opfXml, 'application/xml');

  const titleNodes = opfDoc.getElementsByTagName('title');
  const rawTitle = titleNodes.length > 0 ? titleNodes[0].textContent?.trim() : null;
  const title = rawTitle || file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

  const creatorNodes = opfDoc.getElementsByTagName('creator');
  const author = creatorNodes.length > 0 ? creatorNodes[0].textContent?.trim() : 'Koleksi Pengguna';

  const langNodes = opfDoc.getElementsByTagName('language');
  const language = langNodes.length > 0 ? langNodes[0].textContent?.trim() : 'id';

  const descNodes = opfDoc.getElementsByTagName('description');
  const description =
    descNodes.length > 0
      ? descNodes[0].textContent?.trim()
      : 'Buku digital koleksi pribadi yang diunggah ke Libroverse.';

  // 3. Extract Manifest Items
  const manifestItems = Array.from(opfDoc.getElementsByTagName('item'));
  const manifest = {};
  manifestItems.forEach((it) => {
    const id = it.getAttribute('id');
    if (id) {
      manifest[id] = {
        href: it.getAttribute('href'),
        mediaType: it.getAttribute('media-type') || '',
        properties: it.getAttribute('properties') || ''
      };
    }
  });

  // 4. Extract Cover Image
  let coverDataUrl = null;
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
    const coverZipEntry = resolveZipEntry(zip, opfDir, href);
    if (coverZipEntry) {
      try {
        const blob = await coverZipEntry.async('blob');
        coverDataUrl = await blobToDataUrl(blob);
      } catch (e) {
        console.warn('Cover extraction error:', e);
      }
    }
  }

  // 5. Extract Table of Contents ("Contents") from NCX, EPUB 3 Navigation Document, or TOC Files
  const tocTitles = [];
  const ncxItem = manifestItems.find(
    (it) => it.getAttribute('media-type') === 'application/x-dtbncx+xml' || (it.getAttribute('id') || '').toLowerCase().includes('ncx')
  );
  if (ncxItem) {
    const ncxEntry = resolveZipEntry(zip, opfDir, ncxItem.getAttribute('href'));
    if (ncxEntry) {
      try {
        const ncxXml = await ncxEntry.async('text');
        const ncxDoc = parser.parseFromString(ncxXml, 'application/xml');
        const labels = Array.from(ncxDoc.getElementsByTagName('text'));
        labels.forEach((l) => {
          const t = l.textContent?.trim();
          if (t && t.length >= 2 && !tocTitles.includes(t)) tocTitles.push(t);
        });
      } catch (e) {
        console.warn('NCX extraction error:', e);
      }
    }
  }

  // Also check EPUB 3 navigation item (properties="nav")
  const navItem = manifestItems.find(
    (it) => (it.getAttribute('properties') || '').includes('nav') || (it.getAttribute('id') || '').toLowerCase().includes('toc')
  );
  if (navItem) {
    const navEntry = resolveZipEntry(zip, opfDir, navItem.getAttribute('href'));
    if (navEntry) {
      try {
        const navHtml = await navEntry.async('text');
        const navDoc = parser.parseFromString(navHtml, 'text/html');
        const links = Array.from(navDoc.querySelectorAll('nav[epub\\:type="toc"] li, ol.toc li, ul.toc li, nav li a, .toc a, a'));
        links.forEach((l) => {
          const t = l.textContent?.trim();
          if (t && t.length >= 2 && !tocTitles.includes(t)) tocTitles.push(t);
        });
      } catch (e) {
        console.warn('Nav doc extraction error:', e);
      }
    }
  }

  // 6. Extract Chapters via Spine & Split by Table of Contents ("Contents")
  const itemrefs = Array.from(opfDoc.getElementsByTagName('itemref'));
  const chapters = [];

  for (let i = 0; i < itemrefs.length; i++) {
    const idref = itemrefs[i].getAttribute('idref');
    const item = manifest[idref];
    if (!item || !item.href) continue;

    const chEntry = resolveZipEntry(zip, opfDir, item.href);
    if (!chEntry) continue;

    try {
      const rawHtml = await chEntry.async('text');
      const chDoc = parser.parseFromString(rawHtml, 'text/html');

      // Sanitize scripts and styles
      chDoc.querySelectorAll('script, style, link, meta').forEach((el) => el.remove());

      // Resolve inline images in chapter
      const imgEls = Array.from(chDoc.querySelectorAll('img'));
      for (const img of imgEls) {
        const src = img.getAttribute('src');
        if (src && !src.startsWith('data:') && !src.startsWith('http')) {
          const imgEntry = resolveZipEntry(zip, opfDir, src);
          if (imgEntry) {
            try {
              const imgBlob = await imgEntry.async('blob');
              const imgData = await blobToDataUrl(imgBlob);
              img.setAttribute('src', imgData);
            } catch (err) { }
          }
        }
      }

      // Check if this document contains multiple sections matching the Table of Contents ("content")
      const splitChapters = splitHtmlByTocOrHeadings(chDoc, tocTitles);
      if (splitChapters && splitChapters.length > 0) {
        splitChapters.forEach((sc) => chapters.push(sc));
      } else {
        const heading =
          chDoc.querySelector('h1, h2, h3, title')?.textContent?.trim() || `Bab ${chapters.length + 1}`;
        const bodyText = chDoc.body ? chDoc.body.innerHTML : rawHtml;
        const plainText = chDoc.body ? chDoc.body.textContent.trim() : '';

        if (plainText.length > 15 || chDoc.querySelector('img')) {
          chapters.push({
            title: heading,
            content: bodyText,
            isHtml: true
          });
        }
      }
    } catch (chErr) {
      console.warn(`Error reading chapter item ${idref}:`, chErr);
    }
  }

  // Fallback: Read any HTML or XHTML files if spine was empty
  if (chapters.length === 0) {
    const htmlFiles = Object.keys(zip.files).filter(
      (n) => (n.endsWith('.html') || n.endsWith('.xhtml') || n.endsWith('.htm')) && !n.includes('cover')
    );
    for (let i = 0; i < htmlFiles.length; i++) {
      try {
        const rawHtml = await zip.file(htmlFiles[i]).async('text');
        const doc = parser.parseFromString(rawHtml, 'text/html');
        doc.querySelectorAll('script, style, link').forEach((el) => el.remove());
        const title = doc.querySelector('h1, h2, title')?.textContent?.trim() || `Bagian ${i + 1}`;
        chapters.push({
          title,
          content: doc.body ? doc.body.innerHTML : rawHtml,
          isHtml: true
        });
      } catch (e) { }
    }
  }

  if (chapters.length === 0) {
    chapters.push({
      title: 'Bab Pembuka',
      content: `<p>Berhasil mengekstrak ${file.name}. Selamat membaca di pembaca Libroverse.</p>`,
      isHtml: true
    });
  }

  const bookData = {
    title,
    author,
    language,
    description,
    coverDataUrl,
    chapters
  };

  // Compile full pages list and table of contents
  buildBookPages(bookData);

  return bookData;
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
        const parsedChapters = parseTextIntoChapters(text, cleanName);
        bookData = {
          title: cleanName,
          author: 'Teks Pribadi',
          language: 'id',
          description: text.slice(0, 200) + '...',
          coverDataUrl: null,
          chapters: parsedChapters
        };
        buildBookPages(bookData);
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
        pages: isPdf ? 1 : Math.max(1, (bookData.pagesList && bookData.pagesList.length) || (bookData.chapters || []).length * 15),
        totalPages: (bookData.pagesList && bookData.pagesList.length) || 1,
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
        pagesList: bookData.pagesList || [],
        toc: bookData.toc || [],
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
  applyLanguage(state.currentLang);
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

  console.log('🪐 Libroverse initialized successfully. Personal book upload & IndexedDB active!');
});
