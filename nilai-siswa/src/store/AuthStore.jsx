/**
 * Status masuk pengguna.
 *
 * Aplikasi tetap dapat dipakai tanpa akun ("mode lokal"): data hanya tersimpan
 * di perangkat ini. Setelah masuk, data di perangkat ini menjadi milik akun
 * tersebut dan disinkronkan dengan perangkat lain yang memakai akun yang sama.
 *
 * Isolasi antar akun: setiap data di perangkat ditandai pemiliknya
 * (`sinilai:pemilik`). Bila akun yang masuk berbeda dari pemilik data, data
 * perangkat dibersihkan lebih dulu — sehingga akun lain tidak pernah melihat
 * maupun mengunggah data milik akun sebelumnya.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { STORES, clearStores } from '../lib/db';

const AuthContext = createContext(null);

const KUNCI_LOKAL = 'sinilai:tanpa-akun';

/** Penanda pemilik data perangkat. Nilai 'lokal' = dibuat tanpa akun. */
const KUNCI_PEMILIK = 'sinilai:pemilik';

function bacaPemilik() {
  try {
    return window.localStorage.getItem(KUNCI_PEMILIK) || '';
  } catch {
    return '';
  }
}

function tulisPemilik(uid) {
  try {
    window.localStorage.setItem(KUNCI_PEMILIK, uid);
  } catch {
    /* penyimpanan tidak tersedia; abaikan */
  }
}

/**
 * Pastikan data di perangkat ini milik akun yang sedang masuk.
 * - pemilik kosong atau 'lokal' → data dipakai (diklaim) oleh akun ini.
 * - pemilik sama → data dipertahankan agar tetap bisa dipakai luring.
 * - pemilik akun lain → data perangkat dibersihkan lebih dulu.
 *
 * @returns {Promise<boolean>} true bila data perangkat dibersihkan.
 */
async function siapkanDataUntuk(uid) {
  const pemilik = bacaPemilik();
  const milikAkunLain = Boolean(pemilik) && pemilik !== 'lokal' && pemilik !== uid;
  if (milikAkunLain) {
    await clearStores(STORES);
  }
  tulisPemilik(uid);
  return milikAkunLain;
}

