# SINILAI — Aplikasi Penilaian Siswa

Aplikasi input dan rekap nilai siswa untuk sekolah: multi sekolah, multi kelas, multi
mata pelajaran, dengan komponen penilaian **per kelas + per mata pelajaran** (PH/UTS/UAS),
tanggal & catatan tiap penilaian, rekap, peringkat, serta sinkronisasi antar perangkat.

Tersedia sebagai **aplikasi web** (bisa dipasang sebagai PWA, tetap jalan tanpa internet)
dan **APK Android**.

---

## Daftar isi

- [Fitur](#fitur)
- [Struktur repositori](#struktur-repositori)
- [Menjalankan di komputer](#menjalankan-di-komputer)
- [Database (Supabase)](#database-supabase)
- [Build web](#build-web)
- [Deploy ke GitHub Pages](#deploy-ke-github-pages)
- [Build APK Android](#build-apk-android)
- [Model data](#model-data)
- [Keamanan & hal yang tidak boleh di-commit](#keamanan--hal-yang-tidak-boleh-di-commit)
- [Riwayat pengerjaan](#riwayat-pengerjaan)

---

## Fitur

- **Multi sekolah**: satu aplikasi untuk beberapa sekolah, masing-masing punya daftar
  kelas dan mata pelajaran sendiri.
- **Komponen penilaian per kelas + mata pelajaran**: kelas 7 Matematika bisa punya PH1–PH3,
  sementara kelas 8 baru PH1; tiap komponen punya **tanggal** dan **catatan materi**.
- **Input nilai** PH, UTS, UAS dengan bobot; nilai akhir = Σ(skor × bobot) ÷ Σ(bobot) atas
  komponen yang sudah ada nilainya.
- **Rekap** per kelas dan **laporan per siswa**, dengan pilihan cakupan: PH saja,
  PH + UTS, atau PH + UTS + UAS. Bisa dicetak dan diekspor ke Excel.
- **Peringkat**: siswa bernilai tertinggi per kelas maupun per sekolah, dengan cakupan
  PH / UTS / UAS / keseluruhan.
- **Impor siswa dari Excel**, ekspor rekap, laporan, dan cadangan data (JSON).
- **Offline-first**: data tersimpan di perangkat (IndexedDB) dan tetap bisa diisi tanpa
  internet.
- **Sinkronisasi akun**: masuk dengan email, data antar perangkat (web ⇄ HP) diperbarui
  otomatis lewat Supabase Realtime.
- **PWA + APK**: bisa dipasang di Android (APK) maupun iPhone (Safari → Tambahkan ke
  Layar Utama).

---

## Struktur repositori

```
.
├─ nilai-siswa/          # aplikasi web (React 18 + Vite + Tailwind)
│  ├─ src/
│  │  ├─ pages/          # Dasbor, Sekolah, Kelas, Mapel, Siswa, Input Nilai, Rekap, Peringkat, Pengaturan
│  │  ├─ components/     # UI, layout, panel komponen penilaian, layar masuk
│  │  ├─ store/          # AppStore (data + sinkronisasi), AuthStore (akun)
│  │  └─ lib/            # db (IndexedDB), sync (Supabase), migrasi, grading, excel, format
│  ├─ public/            # manifest PWA, service worker, ikon
│  ├─ supabase/migrations/   # skema database + RLS
│  └─ scripts/           # penyiap deploy GitHub Pages
├─ android-sinilai/      # pembungkus Android (WebView, tanpa Gradle)
│  └─ app/src/main/java/com/sinilai/app/  # MainActivity, BerkasProvider
├─ .github/workflows/deploy-pages.yml
└─ RIWAYAT-PENGERJAAN.md
```

---

## Menjalankan di komputer

Prasyarat: **Node.js 20+**.

```bash
cd nilai-siswa
npm ci

# siapkan konfigurasi (lihat bagian Database)
cp .env.example .env
# isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY

npm run dev        # http://localhost:5173
```

Tanpa `.env`, aplikasi tetap jalan dalam **mode lokal** (data hanya di perangkat, tanpa
sinkronisasi).

---

## Database (Supabase)

Sinkronisasi memakai Supabase (Postgres + Auth + Realtime). Satu proyek cukup untuk
semua pengguna; data dipisahkan per akun lewat Row Level Security.

1. Buat proyek di [supabase.com](https://supabase.com) (paket gratis cukup).
2. Jalankan migrasi di **SQL Editor**, berurutan:
   - `nilai-siswa/supabase/migrations/0001_profiles.sql`
   - `nilai-siswa/supabase/migrations/0002_sinilai_records.sql`
   - `nilai-siswa/supabase/migrations/0003_profiles_grants.sql`
3. Ambil **Project URL** dan **anon/publishable key** dari *Project Settings → API*, lalu
   isi `.env`:

```dotenv
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

4. **Authentication → Providers → Email**: matikan *Confirm email* bila ingin pengguna
   langsung bisa masuk setelah mendaftar (email bawaan Supabase punya batas kirim harian
   yang rendah). Atur juga **Authentication → URL Configuration → Site URL** ke alamat
   situs Anda.

Skema utama: tabel `public.records` menyimpan satu dokumen per baris
(`user_id, collection, id, payload jsonb, updated_at, deleted_at`), dengan RLS
`auth.uid() = user_id` pada semua operasi. Kunci anon aman dipakai di peramban karena
tidak dapat membaca data akun lain.

---

## Build web

```bash
cd nilai-siswa
npm run build          # hasil di dist/, memakai BrowserRouter (URL bersih)
npm run preview        # pratinjau hasil build
```

Untuk hosting yang **tidak** bisa mengarahkan semua rute ke `index.html` (misalnya GitHub
Pages), build dengan mode hash:

```bash
VITE_ROUTER=hash npm run build -- --base=./
node scripts/siapkan-pages.mjs
```

---

## Deploy ke GitHub Pages

Workflow `.github/workflows/deploy-pages.yml` sudah disiapkan (build + upload + deploy).

1. Unggah repositori ini ke GitHub (branch `main`).
2. **Settings → Secrets and variables → Actions** → tambah dua *repository secret*:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. **Settings → Pages → Source**: pilih **GitHub Actions**.
4. Push ke `main` (atau jalankan workflow secara manual). Situs terbit di
   `https://<pengguna>.github.io/<repo>/`.

Catatan: workflow memakai `VITE_ROUTER=hash` dan `--base=./` supaya rute dan aset tetap
benar di sub-folder repositori; `scripts/siapkan-pages.mjs` menyesuaikan manifest PWA
(`start_url`, `scope`, dan jalur ikon) setelah build.

---

## Build APK Android

APK dibungkus tanpa Gradle: `javac` → `d8` → `aapt2` → `zipalign` → `apksigner`.

Prasyarat: **JDK 17**, **Android SDK** dengan `build-tools;34.0.0` dan `platforms;android-34`
(atur `ANDROID_SDK_ROOT`/`ANDROID_HOME`).

```bash
# 1) build bundel web untuk APK (hash router + jalur relatif)
cd nilai-siswa
VITE_ROUTER=hash npx vite build --base=./ --outDir ../android-sinilai/dist-web

# 2) bangun APK
cd ../android-sinilai
python3 build_apk.py
```

`build_apk.py` menyalin bundel web ke `app/src/main/assets/web`, lalu menghasilkan
`SINILAI-v*-android.apk` di folder induk.

**Keystore tidak disertakan di repositori.** Buat sekali, simpan baik-baik, dan pakai
untuk semua pembaruan (tanpa keystore yang sama, APK baru tidak bisa menimpa versi lama):

```bash
keytool -genkeypair -v -keystore sinilai-release.keystore \
  -alias sinilai -keyalg RSA -keysize 2048 -validity 10000
```

Sesuaikan nama keystore, alias, dan sandi di bagian atas `build_apk.py`, lalu naikkan
`versionCode`/`versionName` setiap rilis.

---

## Model data

Semua koleksi disimpan sebagai dokumen di perangkat (IndexedDB) dan di server
(`public.records`):

| Koleksi | Isi penting |
|---|---|
| `schools` | nama sekolah, NPSN, alamat, tahun ajaran |
| `classes` | kelas per sekolah |
| `subjects` | mata pelajaran per sekolah (kode, KKM) |
| `components` | komponen penilaian: `classId`, `subjectId`, `code`, `type` (`harian`/`uts`/`uas`), `weight`, `date`, `note` |
| `students` | siswa per kelas (NIS opsional) |
| `grades` | nilai: `studentId` + `subjectId` + `componentId` |
| `settings` | tahun ajaran, ambang predikat, KKM bawaan, `schemaVersion` |

Migrasi data berjalan otomatis di perangkat (`src/lib/migrasi.js`) dan idempoten —
data lama berbentuk komponen per sekolah/kelas diubah ke bentuk per kelas + mapel tanpa
kehilangan nilai.

---

## Keamanan & hal yang tidak boleh di-commit

- **Jangan commit `.env`** — sudah ada di `.gitignore`; gunakan `.env.example` sebagai
  contoh.
- **Jangan commit `*.keystore` / `*.jks`** dan jangan bagikan sandinya.
- **Jangan pernah menaruh `service_role` key** di aplikasi web/APK. Hanya kunci
  `anon`/`publishable` yang dipakai, dan data dilindungi RLS.
- File `.accio-site.json` (metadata hosting Accio) tidak disertakan.

---

## Riwayat pengerjaan

Kronologi lengkap pengembangan, penyebab bug penting, dan hasil uji ada di
[`RIWAYAT-PENGERJAAN.md`](RIWAYAT-PENGERJAAN.md).
