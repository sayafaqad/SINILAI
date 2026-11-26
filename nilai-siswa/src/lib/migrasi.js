/**
 * Migrasi data penilaian lama ke bentuk terbaru.
 *
 * Riwayat bentuk data:
 * 1. Komponen penilaian milik sekolah (dipakai semua kelas).
 * 2. Komponen penilaian milik kelas.
 * 3. Komponen penilaian milik kelas **dan** mata pelajaran (bentuk sekarang).
 *
 * Sifat penting:
 * - Hanya berjalan sekali (ditandai `schemaVersion` di pengaturan) dan
 *   idempoten: data yang sudah berbentuk baru tidak dikloning ulang.
 * - Komponen bentuk lama ditandai terhapus (tombstone) dan dimasukkan ke
 *   antrean kirim, agar tidak muncul lagi dari server.
 * - Komponen yang sudah dihapus pengguna tidak dibuat ulang.
 */
import { put, putMany, readAllCollections, removeMany } from './db';
import { defaultSettings, makeComponent } from './repository';
import {
  bacaAntrianTersimpan,
  bacaTombstone,
  simpanAntrianTersimpan,
  tambahTombstone,
} from './sync';

const VERSI_SKEMA = 3;

/** Tambahkan penghapusan ke antrean agar server ikut bersih. */
function antrekanHapus(idKomponen) {
  const antrean = bacaAntrianTersimpan();
  const kunci = new Set(antrean.map((a) => `${a.collection}::${a.id}`));
  if (kunci.has(`components::${idKomponen}`)) return antrean;
  antrean.push({ collection: 'components', id: idKomponen, payload: {}, updatedAt: '', dihapus: true });
  return antrean;
}

export async function migrasiKomponenPerKelas() {
  const semua = await readAllCollections();
  const meta = semua.meta.find((row) => row.key === 'app');
  const komponen = semua.components || [];
  const kelas = semua.classes || [];
  const sekolah = semua.schools || [];
  const mapel = semua.subjects || [];
  let nilai = semua.grades || [];

  const versi = Number(meta?.schemaVersion || 0);
  const lamaSekolah = komponen.filter((c) => !c.classId);
  const lamaKelas = komponen.filter((c) => c.classId && !c.subjectId);

  if (versi >= VERSI_SKEMA && lamaSekolah.length === 0 && lamaKelas.length === 0) {
    return { diterapkan: false, komponen: 0, nilai: 0 };
  }

  const dihapus = bacaTombstone();
  let dibuat = 0;
  let antrean = bacaAntrianTersimpan();

  // ── Langkah 1: komponen sekolah → per kelas ──────────────────────────────
  if (lamaSekolah.length > 0) {
    const sudahPerKelas = komponen.some((c) => c.classId);
    if (!sudahPerKelas) {
      const baru = [];
      sekolah.forEach((satu) => {
        const kelasSekolah = kelas.filter((k) => k.schoolId === satu.id);
        const komponenSekolah = lamaSekolah.filter((c) => c.schoolId === satu.id);
        kelasSekolah.forEach((k) => {
          komponenSekolah.forEach((c, urutan) => {
            const idBaru = `${c.id}~${k.id}`;
            if (dihapus.has(`components::${idBaru}`)) return;
            baru.push(makeComponent({ ...c, id: idBaru, classId: k.id }, urutan));
          });
        });
      });
      if (baru.length > 0) await putMany('components', baru);
      dibuat += baru.length;

      const peta = new Map(baru.map((c) => [`${c.id.split('~')[0]}::${c.classId}`, c.id]));
      const nilaiBaru = [];
      const nilaiUsang = [];
      nilai.forEach((n) => {
        const idKomponen = peta.get(`${n.componentId}::${n.classId}`);
        if (!idKomponen) {
          nilaiBaru.push(n);
          return;
        }
        const idBaru = `${n.studentId}::${n.subjectId}::${idKomponen}`;
        if (idBaru !== n.id) nilaiUsang.push(n.id);
        nilaiBaru.push({ ...n, componentId: idKomponen, id: idBaru });
      });
      if (nilaiUsang.length > 0) await removeMany('grades', nilaiUsang);
      if (nilaiBaru.length > 0) await putMany('grades', nilaiBaru);
      nilai = nilaiBaru;
    }

    lamaSekolah.forEach((c) => tambahTombstone('components', c.id));
    await removeMany('components', lamaSekolah.map((c) => c.id));
    lamaSekolah.forEach((c) => {
      antrean = antrekanHapus(c.id);
    });
  }

  // ── Langkah 2: komponen kelas → per kelas + mata pelajaran ───────────────
  if (lamaKelas.length > 0) {
    const baru = [];
    lamaKelas.forEach((c) => {
      const mapelSekolah = mapel.filter((s) => s.schoolId === c.schoolId);
      mapelSekolah.forEach((s, urutan) => {
        const idBaru = `${c.id}~${s.id}`;
        if (dihapus.has(`components::${idBaru}`)) return;
        baru.push(makeComponent({ ...c, id: idBaru, subjectId: s.id }, urutan));
      });
    });
    if (baru.length > 0) await putMany('components', baru);
    dibuat += baru.length;

    const peta = new Map(baru.map((c) => [`${c.id.split('~')[0]}::${c.subjectId}`, c.id]));
    const nilaiBaru = [];
    const nilaiUsang = [];
    nilai.forEach((n) => {
      const idKomponen = peta.get(`${n.componentId}::${n.subjectId}`);
      if (!idKomponen) {
        nilaiBaru.push(n);
        return;
      }
      const idBaru = `${n.studentId}::${n.subjectId}::${idKomponen}`;
      if (idBaru !== n.id) nilaiUsang.push(n.id);
      nilaiBaru.push({ ...n, componentId: idKomponen, id: idBaru });
    });
    if (nilaiUsang.length > 0) await removeMany('grades', nilaiUsang);
    if (nilaiBaru.length > 0) await putMany('grades', nilaiBaru);

    lamaKelas.forEach((c) => tambahTombstone('components', c.id));
    await removeMany('components', lamaKelas.map((c) => c.id));
    lamaKelas.forEach((c) => {
      antrean = antrekanHapus(c.id);
    });
  }

  if (antrean.length > 0) simpanAntrianTersimpan(antrean);
  await put('meta', { ...(meta || defaultSettings()), schemaVersion: VERSI_SKEMA });

  return { diterapkan: true, komponen: dibuat, nilai: nilai.length };
}
