/**
 * Menyiapkan hasil build untuk GitHub Pages (sub-folder repositori).
 *
 * Build memakai `--base=./` sehingga aset di index.html sudah relatif, tetapi
 * manifest PWA disalin apa adanya dari folder public dan masih memakai jalur
 * absolut ("/assets/...", start_url "/"). Skrip ini menjadikannya relatif agar
 * ikon dan mode aplikasi tetap benar saat dipasang dari sub-folder.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dist = join(process.cwd(), 'dist');
const manifest = join(dist, 'manifest.webmanifest');

if (!existsSync(manifest)) {
  console.warn('[siapkan-pages] manifest.webmanifest tidak ditemukan, dilewati.');
  process.exit(0);
}

let teks = readFileSync(manifest, 'utf8');
teks = teks.replaceAll('"/assets/', '"./assets/');
teks = teks.replace(/"start_url"\s*:\s*"\/"/, '"start_url": "./"');
teks = teks.replace(/"scope"\s*:\s*"\/"/, '"scope": "./"');

// JSON tetap valid; tulis ulang.
JSON.parse(teks);
writeFileSync(manifest, teks);
console.log('[siapkan-pages] manifest disesuaikan untuk sub-folder.');
