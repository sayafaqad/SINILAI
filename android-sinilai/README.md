# SINILAI — APK Android

Pembungkus Android untuk aplikasi SINILAI (`../nilai-siswa`). Hasil akhir:
`../SINILAI-v1.0-android.apk` (~306 KB).

- Paket: `com.sinilai.app`, versi 1.0 (versionCode 1)
- minSdk 21 (Android 5.0), targetSdk 34
- **Nol izin** — tidak ada satu pun `uses-permission`
- Seluruh aplikasi (HTML, CSS, JS, ikon) ada di dalam APK di `assets/web`,
  dibuka lewat `file:///android_asset/web/index.html`
- Ditandatangani v1 + v2 + v3 dengan `sinilai-release.keystore`

## Cara membangun ulang

1. Bundel web untuk APK (HashRouter + jalur relatif). Dari folder `nilai-siswa`:

   ```bash
   VITE_ROUTER=hash ./node_modules/.bin/vite build --base=./ --outDir /tmp/nilai-apk-web --emptyOutDir
   ```

   Dua hal ini wajib:
   - `VITE_ROUTER=hash` — di dalam APK halaman dimuat dari `file://`, dan
     `history.pushState` diblokir di sana sehingga `BrowserRouter` gagal.
   - `--base=./` — jalur `"/assets/…"` akan dibaca sebagai `file:///assets/…`
     dan berkas tidak ditemukan.

2. Bangun APK (tanpa Gradle):

   ```bash
   cd ../android-sinilai
   SINILAI_WEB=/tmp/nilai-apk-web python3 build_apk.py
   ```

   Skrip mencari JDK 17 + Android SDK di `~/.accio/toolchain` (bisa diarahkan
   lewat `JAVA_HOME` / `ANDROID_SDK`), lalu menjalankan
   javac → d8 → aapt2 → zipalign → apksigner dan memverifikasi hasilnya.

## Setelan WebView yang penting

| Setelan | Alasan |
| --- | --- |
| `setDomStorageEnabled(true)` | menyimpan data siswa di perangkat |
| `setDatabaseEnabled(true)` | dukungan penyimpanan lama |
| `setAllowFileAccessFromFileURLs(true)` + `setAllowUniversalAccessFromFileURLs(true)` | berkas JS dikemas sebagai modul ES; modul ES dari `file://` diblokir tanpa setelan ini sehingga aplikasi tampil kosong |
| `setTextZoom(100)` | ukuran huruf dikunci agar tabel nilai tetap rapi |

## Jembatan ke Android

- `AndroidSimpan.simpanDanBagikan(nama, isiBase64)` — ekspor Excel/JSON.
  Di WebView, unduhan `blob:` tidak didukung, jadi berkas dikirim ke sisi
  Android, disimpan di folder cache, lalu dibuka lewat lembar berbagi
  (`BerkasProvider` dari `com.sinilai.app.berkas`, tanpa izin apa pun).
- `AndroidAplikasi.platform()` — penanda bahwa aplikasi berjalan sebagai APK,
  dipakai halaman Pengaturan agar tidak menawarkan pemasangan PWA lagi.
- Pemilih berkas `<input type="file">` dilayani `onShowFileChooser`
  (`ACTION_GET_CONTENT`), sehingga impor Excel berjalan tanpa izin penyimpanan.

## Batasan yang diketahui

- **Cetak** tidak tersedia di WebView: tombol Cetak memberi keterangan agar
  memakai Ekspor Excel lalu dicetak dari komputer.
- Keystore (`sinilai-release.keystore`, sandi `sinilaiapp2026`, alias `sinilai`)
  harus dipakai lagi untuk pembaruan; kalau hilang, APK baru tidak bisa
  dipasang sebagai pembaruan di atas yang lama.
- APK tidak diuji di perangkat/emulator Android sungguhan pada sesi ini.
  Yang diuji: bundel web di dalam APK dijalankan pada kondisi `file://`
  (Chrome headless) — aplikasi tampil, delapan rute terbuka, IndexedDB dan
  localStorage menulis-membaca, data bertahan setelah muat ulang, tanpa galat konsol.
