/**
 * Uji alur data SINILAI dari ujung ke ujung di peramban sungguhan.
 *
 * Membuat sekolah → kelas → dua siswa → nilai (PH1, UTS, UAS) lewat antarmuka,
 * lalu memeriksa nilai akhir yang dihitung aplikasi, ketahanan data setelah
 * halaman dimuat ulang, serta halaman Rekap dan Peringkat.
 *
 * Nilai akhir yang diharapkan (bobot bawaan PH1 40, UTS 30, UAS 30):
 *   Budi: (80×40 + 70×30 + 60×30) / 100 = 71,0
 *   Ani : (90×40 + 80×30 + 90×30) / 100 = 87,0
 *
 * Pemakaian: node scripts/uji-alur.mjs [url]
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const URL_APLIKASI = process.argv[2] || 'http://127.0.0.1:4173/';
const KELUARAN = '/tmp/sinilai-uji';
mkdirSync(KELUARAN, { recursive: true });

const galat = [];
const hasil = [];
const catat = (nama, lulus, keterangan = '') => {
  hasil.push({ nama, lulus, keterangan });
  console.log(`${lulus ? 'OK  ' : 'GAGAL'} ${nama}${keterangan ? ' — ' + keterangan : ''}`);
};

const peramban = await chromium.launch({ args: ['--no-sandbox'] });
const konteks = await peramban.newContext({ viewport: { width: 1280, height: 900 } });
const halaman = await konteks.newPage();
halaman.on('pageerror', (e) => galat.push('pageerror: ' + e.message));
halaman.on('console', (m) => {
  if (m.type() === 'error') galat.push(m.text());
});

const dasar = URL_APLIKASI.replace(/\/$/, '');

/* ── 1. masuk mode lokal ──────────────────────────────────────────────── */
await halaman.goto(dasar + '/', { waitUntil: 'networkidle' });
const tanpaAkun = halaman.getByRole('button', { name: /Lanjut tanpa akun/i });
if (await tanpaAkun.count()) await tanpaAkun.first().click();
await halaman.waitForTimeout(500);

/* ── 2. sekolah ───────────────────────────────────────────────────────── */
await halaman.goto(dasar + '/sekolah', { waitUntil: 'networkidle' });
await halaman.getByRole('button', { name: /Tambah sekolah|Sekolah baru|Tambah/i }).first().click();
await halaman.waitForTimeout(400);
await halaman.locator('#school-name, input[name="name"]').first().fill('SMP Alur Uji');
await halaman.getByRole('button', { name: /^Simpan/ }).first().click();
await halaman.waitForTimeout(800);
catat('buat sekolah', (await halaman.getByText('SMP Alur Uji').count()) > 0);

/* ── 3. kelas ─────────────────────────────────────────────────────────── */
await halaman.goto(dasar + '/kelas', { waitUntil: 'networkidle' });
await halaman.getByRole('button', { name: /Tambah kelas/i }).first().click();
await halaman.waitForTimeout(400);
const sekolahKelas = halaman.locator('#class-school');
if (await sekolahKelas.count()) {
  await sekolahKelas.selectOption({ label: 'SMP Alur Uji' });
}
await halaman.locator('#class-name').fill('VII A');
await halaman.getByRole('button', { name: /^Simpan/ }).first().click();
await halaman.waitForTimeout(800);
catat('buat kelas VII A', (await halaman.getByText('VII A').count()) > 0);

/* ── 4. dua siswa ─────────────────────────────────────────────────────── */
async function tambahSiswa(nama) {
  await halaman.goto(dasar + '/siswa', { waitUntil: 'networkidle' });
  await halaman.waitForTimeout(300);
  await halaman.getByRole('button', { name: /Tambah siswa/i }).first().click();
  await halaman.waitForTimeout(400);
  await halaman.locator('#student-school').selectOption({ label: 'SMP Alur Uji' });
  await halaman.waitForTimeout(300);
  const kelas = halaman.locator('#student-class');
  const opsi = await kelas.locator('option').allTextContents();
  const vii = opsi.find((t) => t.includes('VII A'));
  if (vii) await kelas.selectOption({ label: vii });
  await halaman.locator('#student-name').fill(nama);
  await halaman.getByRole('button', { name: /^Simpan/ }).first().click();
  await halaman.waitForTimeout(800);
  return (await halaman.getByText(nama).count()) > 0;
}
catat('tambah siswa Budi', await tambahSiswa('Budi Santoso'));
catat('tambah siswa Ani', await tambahSiswa('Ani Lestari'));

/* ── 5. input nilai ───────────────────────────────────────────────────── */
await halaman.goto(dasar + '/nilai', { waitUntil: 'networkidle' });
await halaman.waitForTimeout(500);
for (const [id, label] of [
  ['#grade-school', 'SMP Alur Uji'],
  ['#grade-class', 'VII A'],
]) {
  const el = halaman.locator(id);
  if (await el.count()) {
    const teks = await el.locator('option').allTextContents();
    const cocok = teks.find((t) => t.includes(label));
    if (cocok) await el.selectOption({ label: cocok });
    await halaman.waitForTimeout(400);
  }
}
const mapel = halaman.locator('#grade-subject');
if (await mapel.count()) {
  const teks = await mapel.locator('option').allTextContents();
  const mtk = teks.find((t) => t.includes('Matematika')) || teks[1];
  if (mtk) await mapel.selectOption({ label: mtk });
  await halaman.waitForTimeout(500);
}

