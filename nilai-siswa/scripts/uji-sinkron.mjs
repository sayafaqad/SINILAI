/**
 * Uji logika sinkronisasi & migrasi tanpa peramban.
 *
 * Yang diuji adalah bagian yang paling sering menggigit di proyek ini:
 * data yang sudah dihapus tidak boleh hidup lagi ketika server masih
 * menyimpan baris lama, dan migrasi komponen harus idempoten.
 *
 * Penyimpanan perangkat dipalsukan dengan localStorage (db.js otomatis
 * memakai jalur itu saat `indexedDB` tidak tersedia), sehingga modul asli
 * di `src/lib` dipakai apa adanya — bukan salinan logikanya.
 *
 * Jalankan: npm run uji
 */
import assert from 'node:assert/strict';

/* ── penyimpanan palsu ─────────────────────────────────────────────────── */
class MemoriPalsu {
  #peta = new Map();
  getItem(kunci) {
    return this.#peta.has(kunci) ? this.#peta.get(kunci) : null;
  }
  setItem(kunci, nilai) {
    this.#peta.set(kunci, String(nilai));
  }
  removeItem(kunci) {
    this.#peta.delete(kunci);
  }
  clear() {
    this.#peta.clear();
  }
}

globalThis.localStorage = new MemoriPalsu();
globalThis.window = { localStorage: globalThis.localStorage };

const { put, putMany, readAll, readAllCollections } = await import('../src/lib/db.js');
const { bedakan, terapkanRemote, tambahTombstone, bacaTombstone } = await import('../src/lib/sync.js');
const { migrasiKomponenPerKelas } = await import('../src/lib/migrasi.js');

let lulus = 0;
function uji(nama, fn) {
  return (async () => {
    await fn();
    lulus += 1;
    console.log('  ✓ ' + nama);
  })();
}

async function bersihkan() {
  globalThis.localStorage.clear();
}

