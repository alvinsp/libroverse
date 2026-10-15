# 🪐 Libroverse — Perpustakaan Semesta Digital

**Libroverse** adalah platform web modern untuk membaca, mendengarkan, dan mengunduh ribuan buku digital gratis (EPUB & PDF) serta audiobook di seluruh galaksi literasi. Dirancang dengan estetika *Cosmic Glassmorphism* yang memukau, responsif di HP (smartphone), dan siap di-deploy langsung ke **Vercel**.

![Libroverse Logo](/public/assets/libroverse-logo.jpg)

---

## ✨ Fitur Unggulan

1. **🎨 Estetika Cosmic Glassmorphism**:
   - Skema warna ungu antariksa, partikel bintang bercahaya, dan kilau nebula lembut.
   - Background canvas interaktif dengan 150+ bintang berkedip, rasi bintang, dan bintang jatuh acak.
   - Menggunakan logo maskot alien kosmik menggemaskan yang memeluk buku bercahaya.

2. **📱 Responsif Penuh di Ponsel / HP (Mobile Ready)**:
   - Tata letak khusus smartphone & tablet dengan touch-friendly gestures (swipe gesture untuk balik halaman).
   - Sticky floating audio player ringkas 2 baris yang pas di layar HP.
   - Drawer rak buku dan modal detail yang ramah sentuhan.

3. **📖 In-Browser Ebook Reader Interaktif & Frame Lebih Besar**:
   - Frame baca buku yang jauh lebih luas (*width: 96vw, max-width: 1320px, height: 95vh*) serta tombol *Layar Penuh (Expand / Maximize)* untuk pengalaman membaca tanpa distraksi (*100vw x 100vh*).
   - Pada layar HP, otomatis beralih ke mode layar penuh *edge-to-edge* (100% full-bleed).
   - Pengaturan ukuran font (A- / A+) dan gaya tipografi (Serif klasik atau Sans modern).
   - 3 pilihan tema membaca: **Kosmik Gelap**, **Kertas Sepia**, dan **Starlight Terang**.
   - Indikator halaman buku dan navigasi bab lengkap.

4. **🎧 Sticky Cosmic Audio Player & Narasi Suara**:
   - Pemutar audiobook mengambang dengan visualisasi gelombang suara (*waveform*).
   - Narator suara otomatis menggunakan **Web Speech Synthesis API**.
   - Kontrol kecepatan putar (1.0x, 1.25x, 1.5x, 2.0x), lompat 15 detik, dan slider volume.

5. **🎵 Ambient Space Sound Synthesizer**:
   - Sintesis musik meditasi kosmik menggunakan **Web Audio API** (*AudioContext*) langsung dari peramban tanpa file eksternal berat.

6. **⭐ Rak Kosmik Saya (My Cosmic Shelf)**:
   - Menyimpan buku favorit dan riwayat membaca dengan sinkronisasi `localStorage`.
   - Filter tab: *Semua Buku*, *Sedang Dibaca*, dan *Selesai*.
   - Tombol unduh langsung EPUB dan PDF resmi.

7. **📥 Generator Unduhan Berkas Asli (EPUB & PDF) & Upload Buku Pribadi**:
   - Fitur upload buku EPUB/PDF pribadi pengguna dengan penyimpanan lokal IndexedDB.

8. **📱 Progressive Web App (PWA) & Dukungan Offline**:
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

---

## ☁️ Cara Deploy ke Vercel

Proyek ini telah dikonfigurasi dengan [`vercel.json`](file:///e:/projects/rea-libroverse/vercel.json) dan build preset Vite standar.
Otomatis terhubung dengan GitHub dan siap dideploy langsung di dashboard Vercel.
