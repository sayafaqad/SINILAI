import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Inbox, Pencil, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../store/AppStore';
import { PageHeader, FilterBar, FilterField } from '../components/layout/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Button, IconButton } from '../components/ui/Button';
import { Field, SearchInput, Select, TextInput } from '../components/ui/Field';
import { ConfirmDialog, Drawer } from '../components/ui/Overlay';
import { EmptyState, TableShell, Td, Th } from '../components/ui/Bits';
import { useToast } from '../components/ui/Toast';
import { formatNumber } from '../lib/format';

const EMPTY_FORM = { schoolId: '', code: '', name: '', kkm: '75' };

export default function SubjectsPage() {
  const { schools, subjects, componentsBySchool, grades, settings, saveSubject, deleteSubject } =
    useApp();
  const toast = useToast();

  const [schoolFilter, setSchoolFilter] = useState('');
  const [query, setQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [kkmDraft, setKkmDraft] = useState({});
  const [savingKkmId, setSavingKkmId] = useState('');

  const schoolName = (id) => schools.find((school) => school.id === id)?.name || '—';

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return subjects
      .filter((subject) => !schoolFilter || subject.schoolId === schoolFilter)
      .filter(
        (subject) =>
          !needle ||
          subject.name.toLowerCase().includes(needle) ||
          subject.code.toLowerCase().includes(needle),
      )
      .map((subject) => ({
        ...subject,
        gradedCells: grades.filter((grade) => grade.subjectId === subject.id).length,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [subjects, grades, schoolFilter, query]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      schoolId: schoolFilter || schools[0]?.id || '',
      kkm: String(settings?.defaultKkm ?? EMPTY_FORM.kkm),
    });
    setErrors({});
    setDrawerOpen(true);
  }

  function openEdit(subject) {
    setEditing(subject);
    setForm({
      schoolId: subject.schoolId,
      code: subject.code,
      name: subject.name,
      kkm: String(subject.kkm || ''),
    });
    setErrors({});
    setDrawerOpen(true);
  }

  function validate() {
    const next = {};
    if (!form.schoolId) next.schoolId = 'Pilih sekolah terlebih dahulu.';
    if (!form.name.trim()) next.name = 'Nama mata pelajaran wajib diisi.';
    if (!form.code.trim()) next.code = 'Kode mata pelajaran wajib diisi.';
    const kkm = Number(form.kkm);
    if (form.kkm !== '' && (Number.isNaN(kkm) || kkm < 0 || kkm > 100)) {
      next.kkm = 'KKM berupa angka 0–100.';
    }
    const duplicate = subjects.find(
      (subject) =>
        subject.id !== editing?.id &&
        subject.schoolId === form.schoolId &&
        (subject.code.trim().toLowerCase() === form.code.trim().toLowerCase() ||
          subject.name.trim().toLowerCase() === form.name.trim().toLowerCase()),
    );
    if (duplicate) next.code = 'Kode atau nama mata pelajaran ini sudah ada di sekolah tersebut.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      await saveSubject({ ...form, id: editing?.id });
      toast.success(
        editing ? 'Perubahan mata pelajaran disimpan' : 'Mata pelajaran ditambahkan',
        form.name,
      );
      setDrawerOpen(false);
    } catch (error) {
      toast.error('Gagal menyimpan mata pelajaran', error?.message || 'Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const result = await deleteSubject(deleteTarget.id);
      toast.success(
        'Mata pelajaran dihapus',
        `${formatNumber(result.grades)} nilai pada mata pelajaran ini ikut terhapus.`,
      );
      setDeleteTarget(null);
    } catch (error) {
      toast.error('Gagal menghapus mata pelajaran', error?.message || 'Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  /** Save an inline KKM change straight from the table row. */
  async function commitKkm(subject) {
    const raw = kkmDraft[subject.id];
    if (raw === undefined) return;
    const value = Number(raw);
    if (raw === '' || Number.isNaN(value) || value < 0 || value > 100) {
      toast.error('KKM belum benar', 'KKM berupa angka 0–100.');
      setKkmDraft((current) => ({ ...current, [subject.id]: String(subject.kkm ?? '') }));
      return;
    }
    if (value === Number(subject.kkm || 0)) return;
    setSavingKkmId(subject.id);
    try {
      await saveSubject({ id: subject.id, kkm: value });
      toast.success('KKM diperbarui', `${subject.name} · KKM ${value}`);
    } catch (error) {
      toast.error('Gagal menyimpan KKM', error?.message || 'Coba lagi.');
    } finally {
      setSavingKkmId('');
    }
  }

  const deleteGradeCount = deleteTarget
    ? grades.filter((grade) => grade.subjectId === deleteTarget.id).length
    : 0;

  const filterComponents = schoolFilter ? componentsBySchool[schoolFilter] || [] : [];

  if (schools.length === 0) {
    return (
      <div data-component="subjects-page">
        <PageHeader title="Mata Pelajaran" description="Kelola mata pelajaran dan nilai KKM." />
        <Card>
          <EmptyState
            icon={BookOpen}
            title="Sekolah belum tersedia"
            description="Mata pelajaran dimiliki oleh masing-masing sekolah. Tambahkan sekolah terlebih dahulu — daftar mata pelajaran umum akan dibuat otomatis."
            action={
              <Link
                to="/sekolah"
                className="inline-flex min-h-touch items-center gap-2 rounded-sm bg-primary px-4 text-label-md font-medium text-primary-foreground hover:bg-primary-700 sm:min-h-control"
              >
                Buka Data Sekolah
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div data-component="subjects-page">
      <PageHeader
        title="Mata Pelajaran"
        description="Setiap sekolah memiliki daftar mata pelajarannya sendiri beserta KKM (nilai minimum ketuntasan). KKM dapat diubah langsung pada kolom KKM di tabel, atau lewat tombol ubah. Kode dan nama mata pelajaran juga dapat diubah kapan saja. Bobot penilaian harian, UTS, dan UAS diatur di menu Pengaturan."
        action={
          <Button icon={Plus} onClick={openCreate}>
            Tambah Mapel
          </Button>
        }
      />

      <FilterBar className="mb-4">
        <FilterField label="Sekolah" className="min-w-[220px]">
          <Select
            value={schoolFilter}
            onChange={(event) => setSchoolFilter(event.target.value)}
            aria-label="Filter sekolah"
          >
            <option value="">Semua sekolah</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label="Cari" className="min-w-[220px] flex-1">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Cari nama atau kode mapel…"
            label="Cari mata pelajaran"
          />
        </FilterField>
        <p className="ml-auto text-body-sm text-muted-foreground">
          {formatNumber(rows.length)} mata pelajaran
        </p>
      </FilterBar>

      {schoolFilter ? (
        <Card className="mb-4">
          <CardHeader
            title="Komponen penilaian diatur per kelas"
            description="Jumlah PH, UTS, dan UAS bisa berbeda tiap kelas. Buka menu Kelas, tekan tombol komponen pada baris kelas, lalu tambahkan komponen beserta bobot, tanggal, dan catatannya."
          />
          <div className="p-5 pt-0">
            <Link
              to="/kelas"
              className="inline-flex min-h-touch items-center rounded-sm bg-secondary px-3 text-label-md font-medium text-secondary-foreground hover:bg-accent sm:min-h-control"
            >
              Buka menu Kelas
            </Link>
          </div>
        </Card>
      ) : null}

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={subjects.length === 0 ? BookOpen : Inbox}
            title={subjects.length === 0 ? 'Belum ada mata pelajaran' : 'Tidak ada mapel yang cocok'}
            description={
              subjects.length === 0
                ? 'Tambahkan mata pelajaran untuk sekolah ini.'
                : 'Ubah filter sekolah atau kata kunci pencarian.'
            }
            action={
              subjects.length === 0 ? (
                <Button icon={Plus} onClick={openCreate}>
                  Tambah Mapel
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery('');
                    setSchoolFilter('');
                  }}
                >
                  Reset filter
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <TableShell>
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr>
                <Th>Mata Pelajaran</Th>
                <Th>Kode</Th>
                <Th>Sekolah</Th>
                <Th align="right">KKM (bisa diubah)</Th>
                <Th align="right">Nilai Terisi</Th>
                <Th align="right">Aksi</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((subject) => (
                <tr key={subject.id} className="border-t border-border hover:bg-accent">
                  <Td className="font-medium">{subject.name}</Td>
                  <Td muted>{subject.code}</Td>
                  <Td muted>{schoolName(subject.schoolId)}</Td>
                  <Td align="right">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={kkmDraft[subject.id] ?? String(subject.kkm ?? '')}
                      onChange={(event) =>
                        setKkmDraft((current) => ({ ...current, [subject.id]: event.target.value }))
                      }
                      onBlur={() => commitKkm(subject)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          event.currentTarget.blur();
                        }
                      }}
                      disabled={savingKkmId === subject.id}
                      aria-label={`KKM ${subject.name}`}
                      className="tnum h-8 w-16 rounded-sm border border-input bg-card text-center text-numeric-md focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/35 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                    />
                  </Td>
                  <Td align="right">{formatNumber(subject.gradedCells)}</Td>
                  <Td align="right">
                    <span className="flex justify-end gap-1">
                      <IconButton
                        label={`Ubah ${subject.name}`}
                        icon={Pencil}
                        onClick={() => openEdit(subject)}
                      />
                      <IconButton
                        label={`Hapus ${subject.name}`}
                        icon={Trash2}
                        tone="danger"
                        onClick={() => setDeleteTarget(subject)}
                      />
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? 'Ubah Mata Pelajaran' : 'Tambah Mata Pelajaran'}
        description="KKM dipakai untuk menandai nilai yang belum tuntas pada input nilai dan rekap."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" form="subject-form" disabled={busy}>
              {busy ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </>
        }
      >
        <form id="subject-form" onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Field label="Sekolah" htmlFor="subject-school" required error={errors.schoolId}>
            <Select
              id="subject-school"
              value={form.schoolId}
              onChange={(event) => setForm({ ...form, schoolId: event.target.value })}
              invalid={Boolean(errors.schoolId)}
            >
              <option value="">Pilih sekolah…</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Nama Mata Pelajaran" htmlFor="subject-name" required error={errors.name}>
            <TextInput
              id="subject-name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              onBlur={validate}
              placeholder="Contoh: Matematika"
              invalid={Boolean(errors.name)}
              autoFocus
            />
          </Field>
          <Field
            label="Kode"
            htmlFor="subject-code"
            required
            error={errors.code}
            helper={
              editing
                ? 'Kode boleh diubah. Kode dipakai sebagai label pada tabel, rekap, dan ekspor — nilai yang sudah tersimpan tidak terpengaruh.'
                : 'Kode singkat untuk kolom tabel dan ekspor, misalnya MTK.'
            }
          >
            <TextInput
              id="subject-code"
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
              onBlur={validate}
              placeholder="MTK"
              invalid={Boolean(errors.code)}
            />
          </Field>
          <Field
            label="KKM"
            htmlFor="subject-kkm"
            error={errors.kkm}
            helper="Nilai minimum ketuntasan, 0–100."
          >
            <TextInput
              id="subject-kkm"
              value={form.kkm}
              onChange={(event) => setForm({ ...form, kkm: event.target.value })}
              inputMode="numeric"
              placeholder="75"
              invalid={Boolean(errors.kkm)}
            />
          </Field>
        </form>
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        busy={busy}
        title="Hapus mata pelajaran ini?"
        message={`"${deleteTarget?.name || ''}" akan dihapus dari ${schoolName(deleteTarget?.schoolId)}.`}
        detail={`${formatNumber(deleteGradeCount)} nilai pada mata pelajaran ini ikut terhapus permanen.`}
        confirmLabel="Hapus Mapel"
      />
    </div>
  );
}