export function AuthProvider({ children }) {
  const [siap, setSiap] = useState(!supabase);
  const [pengguna, setPengguna] = useState(null);
  const [tanpaAkun, setTanpaAkun] = useState(() => {
    try {
      return window.localStorage.getItem(KUNCI_LOKAL) === '1';
    } catch {
      return false;
    }
  });
  const [sibuk, setSibuk] = useState(false);

  useEffect(() => {
    if (!supabase) return undefined;
    let dibatalkan = false;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (dibatalkan) return;
      const sesi = data?.session;
      if (sesi?.user && bacaPemilik() !== sesi.user.id) {
        setSiap(false);
        await siapkanDataUntuk(sesi.user.id);
        if (dibatalkan) return;
      }
      setPengguna(sesi?.user || null);
      setSiap(true);
    })();

    const { data: langganan } = supabase.auth.onAuthStateChange(async (_kejadian, sesi) => {
      if (dibatalkan) return;
      if (sesi?.user && bacaPemilik() !== sesi.user.id) {
        setSiap(false);
        const dibersihkan = await siapkanDataUntuk(sesi.user.id);
        if (dibatalkan) return;
        // Aplikasi mungkin masih menampilkan data akun sebelumnya di memori;
        // muat ulang supaya tidak ada sisa data yang terlihat.
        if (dibersihkan) {
          window.location.reload();
          return;
        }
        setPengguna(sesi.user);
        setSiap(true);
        return;
      }
      setPengguna(sesi?.user || null);
      setSiap(true);
    });

    return () => {
      dibatalkan = true;
      langganan?.subscription?.unsubscribe?.();
    };
  }, []);

  const masuk = useCallback(async (email, sandi) => {
    if (!supabase) return { ok: false, pesan: 'Sinkronisasi belum dikonfigurasi.' };
    setSibuk(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: sandi,
      });
      if (error) return { ok: false, pesan: pesanRamah(error.message) };
      const dibersihkan = data?.user ? await siapkanDataUntuk(data.user.id) : false;
      hapusTanpaAkun();
      if (dibersihkan) {
        // Data akun sebelumnya sudah dibuang; mulai ulang dengan bersih.
        window.location.reload();
      }
      return { ok: true, pesan: '' };
    } finally {
      setSibuk(false);
    }
  }, []);

  const daftar = useCallback(async (email, sandi) => {
    if (!supabase) return { ok: false, pesan: 'Sinkronisasi belum dikonfigurasi.' };
    setSibuk(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: sandi,
      });
      if (error) return { ok: false, pesan: pesanRamah(error.message) };
      if (!data?.session) {
        return {
          ok: false,
          pesan:
            'Akun dibuat, tetapi proyek Supabase masih meminta konfirmasi email. Buka email untuk mengaktifkan akun, atau matikan konfirmasi email di dashboard Supabase (Authentication → Sign In / Providers → Email).',
        };
      }
      const dibersihkan = data?.user ? await siapkanDataUntuk(data.user.id) : false;
      hapusTanpaAkun();
      if (dibersihkan) {
        window.location.reload();
      }
      return { ok: true, pesan: '' };
    } finally {
      setSibuk(false);
    }
  }, []);

  const keluar = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setPengguna(null);
    // Data perangkat sengaja tidak dihapus: pemiliknya tetap tercatat, sehingga
    // akun yang sama dapat memakainya lagi, sedangkan akun lain akan memulai
    // dari kosong (lihat siapkanDataUntuk).
  }, []);

  const gunakanTanpaAkun = useCallback(() => {
    try {
      window.localStorage.setItem(KUNCI_LOKAL, '1');
      // Data yang dibuat tanpa akun ditandai 'lokal' agar dapat diklaim oleh
      // akun pertama yang masuk di perangkat ini.
      window.localStorage.setItem(KUNCI_PEMILIK, 'lokal');
    } catch {
      /* penyimpanan tidak tersedia; abaikan */
    }
    setTanpaAkun(true);
  }, []);

  function hapusTanpaAkun() {
    try {
      window.localStorage.removeItem(KUNCI_LOKAL);
    } catch {
      /* abaikan */
    }
    setTanpaAkun(false);
  }

  const nilai = useMemo(
    () => ({
      siap,
      pengguna,
      email: pengguna?.email || '',
      idPengguna: pengguna?.id || '',
      tersinkron: Boolean(supabase),
      modeLokal: tanpaAkun && !pengguna,
      masuk,
      daftar,
      keluar,
      gunakanTanpaAkun,
    }),
    [siap, pengguna, tanpaAkun, masuk, daftar, keluar, gunakanTanpaAkun],
  );

  return <AuthContext.Provider value={nilai}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const nilai = useContext(AuthContext);
  if (!nilai) throw new Error('useAuth harus dipakai di dalam AuthProvider.');
  return nilai;
}

/** Ubah pesan galat Supabase menjadi kalimat yang mudah dimengerti. */
function pesanRamah(pesan) {
  const teks = String(pesan || '');
  if (/Invalid login|invalid_credentials/i.test(teks)) {
    return 'Email atau sandi belum benar.';
  }
  if (/Email not confirmed/i.test(teks)) {
    return 'Email ini belum dikonfirmasi. Periksa kotak masuk email Anda, atau minta admin mematikan konfirmasi email.';
  }
  if (/User already registered/i.test(teks)) {
    return 'Email ini sudah terdaftar. Silakan masuk.';
  }
  if (/Password should be at least/i.test(teks)) {
    return 'Sandi terlalu pendek (minimal 6 karakter).';
  }
  if (/Unable to validate email|invalid format/i.test(teks)) {
    return 'Format email belum benar.';
  }
  if (/rate limit|Too many requests/i.test(teks)) {
    return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.';
  }
  if (/failed to fetch|networkerror|network request failed|load failed|fetch/i.test(teks)) {
    return 'Tidak ada koneksi internet. Periksa jaringan lalu coba lagi, atau pilih "Lanjut tanpa akun" untuk memakai aplikasi secara luring.';
  }
  return teks || 'Terjadi masalah saat menghubungi server.';
}
