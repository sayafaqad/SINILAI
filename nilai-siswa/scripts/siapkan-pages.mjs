/**
 * Menyiapkan hasil build untuk hosting di sub-folder (GitHub Pages).
 *
 * Build memakai `--base=./` sehingga aset yang diolah Vite di index.html sudah
 * relatif, tetapi dua hal masih memakai jalur absolut dan harus diperbaiki di
 * sini:
 *
 * 1. `manifest.webmanifest` disalin apa adanya dari folder `public`, sehingga
 *    `start_url`, `scope`, dan `src` ikonnya masih "/" dan "/assets/...".
 *    Akibatnya ikon PWA tidak ditemukan saat dipasang dari sub-folder.
 * 2. `index.html` memuat favicon dan apple-touch-icon dengan jalur absolut
 *    "/assets/images/..." karena jalur itu memang dibutuhkan versi web biasa
 *    (BrowserRouter, disajikan dari akar domain). Di sub-folder jalur itu
 *    menunjuk ke domain, bukan ke repositori.
 *
 * Skrip ini hanya dijalankan untuk build hash-router (GitHub Pages), jadi
 * mengubah jalur menjadi relatif aman: alamat halaman selalu berada di akar
 * sub-folder (mis. /repo/#/rekap), bukan /repo/rekap.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dist = join(process.cwd(), 'dist');

/** Ubah rujukan absolut "/assets/..." menjadi relatif "./assets/...". */
function jadikanRelatif(teks) {
  return teks.replaceAll('"/assets/', '"./assets/').replaceAll("'/assets/", "'./assets/");
}

/* ── manifest PWA ─────────────────────────────────────────────────────── */
const manifest = join(dist, 'manifest.webmanifest');
if (existsSync(manifest)) {
  let teks = readFileSync(manifest, 'utf8');
  teks = jadikanRelatif(teks);
  teks = teks.replace(/"start_url"\s*:\s*"\/"/, '"start_url": "./"');
  teks = teks.replace(/"scope"\s*:\s*"\/"/, '"scope": "./"');
  JSON.parse(teks); // pastikan tetap JSON yang sah sebelum ditulis
  writeFileSync(manifest, teks);
  console.log('[siapkan-pages] manifest disesuaikan untuk sub-folder.');
} else {
  console.warn('[siapkan-pages] manifest.webmanifest tidak ditemukan, dilewati.');
}

/* ── index.html ───────────────────────────────────────────────────────── */
const halaman = join(dist, 'index.html');
let adaGalat = false;
if (existsSync(halaman)) {
  const asli = readFileSync(halaman, 'utf8');
  const baru = jadikanRelatif(asli);
  if (baru !== asli) {
    writeFileSync(halaman, baru);
    console.log('[siapkan-pages] jalur ikon di index.html dijadikan relatif.');
  }

  // Periksa hasil akhir: tidak boleh ada lagi rujukan berkas absolut.
  const sisa = baru.match(/(?:href|src)="\/[^"]*"/g);
  if (sisa) {
    adaGalat = true;
    console.error('[siapkan-pages] masih ada jalur absolut di index.html:', sisa);
  }
  if (!/src="\.\/assets\//.test(baru)) {
    adaGalat = true;
    console.error('[siapkan-pages] bundel JS tidak ditemukan sebagai jalur relatif — build ulang dengan --base=./');
  }
} else {
  adaGalat = true;
  console.error('[siapkan-pages] index.html tidak ditemukan di dist/.');
}

if (adaGalat) process.exit(1);
console.log('[siapkan-pages] siap diunggah ke sub-folder (GitHub Pages).');
