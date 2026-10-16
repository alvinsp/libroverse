import { BOOKS_DATA } from '../data/books.js';
import { STORAGE_KEYS } from './constants.js';

export const state = {
  books: [...BOOKS_DATA],
  filteredBooks: [...BOOKS_DATA],
  shelf: JSON.parse(localStorage.getItem(STORAGE_KEYS.SHELF) || '[]'),
  activeGenre: 'all',
  activeFormat: 'all',
  searchQuery: '',
  sortBy: 'popular',
  currentLang: localStorage.getItem(STORAGE_KEYS.LANG) || 'id',

  // Reader State
  currentReadingBook: null,
  currentPageIndex: 0,
  currentChapterIndex: 0,
  readerMode: localStorage.getItem(STORAGE_KEYS.READER_MODE) || 'page',
  readerFontSize: parseInt(localStorage.getItem(STORAGE_KEYS.READER_FONT_SIZE) || '18', 10),
  readerFontFamily: localStorage.getItem(STORAGE_KEYS.READER_FONT_FAMILY) || 'serif',
  readerTheme: localStorage.getItem(STORAGE_KEYS.READER_THEME) || 'dark',
  readerZoom: parseFloat(localStorage.getItem(STORAGE_KEYS.READER_ZOOM) || '1.0'),
  bookmarks: JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKMARKS) || '[]'),
  readerSearchQuery: '',
  readerSearchResults: [],
  currentSearchResultIndex: -1,

  // Audio Player State
  currentAudioBook: null,
  isPlayingAudio: false,
  audioSpeed: 1.0,
  audioVolume: 1.0,
  speechUtterance: null,

  // Ambient Space Audio
  isAmbientAudioPlaying: false,
  ambientAudioNodes: null,

  // Modal & Drawer State
  selectedBook: null,
  activeShelfTab: 'all',
  deferredPwaPrompt: null
};
