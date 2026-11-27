/**
 * Uji ketahanan SINILAI: kehilangan data, penghapusan berantai, dan tata letak
 * ponsel saat data sudah terisi.
 *
 * Skenario:
 *  A. Nilai yang belum disimpan lalu berpindah menu — apakah hilang diam-diam?
 *  B. Semua halaman pada 390 px dengan data lengkap — luapan horizontal?
 *  C. Hapus siswa — nilainya ikut hilang, rekap ikut bersih.
 *  D. Ubah KKM bawaan di Pengaturan — bertahan setelah muat ulang.
 *
 * Pemakaian: node scripts/uji-ketahanan.mjs [url]
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const URL_APLIKASI = process.argv[2] || 'http://127.0.0.1:4173/';
const dasar = URL_APLIKASI.replace(/\/$/, '');
const KELUARAN = '/tmp/sinilai-uji';
mkdirSync(KELUARAN, { recursive: true });

const galat = [];
const hasil = [];
const catat = (nama, lulus, ket = '') => {
  hasil.push({ nama, lulus, ket });
  console.log(`${lulus ? 'OK  ' : 'GAGAL'} ${nama}${ket ? ' — ' + ket : ''}`);
};

const peramban = await chromium.launch({ args: ['--no-sandbox'] });
const konteks = await peramban.newContext({ viewport: { width: 1280, height: 900 } });
const halaman = await konteks.newPage();
halaman.on('pageerror', (e) => galat.push('pageerror: ' + e.message));
halaman.on('console', (m) => {
  if (m.type() === 'error') galat.push(m.text());
});

/* data contoh lewat antarmuka */
await halaman.goto(dasar + '/', { waitUntil: 'networkidle' });
const tombol = halaman.getByRole('button', { name: /Lanjut tanpa akun/i });
if (await tombol.count()) await tombol.first().click();
await halaman.waitForTimeout(400);

await halaman.goto(dasar + '/sekolah', { waitUntil: 'networkidle' });
await halaman.getByRole('button', { name: /Tambah sekolah|Sekolah baru|Tambah/i }).first().click();
await halaman.waitForTimeout(350);
await halaman.locator('#school-name, input[name="name"]').first().fill('SMP Ketahanan');
await halaman.getByRole('button', { name: /^Simpan/ }).first().click();
await halaman.waitForTimeout(700);

// Kelas diperlukan agar siswa punya konteks penilaian.
await halaman.goto(dasar + '/kelas', { waitUntil: 'networkidle' });
await halaman.getByRole('button', { name: /Tambah kelas/i }).first().click();
await halaman.waitForTimeout(350);
const sekolahKelas = halaman.locator('#class-school');
if (await sekolahKelas.count()) {
  const opsi = await sekolahKelas.locator('option').allTextContents();
  const cocok = opsi.find((t) => t.includes('SMP Ketahanan'));
  if (cocok) await sekolahKelas.selectOption({ label: cocok });
}
await halaman.locator('#class-name').fill('VIII B');
await halaman.getByRole('button', { name: /^Simpan/ }).first().click();
await halaman.waitForTimeout(700);

for (const nama of ['Citra Dewi', 'Dedi Pratama']) {
  await halaman.goto(dasar + '/siswa', { waitUntil: 'networkidle' });
  await halaman.waitForTimeout(250);
  await halaman.getByRole('button', { name: /Tambah siswa/i }).first().click();
  await halaman.waitForTimeout(350);
  await halaman.locator('#student-school').selectOption({ label: 'SMP Ketahanan' });
  await halaman.waitForTimeout(250);
  const kelas = halaman.locator('#student-class');
  const opsiKelas = await kelas.locator('option').allTextContents();
  const viii = opsiKelas.find((t) => t.includes('VIII B'));
  if (viii) await kelas.selectOption({ label: viii });
  await halaman.locator('#student-name').fill(nama);
  await halaman.getByRole('button', { name: /^Simpan/ }).first().click();
  await halaman.waitForTimeout(700);
}

/* ── A. draf nilai yang belum disimpan ─────────────────────────────────── */
await halaman.goto(dasar + '/nilai', { waitUntil: 'networkidle' });
await halaman.waitForTimeout(500);
for (const [id, teks] of [
  ['#grade-school', 'SMP Ketahanan'],
  ['#grade-class', 'VIII B'],
  ['#grade-subject', 'Matematika'],
]) {
  const el = halaman.locator(id);
  if (await el.count()) {
    const opsi = await el.locator('option').allTextContents();
    const cocok = opsi.find((t) => t.includes(teks));
    if (cocok) await el.selectOption({ label: cocok });
    await halaman.waitForTimeout(400);
  }
}
const kolom = halaman.locator('input[aria-label="Nilai PH1 untuk Citra Dewi"]').first();
const adaKolom = await kolom.count();
if (adaKolom) {
  await kolom.fill('85');
  await halaman.waitForTimeout(300);
  const penanda = await halaman.getByText(/perubahan belum disimpan/i).count();
  catat('draf tercatat sebagai belum disimpan', penanda > 0);

  // Pindah menu lewat navigasi aplikasi (bukan muat ulang halaman).
  await halaman.getByRole('link', { name: /Rekap/i }).first().click();
  await halaman.waitForTimeout(700);
  await halaman.getByRole('link', { name: /Input Nilai/i }).first().click();
  await halaman.waitForTimeout(900);

  const nilaiKembali = await halaman
    .locator('input[aria-label="Nilai PH1 untuk Citra Dewi"]')
    .first()
    .inputValue()
    .catch(() => null);
  catat(
    'draf nilai bertahan setelah pindah menu',
    nilaiKembali === '85',
    `terbaca: ${JSON.stringify(nilaiKembali)}`,
  );
} else {
  catat('kolom nilai ditemukan', false, 'tidak ada kolom PH1 untuk Citra Dewi');
}

