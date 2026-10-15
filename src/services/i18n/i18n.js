import id from './locales/id.js';
import en from './locales/en.js';
import { state } from '../../core/state.js';
import { STORAGE_KEYS } from '../../core/constants.js';

export const I18N_DICT = { id, en };

let languageChangeListeners = [];

export function onLanguageChange(callback) {
  if (typeof callback === 'function') {
    languageChangeListeners.push(callback);
  }
}

export function t(key, params = {}) {
  const lang = state.currentLang || 'id';
  let str = I18N_DICT[lang]?.[key] || I18N_DICT.en?.[key] || I18N_DICT.id?.[key] || key;
  Object.keys(params).forEach((k) => {
    str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), params[k]);
  });
  return str;
}

export function getTranslatedGenre(genre, lang = state.currentLang) {
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

export function applyLanguage(lang = 'id') {
  if (!I18N_DICT[lang] && lang !== 'bn' && lang !== 'es' && lang !== 'jp') {
    lang = 'id';
  }
  state.currentLang = lang;
  localStorage.setItem(STORAGE_KEYS.LANG, lang);
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

  // Notify registered views
  languageChangeListeners.forEach((cb) => cb(lang));
}
