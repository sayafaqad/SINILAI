/**
 * Uji mode luring SINILAI.
 *
 * Aplikasi ini dipakai di sekolah yang jaringannya tidak selalu ada, jadi
 * janji "tetap terbuka tanpa internet" harus dibuktikan: setelah service
 * worker mengambil alih, halaman dimuat ulang dalam keadaan offline dan harus
 * tetap tampil, bukan halaman galat peramban.
 *
 * Pemakaian: node scripts/uji-offline.mjs [url]
 */
import { chromium } from 'playwright';

const URL_APLIKASI = (process.argv[2] || 'http://127.0.0.1:4173/').replace(/\/+$/, '');
const hasil = [];
const catat = (nama, lulus, ket = '') => {
  hasil.push({ nama, lulus });
  console.log(`${lulus ? 'OK  ' : 'GAGAL'} ${nama}${ket ? ' — ' + ket : ''}`);
};

const peramban = await chromium.launch({ args: ['--no-sandbox'] });
const konteks = await peramban.newContext();
const halaman = await konteks.newPage();
const galat = [];
halaman.on('pageerror', (e) => galat.push(e.message));

await halaman.goto(URL_APLIKASI + '/', { waitUntil: 'networkidle' });
const tanpaAkun = halaman.getByRole('button', { name: /Lanjut tanpa akun/i });
if (await tanpaAkun.count()) await tanpaAkun.first().click();
await halaman.waitForTimeout(800);

const dikendalikan = await halaman
  .waitForFunction(() => navigator.serviceWorker?.controller != null, undefined, { timeout: 20000 })
  .then(() => true)
  .catch(() => false);
catat('service worker mengendalikan halaman', dikendalikan);

await konteks.setOffline(true);
await halaman.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
await halaman.waitForTimeout(4000);

const isi = await halaman.evaluate(
  () => (document.querySelector('#root')?.textContent || '').trim().length,
);
const judul = await halaman.title();
catat('aplikasi tetap tampil saat offline', isi > 100, `${isi} karakter`);
catat('judul halaman benar saat offline', /SINILAI/i.test(judul), judul);
catat('tidak ada galat skrip saat offline', galat.length === 0, galat.slice(0, 2).join(' | '));

const gagal = hasil.filter((h) => !h.lulus);
console.log(`\n${hasil.length - gagal.length}/${hasil.length} pemeriksaan lulus.`);
await peramban.close();
process.exit(gagal.length === 0 ? 0 : 1);