/* ── B. tata letak 390 px dengan data ─────────────────────────────────── */
await halaman.setViewportSize({ width: 390, height: 844 });
for (const [jalur, nama] of [
  ['/', 'dasbor'],
  ['sekolah', 'sekolah'],
  ['kelas', 'kelas'],
  ['mapel', 'mapel'],
  ['siswa', 'siswa'],
  ['nilai', 'input nilai'],
  ['rekap', 'rekap'],
  ['peringkat', 'peringkat'],
  ['pengaturan', 'pengaturan'],
]) {
  await halaman.goto(`${dasar}/${jalur === '/' ? '' : jalur}`, { waitUntil: 'networkidle' });
  await halaman.waitForTimeout(400);
  const m = await halaman.evaluate(() => ({
    lebih: document.documentElement.scrollWidth - window.innerWidth,
  }));
  catat(`tanpa luapan 390px: ${nama}`, m.lebih <= 0, `${m.lebih}px`);
}
await halaman.screenshot({ path: `${KELUARAN}/pengaturan-390.png` });

/* ── C. hapus siswa ikut menghapus nilainya ───────────────────────────── */
await halaman.setViewportSize({ width: 1280, height: 900 });
await halaman.goto(dasar + '/siswa', { waitUntil: 'networkidle' });
await halaman.waitForTimeout(500);
const tombolHapus = halaman.getByRole('button', { name: /Hapus Citra Dewi/i }).first();
if (await tombolHapus.count()) {
  await tombolHapus.click();
  await halaman.waitForTimeout(500);
  const konfirmasi = halaman.getByRole('button', { name: /Hapus Siswa/i }).first();
  if (await konfirmasi.count()) await konfirmasi.click();
  await halaman.waitForTimeout(1200);
  const diTabel = await halaman.evaluate(() => {
    const baris = [...document.querySelectorAll('tbody tr')].map((tr) =>
      (tr.textContent || '').replace(/\s+/g, ' ').trim(),
    );
    return baris.some((t) => t.includes('Citra Dewi'));
  });
  catat('hapus siswa', !diTabel, diTabel ? 'baris masih ada di tabel' : 'baris hilang dari tabel');

  await halaman.goto(dasar + '/rekap', { waitUntil: 'networkidle' });
  await halaman.waitForTimeout(700);
  const teksRekap = await halaman.locator('body').innerText();
  catat('nilai siswa terhapus tidak muncul di rekap', !teksRekap.includes('Citra Dewi'));
} else {
  catat('tombol hapus siswa ditemukan', false);
}

/* ── D. pengaturan bertahan ───────────────────────────────────────────── */
await halaman.goto(dasar + '/pengaturan', { waitUntil: 'networkidle' });
await halaman.waitForTimeout(600);
const kkm = halaman.locator('#default-kkm').first();
if (await kkm.count()) {
  await kkm.fill('78');
  const simpan = halaman.getByRole('button', { name: /Simpan KKM bawaan/i }).first();
  if (await simpan.count()) await simpan.click();
  await halaman.waitForTimeout(800);
  await halaman.reload({ waitUntil: 'networkidle' });
  await halaman.waitForTimeout(900);
  const nilaiKkm = await halaman
    .locator('#default-kkm')
    .first()
    .inputValue()
    .catch(() => null);
  catat('KKM bawaan bertahan setelah muat ulang', nilaiKkm === '78', `terbaca: ${nilaiKkm}`);
} else {
  catat('kolom KKM bawaan ditemukan', false);
}

await halaman.screenshot({ path: `${KELUARAN}/pengaturan-1280.png`, fullPage: false });

console.log('\n=== GALAT ===');
galat.length ? galat.slice(0, 8).forEach((g) => console.log('- ' + g.slice(0, 300))) : console.log('tidak ada');
const gagal = hasil.filter((h) => !h.lulus);
console.log(`\n${hasil.length - gagal.length}/${hasil.length} pemeriksaan lulus.`);
await peramban.close();
process.exit(gagal.length === 0 && galat.length === 0 ? 0 : 1);
