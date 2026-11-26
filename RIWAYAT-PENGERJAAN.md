# Riwayat Pengerjaan — SINILAI

Catatan kronologis pengembangan aplikasi penilaian siswa **SINILAI** (web + Android),
disusun dari pekerjaan yang benar-benar dikerjakan dan diuji pada tiap sesi.

- **Web:** https://sinilai.site.accio.ai
- **APK terbaru:** `SINILAI-v1.6-android.apk` (versionCode 7)
- **Paket Android:** `com.sinilai.app` · Android 5.0+ · izin: INTERNET, ACCESS_NETWORK_STATE
- **Database:** Supabase, proyek `sinilai` (`peprutcsvgpfmucbptil`), tabel `public.records`

---

## 9 Oktober 2026 — Versi pertama

- Aplikasi web React + Vite: banyak sekolah, banyak mata pelajaran, kelas, siswa.
- Penilaian **PH1/PH2, UTS, UAS** dengan bobot; nilai akhir = Σ(skor × bobot) ÷ Σ(bobot).
- Predikat A/B/C/D yang bisa diatur, penanda nilai di bawah KKM.
- Impor siswa massal dari Excel (template + pemetaan kolom otomatis), ekspor rekap/rapor.
- Penyimpanan lokal di perangkat (IndexedDB, cadangan localStorage), tanpa login.

## 11 Oktober 2026 — Penyesuaian aturan penilaian

- **NIS tidak lagi wajib** (form, impor Excel, template); pencocokan impor memakai nama bila NIS kosong.
- **KKM bisa diubah** per mata pelajaran (langsung di tabel) + **KKM bawaan** di Pengaturan.
- **Cakupan rekap**: PH saja, PH + UTS, PH + UTS + UAS (kolom, rata-rata, predikat, ekspor ikut menyesuaikan).
- Kode mata pelajaran sempat dikunci saat mengubah mapel.

## 12 Oktober 2026 — APK Android pertama (v1.0)

- Pembungkus WebView tanpa Gradle (javac → d8 → aapt2 → zipalign → apksigner).
- Bundel web dibangun ulang dengan **HashRouter** + jalur aset relatif agar berjalan dari `file://`.
- Ekspor Excel/JSON lewat lembar berbagi Android (JS bridge + FileProvider), impor lewat pemilih berkas.
- **Nol izin** saat itu karena aplikasi sepenuhnya luring.
- Catatan teknis: modul ES tidak dimuat dari `file://` tanpa `setAllowFileAccessFromFileURLs` +
  `setAllowUniversalAccessFromFileURLs`.

## 14 Oktober 2026 — Perbaikan cetak & tampilan

- **Cetak** diperbaiki: dialog cetak Android (PrintManager) di APK; gaya cetak hanya menampilkan isi rekap.
- **Kolom/tabel tidak lagi dibekukan** (semua kolom menggulir bersama).
- **Menu landscape** dapat digulir (panel memakai tinggi layar terlihat, `100dvh`).
- **Halaman Peringkat** baru: nilai tertinggi per kelas dan per sekolah.

## 15 Oktober 2026 — Publikasi web & PWA

- Situs terbit di **https://sinilai.site.accio.ai**.
- Ikon aplikasi (192/512/maskable/apple-touch) dibuat secara programatik, manifest + service worker.
- Kartu "Pasang sebagai aplikasi di HP" + pengingat pemasangan (Android: Chrome, iPhone: Safari).

## 17 Oktober 2026 — Sinkronisasi dengan login (v1.2)

- Proyek Supabase dibuat; tabel `records` menyimpan data per akun (jsonb) dengan RLS.
- Layar masuk/daftar + mode "Lanjut tanpa akun".
- Mesin sinkronisasi: data lokal tetap sumber utama, perubahan dikirim otomatis, perangkat lain
  menerima lewat langganan langsung (realtime), penggabungan memakai versi terbaru.
- Diuji dua sesi peramban: data akun sama muncul otomatis di perangkat lain.
- **Papan ketik berkedip** diperbaiki: efek dialog berjalan ulang tiap ketikan karena dependensi
  memakai fungsi inline, sehingga fokus direbut bergantian; kini efek hanya bergantung pada status buka.

## 18 Oktober 2026 — Perbaikan APK

- **"Failed to fetch" saat masuk di APK**: penyebabnya APK dibangun **tanpa izin INTERNET**.
  Ditambahkan `INTERNET` dan `ACCESS_NETWORK_STATE` (izin normal, tanpa dialog) — **v1.3**.
- Pesan galat jaringan dibuat ramah ("Tidak ada koneksi internet…").
- **Isolasi data antar akun** (v1.4): data perangkat ditandai pemiliknya; masuk dengan akun berbeda
  membersihkan data perangkat lebih dulu, antrean unggahan direset. Diuji: akun B melihat 0 data akun A.

## 30 Oktober 2026 — Cakupan Peringkat & komponen per kelas

- **Peringkat** memakai cakupan nilai: **PH**, **UTS**, **UAS**, atau **semua** (v1.5).
  Diuji: PH → Budi 90; UTS → Ani 95; UAS → Budi 98; semua → Ani 85.
