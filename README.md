# 🪐 Libroverse — Perpustakaan Semesta Digital

**Libroverse** adalah platform web modern untuk membaca, mendengarkan, dan mengunduh ribuan buku digital gratis (EPUB & PDF) serta audiobook di seluruh galaksi literasi. Dirancang dengan estetika *Cosmic Glassmorphism* yang memukau, responsif, dan siap di-deploy langsung ke **Vercel**.

![Libroverse Logo](/public/assets/libroverse-logo.jpg)

---

## ✨ Fitur Unggulan

1. **🎨 Estetika Cosmic Glassmorphism**:
   - Skema warna ungu antariksa, partikel bintang bercahaya, dan kilau nebula lembut.
   - Background canvas interaktif dengan 150+ bintang berkedip, rasi bintang, dan bintang jatuh acak.
   - Menggunakan logo maskot alien kosmik menggemaskan yang memeluk buku bercahaya.

2. **📖 In-Browser Ebook Reader Interaktif**:
   - Membaca buku langsung di browser tanpa aplikasi tambahan.
   - Pengaturan ukuran font (A- / A+) dan gaya tipografi (Serif klasik atau Sans modern).
   - 3 pilihan tema membaca: **Kosmik Gelap**, **Kertas Sepia**, dan **Starlight Terang**.
   - Indikator progres bacaan otomatis berdasarkan posisi gulir.

3. **🎧 Sticky Cosmic Audio Player & Narasi Suara**:
   - Pemutar audiobook mengambang dengan visualisasi gelombang suara (*waveform*).
   - Narator suara otomatis menggunakan **Web Speech Synthesis API**.
   - Kontrol kecepatan putar (1.0x, 1.25x, 1.5x, 2.0x), lompat 15 detik, dan slider volume.

4. **🎵 Ambient Space Sound Synthesizer**:
   - Sintesis musik meditasi kosmik menggunakan **Web Audio API** (*AudioContext*) langsung dari peramban tanpa file eksternal berat.

5. **⭐ Rak Kosmik Saya (My Cosmic Shelf)**:
   - Menyimpan buku favorit dan riwayat membaca dengan sinkronisasi `localStorage`.
   - Filter tab: *Semua Buku*, *Sedang Dibaca*, dan *Selesai*.
   - Tombol unduh langsung EPUB dan PDF resmi.

6. **📥 Generator Unduhan Berkas Asli (EPUB & PDF)**:
   - Mengunduh berkas buku bersih dalam format `.epub` dan `.pdf`.

7. **📱 Progressive Web App (PWA) & Dukungan Offline**:
   - Dilengkapi `manifest.webmanifest` dan `sw.js` (Service Worker) untuk dipasang di layar ponsel atau desktop.

---

## 🚀 Cara Menjalankan Secara Lokal

1. **Instal dependensi**:
   ```bash
   npm install
   ```

2. **Jalankan server pengembangan**:
   ```bash
   npm run dev
   ```
   Buka peramban di [http://localhost:5173/](http://localhost:5173/).

3. **Uji build produksi**:
   ```bash
   npm run build
   ```

4. **Crawling / Sinkronisasi Buku dari BDeBooks**:
   ```bash
   # Crawl dan unduh 10 buku + sampul lokal ke Libroverse:
   npm run scrape

   # Crawl hingga 40 buku sekaligus:
   npm run scrape:all
   ```

---

## ☁️ Cara Deploy ke Vercel

Proyek ini telah dikonfigurasi dengan [`vercel.json`](file:///e:/projects/rea-libroverse/vercel.json) dan build preset Vite standar.

### Opsi 1: Lewat Vercel CLI
```bash
# 1. Login ke Vercel (jika belum)
npx vercel login

# 2. Deploy proyek
npx vercel
```

### Opsi 2: Lewat Dashboard Vercel (GitHub)
1. Buat repository baru di GitHub dan push folder ini:
   ```bash
   git init
   git add .
   git commit -m "feat: initial Libroverse cosmic release"
   git branch -M main
   git remote add origin https://github.com/<username>/libroverse.git
   git push -u origin main
   ```
2. Buka dashboard [Vercel](https://vercel.com/) -> **Add New Project**.
3. Pilih repository `libroverse`.
4. Vercel akan otomatis mendeteksi:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Klik **Deploy**!
