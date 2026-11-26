/**
 * Mesin sinkronisasi SINILAI.
 *
 * Cara kerja singkat:
 * - Penyimpanan di perangkat (IndexedDB) tetap menjadi sumber data untuk
 *   aplikasi, sehingga aplikasi tetap bisa dipakai tanpa internet.
 * - Setiap perubahan lokal dimasukkan ke antrean, lalu dikirim ke Supabase
 *   (tabel `records`) beberapa saat kemudian.
 * - Perubahan dari perangkat lain diterima lewat langganan langsung (realtime)
 *   dan langsung diterapkan ke penyimpanan perangkat, sehingga halaman yang
 *   sedang terbuka ikut terisi tanpa perlu dimuat ulang manual.
 * - Bila terjadi bentrokan (satu baris diubah di dua perangkat), yang dipakai
 *   adalah versi dengan `updatedAt` paling baru.
 */
import { put, putMany, readAllCollections, remove } from './db';
import { supabase } from './supabase';

const TABEL = 'records';
/** Antrean perubahan disimpan di perangkat agar tidak hilang saat aplikasi ditutup. */
const KUNCI_ANTRIAN = 'sinilai:antrian';
/** Daftar id yang sudah dihapus di perangkat ini; mencegah data hidup lagi. */
const KUNCI_TOMBSTONE = 'sinilai:dihapus';

/** Kumpulan data yang ikut disinkronkan. */
export const KOLEKSI = [
  'schools',
  'classes',
  'subjects',
  'components',
  'students',
  'grades',
  'settings',
];

/**
 * Nama penyimpanan lokal untuk tiap kumpulan data.
 * `STORES` di db.js berupa daftar nama (bukan objek), jadi pemetaan ini ditulis
 * eksplisit agar tidak salah ambil.
 */
const STORE_UNTUK = {
  schools: 'schools',
  classes: 'classes',
  subjects: 'subjects',
  components: 'components',
  students: 'students',
  grades: 'grades',
  settings: 'meta',
};

/** Kunci baris untuk tiap kumpulan data. */
function kunciUntuk(collection, record) {
  return collection === 'settings' ? 'app' : record.id;
}

function waktu(record) {
  const nilai = Date.parse(record?.updatedAt || record?.createdAt || '') || 0;
  return nilai;
}

/** Kumpulkan seluruh baris lokal dalam bentuk siap kirim. */
export async function kumpulkanLokal() {
  const semua = await readAllCollections();
  const hasil = [];
  KOLEKSI.forEach((collection) => {
    const baris = collection === 'settings' ? [semua.meta.find((x) => x.key === 'app')] : semua[collection];
    (baris || []).filter(Boolean).forEach((record) => {
      const id = kunciUntuk(collection, record);
      if (!id) return;
      hasil.push({
        collection,
        id,
        payload: collection === 'settings' ? { ...record, key: undefined } : record,
        updatedAt: record.updatedAt || record.createdAt || new Date(0).toISOString(),
      });
    });
  });
  return hasil;
}

/**
 * Versi `kumpulkanLokal` yang bekerja dari keadaan aplikasi di memori, sehingga
 * bisa dipanggil langsung dari React tanpa membaca penyimpanan lagi.
 */
export function kumpulkanDariState(state) {
  const hasil = [];
  KOLEKSI.forEach((collection) => {
    const baris = collection === 'settings' ? [state.settings] : state[collection] || [];
    (baris || []).filter(Boolean).forEach((record) => {
      const id = collection === 'settings' ? 'app' : record.id;
      if (!id) return;
      const payload = collection === 'settings' ? { ...record, key: 'app' } : record;
      hasil.push({
        collection,
        id,
        payload,
        updatedAt: record.updatedAt || record.createdAt || '',
      });
    });
  });
  return hasil;
}

/** Baris lokal yang sudah berubah dibanding pengiriman terakhir. */
export function bedakan(sebelum, sesudah) {
  const keluaran = [];
  const petaLama = new Map(sebelum.map((item) => [`${item.collection}::${item.id}`, item]));

  sesudah.forEach((item) => {
    const kunci = `${item.collection}::${item.id}`;
    const lama = petaLama.get(kunci);
    if (!lama || JSON.stringify(lama.payload) !== JSON.stringify(item.payload)) keluaran.push(item);
    petaLama.delete(kunci);
  });

  // Sisa di peta berarti sudah dihapus di perangkat ini.
  petaLama.forEach((item) => {
    keluaran.push({ ...item, payload: {}, dihapus: true });
  });

  return keluaran;
}

/**
 * Terapkan baris dari server ke penyimpanan perangkat.
 * Baris yang lebih tua daripada data lokal tidak menimpa data lokal.
 * @returns jumlah baris yang benar-benar mengubah penyimpanan
 */
