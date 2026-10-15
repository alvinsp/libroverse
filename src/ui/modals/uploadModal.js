import { state } from '../../core/state.js';
import { showToast } from '../../utils/toast.js';
import { formatBytes } from '../../utils/domUtils.js';
import { parseEpubFile } from '../../services/parser/epubParser.js';
import { parseTextIntoChapters } from '../../services/parser/txtParser.js';
import { buildBookPages } from '../../services/parser/paginator.js';
import { saveBookToDB } from '../../services/storage/indexedDb.js';
import { addOrUpdateShelfStatus } from '../../services/storage/shelfStorage.js';
import { filterAndRenderBooks } from '../catalogue/catalogueView.js';
import { openReaderModal } from '../reader/readerView.js';

let pendingUploadedBook = null;

export function setupUploadModal() {
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
