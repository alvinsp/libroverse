import { state } from '../../core/state.js';
import { BOOKS_DATA } from '../../data/books.js';
import { buildBookPages } from '../parser/paginator.js';

const DB_NAME = 'libroverse_db';
const DB_VERSION = 1;
const STORE_NAME = 'user_books';

export function openUserBookDB() {
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

export async function saveBookToDB(book) {
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

export async function getAllBooksFromDB() {
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

export async function deleteBookFromDB(id) {
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

export async function initUserBooksStorage(onBooksLoaded) {
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
      if (typeof onBooksLoaded === 'function') {
        onBooksLoaded(state.books);
      }
    }
  } catch (e) {
    console.log('User books init error:', e);
  }
}