/* ── data awal: 1 sekolah, 1 kelas, 1 mapel, 1 komponen, 1 siswa ───────── */
const sekolah = { id: 'sch1', name: 'SMP Uji', createdAt: '2026-01-01T00:00:00.000Z', order: 0 };
const kelas = { id: 'cls1', schoolId: 'sch1', name: '7A', createdAt: '2026-01-01T00:00:00.000Z', order: 0 };
const mapel = { id: 'sub1', schoolId: 'sch1', code: 'MTK', name: 'Matematika', kkm: 70, order: 0 };
const komponen = {
  id: 'cmp1',
  schoolId: 'sch1',
  classId: 'cls1',
  subjectId: 'sub1',
  code: 'PH1',
  label: 'Penilaian Harian 1',
  type: 'harian',
  weight: 40,
  date: '',
  note: '',
  order: 0,
};
const siswa = {
  id: 'std1',
  schoolId: 'sch1',
  classId: 'cls1',
  nis: '',
  name: 'Budi',
  gender: 'L',
  status: 'aktif',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
const nilai = {
  id: 'std1::sub1::cmp1',
  schoolId: 'sch1',
  classId: 'cls1',
  studentId: 'std1',
  subjectId: 'sub1',
  componentId: 'cmp1',
  score: 80,
  updatedAt: '2026-01-01T00:00:00.000Z',
};

async function isiDataContoh() {
  await putMany('schools', [sekolah]);
  await putMany('classes', [kelas]);
  await putMany('subjects', [mapel]);
  await putMany('components', [komponen]);
  await putMany('students', [siswa]);
  await putMany('grades', [nilai]);
  await put('meta', { key: 'app', schemaVersion: 3 });
}

/* ── 1. pembanding keadaan ─────────────────────────────────────────────── */
await bersihkan();
await uji('bedakan: keadaan sama → tidak ada perubahan', async () => {
  const a = [{ collection: 'grades', id: 'g1', payload: { score: 80 } }];
  const b = [{ collection: 'grades', id: 'g1', payload: { score: 80 } }];
  assert.equal(bedakan(a, b).length, 0);
});

await uji('bedakan: baris hilang → dikirim sebagai penghapusan', async () => {
  const a = [{ collection: 'components', id: 'cmp1', payload: { code: 'PH1' } }];
  const selisih = bedakan(a, []);
  assert.equal(selisih.length, 1);
  assert.equal(selisih[0].dihapus, true);
  assert.equal(selisih[0].id, 'cmp1');
});

/* ── 2. baris terhapus tidak boleh hidup lagi ──────────────────────────── */
await bersihkan();
await uji('terapkanRemote: komponen bertombstone tidak muncul lagi walau server masih punya', async () => {
  await isiDataContoh();
  tambahTombstone('components', 'cmp1');
  assert.ok(bacaTombstone().has('components::cmp1'));

  const berubah = await terapkanRemote([
    {
      collection: 'components',
      id: 'cmp1',
      payload: { ...komponen, label: 'Penilaian Harian 1 (versi server)' },
      updated_at: '2030-01-01T00:00:00.000Z', // lebih baru dari data lokal
      deleted_at: null,
    },
  ]);

  assert.equal(berubah, 0, 'baris bertombstone seharusnya dilewati');
  const komponenLokal = await readAll('components');
  assert.equal(komponenLokal.length, 1);
  assert.equal(komponenLokal[0].label, 'Penilaian Harian 1');
});

await uji('terapkanRemote: nilai bertombstone tidak dihidupkan kembali', async () => {
  tambahTombstone('grades', 'std1::sub1::cmp1');
  const berubah = await terapkanRemote([
    {
      collection: 'grades',
      id: 'std1::sub1::cmp1',
      payload: { ...nilai, score: 95 },
      updated_at: '2030-01-01T00:00:00.000Z',
      deleted_at: null,
    },
  ]);
  assert.equal(berubah, 0);
  const nilaiLokal = await readAll('grades');
  assert.equal(nilaiLokal[0].score, 80);
});

/* ── 3. penghapusan dari perangkat lain tetap diterapkan ───────────────── */
await bersihkan();
await uji('terapkanRemote: baris deleted_at di server ikut dihapus di perangkat', async () => {
  await isiDataContoh();
  const berubah = await terapkanRemote([
    {
      collection: 'grades',
      id: 'std1::sub1::cmp1',
      payload: {},
      updated_at: '2030-01-01T00:00:00.000Z',
      deleted_at: '2030-01-01T00:00:00.000Z',
    },
  ]);
  assert.equal(berubah, 1);
  assert.equal((await readAll('grades')).length, 0);
});

/* ── 4. baris baru dari server masuk ke perangkat ──────────────────────── */
await bersihkan();
await uji('terapkanRemote: baris baru di server ditulis ke perangkat', async () => {
  await isiDataContoh();
  const berubah = await terapkanRemote([
    {
      collection: 'students',
      id: 'std2',
      payload: { ...siswa, id: 'std2', name: 'Ani' },
      updated_at: '2030-01-01T00:00:00.000Z',
      deleted_at: null,
    },
  ]);
  assert.equal(berubah, 1);
  const siswaLokal = await readAll('students');
  assert.deepEqual(siswaLokal.map((s) => s.name).sort(), ['Ani', 'Budi']);
});

/* ── 5. migrasi komponen idempoten ─────────────────────────────────────── */
await bersihkan();
await uji('migrasi: komponen sekolah dikloning ke tiap kelas+mapel, lalu tidak diulang', async () => {
  await putMany('schools', [sekolah]);
  await putMany('classes', [kelas, { ...kelas, id: 'cls2', name: '8A' }]);
  await putMany('subjects', [mapel, { ...mapel, id: 'sub2', code: 'IPA', name: 'IPA' }]);
  await putMany('components', [
    { ...komponen, classId: undefined, subjectId: undefined },
  ]);
  await putMany('students', [siswa]);
  await putMany('grades', [nilai]);
  await put('meta', { key: 'app', schemaVersion: 0 });

  const pertama = await migrasiKomponenPerKelas();
  assert.equal(pertama.diterapkan, true);

  const semua = await readAllCollections();
  // 2 kelas × 2 mapel = 4 komponen per komponen lama (1) = 4
  assert.equal(semua.components.length, 4);
  const pasangan = semua.components
    .map((c) => `${c.classId}::${c.subjectId}`)
    .sort();
  assert.deepEqual(pasangan, ['cls1::sub1', 'cls1::sub2', 'cls2::sub1', 'cls2::sub2']);
  // Komponen lama hilang, bukan tertinggal.
  assert.equal(semua.components.filter((c) => !c.classId || !c.subjectId).length, 0);

  const kedua = await migrasiKomponenPerKelas();
  assert.equal(kedua.diterapkan, false);
  assert.equal((await readAll('components')).length, 4);
});

/* ── 6. data bentuk (2) selesai dalam satu kali migrasi ────────────────── */
await bersihkan();
await uji('migrasi: komponen per kelas (skema 2) langsung menjadi per kelas+mapel', async () => {
  await putMany('schools', [sekolah]);
  await putMany('classes', [kelas]);
  await putMany('subjects', [mapel, { ...mapel, id: 'sub2', code: 'IPA', name: 'IPA' }]);
  await putMany('components', [
    { ...komponen, id: 'cx', subjectId: undefined, code: 'PH1' },
  ]);
  await putMany('students', [siswa]);
  await putMany('grades', [
    { ...nilai, id: 'std1::sub1::cx', componentId: 'cx' },
  ]);
  await put('meta', { key: 'app', schemaVersion: 2 });

  await migrasiKomponenPerKelas();

  const semua = await readAllCollections();
  assert.equal(semua.components.length, 2, 'satu kali migrasi harus menghasilkan dua salinan mapel');
  assert.deepEqual(
    semua.components.map((c) => c.subjectId).sort(),
    ['sub1', 'sub2'],
  );
  assert.equal(
    semua.components.filter((c) => !c.subjectId).length,
    0,
    'tidak boleh ada komponen tanpa mapel setelah migrasi',
  );

  // Nilai 80 harus menempel pada salinan Matematika, bukan IPA.
  const nilaiLokal = await readAll('grades');
  assert.equal(nilaiLokal.length, 1);
  assert.equal(nilaiLokal[0].score, 80);
  assert.equal(nilaiLokal[0].componentId, 'cx~sub1');
  assert.equal(nilaiLokal[0].id, 'std1::sub1::cx~sub1');
});

/* ── 7. komponen yang sudah dihapus pengguna tidak dibuat ulang ────────── */
await bersihkan();
await uji('migrasi: komponen bertombstone tidak dikloning ulang', async () => {
  await putMany('schools', [sekolah]);
  await putMany('classes', [kelas]);
  await putMany('subjects', [mapel, { ...mapel, id: 'sub2', code: 'IPA', name: 'IPA' }]);
  await putMany('components', [{ ...komponen, id: 'cy', subjectId: undefined }]);
  await put('meta', { key: 'app', schemaVersion: 2 });
  tambahTombstone('components', 'cy~sub2');

  await migrasiKomponenPerKelas();

  const ids = (await readAll('components')).map((c) => c.id).sort();
  assert.deepEqual(ids, ['cy~sub1']);
});

console.log(`\n${lulus} uji lulus.`);
