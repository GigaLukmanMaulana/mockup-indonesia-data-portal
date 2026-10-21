# Perencanaan Teknis: 5 Poin Revisi Halaman Profil Wilayah

Dokumen ini memuat analisis kebutuhan, spesifikasi teknis, dan rencana aksi (*checkpoint execution plan*) untuk menuntaskan 5 poin arahan revisi atasan pada halaman [`profil.html`](file:///c:/laragon/www/PKL/mockup/profil.html) (contoh rujukan: `http://localhost:3000/profil.html?id=334&slug=kalimantan-tengah-barito-selatan`).

---

## 1. Analisis Kebutuhan & Detail 5 Poin Revisi

### Poin 1: Tab Data Pertanian — Tampilkan Semua Data Komoditas Penuh (Hapus Tombol "Lihat Semua")
* **Kondisi Eksisting**:
  Pada [`assets/js/core/Profil.js`](file:///c:/laragon/www/PKL/mockup/assets/js/core/Profil.js#L1540-L1543), daftar komoditas dibatasi menggunakan `.slice(0, 5)` untuk Tanaman Pangan, Hortikultura, dan Perkebunan, serta `.slice(0, 3)` untuk Peternakan. Jika terdapat lebih dari 5 item, dimunculkan tombol `.btn-see-all` yang membuka modal dialog `#taniModal`.
* **Solusi**:
  1. Hapus pemotongan `.slice()` pada `filteredTp`, `filteredHorti`, `filteredKebun`, `filteredPop`, dan `filteredProd`. Seluruh komoditas yang terdata pada daerah terkait ditampilkan secara langsung.
  2. Hapus elemen tombol `.btn-see-all` dan event listener pembuka modal.
  3. Berikan penataan wadah scroll internal yang rapi pada setiap sub-list kartu (`max-height: 420px; overflow-y: auto; padding-right: 6px;`) agar kartu di grid 4-sektor tetap proporsional dan tidak timpang secara vertikal saat salah satu sektor memiliki belasan komoditas.
  4. Pertahankan fitur *Search Bar* (`#taniSearch`) agar pengguna tetap dapat menyaring nama komoditas secara instan *on-the-fly*.
  5. Bersihkan markup dialog modal `#taniModal` yang tidak lagi digunakan.

---

### Poin 2: Tab Sosial — Urutkan Jenjang Pendidikan dari TK s.d. PT & Pemisahan Madrasah (MI, MTs, MA)
* **Kondisi Eksisting**:
  Pada [`assets/js/core/Profil.js`](file:///c:/laragon/www/PKL/mockup/assets/js/core/Profil.js#L1947-L1955), urutan diagram batang pendidikan (`eduBar`) tidak runut:
  `SD` → `SMP` → `SMA` → `SMK` → `Madrasah (MI/MTs/MA)` → `PAUD & TK` → `Perguruan Tinggi`.
  Selain itu, madrasah digabung dalam satu baris padahal memiliki tingkat jenjang yang berbeda (MI = setingkat SD, MTs = setingkat SMP, MA = setingkat SMA).
* **Solusi**:
  1. Di [`assets/js/data/sosial-data.js`](file:///c:/laragon/www/PKL/mockup/assets/js/data/sosial-data.js), struktur data `rekap_jenjang.madrasah` sudah memuat rincian terpisah:
     `{ total, mi, mts, ma, siswa, guru, negeri, swasta }`.
     *(Contoh Barito Selatan: MI: 22, MTs: 17, MA: 12. Total = 51)*.
  2. Susun ulang urutan visual grafik batang pendidikan (`eduBar`) mengikuti hierarki jenjang pendidikan nasional:
     1. **PAUD & TK** (Kategori Prasekolah / Usia Dini — `#E8604C`)
     2. **SD / Sederajat** (Dasar Umum — `#0FB5A0`)
     3. **Madrasah Ibtidaiyah (MI)** (Dasar Keagamaan — `#14B8A6`)
     4. **SMP / Sederajat** (Menengah Pertama Umum — `#2E9BD6`)
     5. **Madrasah Tsanawiyah (MTs)** (Menengah Pertama Keagamaan — `#38BDF8`)
     6. **SMA / Sederajat** (Menengah Atas Akademik — `#D9962B`)
     7. **Madrasah Aliyah (MA)** (Menengah Atas Keagamaan — `#F59E0B`)
     8. **SMK** (Menengah Kejuruan — `#5B6EE0`)
     9. **SLB** (Pendidikan Khusus — jika > 0, `#64748B`)
     10. **Perguruan Tinggi** (Tinggi — `#8E44AD`)
  3. Filter bar hanya merender jenjang yang memiliki nilai `> 0`.
  4. Perbarui penghitungan baris status Negeri vs Swasta (`eduStatusRow`) agar rincian MI, MTs, dan MA ikut teragregasi secara presisi.

---

### Poin 3: Tab Penduduk & SDM — Klarifikasi Angkatan Kerja (Satuan Baku: "Jiwa" / Orang)
* **Kondisi Eksisting**:
  Di [`assets/js/core/Profil.js`](file:///c:/laragon/www/PKL/mockup/assets/js/core/Profil.js#L998-L1001) dan `#akTree` baris 1085:
  Angka angkatan kerja hanya menampilkan angka mentah (contoh: `85.661`) tanpa unit yang menonjol di kartu pohon kerja, sehingga menimbulkan keraguan apakah angka tersebut adalah persentase (%) atau jumlah orang (jiwa).
* **Keputusan Penetapan Satuan**:
  - Menggunakan satuan baku resmi statistik kependudukan BPS: **`jiwa`** (yang bermakna banyaknya **orang** usia produktif kerja).
  - Pilihan kata **`jiwa`** menjaga konsistensi 100% dengan metrik kependudukan lain di halaman yang sama (`Total penduduk: 138.163 jiwa`, `Laki-laki: 70.123 jiwa`, `Perempuan: 68.040 jiwa`).
* **Solusi**:
  1. Pada KPI Card `Angkatan kerja`:
     - Tampilkan nilai dengan penegasan unit: `${fmt(ak)}` `<span class="k-unit">jiwa</span>`.
     - Keterangan note KPI: *"Penduduk usia produktif kerja (BPS Sakernas)"*.
  2. Pada Pohon Rincian `#akTree`:
     - Tampilkan angka jumlah jiwa beserta porsi persentasenya:
       - **I. Angkatan Kerja**: `${fmt(ak)} jiwa` `(100% Angkatan Kerja)`
       - **Bekerja**: `${fmt(bek)} jiwa` `(${((bek / ak) * 100).toFixed(1)}%)`
       - **Pengangguran Terbuka**: `${fmt(nganggur)} jiwa` `(${((nganggur / ak)*100).toFixed(1)}%)`
  3. Pada elemen `#akTotal` (chip kanan atas kartu):
     - Tampilkan teks eksplisit: `${fmt(ak)} Jiwa`.
  4. Pada catatan sumber `#srcAk`:
     - Tambahkan catatan metodologis:
       *"Angkatan Kerja adalah penduduk usia 15 tahun ke atas yang aktif secara ekonomi (bekerja atau mencari kerja). Satuan: Jiwa / Orang (BPS Sakernas 2023/2024)."*

---

### Poin 4: Tab Profil Wilayah — Curah Hujan (Tampilkan Angka pada Setiap Batang Bulanan)
* **Kondisi Eksisting**:
  Pada [`assets/js/core/Profil.js`](file:///c:/laragon/www/PKL/mockup/assets/js/core/Profil.js#L850-L868), grafik batang Curah Hujan SVG hanya menampilkan angka pada sumbu Y (`0, 100, 200, 300, 400`) dan nama bulan di sumbu X (`Jan` s.d. `Des`). Angka per bulan hanya ada pada tag `<title>` (tooltip) dan tidak terlihat secara langsung.
* **Solusi**:
  1. Modifikasi fungsi `renderRainChart(r)`:
     - Render elemen teks nilai `<text>` langsung di atas masing-masing batang (posisi `y(v) - 5`):
       ```javascript
       s += `<text class="rain-val" x="${x + w / 2}" y="${y(v) - 5}" text-anchor="middle" font-family="var(--mono)" font-size="9" font-weight="700" fill="var(--text-hi)">${v}</text>`;
       ```
     - Tambahkan padding atas SVG (`P.t = 24`) agar angka pada batang yang tinggi tidak terpotong tepi atas SVG.
  2. Berikan tooltip dan note total yang informatif di bagian bawah grafik (`rainNote`).

---

### Poin 5: Metadata Tahun Data Resmi pada Sektor Pertanian & Modul Terkait
* **Kondisi Eksisting**:
  Saat ini, kartu pertanian dan modul profil hanya menyebut "Data Resmi BPS" tanpa menyertakan tahun rilis data. Atasan meminta agar tahun data (seperti tahun produksi pertanian) dituliskan dengan jelas.
* **Solusi**:
  1. **Tab Data Pertanian**:
     - Data pertanian bersumber dari **Sensus Pertanian 2023 (ST2023) / Publikasi BPS & Kementan 2023** (sesuai dokumen [`docs/PLANNING_INTEGRASI_DATA_PERTANIAN_2023.md`](file:///c:/laragon/www/PKL/mockup/docs/PLANNING_INTEGRASI_DATA_PERTANIAN_2023.md)).
     - Cantumkan tahun 2023 pada judul/eyebrow:
       `SEKTOR PERTANIAN · DATA RESMI BPS TAHUN 2023`
     - Tambahkan chip tahun pada header kartu: `Tahun Data: 2023`.
     - Aktifkan footnote `#srcTaniSektor`:
       *"Sumber Data: Badan Pusat Statistik (BPS) & Kementerian Pertanian RI — Publikasi Statistik Tahunan 2023. Mencakup subsektor Tanaman Pangan, Hortikultura, Perkebunan, dan Peternakan."*
  2. **Metadata Sektor Lain**:
     - **Tab Konsumsi**: *"Sumber: BPS — Survei Sosial Ekonomi Nasional (SUSENAS) 2023/2024."*
     - **Tab Sosial (Pendidikan & Faskes)**: *"Sumber: Kemendikbudristek (Dapodik), Kemenag (EMIS) Semester Ganjil 2023/2024, dan Kemenkes RI (RS Online/Puskesmas 2024)."*
     - **Tab PODES**: *"Sumber: BPS — Potensi Desa (PODES) 2024."*
     - **Tab Penduduk & SDM**: *"Sumber: BPS — Data Kependudukan & Survei Angkatan Kerja Nasional (Sakernas) 2023/2024."*

---

## 2. Matriks Checkpoint Pelaksanaan

| Checkpoint | Deskripsi Pekerjaan | File Terkait |
|:---|:---|:---|
| **CP-01** | **Pertanian Full List & Removal of Modal**: Hapus pembatasan `slice()`, tampilkan seluruh komoditas langsung di kartu masing-masing dengan container scroll rapi, dan hilangkan tombol serta modal "Lihat Semua". | [`assets/js/core/Profil.js`](file:///c:/laragon/www/PKL/mockup/assets/js/core/Profil.js)<br>[`profil.html`](file:///c:/laragon/www/PKL/mockup/profil.html) |
| **CP-02** | **Jenjang Pendidikan Runut & Pemecahan Madrasah**: Susun diagram batang dari PAUD/TK hingga Perguruan Tinggi, dan pecah data madrasah menjadi MI, MTs, dan MA secara proporsional. | [`assets/js/core/Profil.js`](file:///c:/laragon/www/PKL/mockup/assets/js/core/Profil.js) |
| **CP-03** | **Klarifikasi Angkatan Kerja (Satuan Jiwa & Proporsi)**: Beri label `jiwa/orang` yang tegas pada KPI dan chip `#akTotal`, serta tambahkan persentase bekerja dan pengangguran di `#akTree`. | [`assets/js/core/Profil.js`](file:///c:/laragon/www/PKL/mockup/assets/js/core/Profil.js) |
| **CP-04** | **Label Angka Curah Hujan Bulanan**: Tambahkan teks angka numerik di atas setiap batang bulanan grafik SVG Curah Hujan dengan tipografi monospaced yang presisi. | [`assets/js/core/Profil.js`](file:///c:/laragon/www/PKL/mockup/assets/js/core/Profil.js) |
| **CP-05** | **Penegasan Metadata Tahun Data**: Munculkan informasi Tahun 2023 pada Sektor Pertanian dan tahun rilis resmi pada sektor Konsumsi, Pendidikan, Penduduk, dan PODES. | [`assets/js/core/Profil.js`](file:///c:/laragon/www/PKL/mockup/assets/js/core/Profil.js)<br>[`profil.html`](file:///c:/laragon/www/PKL/mockup/profil.html) |
| **CP-06** | **Verifikasi Visual & Uji Interaktif di Browser**: Pastikan seluruh kartu tampil proporsional di Barito Selatan (id: 334), Kutai Barat (id: 358), maupun wilayah lainnya tanpa error console. | Browser Validation |

---

## 3. Kriteria Keberhasilan (Definition of Done)
1. Seluruh komoditas pada tab *Data Pertanian* langsung muncul di kartu tanpa tombol "Lihat Semua", dan pencarian *real-time* tetap berfungsi menyaring komoditas.
2. Grafik batang *Sarana Pendidikan* berurutan rapi dari PAUD & TK di atas hingga Perguruan Tinggi di bawah, dan madrasah terpecah menjadi MI, MTs, dan MA.
3. Angka Angkatan Kerja terbaca tegas sebagai jumlah orang/jiwa (`jiwa`) lengkap dengan persentase di pohon tenaga kerja.
4. Grafik Curah Hujan menampilkan angka mm di atas setiap batang bulanan secara permanen.
5. Keterangan Tahun 2023 pada Pertanian dan metadata tahun rilis pada tab-tab lainnya tampil jelas.
6. Perubahan tersimpan secara lokal dan tidak di-push sebelum verifikasi pengguna.
