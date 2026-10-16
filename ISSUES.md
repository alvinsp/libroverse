# 📋 Libroverse Issue Tracker & Changelog

Dokumentasi pelacakan masalah (*issues*), permintaan fitur, dan status penyelesaian (*resolutions*) pada proyek **Libroverse**. Semua isu yang dilaporkan di bawah ini telah diselesaikan (**[x] Solved**) dan diverifikasi dalam *codebase*.

---

## 🎯 Ringkasan Status Masalah

| No | Issue | Kategori | Status | Commit / Modul |
|---|---|---|:---:|---|
| #1 | [Tampilan Awal Macet / Blank Saat Refresh](#issue-1-tampilan-awal-macet--blank-saat-dibuka--refresh) | Bug / UI | `[x] Solved` | `src/main.js` |
| #2 | [Pagination Terbatas 5 Halaman pada Berkas Upload](#issue-2-pagination-terbatas-hanya-5-halaman-pada-buku-upload-panjang) | Bug / Reader | `[x] Solved` | `src/services/parser/paginator.js` |
| #3 | [Hirarki Tipografi & Tata Letak Buku Belum Rapi](#issue-3-hirarki-tipografi-dan-tata-letak-buku-kurang-rapi) | UX / Typography | `[x] Solved` | `src/style.css`, `src/ui/reader/` |
| #4 | [Tampilan Belum Responsif di HP & Frame Baca Terlalu Sempit](#issue-4-tampilan-belum-responsif-di-hp--frame-baca-kurang-besar) | Responsive / Mobile | `[x] Solved` | `src/style.css`, `src/ui/reader/readerView.js` |
| #5 | [Konten & Bab Philippa Perry Chapter 7 Belum Terstruktur](#issue-5-konten--bab-philippa-perry-chapter-7-belum-terpisah-rapi) | Content / Reader | `[x] Solved` | `src/data/books.js`, `src/ui/reader/` |
| #6 | [Pemisahan Bab Otomatis Berdasarkan Table of Contents ("Contents")](#issue-6-pemisahan-bab-otomatis-sesuai-table-of-contents-contents) | Feature / Parser | `[x] Solved` | `src/services/parser/tocSplitter.js` |
| #7 | [Sistem Multi-Bahasa (i18n) Tidak Berfungsi](#issue-7-pengubah-bahasa-tidak-berfungsi--belum-reaktif) | Bug / i18n | `[x] Solved` | `src/services/i18n/`, `index.html` |
| #8 | [Kode Monolitik Belum Menerapkan Clean Architecture](#issue-8-arsitektur-kode-monolitik-belum-menerapkan-clean-architecture) | Architecture / Refactor | `[x] Solved` | `src/core/`, `src/services/`, `src/ui/` |
| #9 | [Normalisasi EPUB & Eliminasi Judul Duplikat](#issue-9-normalisasi-epub-eliminasi-judul-duplikat-dan-tipografi-seperti-the-celestial-odyssey) | Parser / Typography | `[x] Solved` | `src/services/parser/epubNormalizer.js`, `src/style.css` |
| #10 | [Zoom Out 50% di HP, Ergonomi Mobile, In-Reader Search & Bookmark](#issue-10-zoom-out-50-di-hp-ergonomi-mobile-in-reader-search--bookmark) | Mobile / UX / Feature | `[x] Solved` | `src/ui/reader/readerView.js`, `src/style.css`, `index.html` |

---

## 🔍 Rincian Masalah & Solusi

### Issue #1: Tampilan Awal Macet / Blank Saat Dibuka & Refresh
- **Laporan Pengguna**: *"when I opened the website, first thing that I looked is like that and when refreshed It's nothing happened. stuck there"*
- **Penyebab**: Modal reader atau detail buku mempertahankan kelas aktif atau tidak tertutup secara tegas saat `DOMContentLoaded`, dan atribut `overflow: hidden` pada `document.body` mengunci scroll halaman.
- **Solusi**:
  - [x] Memaksa penutupan eksplisit seluruh modal dan drawer pada startup (`closeReaderModal()`, `closeBookDetailModal()`, `closeShelfDrawer()`).
  - [x] Menambahkan properti CSS penegas `display: none !important` saat elemen memiliki atribut `hidden`.
  - [x] Mereset `document.body.style.overflow = ''` pada saat inisialisasi awal.
- **Status**: `[x] Solved`

---

