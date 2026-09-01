# 🇮🇩 Portal Data Indonesia — Web GIS & Profil 514 Kabupaten/Kota

Portal data visualisasi interaktif dan sistem informasi statistik wilayah untuk **514 Kabupaten & Kota di 38 Provinsi Indonesia**. Proyek ini menyajikan data statistik resmi BPS (Badan Pusat Statistik) secara visual melalui peta tematik (*Choropleth GIS Map*), indikator makro ekonomi, demografi, serta profil mendalam setiap wilayah.

![Status Proyek](https://img.shields.io/badge/Status-Aktif%20%26%20Terintegrasi-0d9488?style=for-the-badge)
![Teknologi](https://img.shields.io/badge/Tech-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20JS%20%7C%20Leaflet-2E9BD6?style=for-the-badge)

---

## ✨ Fitur Utama Platform

### 1. 🗺️ Peta Tematik Interaktif (Web GIS Choropleth)
* **Warna Poligon Dinamis (Metric-Specific Color Ramps)**:
  * **IPM (Indeks Pembangunan Manusia)**: Skala warna intuitif Hijau Emerald (Sangat Tinggi) ➔ Kuning Amber ➔ Merah Coral (Rendah).
  * **Tingkat Kemiskinan**: Skala indikator risiko Hijau (Rendah) ➔ Kuning ➔ Merah (Tinggi).
  * **PDRB, Luas Wilayah, & Kependudukan**: Skala gradien profesional Ocean Slate & Teal.
* **Presisi Kamera Asimetris (*Asymmetrical FlyToBounds*)**: Kamera peta otomatis bergeser memfokuskan wilayah di tengah area pandang tanpa terhalang oleh *drawer* detail kanan (380px).
* **Dukungan 38 Provinsi (Termasuk Pemekaran DOB Papua 2022)**: Sinkronisasi presisi data BPS terbaru dengan poligon GeoJSON daerah pemekaran Papua Pegunungan, Papua Tengah, Papua Selatan, dan Papua Barat Daya.

### 2. 📊 Peringkat Daerah & Papan Statistik
* **Peringkat Teratas & Terendah (*Top/Bottom Leaderboard*)**: Menampilkan 5 daerah tertinggi dan 5 terendah secara *real-time* berdasarkan metrik aktif.
* **Tampilan Tabel Penuh (Table View)**: Mode tabel komprehensif untuk membandingkan 514 daerah di Indonesia secara keseluruhan.
* **Ringkasan Rujukan Nasional**: Menampilkan nilai Terendah, Rata-Rata Nasional, dan Tertinggi untuk setiap metrik.

### 3. 📄 Halaman Profil Wilayah Mendalam (`profil.html`)
* **Pencarian & Filter Daerah Cepat (`Ctrl + K`)**: Pemilih daerah interaktif dengan filter pulau (*Sumatera, Jawa, Kalimantan, Sulawesi, Bali-Nusa, Maluku-Papua*) dan pencarian instan nama daerah/provinsi.
* **Navigasi Melayang Mulus (*Sticky Nav ScrollSpy*)**: Bar navigasi melayang yang 100% tersinkronisasi dua arah (*Smooth Scroll* & *ScrollSpy*) mengikuti posisi layar.
* **Rincian Data Sektoral**:
  * **Wilayah & Geografi**: Luas daratan, kepadatan, elevasi, curah hujan, dan batas wilayah administratif 4 penjuru.
  * **Pemerintahan & Parlemen**: Kepala daerah, wakil kepala, kecamatan, desa/kelurahan, dan distribusi kursi DPRD.
  * **Kependudukan & IPM**: Gauge Indeks Pembangunan Manusia, proporsi jenis kelamin, kelompok umur, dan ketenagakerjaan.
  * **Perekonomian & PDRB**: PDRB Total (ADHB), PDRB Per Kapita, laju pertumbuhan ekonomi, garis kemiskinan, serta 10 Sektor Penyumbang Ekonomi Terbesar Daerah.

### 🎨 4. Desain Visual Premium & Bebas Silau (Eye-Friendly UI)
* **Soft Slate Off-White Palette (`#f8fafc` / `#f1f5f9`)**: Menghilangkan 90% silau pantulan cahaya monitor (*glare*) untuk kenyamanan mata pengguna saat membaca data.
* **Aksen Warna Deep Emerald & Ocean Cyan (`#0d9488` / `#0f766e`)**: Kontras tinggi berstandar aksesibilitas internasional (WCAG AAA).
* **Top Navbar Frosted Glassmorphism**: Navbar gradien teal-cyan modern dengan efek kaca transparan dan bayangan lembut.

---

## 🚀 Cara Menjalankan Proyek (Local Development)

Proyek ini dibuat menggunakan **Vanilla HTML5, CSS3, dan JavaScript (ES6)** tanpa membutuhkan proses kompilasi atau Node.js build tools.

### 1. Menjalankan di Localhost (Laragon / XAMPP / Live Server)
1. Clone repositori ini ke folder server Anda (misal `c:\laragon\www\mockup-indonesia-data-portal` atau `htdocs`):
   ```bash
   git clone https://github.com/GigaLukmanMaulana/mockup-indonesia-data-portal.git
   ```
2. Buka browser dan akses halaman utama:
   ```text
   http://localhost/mockup-indonesia-data-portal/index.html
   ```
   Atau untuk halaman profil wilayah:
   ```text
   http://localhost/mockup-indonesia-data-portal/profil.html?id=158
   ```

3. Jika menggunakan Extension **Live Server** di VS Code, cukup klik kanan pada file `index.html` dan pilih **Open with Live Server**.

---

## 📁 Struktur Direktori Project

```text
mockup-indonesia-data-portal/
├── index.html         # Halaman Utama Dashboard & Peta Interaktif GIS
├── profil.html        # Halaman Profil Detail Wilayah Kabupaten/Kota
├── styles.css         # Custom Design System, Off-White Tokens & Layout
├── Map.js             # Logika Peta Leaflet, Choropleth, Filter & Leaderboard
├── Profil.js          # Logika Detail Profil, ScrollSpy & Custom Search Picker
├── data.js            # Basis Data 514 Kabupaten/Kota & 38 Provinsi Indonesia
├── indonesia-kab.json # Berkas Batas Poligon GeoJSON Kabupaten/Kota Indonesia
└── README.md          # Dokumentasi Proyek
```

---

## 📄 Lisensi & Sumber Data
* **Sumber Data**: Publikasi Resmi Badan Pusat Statistik (BPS) Kabupaten/Kota Dalam Angka 2026.
* **Peta Dasar**: OpenStreetMap & Leaflet.js GeoJSON Engine.
* **Pengembang**: Giga Lukman Maulana.
