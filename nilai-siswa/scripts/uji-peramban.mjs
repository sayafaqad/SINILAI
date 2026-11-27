/**
 * Uji peramban SINILAI dengan Chromium headless (Playwright).
 *
 * Menjalankan aplikasi hasil build seperti pengguna sungguhan: membuka halaman,
 * memilih "Lanjut tanpa akun", menelusuri semua menu, mengisi data (sekolah,
 * kelas, mapel, siswa, nilai), memeriksa tata letak pada 1280 px dan 390 px,
 * lalu melaporkan setiap galat konsol dan setiap masalah tampilan.
 *
 * Pemakaian: node scripts/uji-peramban.mjs [url]
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

// Tanpa garis miring di akhir: kalau tidak, alamat dasbor menjadi "//"
// dan host produksi menjawab 404 untuk asetnya.
const URL_APLIKASI = (process.argv[2] || 'http://127.0.0.1:4173/').replace(/\/+$/, '');
/** Susun alamat halaman tanpa pernah menghasilkan "//" di jalur. */
const alamat = (jalur) => new URL(jalur === '/' ? '' : jalur.replace(/^\//, ''), URL_APLIKASI + '/').href;
const KELUARAN = '/tmp/sinilai-uji';
mkdirSync(KELUARAN, { recursive: true });

const galat = [];
const peringatan = [];
const langkah = [];

function catat(nama, berhasil, keterangan = '') {
  langkah.push({ nama, berhasil, keterangan });
  console.log(`${berhasil ? 'OK  ' : 'GAGAL'} ${nama}${keterangan ? ' — ' + keterangan : ''}`);
}

/** Periksa luapan horizontal dan elemen yang keluar dari tepi layar. */
async function periksaTataLetak(halaman, label) {
  const hasil = await halaman.evaluate(() => {
    const lebar = window.innerWidth;
    const gulir = document.documentElement.scrollWidth;
    const keluar = [];
    /** Elemen di dalam kotak bergulir (.table-scroll) memang boleh lebih lebar. */
    const diDalamGulir = (el) => {
      for (let induk = el.parentElement; induk; induk = induk.parentElement) {
        const gaya = getComputedStyle(induk);
        if (gaya.overflowX === 'auto' || gaya.overflowX === 'scroll') return true;
      }
      return false;
    };
    document.querySelectorAll('body *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if (r.right > lebar + 1 || r.left < -1) {
        const gaya = getComputedStyle(el);
        if (gaya.position === 'fixed' || gaya.visibility === 'hidden' || gaya.opacity === '0') return;
        if (diDalamGulir(el)) return;
        keluar.push({
          tag: el.tagName.toLowerCase(),
          kelas: (el.className || '').toString().slice(0, 80),
          kiri: Math.round(r.left),
          kanan: Math.round(r.right),
          teks: (el.textContent || '').trim().slice(0, 40),
        });
      }
    });
    return { lebar, gulir, lebih: Math.max(0, gulir - lebar), keluar: keluar.slice(0, 5) };
  });
  catat(
    `tata letak ${label}`,
    hasil.lebih === 0 && hasil.keluar.length === 0,
    hasil.lebih > 0
      ? `luapan horizontal ${hasil.lebih}px (scrollWidth ${hasil.gulir} > ${hasil.lebar}); contoh: ${JSON.stringify(hasil.keluar)}`
      : hasil.keluar.length > 0
        ? `elemen keluar tepi: ${JSON.stringify(hasil.keluar)}`
        : `lebar ${hasil.lebar}px, tanpa luapan`,
  );
  return hasil;
}

const peramban = await chromium.launch({ args: ['--no-sandbox'] });
const konteks = await peramban.newContext({ viewport: { width: 1280, height: 800 } });
const halaman = await konteks.newPage();