export async function terapkanRemote(rows) {
  const lokal = await kumpulkanLokal();
  const petaLokal = new Map(lokal.map((item) => [`${item.collection}::${item.id}`, item]));
  // Baris yang sudah dihapus di perangkat ini tidak boleh muncul lagi hanya
  // karena server belum menerima penghapusannya.
  const dihapusLokal = bacaTombstone();
  const tulisan = [];
  const hapus = [];
  let berubah = 0;

  rows.forEach((row) => {
    const kunci = `${row.collection}::${row.id}`;
    const sekarang = petaLokal.get(kunci);
    const waktuRemote = Date.parse(row.updated_at || '') || 0;
    const waktuLokal = waktu(sekarang?.payload);

    if (row.deleted_at) {
      // Sudah dihapus di perangkat lain.
      if (sekarang && waktuRemote >= waktuLokal) {
        hapus.push({ collection: row.collection, id: row.id });
        berubah += 1;
      }
      return;
    }

    if (dihapusLokal.has(kunci)) return;
    if (sekarang && JSON.stringify(sekarang.payload) === JSON.stringify(row.payload)) return;
    if (sekarang && waktuRemote < waktuLokal) return;

    tulisan.push({ collection: row.collection, id: row.id, payload: row.payload });
    berubah += 1;
  });

  for (const item of tulisan) {
    const store = STORE_UNTUK[item.collection];
    if (!store) continue;
    const record =
      item.collection === 'settings'
        ? { ...item.payload, key: 'app' }
        : { ...item.payload, id: item.id };
    await put(store, record);
  }

  for (const item of hapus) {
    const store = STORE_UNTUK[item.collection];
    if (!store) continue;
    if (item.collection === 'settings') continue;
    await remove(store, item.id);
  }

  return berubah;
}

/** Daftar id yang sudah dihapus di perangkat ini. */
export function bacaTombstone() {
  try {
    const mentah = window.localStorage.getItem(KUNCI_TOMBSTONE);
    const daftar = mentah ? JSON.parse(mentah) : [];
    return new Set(Array.isArray(daftar) ? daftar : []);
  } catch (error) {
    return new Set();
  }
}

/** Catat bahwa sebuah baris sudah dihapus di perangkat ini. */
export function tambahTombstone(collection, id) {
  const daftar = bacaTombstone();
  daftar.add(`${collection}::${id}`);
  try {
    window.localStorage.setItem(KUNCI_TOMBSTONE, JSON.stringify(Array.from(daftar)));
  } catch (error) {
    /* abaikan: penyimpanan penuh */
  }
}

/** Baca antrean perubahan yang tertunda dari penyimpanan perangkat. */
export function bacaAntrianTersimpan() {
  try {
    const mentah = window.localStorage.getItem(KUNCI_ANTRIAN);
    if (!mentah) return [];
    const daftar = JSON.parse(mentah);
    return Array.isArray(daftar) ? daftar : [];
  } catch (error) {
    return [];
  }
}

/** Simpan antrean perubahan supaya tetap ada setelah aplikasi dimuat ulang. */
export function simpanAntrianTersimpan(daftar) {
  try {
    if (!daftar || daftar.length === 0) {
      window.localStorage.removeItem(KUNCI_ANTRIAN);
      return;
    }
    window.localStorage.setItem(KUNCI_ANTRIAN, JSON.stringify(daftar));
  } catch (error) {
    /* penyimpanan penuh: antrean tetap dipakai di memori */
  }
}

/** Ambil seluruh data milik pengguna ini dari server. */
export async function tarik() {
  if (!supabase) return { rows: [], ok: false, pesan: 'Supabase belum dikonfigurasi.' };
  const { data, error } = await supabase
    .from(TABEL)
    .select('collection,id,payload,updated_at,deleted_at')
    .order('updated_at', { ascending: true });
  if (error) return { rows: [], ok: false, pesan: error.message };
  return { rows: data || [], ok: true, pesan: '' };
}

/** Kirim sekumpulan perubahan ke server. */
export async function kirim(perubahan) {
  if (!supabase || perubahan.length === 0) return { ok: true, jumlah: 0, pesan: '' };
  const { data: pengguna } = await supabase.auth.getUser();
  const userId = pengguna?.user?.id;
  if (!userId) return { ok: false, jumlah: 0, pesan: 'Belum masuk ke akun.' };

  perubahan.forEach((item) => {
    if (item.dihapus) tambahTombstone(item.collection, item.id);
  });

  const baris = perubahan.map((item) => ({
    user_id: userId,
    collection: item.collection,
    id: item.id,
    parent_id: item.payload?.schoolId || null,
    payload: item.dihapus ? {} : item.payload,
    updated_at: new Date().toISOString(),
    deleted_at: item.dihapus ? new Date().toISOString() : null,
  }));

  const { error } = await supabase.from(TABEL).upsert(baris, {
    onConflict: 'user_id,collection,id',
  });
  if (error) return { ok: false, jumlah: 0, pesan: error.message };
  return { ok: true, jumlah: baris.length, pesan: '' };
}

/** Tandai salinan lokal sebagai "sudah diterapkan" (dipakai setelah kirim/tarik). */
export async function tandaiDiterapkan(rows) {
  const perubahan = rows.map((row) => ({
    collection: row.collection,
    id: row.id,
    payload: row.payload,
  }));
  for (const item of perubahan) {
    const store = STORE_UNTUK[item.collection];
    if (!store) continue;
    const record =
      item.collection === 'settings'
        ? { ...item.payload, key: 'app' }
        : { ...item.payload, id: item.id };
    await put(store, record);
  }
}

/** Langganan perubahan langsung dari server. */
export function berlangganan(userId, onPerubahan, onStatus) {
  if (!supabase || !userId) return null;
  const kanal = supabase
    .channel(`sinilai-records-${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABEL, filter: `user_id=eq.${userId}` },
      (muatan) => {
        const baris = muatan.new || muatan.old;
        if (!baris || !baris.collection) return;
        onPerubahan([baris]);
      },
    )
    .subscribe((status) => {
      if (onStatus) onStatus(status);
    });
  return kanal;
}

export function lepaskanLangganan(kanal) {
  if (kanal && supabase) supabase.removeChannel(kanal);
}

/** Utilitas kecil untuk membuat id baris bila diperlukan. */
export function simpanBanyak(store, records) {
  return putMany(store, records);
}

export function hapusBanyak(store, ids) {
  return remove(store, ids);
}