async function isiNilai(kode, nama, nilai) {
  const kolom = halaman.locator(`input[aria-label="Nilai ${kode} untuk ${nama}"]`).first();
  if (!(await kolom.count())) return false;
  await kolom.fill(String(nilai));
  await kolom.blur();
  await halaman.waitForTimeout(250);
  return true;
}

const terisi = [];
terisi.push(['Budi PH1', await isiNilai('PH1', 'Budi Santoso', 80)]);
terisi.push(['Budi UTS', await isiNilai('UTS', 'Budi Santoso', 70)]);
terisi.push(['Budi UAS', await isiNilai('UAS', 'Budi Santoso', 60)]);
terisi.push(['Ani PH1', await isiNilai('PH1', 'Ani Lestari', 90)]);
terisi.push(['Ani UTS', await isiNilai('UTS', 'Ani Lestari', 80)]);
terisi.push(['Ani UAS', await isiNilai('UAS', 'Ani Lestari', 90)]);
catat(
  'enam sel nilai terisi',
  terisi.every(([, ok]) => ok),
  terisi.filter(([, ok]) => !ok).map(([n]) => n).join(', ') || 'semua kolom ditemukan',
);

// Nilai disimpan lewat tombol "Simpan Nilai" (bukan otomatis).
const tombolSimpan = halaman.getByRole('button', { name: /Simpan Nilai/i });
catat('tombol Simpan Nilai aktif', await tombolSimpan.isEnabled());
await tombolSimpan.click();
await halaman.waitForTimeout(1200);

/* ── 6. nilai akhir dihitung benar ────────────────────────────────────── */
await halaman.waitForTimeout(700);
const barisBudi = await halaman.evaluate(() => {
  const baris = [...document.querySelectorAll('tr')].find((tr) =>
    (tr.textContent || '').includes('Budi Santoso'),
  );
  return baris ? baris.textContent.replace(/\s+/g, ' ').trim() : '';
});
const naBudi = /71(\.0)?\b/.test(barisBudi);
const naAni = await halaman.evaluate(() => {
  const baris = [...document.querySelectorAll('tr')].find((tr) =>
    (tr.textContent || '').includes('Ani Lestari'),
  );
  return baris ? /87(\.0)?\b/.test(baris.textContent) : false;
});
catat('NA Budi = 71,0', naBudi, barisBudi.slice(0, 160));
catat('NA Ani = 87,0', naAni);

/* ── 7. data bertahan setelah muat ulang ──────────────────────────────── */
await halaman.reload({ waitUntil: 'networkidle' });
await halaman.waitForTimeout(900);
const masihAda = await halaman.evaluate(() => {
  const teks = document.body.textContent || '';
  return teks.includes('Budi Santoso') && teks.includes('Ani Lestari');
});
catat('data bertahan setelah muat ulang', masihAda);

const nilaiBertahan = await halaman.evaluate(() => {
  const input = document.querySelector('input[aria-label="Nilai PH1 untuk Budi Santoso"]');
  return input ? input.value : null;
});
catat('nilai PH1 tersimpan = 80', nilaiBertahan === '80', `terbaca: ${nilaiBertahan}`);

/* ── 8. rekap & peringkat ─────────────────────────────────────────────── */
await halaman.goto(dasar + '/rekap', { waitUntil: 'networkidle' });
await halaman.waitForTimeout(600);
const teksRekap = (await halaman.locator('body').innerText()).replace(/\s+/g, ' ');
catat('rekap memuat kedua siswa', teksRekap.includes('Budi Santoso') && teksRekap.includes('Ani Lestari'));
catat('rekap memuat nilai 71 dan 87', /\b71\b/.test(teksRekap) && /\b87\b/.test(teksRekap));

await halaman.goto(dasar + '/peringkat', { waitUntil: 'networkidle' });
await halaman.waitForTimeout(600);
const teksPeringkat = (await halaman.locator('body').innerText()).replace(/\s+/g, ' ');
const posisiAni = teksPeringkat.indexOf('Ani Lestari');
const posisiBudi = teksPeringkat.indexOf('Budi Santoso');
catat(
  'peringkat: Ani (87) di atas Budi (71)',
  posisiAni >= 0 && posisiBudi >= 0 && posisiAni < posisiBudi,
  `Ani@${posisiAni} Budi@${posisiBudi}`,
);
await halaman.screenshot({ path: `${KELUARAN}/peringkat-1280.png` });

console.log('\n=== GALAT ===');
galat.length ? galat.forEach((g) => console.log('- ' + g.slice(0, 300))) : console.log('tidak ada');

const gagal = hasil.filter((h) => !h.lulus);
console.log(`\n${hasil.length - gagal.length}/${hasil.length} pemeriksaan lulus.`);
await peramban.close();
process.exit(gagal.length === 0 && galat.length === 0 ? 0 : 1);