- **Komponen penilaian pindah ke tiap kelas** (v1.6):
  - tidak lagi diatur di Pengaturan; dikelola dari menu **Kelas → tombol Komponen**;
  - tiap kelas punya daftar sendiri (mis. kelas 7 punya PH3, kelas 8 baru PH1);
  - kelas baru otomatis mendapat PH1, UTS, UAS;
  - setiap komponen menyimpan **tanggal penilaian** dan **catatan/materi**, tampil di kepala kolom
    Input Nilai dan ikut tercatat pada ekspor Excel;
  - **migrasi otomatis** data lama: komponen milik sekolah disalin ke setiap kelas, seluruh nilai
    dipindahkan ke salinan kelasnya, komponen lama dihapus (versi skema 2).
  - Verifikasi: data lama 2 komponen × 2 kelas → 4 komponen, tanggal/catatan ikut tersalin,
    nilai menempel ke komponen kelas yang benar, tanpa galat konsol.

---

## Daftar berkas penting

| Berkas | Isi |
|---|---|
| `nilai-siswa/` | Aplikasi web (React + Vite), termasuk `supabase/migrations` |
| `android-sinilai/` | Proyek APK: `build_apk.py`, manifest, kode Java, README |
| `SINILAI-v1.6-android.apk` | APK terbaru (versionCode 7) |
| `RIWAYAT-PENGERJAAN.md` | Dokumen ini |

## Catatan pemeliharaan

- APK ditandatangani `android-sinilai/sinilai-release.keystore` — **jangan hilang**, dipakai untuk
  menerbitkan pembaruan. Tanpa kunci ini APK baru tidak bisa menimpa versi lama.
- Membangun ulang APK: `python3 android-sinilai/build_apk.py` setelah bundel web dibuat dengan
  `VITE_ROUTER=hash vite build --base=./`.
- Konfirmasi email Supabase masih bawaan aktif; agar pendaftaran langsung bisa dipakai, matikan
  **Authentication → Providers → Email → Confirm email**.

---

## 15 November 2026 — Perbaikan: komponen yang dihapus muncul lagi

**Masalah.** Menghapus komponen (mis. PH 6/PH 7 yang tidak terpakai) berhasil di layar,
tetapi setelah aplikasi dimuat ulang komponen itu muncul kembali.

**Penyebab (tiga lapis).**
1. Migrasi ke komponen per kelas berjalan ulang setiap aplikasi dibuka, karena penanda
   versi skema tidak tersimpan di server. Migrasi itu mengkloning **41 komponen lama
   milik sekolah** yang masih aktif di server ke setiap kelas — termasuk PH yang baru
   saja dihapus.
2. Antrean penghapusan hanya ada di memori. Bila aplikasi dimuat ulang atau sedang
   luring sebelum terkirim, penghapusan hilang dan data lama ditarik lagi dari server.
3. Efek "ganti akun" ikut berjalan saat aplikasi baru dibuka, sehingga antrean yang
   tersimpan justru dibersihkan.

**Perbaikan.**
- `migrasi.js` ditulis ulang: idempoten (tidak mengkloning ulang bila data sudah per
  kelas), menandai komponen lama sebagai terhapus, dan melewati komponen yang sudah
  pernah dihapus pengguna.
- Antrean perubahan disimpan di perangkat (`sinilai:antrian`) dan dikirim lebih dulu
  sebelum menarik data server; tidak lagi dibersihkan saat aplikasi dibuka.
- Penghapusan komponen langsung dikirim (tanpa menunggu jeda), dan id yang dihapus
  dicatat permanen (`sinilai:dihapus`) agar tidak bisa dihidupkan lagi oleh tarikan
  server mana pun.
- Antrean dari migrasi ikut dikirim, sehingga komponen lama di server juga dibersihkan.

**Verifikasi.** Dengan akun uji: hapus PH pada kelas IX → muat ulang aplikasi → komponen
tetap hilang (diulang dua kali dengan komponen berbeda). Sebelum perbaikan, komponen
yang sama selalu kembali.

**Rilis.** APK `SINILAI-v1.7-android.apk` (versionCode 8) dan web
https://sinilai.site.accio.ai.

**Catatan.** Pembersihan 41 komponen lama di server berjalan otomatis saat aplikasi
dibuka dalam keadaan masuk akun; sampai itu terjadi, baris lama tetap ada di server
tetapi tidak lagi ditampilkan atau dipakai.

---

## Pembaruan lanjutan — komponen penilaian per mata pelajaran

**Permintaan.** Setiap mata pelajaran punya komponen penilaian berbeda-beda, jadi
komponen harus dipisah per mata pelajaran, bukan hanya per kelas.

**Perubahan.**
- Komponen kini dimiliki satu **kelas + satu mata pelajaran** (`subjectId` pada data).
- Form tambah/ubah komponen punya pilihan **Mata Pelajaran**, dan daftar komponen
  menampilkan kolom mapel.
- Kelas baru otomatis mendapat komponen bawaan (PH1, UTS, UAS) untuk **setiap** mapel
  di sekolah itu.
- Mapel baru otomatis mendapat komponen bawaan di **setiap** kelas sekolah tersebut.
- Menghapus mapel ikut menghapus komponen dan nilainya.
- Input Nilai, Rekap, dan Peringkat memakai komponen sesuai kelas + mapel yang dipilih.
- Migrasi otomatis (versi skema 3): komponen lama per kelas digandakan ke setiap mapel,
  nilai dipindahkan ke salinan mapelnya, dan komponen lama ditandai terhapus.

**Verifikasi.** Data uji 2 komponen × 2 mapel: hasil migrasi 4 komponen dengan penanda
mapel yang benar (PH1/UAS × MTK/IPA), nilai 80 tetap menempel pada komponen MTK, dan
tidak ada galat saat halaman Rekap dibuka.

**Rilis.** APK `SINILAI-v1.8-android.apk` (versionCode 9) dan web
https://sinilai.site.accio.ai.
