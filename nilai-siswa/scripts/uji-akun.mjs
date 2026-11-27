/**
 * Uji jalan masuk/keluar akun dari halaman Pengaturan.
 *
 * Kasus yang pernah rusak: setelah memilih "Lanjut tanpa akun", layar masuk
 * tidak pernah muncul lagi sehingga pengguna tidak bisa masuk dengan akun
 * untuk menyinkronkan data. Uji ini memastikan jalan keluarnya selalu ada.
 *
 * Pemakaian: node scripts/uji-akun.mjs [url]
 */
import { chromium } from 'playwright';

const dasar = (process.argv[2] || 'http://127.0.0.1:4173/').replace(/\/+$/, '');
const hasil = [];
const catat = (nama, lulus, ket = '') => {
  hasil.push({ nama, lulus });
  console.log(`${lulus ? 'OK  ' : 'GAGAL'} ${nama}${ket ? ' — ' + ket : ''}`);
};

const peramban = await chromium.launch({ args: ['--no-sandbox'] });
const konteks = await peramban.newContext({ viewport: { width: 1280, height: 900 } });
const halaman = await konteks.newPage();
const galat = [];
halaman.on('pageerror', (e) => galat.push(e.message));

/* 1. masuk sebagai tamu */
await halaman.goto(dasar + '/', { waitUntil: 'networkidle' });
const tanpaAkun = halaman.getByRole('button', { name: /Lanjut tanpa akun/i });
catat('layar masuk tampil untuk pengguna baru', (await tanpaAkun.count()) > 0);
await tanpaAkun.first().click();
await halaman.waitForTimeout(600);

/* 2. buka Pengaturan → Akun & sinkronisasi */
await halaman.goto(dasar + '/pengaturan', { waitUntil: 'networkidle' });
await halaman.waitForTimeout(800);
const kartu = await halaman.getByText('Akun & sinkronisasi').count();
catat('kartu "Akun & sinkronisasi" ada', kartu > 0);

const tombolMasuk = halaman.getByRole('button', { name: /^Masuk dengan akun$/ });
catat('tombol "Masuk dengan akun" tersedia di mode lokal', (await tombolMasuk.count()) > 0);

/* 3. tombol itu membuka layar masuk */
if (await tombolMasuk.count()) {
  await tombolMasuk.first().click();
  await halaman.waitForTimeout(900);
  const adaEmail = await halaman.locator('input[type="email"], input[name="email"]').count();
  const adaSandi = await halaman.locator('input[type="password"]').count();
  catat('layar masuk terbuka dengan kolom email & sandi', adaEmail > 0 && adaSandi > 0);
  catat('layar masuk punya tombol daftar', (await halaman.getByRole('button', { name: /Daftar|Buat akun/i }).count()) > 0);

  /* 4. bisa kembali ke mode lokal tanpa kehilangan data */
  const kembali = halaman.getByRole('button', { name: /Lanjut tanpa akun/i });
  if (await kembali.count()) {
    await kembali.first().click();
    await halaman.waitForTimeout(800);
  } else {
    const lewati = halaman.getByRole('link', { name: /Lanjut tanpa akun/i });
    if (await lewati.count()) await lewati.first().click();
    await halaman.waitForTimeout(800);
  }
  const isiApp = await halaman.evaluate(
    () => (document.querySelector('#root')?.textContent || '').trim().length,
  );
  catat('bisa kembali ke aplikasi (mode lokal)', isiApp > 200, `${isiApp} karakter`);

  await halaman.goto(dasar + '/pengaturan', { waitUntil: 'networkidle' });
  await halaman.waitForTimeout(800);
  catat(
    'tombol tampil lagi setelah kembali ke mode lokal',
    (await halaman.getByRole('button', { name: /^Masuk dengan akun$/ }).count()) > 0,
  );
}

console.log('\ngalat skrip:', galat.length ? galat.slice(0, 3) : 'tidak ada');
const gagal = hasil.filter((h) => !h.lulus);
console.log(`\n${hasil.length - gagal.length}/${hasil.length} pemeriksaan lulus.`);
await peramban.close();
process.exit(gagal.length === 0 && galat.length === 0 ? 0 : 1);