### Issue #2: Pagination Terbatas Hanya 5 Halaman pada Buku Upload Panjang
- **Laporan Pengguna**: *"when I uploaded book with many pages I can't see all of them. just until page 5. how can it be?"*
- **Penyebab**: Parser buku lama memiliki pembatas buatan (*hardcoded limit*) `slice(0, 5)` pada iterasi spine EPUB dan pemotongan teks.
- **Solusi**:
  - [x] Menghapus semua limitasi buatan pada loop manifest spine di [src/services/parser/epubParser.js](file:///e:/projects/rea-libroverse/src/services/parser/epubParser.js).
  - [x] Mengembangkan `paginateHtmlContent` dengan algoritma hitung kata dinamis (~380 kata per halaman) yang membagi bab panjang ke dalam halaman-halaman natural tanpa memotong teks di tengah jalan.
  - [x] Mendukung navigasi ratusan halaman dengan input lompat halaman langsung (*jump input*).
- **Status**: `[x] Solved`

---

### Issue #3: Hirarki Tipografi dan Tata Letak Buku Kurang Rapi
- **Laporan Pengguna**: *"https://bdebooks.com/en/books/the-book-you-wish-your-parents-had-read-by-philippa-perry/read/?chapter=3 why when I looked on this website, the writing looks so clean. I can see where is title for part one, the introduction, the chapter or anything"*
- **Penyebab**: Tipografi buku masih menggunakan font generik browser tanpa kontras hirarki antara bagian utama (*Part*), sub-bab (*Chapter*), dan blok kutipan latihan refleksi.
- **Solusi**:
  - [x] Mengadopsi Google Font **Literata** (font serif khusus buku digital) dan **Outfit** untuk judul modern.
  - [x] Menambahkan *eyebrow banner* di bagian atas teks buku untuk menampilkan judul buku dan penanda bab (`reader-eyebrow`).
  - [x] Membuat komponen khusus `reader-exercise-box` untuk latihan interaktif (seperti *"Exercise: Looking back with compassion"*).
  - [x] Menata line-height (1.8), margin paragraf, dan ukuran font yang dapat diatur pengguna (14px – 28px).
- **Status**: `[x] Solved`

---

### Issue #4: Tampilan Belum Responsif di HP & Frame Baca Kurang Besar
- **Laporan Pengguna**: *"buatkan agar website ini bisa dibuka di hp dan buatkan saat baca buku itu frame untuk baca bukunya lebih besar"*
- **Penyebab**: Modal pembaca memiliki batas `max-width: 800px` yang sempit pada monitor desktop, dan elemen navigasi bertumpuk secara canggung di layar smartphone.
- **Solusi**:
  - [x] Memperbesar frame baca default menjadi `width: 96vw; max-width: 1320px; height: 95vh;`.
  - [x] Menambahkan fitur **Mode Layar Penuh (*Maximize / Fullscreen*)** yang memperluas pembaca hingga `100vw x 100vh` tanpa batas tepi.
  - [x] Pada layar ponsel (layar < 768px), reader otomatis beralih ke mode *full-bleed edge-to-edge*.
  - [x] Menambahkan dukungan **Mobile Touch Swipe Gesture**: geser ke kiri untuk halaman berikutnya, geser ke kanan untuk halaman sebelumnya.
  - [x] Menyesuaikan sticky audio player menjadi tata letak 2 baris ringkas yang pas di smartphone.
- **Status**: `[x] Solved`

---

### Issue #5: Konten & Bab Philippa Perry Chapter 7 Belum Terpisah Rapi
- **Laporan Pengguna**: *"https://bdebooks.com/en/books/the-book-you-wish-your-parents-had-read-by-philippa-perry/read/?chapter=7 rea bagian ini untuk content dan chapter yang terlihat nyaman saat di baca"*
- **Penyebab**: Buku Philippa Perry pada dataset lokal belum memiliki urutan bab lengkap yang sesuai dengan BDeBooks `?chapter=7`.
- **Solusi**:
  - [x] Menambahkan urutan bab lengkap di [src/data/books.js](file:///e:/projects/rea-libroverse/src/data/books.js):
    1. *About the Author*
    2. *Dedication & Foreword*
    3. *Introduction: Parenting is a Relationship*
    4. *Part One: Your Parenting Legacy*
    5. *The past comes back to bite us (and our children)*
    6. *Rupture and repair*
    7. **Chapter 7: *Repairing the past*** (persis sesuai konten BDeBooks)
    8. *How we talk to ourselves*
    9. *Good parent/bad parent: the downside of judgement*
    10. *Part Two: Your Child’s Environment*
    11. *It’s not family structure that matters, it’s how we all get on*
  - [x] Mendukung peralihan antara **Mode Gulir (*Scroll Mode*)** dan **Mode Halaman (*Page Mode*)**.
- **Status**: `[x] Solved`

---

### Issue #6: Pemisahan Bab Otomatis Sesuai Table of Contents ("Contents")
- **Laporan Pengguna**: *"mungkin pisahnya sesuain sama content maksud nya kalau ada yang tulisannya sama dengan content itu nanti jadi title di bab berikutnya"*
- **Penyebab**: Berkas digital sering kali mengemas beberapa bab atau seluruh bagian buku ke dalam satu berkas HTML/teks besar tanpa dipisah per judul bab.
- **Solusi**:
  - [x] Membangun [src/services/parser/tocSplitter.js](file:///e:/projects/rea-libroverse/src/services/parser/tocSplitter.js) dan [src/services/parser/txtParser.js](file:///e:/projects/rea-libroverse/src/services/parser/txtParser.js).
  - [x] Sistem memindai bagian *Contents / Table of Contents / Daftar Isi*, manifest EPUB NCX, atau EPUB 3 NAV untuk mengumpulkan seluruh judul resmi.
  - [x] Setiap kali ditemukan teks atau elemen heading di dalam konten yang cocok dengan entri *Contents*, konten langsung dipecah pada batas tersebut, dan teks yang cocok otomatis menjadi **Judul Bab Berikutnya** (`title di bab berikutnya`).
  - [x] Tombol navigasi di bawah secara dinamis menginformasikan bab selanjutnya: `Bab Berikutnya: [Judul Bab] →` (atau `Next: [Title] →`).
  - [x] Laci Daftar Isi (📑) menampilkan hirarki dua tingkat (*depth 1* untuk Bagian/Part, *depth 2* untuk Sub-bab).
- **Status**: `[x] Solved`

---

### Issue #7: Pengubah Bahasa Tidak Berfungsi / Belum Reaktif
- **Laporan Pengguna**: *"terus bahasanya belum bisa berfungsi"*
- **Penyebab**: Event listener dropdown bahasa di navbar hanya mengganti teks label tombol tanpa memanggil fungsi terjemahan DOM, serta state bahasa tidak disimpan secara permanen.
- **Solusi**:
  - [x] Membangun layanan i18n reaktif [src/services/i18n/i18n.js](file:///e:/projects/rea-libroverse/src/services/i18n/i18n.js) dengan kamus lengkap di [id.js](file:///e:/projects/rea-libroverse/src/services/i18n/locales/id.js) dan [en.js](file:///e:/projects/rea-libroverse/src/services/i18n/locales/en.js).
  - [x] Menyimpan preferensi bahasa di `localStorage` (`libroverse_lang`) sehingga tetap aktif saat halaman direfresh.
  - [x] Menambahkan atribut deklaratif `data-i18n`, `data-i18n-html`, `data-i18n-ph`, dan `data-i18n-title` di seluruh elemen `index.html`.
  - [x] Menghubungkan dropdown bahasa sehingga langsung memanggil `applyLanguage(lang)`, memperbarui teks navbar, pencarian, hero, statistik, filter katalog, tombol kartu buku, laci rak kosmik, modal upload, dan kontrol reader.
- **Status**: `[x] Solved`

---

### Issue #8: Arsitektur Kode Monolitik Belum Menerapkan Clean Architecture
- **Laporan Pengguna**: *"rapikan code nya jadi clean architecture kalau udah"*
- **Penyebab**: Kode aplikasi tertumpuk dalam satu berkas raksasa `src/main.js` (>3.100 baris), menyulitkan pemeliharaan dan pengujian.
- **Solusi**:
  - [x] Merefaktor kode menjadi **Clean Architecture** berlapis:
    - **`src/core/`**: Menyimpan state reaktif terpusat ([state.js](file:///e:/projects/rea-libroverse/src/core/state.js)) dan konstanta konfigurasi ([constants.js](file:///e:/projects/rea-libroverse/src/core/constants.js)).
    - **`src/services/`**: Layanan logika bisnis independen dari DOM ([i18n.js](file:///e:/projects/rea-libroverse/src/services/i18n/i18n.js), [epubParser.js](file:///e:/projects/rea-libroverse/src/services/parser/epubParser.js), [txtParser.js](file:///e:/projects/rea-libroverse/src/services/parser/txtParser.js), [tocSplitter.js](file:///e:/projects/rea-libroverse/src/services/parser/tocSplitter.js), [paginator.js](file:///e:/projects/rea-libroverse/src/services/parser/paginator.js), [indexedDb.js](file:///e:/projects/rea-libroverse/src/services/storage/indexedDb.js), [shelfStorage.js](file:///e:/projects/rea-libroverse/src/services/storage/shelfStorage.js), [audioService.js](file:///e:/projects/rea-libroverse/src/services/audio/audioService.js)).
    - **`src/ui/`**: Komponen tampilan dan interaksi pengguna ([readerView.js](file:///e:/projects/rea-libroverse/src/ui/reader/readerView.js), [catalogueView.js](file:///e:/projects/rea-libroverse/src/ui/catalogue/catalogueView.js), [shelfView.js](file:///e:/projects/rea-libroverse/src/ui/shelf/shelfView.js), [bookDetailModal.js](file:///e:/projects/rea-libroverse/src/ui/modals/bookDetailModal.js), [uploadModal.js](file:///e:/projects/rea-libroverse/src/ui/modals/uploadModal.js), [cosmicCanvas.js](file:///e:/projects/rea-libroverse/src/ui/canvas/cosmicCanvas.js)).
    - **`src/utils/`**: Helper murni ([domUtils.js](file:///e:/projects/rea-libroverse/src/utils/domUtils.js), [toast.js](file:///e:/projects/rea-libroverse/src/utils/toast.js)).
  - [x] Memangkas [src/main.js](file:///e:/projects/rea-libroverse/src/main.js) menjadi ~140 baris *orchestrator* murni.
  - [x] Memverifikasi build Vite berhasil tanpa error (`npm run build`).
- **Status**: `[x] Solved`

---

### Issue #9: Normalisasi EPUB, Eliminasi Judul Duplikat, dan Tipografi seperti "The Celestial Odyssey"
- **Laporan Pengguna**: *"on the epub when I uploaded and wanted to read. it's still like usual make it to be like 'The Celestial Odyssey' for example. it can determine where is the title and not title, in epub making it like the original epub. if you try to convert the epub to make it readable"*
- **Penyebab**:
  1. **Judul Ganda (Duplicate Title Glitch)**: Saat berkas EPUB diekstrak, judul bab dimasukkan ke `h1.reader-h1` di header pembaca, namun elemen judul asli EPUB (`<h1>`, `<h2>`, atau `<p class="title">`) masih tersisa di dalam body HTML konten, sehingga judul tampil dua kali berturut-turut.
  2. **Gaya Bawaan Publisher Merusak Tema**: Berkas EPUB bawaan publisher memiliki inline style keras (`color: #000000`, `background: #ffffff`, `font-family: 'Times New Roman'`, fixed line-height 12pt) yang membuat teks tidak terbaca pada mode gelap (teks hitam di latar hitam) serta font berantakan.
  3. **Belum Ada Pembeda Judul vs Sub-judul vs Konten Teks**: Sub-judul internal di dalam bab tidak ditandai secara semantik, dan paragraf awal belum memiliki estetika *drop-cap* seperti buku "The Celestial Odyssey".
- **Solusi**:
  - [x] Membangun modul normalisasi canggih [src/services/parser/epubNormalizer.js](file:///e:/projects/rea-libroverse/src/services/parser/epubNormalizer.js):
    - **Deteksi & Pemisahan Judul Utama**: Mengidentifikasi elemen judul utama bab (mencocokkan TOC, pola `Chapter N: Name`, atau heading awal) dan menghapus elemen tersebut dari dalam body HTML sehingga **tidak terduplikasi** dengan `h1.reader-h1`.
    - **Pembersihan Inline Style Destruktif**: Menghapus `color`, `background`, `font-family`, `font-size`, `line-height`, `margin`, `padding`, dan class publisher (`calibre*`, `Mso*`) agar teks adaptif sempurna dengan tema Dark (Cosmic), Sepia, dan Light.
    - **Sub-heading Cerdas (`.reader-subheading`)**: Mengubah sub-judul internal bab (`h2`, `h3`, atau teks tebal pendek pemisah topik) menjadi `<h2 class="reader-subheading">` lengkap dengan aksen garis cyan/emas yang elegan.
    - **Drop-cap Klasik (`.reader-lead-paragraph`)**: Memberikan huruf inisial besar bergaya sastra klasik pada paragraf pembuka setiap bab persis seperti "The Celestial Odyssey".
    - **Penataan Kotak Latihan & Kutipan**: Mengonversi `[Exercise: ...]` menjadi `.reader-exercise-box` dan kutipan menjadi `.reader-quote`.
  - [x] Memperbarui [src/ui/reader/readerView.js](file:///e:/projects/rea-libroverse/src/ui/reader/readerView.js):
    - `h1.reader-h1` hanya ditampilkan pada **halaman 1** dari setiap bab. Pada halaman 2, 3, dst., teks mengalir natural dari atas tanpa interupsi banner judul raksasa berulang.
    - Eyebrow pada halaman lanjutan menampilkan judul bab aktif (`Chapter 1 • Halaman 2 dari 5`).
  - [x] Memperbarui [src/style.css](file:///e:/projects/rea-libroverse/src/style.css) dengan aturan penegas kontras tema dan tipografi buku profesional.
- **Status**: `[x] Solved`

---

### Issue #10: Zoom Out 50% di HP, Ergonomi Mobile, In-Reader Search & Bookmark
- **Laporan Pengguna**: *"selanjutnya buatkan ketika membaca di handphone itu frame nya terlalu besar jadi perlu di zoom out sampe 50%"* dan penambahan fitur (search, bookmarks, optimasi parser & testing build).
- **Penyebab**:
  1. Pada layar ponsel pintar (*smartphone*), frame baca edge-to-edge dan tipografi terasa terlalu besar bagi pengguna yang menginginkan kepadatan teks tinggi (*information density*) layaknya buku saku, sehingga dibutuhkan kemampuan zoom out hingga **50%**.
  2. Belum ada kontrol zoom fleksibel pada toolbar pembaca dan kontrol gesture cubit layar (*pinch-to-zoom*).
  3. Belum tersedianya fitur pencarian kata langsung di dalam buku (*in-reader text search*) dan penanda halaman (*bookmarks*) yang tersimpan lokal.
- **Solusi**:
  - [x] **Kontrol Zoom Fleksibel (50% – 150%)**:
    - Membangun fungsi `applyReaderZoom(zoomLevel)` di [src/ui/reader/readerView.js](file:///e:/projects/rea-libroverse/src/ui/reader/readerView.js) dengan batas minimal **50% (0.50x)** dan maksimal 150% (1.50x).
    - Menambahkan tombol stepper zoom (`🔍−`, `100%`, `🔍+`) dan pill cepat **`50%`** khusus mobile di toolbar pembaca.
    - Mengintegrasikan CSS custom property `--reader-zoom` pada `.reader-container` dan `.reader-body` dengan penyesuaian padding otomatis (`.is-zoomed-out`) agar tata letak tidak terpotong.
    - Mendukung gestur sentuh **Pinch-to-Zoom** (cubit dengan 2 jari) untuk mengecilkan atau membesarkan frame secara mulus di smartphone.
    - Menyimpan preferensi zoom pengguna di `localStorage` (`libroverse_reader_zoom`).
  - [x] **Pencarian Kata Kunci di Dalam Buku (In-Reader Search)**:
    - Menambahkan tombol `🔍 Cari` dan bar pencarian geser (*slide-down search bar*) di header reader.
    - Memindai seluruh bab/halaman buku secara instan, menyorot temuan dengan `<mark class="reader-search-highlight">` dan indikator temuan aktif (`.reader-search-highlight--active`).
    - Tombol navigasi temuan Sebelumnya (`↑`) dan Berikutnya (`↓`) dengan lompat halaman otomatis dan scroll mulus.
  - [x] **Sistem Penanda Halaman (Bookmarks)**:
    - Tombol `🔖 Tandai` di toolbar reader untuk menandai halaman aktif secara instan dengan indikator bintang emas (`★`).
    - Menyediakan tab **`🔖 Bookmark`** di dalam laci daftar isi (`#reader-toc-drawer`), menampilkan nomor halaman, judul bab, dan cuplikan teks.
    - Klik satu sentuhan untuk lompat langsung ke halaman bookmark dan tombol hapus bookmark.
  - [x] **Optimasi Parser & PDF**:
    - Memperbarui [src/services/parser/paginator.js](file:///e:/projects/rea-libroverse/src/services/parser/paginator.js) dengan sub-chunking paragraf monolitik (>450 kata) agar halaman tidak membengkak tinggi.
    - Menyediakan tombol aksi cepat *"↗ Buka di Tab Baru"* dan *"📥 Unduh Berkas PDF"* untuk dokumen PDF.
  - [x] **Uji Build Produksi**:
    - Diverifikasi dengan `npm run build` (Vite v8), berhasil 100% tanpa kendala (0 error, build time < 2s).
- **Status**: `[x] Solved`

---

*Terakhir diperbarui: 2026-10-16 • Semua isu terverifikasi dan berstatus `[x] Solved`.*

