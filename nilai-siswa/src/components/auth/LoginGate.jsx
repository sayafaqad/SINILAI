/**
 * Layar masuk / daftar.
 *
 * Tampil hanya ketika pengguna belum masuk dan belum memilih mode tanpa akun.
 * Setelah masuk, data di perangkat ini diunggah ke akun dan disinkronkan dengan
 * perangkat lain yang memakai akun yang sama.
 */
import { useState } from 'react';
import { Cloud, LogIn, ShieldCheck, UserPlus } from 'lucide-react';
import { Button } from '../ui/Button';
import { Field, TextInput } from '../ui/Field';
import { useAuth } from '../../store/AuthStore';

export default function LoginGate({ children }) {
  const { siap, pengguna, modeLokal, masuk, daftar, gunakanTanpaAkun, tersinkron } = useAuth();
  const [mode, setMode] = useState('masuk');
  const [form, setForm] = useState({ email: '', sandi: '' });
  const [galat, setGalat] = useState('');

  // Selama sesi diperiksa, jangan kedipkan layar masuk.
  if (!siap) {
    return (
      <div className="grid min-h-layar place-items-center bg-background">
        <p className="text-body-md text-muted-foreground">Memeriksa sesi…</p>
      </div>
    );
  }

  if (pengguna || modeLokal || !tersinkron) return children;

  async function kirim(event) {
    event.preventDefault();
    setGalat('');
    if (!form.email.trim() || !form.sandi) {
      setGalat('Isi email dan sandi terlebih dahulu.');
      return;
    }
    const aksi = mode === 'masuk' ? masuk : daftar;
    const hasil = await aksi(form.email, form.sandi);
    if (!hasil.ok) setGalat(hasil.pesan);
  }

  return (
    <div className="min-h-layar bg-background px-4 py-10" data-component="layar-masuk">
      <div className="mx-auto flex w-full max-w-[420px] flex-col gap-6">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-[#2D6EDD] to-[#1546A0] text-[26px] font-semibold leading-none text-white"
          >
            S
          </span>
          <div>
            <p className="text-headline-md text-foreground">SINILAI</p>
            <p className="text-body-sm text-muted-foreground">
              Nilai tersimpan di perangkat, dan ikut tersinkron ke akun Anda.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex gap-1 rounded-md bg-muted p-1">
            {[
              { nilai: 'masuk', label: 'Masuk' },
              { nilai: 'daftar', label: 'Daftar' },
            ].map((pilihan) => (
              <button
                key={pilihan.nilai}
                type="button"
                onClick={() => {
                  setMode(pilihan.nilai);
                  setGalat('');
                }}
                className={
                  mode === pilihan.nilai
                    ? 'flex-1 rounded-sm bg-card px-3 py-2 text-label-md font-medium text-foreground shadow-sm'
                    : 'flex-1 rounded-sm px-3 py-2 text-label-md text-muted-foreground'
                }
              >
                {pilihan.label}
              </button>
            ))}
          </div>

          <form onSubmit={kirim} className="flex flex-col gap-4" noValidate>
            <Field label="Email" htmlFor="masuk-email">
              <TextInput
                id="masuk-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="nama@sekolah.sch.id"
              />
            </Field>

            <Field
              label="Sandi"
              htmlFor="masuk-sandi"
              helper={mode === 'daftar' ? 'Minimal 6 karakter.' : undefined}
            >
              <TextInput
                id="masuk-sandi"
                type="password"
                autoComplete={mode === 'masuk' ? 'current-password' : 'new-password'}
                value={form.sandi}
                onChange={(event) => setForm({ ...form, sandi: event.target.value })}
                placeholder="••••••"
              />
            </Field>

            {galat ? (
              <p
                data-component="galat-masuk"
                className="rounded-md bg-danger-surface px-3 py-2 text-body-sm text-danger"
                role="alert"
              >
                {galat}
              </p>
            ) : null}

            <Button
              type="submit"
              icon={mode === 'masuk' ? LogIn : UserPlus}
              className="w-full justify-center"
            >
              {mode === 'masuk' ? 'Masuk' : 'Buat akun'}
            </Button>
          </form>

          <button
            type="button"
            onClick={gunakanTanpaAkun}
            className="mt-4 w-full text-center text-body-sm text-primary underline-offset-2 hover:underline"
          >
            Lanjut tanpa akun — data hanya tersimpan di perangkat ini
          </button>
        </div>

        <div className="rounded-lg border border-border bg-info-surface px-4 py-3 text-body-sm text-info">
          <p className="flex items-center gap-2 font-medium">
            <Cloud size={16} /> Satu akun untuk semua perangkat
          </p>
          <p className="mt-1">
            Masuk dengan akun yang sama di HP dan komputer. Nilai yang diisi di satu perangkat
            langsung muncul di perangkat lain, dan tetap bisa diisi saat tidak ada internet.
          </p>
          <p className="mt-2 flex items-center gap-2 text-muted-foreground">
            <ShieldCheck size={16} /> Data nilai hanya dapat dibuka oleh akun Anda sendiri.
          </p>
        </div>
      </div>
    </div>
  );
}