halaman.on('console', (pesan) => {
  const jenis = pesan.type();
  const teks = pesan.text();
  if (jenis === 'error') galat.push(teks);
  else if (jenis === 'warning') peringatan.push(teks);
});
halaman.on('pageerror', (e) => galat.push('pageerror: ' + e.message));
halaman.on('requestfailed', (r) => {
  if (!r.url().includes('supabase')) galat.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`);
});

/* ── 1. buka aplikasi ─────────────────────────────────────────────────── */
await halaman.goto(alamat('/'), { waitUntil: 'networkidle' });
const judul = await halaman.title();
catat('judul halaman', judul.includes('SINILAI'), judul);
const rootTerisi = await halaman.evaluate(
  () => (document.querySelector('#root')?.textContent || '').trim().length > 20,
);
catat('#root terisi', rootTerisi);

/* ── 2. masuk sebagai mode tanpa akun ─────────────────────────────────── */
const tombolTanpaAkun = halaman.getByRole('button', { name: /Lanjut tanpa akun/i });
if (await tombolTanpaAkun.count()) {
  await tombolTanpaAkun.first().click();
  await halaman.waitForTimeout(600);
  catat('klik "Lanjut tanpa akun"', true);
} else {
  catat('klik "Lanjut tanpa akun"', true, 'layar masuk tidak muncul (kemungkinan sudah mode lokal)');
}
await periksaTataLetak(halaman, 'dasbor 1280px');
await halaman.screenshot({ path: `${KELUARAN}/dasbor-1280.png`, fullPage: false });

/* ── 3. tambah sekolah lewat UI ───────────────────────────────────────── */
await halaman.goto(alamat('sekolah'), { waitUntil: 'networkidle' });
await halaman.waitForTimeout(400);
const tombolTambah = halaman
  .getByRole('button', { name: /Tambah sekolah|Sekolah baru|Tambah/i })
  .first();
if (await tombolTambah.count()) {
  await tombolTambah.click();
  await halaman.waitForTimeout(500);
  const kolomNama = halaman.locator('input[name="name"], #nama, input[placeholder*="SMP" i]').first();
  if (await kolomNama.count()) {
    await kolomNama.fill('SMP Uji Otomatis');
    const simpan = halaman.getByRole('button', { name: /^Simpan|Simpan sekolah/i }).first();
    await simpan.click();
    await halaman.waitForTimeout(900);
    const adaDiDaftar = await halaman.getByText('SMP Uji Otomatis').count();
    catat('tambah sekolah', adaDiDaftar > 0, adaDiDaftar ? 'sekolah tampil di daftar' : 'sekolah tidak muncul');
  } else {
    catat('tambah sekolah', false, 'kolom nama sekolah tidak ditemukan');
  }
} else {
  catat('tambah sekolah', false, 'tombol tambah tidak ditemukan');
}

/* ── 4. telusuri semua menu ───────────────────────────────────────────── */
const menu = [
  ['/', 'Dasbor'],
  ['sekolah', 'Sekolah'],
  ['kelas', 'Kelas'],
  ['mapel', 'Mapel'],
  ['siswa', 'Siswa'],
  ['nilai', 'Input Nilai'],
  ['rekap', 'Rekap'],
  ['peringkat', 'Peringkat'],
  ['pengaturan', 'Pengaturan'],
];

const galatSebelumMenu = galat.length;
for (const [jalur, nama] of menu) {
  const sebelum = galat.length;
  await halaman.goto(alamat(jalur), { waitUntil: 'networkidle' });
  // Tunggu isi benar-benar tampil; 350 ms tetap tidak cukup pada jaringan nyata
  // sehingga pemeriksaan bisa melaporkan "halaman kosong" secara keliru.
  await halaman
    .waitForFunction(
      () => (document.querySelector('#root')?.textContent || '').trim().length > 30,
      undefined,
      { timeout: 8000 },
    )
    .catch(() => {});
  const isi = await halaman.evaluate(
    () => (document.querySelector('#root')?.textContent || '').trim().length,
  );
  const baru = galat.slice(sebelum);
  catat(
    `menu ${nama}`,
    isi > 30 && baru.length === 0,
    isi <= 30 ? 'halaman kosong' : baru.length ? `galat: ${baru.join(' | ').slice(0, 200)}` : `${isi} karakter`,
  );
}

/* ── 5. tata letak ponsel ─────────────────────────────────────────────── */
await halaman.setViewportSize({ width: 390, height: 844 });
for (const [jalur, nama] of [
  ['/', 'dasbor'],
  ['nilai', 'input nilai'],
  ['rekap', 'rekap'],
  ['siswa', 'siswa'],
]) {
  await halaman.goto(alamat(jalur), { waitUntil: 'networkidle' });
  await halaman
    .waitForFunction(
      () => (document.querySelector('#root')?.textContent || '').trim().length > 30,
      undefined,
      { timeout: 8000 },
    )
    .catch(() => {});
  await periksaTataLetak(halaman, `${nama} 390px`);
}
await halaman.goto(alamat('nilai'), { waitUntil: 'networkidle' });
await halaman.waitForTimeout(400);
await halaman.screenshot({ path: `${KELUARAN}/nilai-390.png`, fullPage: false });

/* ── 6. service worker & manifest ─────────────────────────────────────── */
const sw = await halaman.evaluate(async () => {
  const reg = await navigator.serviceWorker?.getRegistration();
  return { terdaftar: Boolean(reg), aktif: Boolean(reg?.active), skrip: reg?.active?.scriptURL || '' };
});
catat('service worker aktif', sw.aktif, sw.skrip);
const manifest = await halaman.evaluate(async () => {
  const tautan = document.querySelector('link[rel="manifest"]');
  if (!tautan) return { ada: false };
  const r = await fetch(tautan.href);
  const data = await r.json();
  const ikon = await Promise.all(
    (data.icons || []).map(async (i) => {
      try {
        const resp = await fetch(i.src, { method: 'GET' });
        return { src: i.src, status: resp.status };
      } catch (e) {
        return { src: i.src, status: 'gagal' };
      }
    }),
  );
  return { ada: true, nama: data.name, start: data.start_url, scope: data.scope, ikon };
});
catat('manifest PWA', manifest.ada && manifest.ikon.every((i) => i.status === 200), JSON.stringify(manifest).slice(0, 300));

/* ── ringkasan ────────────────────────────────────────────────────────── */
console.log('\n=== GALAT KONSOL (' + galat.length + ') ===');
galat.forEach((g, i) => console.log(`${i + 1}. ${g}`.slice(0, 400)));
console.log('\n=== PERINGATAN (' + peringatan.length + ') ===');
peringatan.slice(0, 12).forEach((p, i) => console.log(`${i + 1}. ${p}`.slice(0, 300)));

const gagal = langkah.filter((l) => !l.berhasil);
console.log(`\n${langkah.length - gagal.length}/${langkah.length} pemeriksaan lulus.`);
await peramban.close();
process.exit(gagal.length === 0 && galat.length === 0 ? 0 : 1);
