/**
 * Migrasi data penilaian lama ke bentuk terbaru.
 *
 * Riwayat bentuk data:
 * 1. Komponen penilaian milik sekolah (dipakai semua kelas).
 * 2. Komponen penilaian milik kelas.
 * 3. Komponen penilaian milik kelas **dan** mata pelajaran (bentuk sekarang).
 *
 * Sifat penting:
 * - Idempoten: data yang sudah berbentuk baru tidak dikloning ulang.
 * - Konvergen dalam satu kali jalan. Sebelumnya data bentuk (1) hanya menjadi
 *   bentuk (2) pada pemuatan pertama dan baru menjadi bentuk (3) pada pemuatan
 *   berikutnya, sehingga kolom nilai sempat kosong sekali bagi pengguna yang
 *   naik langsung dari versi lama.
 * - Komponen bentuk lama ditandai terhapus (tombstone) dan dimasukkan ke
 *   antrean kirim, agar tidak muncul lagi dari server.
 * - Komponen yang sudah dihapus pengguna tidak dibuat ulang.
 */
import { put, putMany, readAll, readAllCollections, removeMany } from './db';
import { defaultSettings, makeComponent } from './repository';
import {
  bacaAntrianTersimpan,
  bacaTombstone,
  simpanAntrianTersimpan,
  tambahTombstone,
} from './sync';

const VERSI_SKEMA = 3;

/** Tambahkan penghapusan ke antrean agar server ikut bersih. */
function antrekanHapus(antrean, idKomponen) {
  const kunci = new Set(antrean.map((a) => `${a.collection}::${a.id}`));
  if (kunci.has(`components::${idKomponen}`)) return antrean;
  antrean.push({
    collection: 'components',
    id: idKomponen,
    payload: {},
    updatedAt: '',
    dihapus: true,
  });
  return antrean;
}

/**
 * Pindahkan nilai dari komponen lama ke komponen salinannya memakai peta
 * `kunci -> id komponen baru`. Nilai yang tidak punya salinan dibiarkan apa
 * adanya (tidak dihapus), supaya tidak ada nilai yang hilang diam-diam.
 */
async function pindahkanNilai(nilai, cariKomponenBaru) {
  const nilaiBaru = [];
  const nilaiUsang = [];
  nilai.forEach((n) => {
    const idKomponen = cariKomponenBaru(n);
    if (!idKomponen || idKomponen === n.componentId) {
      nilaiBaru.push(n);
      return;
    }
    const idBaru = `${n.studentId}::${n.subjectId}::${idKomponen}`;
    if (idBaru !== n.id) nilaiUsang.push(n.id);
    nilaiBaru.push({ ...n, componentId: idKomponen, id: idBaru });
  });
  if (nilaiUsang.length > 0) await removeMany('grades', nilaiUsang);
  if (nilaiBaru.length > 0) await putMany('grades', nilaiBaru);
  return nilaiBaru;
}

export async function migrasiKomponenPerKelas() {
  const semua = await readAllCollections();
  const meta = semua.meta.find((row) => row.key === 'app');
  const sekolah = semua.schools || [];
  const kelas = semua.classes || [];
  const mapel = semua.subjects || [];
  let nilai = semua.grades || [];

  const komponen = semua.components || [];
  const versi = Number(meta?.schemaVersion || 0);
  const lamaSekolah = komponen.filter((c) => !c.classId);
  const lamaKelas = komponen.filter((c) => c.classId && !c.subjectId);

  if (versi >= VERSI_SKEMA && lamaSekolah.length === 0 && lamaKelas.length === 0) {
    return { diterapkan: false, komponen: 0, nilai: 0 };
  }

  const dihapus = bacaTombstone();
  let dibuat = 0;
  let antrean = bacaAntrianTersimpan();

  /** Buang komponen bentuk lama dari perangkat dan antrekan ke server. */
  async function buangLama(daftar) {
    if (daftar.length === 0) return;
    daftar.forEach((c) => tambahTombstone('components', c.id));
    await removeMany('components', daftar.map((c) => c.id));
    daftar.forEach((c) => {
      antrean = antrekanHapus(antrean, c.id);
    });
  }

  // ── Langkah 1: komponen sekolah → per kelas ──────────────────────────────
  if (lamaSekolah.length > 0) {
    const sudahPerKelas = komponen.some((c) => c.classId);
    if (!sudahPerKelas) {
      const baru = [];
      /** `${komponenAsal}::${kelas}` → id komponen baru */
      const petaKelas = new Map();
      /** komponenAsal → salinan pertama (untuk nilai tanpa kelas) */
      const salinanPertama = new Map();

      sekolah.forEach((satu) => {
        const kelasSekolah = kelas.filter((k) => k.schoolId === satu.id);
        const komponenSekolah = lamaSekolah.filter((c) => c.schoolId === satu.id);
        kelasSekolah.forEach((k) => {
          komponenSekolah.forEach((c, urutan) => {
            const idBaru = `${c.id}~${k.id}`;
            if (dihapus.has(`components::${idBaru}`)) return;
            baru.push(makeComponent({ ...c, id: idBaru, classId: k.id }, urutan));
            petaKelas.set(`${c.id}::${k.id}`, idBaru);
            if (!salinanPertama.has(c.id)) salinanPertama.set(c.id, idBaru);
          });
        });
      });

      if (baru.length > 0) await putMany('components', baru);
      dibuat += baru.length;

      nilai = await pindahkanNilai(nilai, (n) => {
        const perKelas = n.classId ? petaKelas.get(`${n.componentId}::${n.classId}`) : null;
        return perKelas || salinanPertama.get(n.componentId) || null;
      });
    }
    await buangLama(lamaSekolah);
  }

  // ── Langkah 2: komponen kelas → per kelas + mata pelajaran ───────────────
  // Diulang sampai tidak ada lagi komponen tanpa mapel, sehingga data bentuk
  // terlama pun selesai dalam satu kali pemuatan.
  for (let putaran = 0; putaran < 6; putaran += 1) {
    const tersisa = (await readAll('components')).filter((c) => c.classId && !c.subjectId);
    if (tersisa.length === 0) break;

    const baru = [];
    /** `${komponenLama}::${mapel}` → id komponen baru */
    const petaMapel = new Map();

    tersisa.forEach((c) => {
      const mapelSekolah = mapel.filter((s) => s.schoolId === c.schoolId);
      mapelSekolah.forEach((s, urutan) => {
        const idBaru = `${c.id}~${s.id}`;
        if (dihapus.has(`components::${idBaru}`)) return;
        baru.push(makeComponent({ ...c, id: idBaru, subjectId: s.id }, urutan));
        petaMapel.set(`${c.id}::${s.id}`, idBaru);
      });
    });

    if (baru.length > 0) await putMany('components', baru);
    dibuat += baru.length;

    // Nilai komponen lama pindah ke salinan mapel yang sama.
    nilai = await pindahkanNilai(nilai, (n) => petaMapel.get(`${n.componentId}::${n.subjectId}`) || null);

    await buangLama(tersisa);
  }

  if (antrean.length > 0) simpanAntrianTersimpan(antrean);
  await put('meta', { ...(meta || defaultSettings()), schemaVersion: VERSI_SKEMA });

  return { diterapkan: true, komponen: dibuat, nilai: nilai.length };
}
