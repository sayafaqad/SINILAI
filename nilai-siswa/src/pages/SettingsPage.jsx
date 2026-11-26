import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Cloud,
  Download,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  TriangleAlert,
  Upload,
} from 'lucide-react';
import { useAuth } from '../store/AuthStore';
import { useApp } from '../store/AppStore';
import { PageHeader, FilterBar, FilterField } from '../components/layout/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Button, IconButton } from '../components/ui/Button';
import { Field, Select, TextInput } from '../components/ui/Field';
import { ConfirmDialog } from '../components/ui/Overlay';
import { LocalModeBanner, TableShell, Td, Th } from '../components/ui/Bits';
import { InstallAppCard } from '../components/pwa/InstallApp';
import { useToast } from '../components/ui/Toast';
import { ASSESSMENT_TYPES } from '../lib/grading';
import { exportJsonBackup, readTextFile } from '../lib/excel';
import { parseBackup } from '../lib/repository';
import { storageMode } from '../lib/db';
import { formatNumber } from '../lib/format';

const NEW_COMPONENT = { code: '', label: '', type: 'harian', weight: '10' };

export default function SettingsPage() {
  const {
    schools,
    componentsBySchool,
    grades,
    settings,
    totals,
    saveComponent,
    deleteComponent,
    saveComponentWeights,
    updateSettings,
    exportBackup,
    restoreBackup,
    resetAll,
  } = useApp();
  const toast = useToast();

  const [schoolId, setSchoolId] = useState(schools[0]?.id || '');
  const [weights, setWeights] = useState({});
  const [newComponent, setNewComponent] = useState(NEW_COMPONENT);
  const [componentErrors, setComponentErrors] = useState({});
  const [predikatForm, setPredikatForm] = useState({
    A: String(settings.predikat.A),
    B: String(settings.predikat.B),
    C: String(settings.predikat.C),
  });
  const [predikatErrors, setPredikatErrors] = useState({});
  const [yearForm, setYearForm] = useState(settings.activeAcademicYear);
  const [kkmForm, setKkmForm] = useState(String(settings.defaultKkm ?? ''));
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [pendingRestore, setPendingRestore] = useState(null);

  useEffect(() => {
    if (!schoolId && schools.length > 0) setSchoolId(schools[0].id);
  }, [schools, schoolId]);

  const components = schoolId ? componentsBySchool[schoolId] || [] : [];

  useEffect(() => {
    const next = {};
    components.forEach((component) => {
      next[component.id] = String(component.weight ?? 0);
    });
    setWeights(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, components.map((component) => `${component.id}:${component.weight}`).join('|')]);

  const totalWeight = useMemo(
    () => components.reduce((sum, component) => sum + (Number(weights[component.id] ?? component.weight) || 0), 0),
    [components, weights],
  );

  const weightsDirty = components.some(
    (component) => String(component.weight ?? 0) !== (weights[component.id] ?? ''),
  );

  const schoolName = (id) => schools.find((school) => school.id === id)?.name || '—';

  async function handleSaveWeights() {
    setBusy(true);
    try {
      await saveComponentWeights(schoolId, weights);
      toast.success(
        'Bobot penilaian disimpan',
        `Total bobot ${totalWeight}%. ${
          totalWeight === 100
            ? 'Perhitungan nilai akhir memakai bobot ini apa adanya.'
            : 'Nilai akhir tetap dihitung sebagai Σ(skor × bobot) ÷ Σ(bobot), sehingga tetap proporsional.'
        }`,
      );
    } catch (error) {
      toast.error('Gagal menyimpan bobot', error?.message || 'Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  async function handleAddComponent(event) {
    event.preventDefault();
    const errors = {};
    if (!newComponent.code.trim()) errors.code = 'Kode komponen wajib diisi.';
    if (!newComponent.label.trim()) errors.label = 'Nama komponen wajib diisi.';
    const weight = Number(newComponent.weight);
    if (Number.isNaN(weight) || weight < 0 || weight > 100) {
      errors.weight = 'Bobot berupa angka 0–100.';
    }
    const duplicate = components.find(
      (component) => component.code.toLowerCase() === newComponent.code.trim().toLowerCase(),
    );
    if (duplicate) errors.code = 'Kode komponen ini sudah dipakai.';
    setComponentErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBusy(true);
    try {
      await saveComponent({ schoolId, ...newComponent });
      toast.success('Komponen penilaian ditambahkan', `${newComponent.code} · bobot ${weight}%`);
      setNewComponent(NEW_COMPONENT);
    } catch (error) {
      toast.error('Gagal menambah komponen', error?.message || 'Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteComponent() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const result = await deleteComponent(deleteTarget.id);
      toast.success(
        'Komponen penilaian dihapus',
        `${formatNumber(result.grades)} nilai pada komponen ini ikut terhapus.`,
      );
      setDeleteTarget(null);
    } catch (error) {
      toast.error('Gagal menghapus komponen', error?.message || 'Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSavePredikat(event) {
    event.preventDefault();
    const values = { A: Number(predikatForm.A), B: Number(predikatForm.B), C: Number(predikatForm.C) };
    const errors = {};
    if (Number.isNaN(values.A) || values.A < 0 || values.A > 100) errors.A = 'Isi angka 0–100.';
    if (Number.isNaN(values.B) || values.B < 0 || values.B > 100) errors.B = 'Isi angka 0–100.';
    if (Number.isNaN(values.C) || values.C < 0 || values.C > 100) errors.C = 'Isi angka 0–100.';
    if (!errors.A && !errors.B && !(values.A > values.B)) {
      errors.A = 'Ambang A harus lebih besar dari ambang B.';
    }
    if (!errors.B && !errors.C && !(values.B > values.C)) {
      errors.B = 'Ambang B harus lebih besar dari ambang C.';
    }
    setPredikatErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBusy(true);
    try {
      await updateSettings({ predikat: values });
      toast.success(
        'Ambang predikat disimpan',
        `A ≥ ${values.A} · B ≥ ${values.B} · C ≥ ${values.C} · D di bawahnya.`,
      );
    } catch (error) {
      toast.error('Gagal menyimpan ambang predikat', error?.message || 'Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveYear(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await updateSettings({ activeAcademicYear: yearForm.trim() });
      toast.success('Tahun ajaran disimpan', yearForm.trim());
    } catch (error) {
      toast.error('Gagal menyimpan tahun ajaran', error?.message || 'Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveDefaultKkm(event) {
    event.preventDefault();
    const value = Number(kkmForm);
    if (kkmForm === '' || Number.isNaN(value) || value < 0 || value > 100) {
      toast.error('KKM bawaan belum benar', 'Isi angka 0–100, misalnya 75.');
      return;
    }
    setBusy(true);
    try {
      await updateSettings({ defaultKkm: value });
      toast.success('KKM bawaan disimpan', `Mata pelajaran baru akan memakai KKM ${value}.`);
    } catch (error) {
      toast.error('Gagal menyimpan KKM bawaan', error?.message || 'Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  function handleExportBackup() {
    exportJsonBackup(exportBackup());
    toast.success('Cadangan dibuat', 'Berkas JSON tersimpan di folder unduhan perangkat ini.');
  }

  async function handleRestoreFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const text = await readTextFile(file);
      const parsed = parseBackup(text);
      if (!parsed.ok) {
        toast.error('Cadangan tidak dapat dibaca', parsed.error);
        return;
      }
      setPendingRestore(parsed.data);
    } catch (error) {
      toast.error('Cadangan tidak dapat dibaca', error?.message || 'Berkas tidak dikenali.');
    }
  }

  async function handleRestoreConfirm() {
    if (!pendingRestore) return;
    setBusy(true);
    try {
      await restoreBackup(pendingRestore);
      toast.success(
        'Cadangan dipulihkan',
        `${formatNumber(pendingRestore.schools.length)} sekolah dan ${formatNumber(
          pendingRestore.students.length,
        )} siswa dimuat kembali.`,
      );
      setPendingRestore(null);
    } catch (error) {
      toast.error('Gagal memulihkan cadangan', error?.message || 'Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    setBusy(true);
    try {
      await resetAll();
      toast.success('Semua data dihapus', 'Aplikasi kembali ke keadaan awal.');
      setResetOpen(false);
    } catch (error) {
      toast.error('Gagal menghapus data', error?.message || 'Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  const deleteGradeCount = deleteTarget
    ? grades.filter((grade) => grade.componentId === deleteTarget.id).length
    : 0;

  const restoreCounts = pendingRestore
    ? {
        schools: pendingRestore.schools.length,
        classes: pendingRestore.classes.length,
        students: pendingRestore.students.length,
        grades: pendingRestore.grades.length,
      }
    : null;

  return (
    <div data-component="settings-page">
      <PageHeader
        title="Pengaturan"
        description="Atur komponen penilaian dan bobotnya, ambang predikat, KKM bawaan, tahun ajaran aktif, pemasangan aplikasi di HP, serta cadangan data lokal."
      />

      <LocalModeBanner className="mb-4" />

      <FilterBar className="mb-5">
        <FilterField label="Sekolah" className="min-w-[240px]">
          {schools.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">
              Belum ada sekolah.{' '}
              <Link to="/sekolah" className="text-primary underline">
                Tambahkan sekolah
              </Link>{' '}
              terlebih dahulu.
            </p>
          ) : (
            <Select
              value={schoolId}
              onChange={(event) => setSchoolId(event.target.value)}
              aria-label="Pilih sekolah untuk pengaturan penilaian"
            >
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </Select>
          )}
        </FilterField>
        <p className="ml-auto text-body-sm text-muted-foreground">
          Penyimpanan: {storageMode() === 'indexeddb' ? 'IndexedDB' : 'localStorage'} di perangkat ini
        </p>
      </FilterBar>

      {schools.length > 0 ? (
        <Card className="mb-5">
          {/* Komponen penilaian kini diatur per kelas, bukan di sini. */}
        <CardHeader
          title="Komponen penilaian ada di tiap kelas"
          description="Jumlah PH, UTS, dan UAS berbeda untuk setiap kelas, jadi komponen tidak lagi diatur di halaman ini."
        />
        <div className="space-y-3 p-5 text-body-sm text-muted-foreground">
          <p>
            Buka menu <span className="font-medium text-foreground">Kelas</span>, tekan tombol
            komponen pada baris kelas, lalu tambahkan PH, UTS, atau UAS beserta bobot, tanggal
            penilaian, dan catatan materinya.
          </p>
          <Link
            to="/kelas"
            className="inline-flex min-h-touch items-center gap-2 rounded-sm bg-primary px-4 text-label-md font-medium text-primary-foreground hover:bg-primary-700 sm:min-h-control"
          >
            Buka menu Kelas
          </Link>
        </div>
      </Card>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Ambang predikat"
            description="Nilai minimum untuk setiap predikat. Nilai di bawah ambang C mendapat predikat D."
          />
          <form onSubmit={handleSavePredikat} className="flex flex-col gap-4 p-5" noValidate>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Predikat A minimal" htmlFor="pred-a" error={predikatErrors.A}>
                <TextInput
                  id="pred-a"
                  value={predikatForm.A}
                  onChange={(event) => setPredikatForm({ ...predikatForm, A: event.target.value })}
                  inputMode="numeric"
                  invalid={Boolean(predikatErrors.A)}
                />
              </Field>
              <Field label="Predikat B minimal" htmlFor="pred-b" error={predikatErrors.B}>
                <TextInput
                  id="pred-b"
                  value={predikatForm.B}
                  onChange={(event) => setPredikatForm({ ...predikatForm, B: event.target.value })}
                  inputMode="numeric"
                  invalid={Boolean(predikatErrors.B)}
                />
              </Field>
              <Field label="Predikat C minimal" htmlFor="pred-c" error={predikatErrors.C}>
                <TextInput
                  id="pred-c"
                  value={predikatForm.C}
                  onChange={(event) => setPredikatForm({ ...predikatForm, C: event.target.value })}
                  inputMode="numeric"
                  invalid={Boolean(predikatErrors.C)}
                />
              </Field>
            </div>
            <p className="text-body-sm text-muted-foreground">
              Urutan yang benar: A lebih tinggi dari B, dan B lebih tinggi dari C.
            </p>
            <div>
              <Button type="submit" icon={Save} disabled={busy}>
                Simpan ambang predikat
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <CardHeader
            title="Tahun ajaran aktif"
            description="Dipakai sebagai nilai awal saat menambahkan sekolah atau kelas baru."
          />
          <form onSubmit={handleSaveYear} className="flex flex-col gap-4 p-5" noValidate>
            <Field label="Tahun ajaran" htmlFor="academic-year" helper="Contoh format: 2026/2027">
              <TextInput
                id="academic-year"
                value={yearForm}
                onChange={(event) => setYearForm(event.target.value)}
              />
            </Field>
            <div>
              <Button type="submit" icon={Save} disabled={busy}>
                Simpan tahun ajaran
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <CardHeader
            title="KKM bawaan"
            description="Nilai minimum ketuntasan yang dipakai sebagai isian awal saat menambahkan mata pelajaran baru, dan untuk daftar mapel yang dibuat otomatis ketika sekolah baru ditambahkan."
          />
          <form onSubmit={handleSaveDefaultKkm} className="flex flex-col gap-4 p-5" noValidate>
            <Field
              label="KKM bawaan"
              htmlFor="default-kkm"
              helper="Angka 0–100, misalnya 75. KKM setiap mapel tetap dapat diubah di menu Mata Pelajaran."
            >
              <TextInput
                id="default-kkm"
                value={kkmForm}
                onChange={(event) => setKkmForm(event.target.value)}
                inputMode="numeric"
                placeholder="75"
              />
            </Field>
            <div>
              <Button type="submit" icon={Save} disabled={busy}>
                Simpan KKM bawaan
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <SyncCard />

      <InstallAppCard className="mt-5" />

      <Card className="mt-5">
        <CardHeader
          title="Cadangan & pemulihan data"
          description="Data SINILAI hanya tersimpan di browser ini. Buat cadangan berkala agar nilai tidak hilang saat browser dibersihkan atau perangkat diganti."
        />
        <div className="flex flex-col gap-4 p-5">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-md bg-muted px-4 py-3">
              <p className="text-label-caps uppercase text-muted-foreground">Sekolah</p>
              <p className="tnum mt-1 text-numeric-md">{formatNumber(totals.schools ?? 0)}</p>
            </div>
            <div className="rounded-md bg-muted px-4 py-3">
              <p className="text-label-caps uppercase text-muted-foreground">Siswa</p>
              <p className="tnum mt-1 text-numeric-md">{formatNumber(totals.students ?? 0)}</p>
            </div>
            <div className="rounded-md bg-muted px-4 py-3">
              <p className="text-label-caps uppercase text-muted-foreground">Nilai tersimpan</p>
              <p className="tnum mt-1 text-numeric-md">{formatNumber(totals.grades ?? 0)}</p>
            </div>
            <div className="rounded-md bg-muted px-4 py-3">
              <p className="text-label-caps uppercase text-muted-foreground">Mapel</p>
              <p className="tnum mt-1 text-numeric-md">{formatNumber(totals.subjects ?? 0)}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" icon={Download} onClick={handleExportBackup}>
              Unduh cadangan (JSON)
            </Button>
            <label className="inline-flex min-h-touch cursor-pointer items-center gap-2 rounded-sm border border-border bg-card px-4 text-label-md font-medium hover:bg-accent sm:min-h-control">
              <Upload size={17} aria-hidden="true" />
              Pulihkan dari cadangan
              <input type="file" accept=".json" className="sr-only" onChange={handleRestoreFile} />
            </label>
            <Button
              variant="destructive"
              icon={Trash2}
              className="ml-auto"
              onClick={() => setResetOpen(true)}
            >
              Hapus semua data
            </Button>
          </div>

          <p className="flex items-start gap-2 text-body-sm text-muted-foreground">
            <TriangleAlert size={16} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
            Memulihkan cadangan akan menggantikan seluruh data yang ada sekarang. Menghapus semua data
            tidak dapat dibatalkan.
          </p>
        </div>
      </Card>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteComponent}
        busy={busy}
        title="Hapus komponen penilaian?"
        message={`Komponen "${deleteTarget?.code || ''} — ${deleteTarget?.label || ''}" akan dihapus.`}
        detail={`${formatNumber(deleteGradeCount)} nilai pada komponen ini ikut terhapus. Nilai Akhir akan dihitung ulang tanpa komponen ini.`}
        confirmLabel="Hapus Komponen"
      />

      <ConfirmDialog
        open={Boolean(pendingRestore)}
        onClose={() => setPendingRestore(null)}
        onConfirm={handleRestoreConfirm}
        busy={busy}
        title="Pulihkan cadangan ini?"
        message="Seluruh data yang ada saat ini akan digantikan oleh isi berkas cadangan."
        detail={
          restoreCounts
            ? `Isi cadangan: ${formatNumber(restoreCounts.schools)} sekolah, ${formatNumber(
                restoreCounts.classes,
              )} kelas, ${formatNumber(restoreCounts.students)} siswa, dan ${formatNumber(
                restoreCounts.grades,
              )} nilai.`
            : ''
        }
        confirmLabel="Pulihkan Cadangan"
      />

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={handleReset}
        busy={busy}
        title="Hapus semua data?"
        message="Seluruh sekolah, kelas, mata pelajaran, siswa, dan nilai akan dihapus dari perangkat ini."
        detail={`Saat ini tersimpan ${formatNumber(totals.schools ?? 0)} sekolah dan ${formatNumber(
          totals.grades ?? 0,
        )} nilai. Unduh cadangan terlebih dahulu bila masih diperlukan.`}
        confirmLabel="Hapus Semua Data"
      />
    </div>
  );
}

/** Status akun: apakah data sedang disinkronkan, dan tombol keluar dari akun. */
function SyncCard() {
  const { sinkron } = useApp();
  const { pengguna, email, keluar } = useAuth();
  const toast = useToast();
  const [sibuk, setSibuk] = useState(false);

  const keterangan = {
    diam: 'Semua perubahan sudah terkirim.',
    mengirim: 'Mengirim perubahan…',
    menerima: 'Menerima perubahan dari perangkat lain…',
    menarik: 'Mengambil data terbaru…',
    galat: sinkron.pesan || 'Sinkronisasi terganggu, akan dicoba lagi.',
  };

  async function tarikSekarang() {
    setSibuk(true);
    try {
      await sinkron.sinkronSekarang();
      toast.success('Data disinkronkan', 'Data terbaru sudah diambil dari akun Anda.');
    } finally {
      setSibuk(false);
    }
  }

  async function keluarAkun() {
    setSibuk(true);
    try {
      await keluar();
      toast.info('Sudah keluar', 'Data di perangkat ini tetap tersimpan.');
    } finally {
      setSibuk(false);
    }
  }

  return (
    <Card className="mt-5">
      <CardHeader
        title="Akun & sinkronisasi"
        description="Masuk dengan akun yang sama di HP dan komputer agar nilai yang diisi di satu perangkat langsung muncul di perangkat lain. Data tetap bisa diisi tanpa internet dan dikirim saat koneksi kembali."
      />
      <div className="flex flex-col gap-4 p-5">
        {pengguna ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-info-surface text-info">
                <Cloud size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-label-md font-medium text-foreground">Tersinkron</p>
                <p className="break-all text-body-sm text-muted-foreground">{email}</p>
              </div>
            </div>
            <p className="text-body-sm text-muted-foreground">
              {keterangan[sinkron.keadaan] || keterangan.diam}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={RefreshCw} onClick={tarikSekarang} disabled={sibuk}>
                Sinkronkan sekarang
              </Button>
              <Button variant="ghost" icon={LogOut} onClick={keluarAkun} disabled={sibuk}>
                Keluar dari akun
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-body-sm text-muted-foreground">
              Perangkat ini memakai mode lokal: data hanya tersimpan di perangkat ini dan tidak
              berpindah ke perangkat lain.
            </p>
            <p className="text-body-sm text-muted-foreground">
              Untuk menyinkronkan, buka halaman masuk (keluar dari mode lokal lalu masuk dengan
              akun) — data yang sudah ada akan diunggah ke akun Anda.
            </p>
          </>
        )}
      </div>
    </Card>
  );
}
