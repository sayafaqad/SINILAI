import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, ListChecks, Pencil, Plus, Rows3, Trash2 } from 'lucide-react';
import { useApp } from '../store/AppStore';
import { PageHeader, FilterBar, FilterField } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button, IconButton } from '../components/ui/Button';
import { Field, SearchInput, Select, TextInput } from '../components/ui/Field';
import { ConfirmDialog, Drawer } from '../components/ui/Overlay';
import { EmptyState, TableShell, Td, Th } from '../components/ui/Bits';
import { useToast } from '../components/ui/Toast';
import KomponenDrawer from '../components/classes/KomponenDrawer';
import { formatNumber } from '../lib/format';

const EMPTY_FORM = { schoolId: '', name: '', gradeLevel: '', homeroom: '', academicYear: '' };

export default function ClassesPage() {
  const { schools, classes, students, settings, saveClass, deleteClass } = useApp();
  const toast = useToast();

  const [schoolFilter, setSchoolFilter] = useState('');
  const [komponenKelas, setKomponenKelas] = useState(null);
  const [query, setQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  const schoolName = (id) => schools.find((school) => school.id === id)?.name || '—';

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return classes
      .filter((klass) => !schoolFilter || klass.schoolId === schoolFilter)
      .filter(
        (klass) =>
          !needle ||
          klass.name.toLowerCase().includes(needle) ||
          klass.homeroom.toLowerCase().includes(needle),
      )
      .map((klass) => ({
        ...klass,
        studentCount: students.filter((student) => student.classId === klass.id).length,
      }))
      .sort((a, b) => {
        if (a.schoolId !== b.schoolId) return schoolName(a.schoolId).localeCompare(schoolName(b.schoolId));
        return a.name.localeCompare(b.name);
      });
  }, [classes, students, schoolFilter, query, schools]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      schoolId: schoolFilter || schools[0]?.id || '',
      academicYear: settings.activeAcademicYear,
    });
    setErrors({});
    setDrawerOpen(true);
  }

  function openEdit(klass) {
    setEditing(klass);
    setForm({
      schoolId: klass.schoolId,
      name: klass.name,
      gradeLevel: klass.gradeLevel,
      homeroom: klass.homeroom,
      academicYear: klass.academicYear,
    });
    setErrors({});
    setDrawerOpen(true);
  }

  function validate() {
    const next = {};
    if (!form.schoolId) next.schoolId = 'Pilih sekolah terlebih dahulu.';
    if (!form.name.trim()) next.name = 'Nama kelas wajib diisi.';
    const duplicate = classes.find(
      (klass) =>
        klass.id !== editing?.id &&
        klass.schoolId === form.schoolId &&
        klass.name.trim().toLowerCase() === form.name.trim().toLowerCase(),
    );
    if (duplicate) next.name = 'Nama kelas ini sudah ada di sekolah tersebut.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      await saveClass({ ...form, id: editing?.id });
      toast.success(editing ? 'Perubahan kelas disimpan' : 'Kelas ditambahkan', form.name);
      setDrawerOpen(false);
    } catch (error) {
      toast.error('Gagal menyimpan kelas', error?.message || 'Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const result = await deleteClass(deleteTarget.id);
      toast.success(
        'Kelas dihapus',
        `${formatNumber(result.grades)} nilai pada kelas ini dihapus. ${formatNumber(
          result.students,
        )} siswa tetap tersimpan tanpa kelas dan dapat dipindahkan dari menu Siswa.`,
      );
      setDeleteTarget(null);
    } catch (error) {
      toast.error('Gagal menghapus kelas', error?.message || 'Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  const deleteStudentCount = deleteTarget
    ? students.filter((student) => student.classId === deleteTarget.id).length
    : 0;

  if (schools.length === 0) {
    return (
      <div data-component="classes-page">
        <PageHeader title="Kelas" description="Kelola kelas untuk setiap sekolah." />
        <Card>
          <EmptyState
            icon={Rows3}
            title="Sekolah belum tersedia"
            description="Kelas selalu berada di dalam satu sekolah. Tambahkan sekolah terlebih dahulu."
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
    <div data-component="classes-page">
      <PageHeader
        title="Kelas"
        description="Kelas menghubungkan siswa dengan mata pelajaran dan nilai. Satu sekolah dapat memiliki banyak kelas."
        action={
          <Button icon={Plus} onClick={openCreate}>
            Tambah Kelas
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
            placeholder="Cari nama kelas atau wali kelas…"
            label="Cari kelas"
          />
        </FilterField>
        <p className="ml-auto text-body-sm text-muted-foreground">
          {formatNumber(rows.length)} kelas ditampilkan
        </p>
      </FilterBar>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={classes.length === 0 ? Rows3 : Inbox}
            title={classes.length === 0 ? 'Belum ada kelas' : 'Tidak ada kelas yang cocok'}
            description={
              classes.length === 0
                ? 'Tambahkan kelas pertama, misalnya "VII A", lalu isi siswanya lewat impor Excel.'
                : 'Ubah filter sekolah atau kata kunci pencarian.'
            }
            action={
              classes.length === 0 ? (
                <Button icon={Plus} onClick={openCreate}>
                  Tambah Kelas
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
          <table className="w-full min-w-[780px] border-collapse">
            <thead>
              <tr>
                <Th>Kelas</Th>
                <Th>Sekolah</Th>
                <Th>Tingkat</Th>
                <Th>Wali Kelas</Th>
                <Th align="right">Siswa</Th>
                <Th align="right">Aksi</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((klass) => (
                <tr key={klass.id} className="border-t border-border hover:bg-accent">
                  <Td className="font-medium">{klass.name}</Td>
                  <Td muted>{schoolName(klass.schoolId)}</Td>
                  <Td muted>{klass.gradeLevel || '—'}</Td>
                  <Td muted>{klass.homeroom || '—'}</Td>
                  <Td align="right">{formatNumber(klass.studentCount)}</Td>
                  <Td align="right">
                    <span className="flex justify-end gap-1">
                      <IconButton
                        label={`Komponen penilaian kelas ${klass.name}`}
                        icon={ListChecks}
                        onClick={() => setKomponenKelas(klass)}
                      />
                      <IconButton
                        label={`Ubah kelas ${klass.name}`}
                        icon={Pencil}
                        onClick={() => openEdit(klass)}
                      />
                      <IconButton
                        label={`Hapus kelas ${klass.name}`}
                        icon={Trash2}
                        tone="danger"
                        onClick={() => setDeleteTarget(klass)}
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
        title={editing ? 'Ubah Kelas' : 'Tambah Kelas'}
        description="Nama kelas sebaiknya sama dengan yang dipakai di sekolah, misalnya VII A atau 8B, agar cocok saat impor siswa dari Excel."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" form="class-form" disabled={busy}>
              {busy ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </>
        }
      >
        <form id="class-form" onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Field label="Sekolah" htmlFor="class-school" required error={errors.schoolId}>
            <Select
              id="class-school"
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
          <Field label="Nama Kelas" htmlFor="class-name" required error={errors.name}>
            <TextInput
              id="class-name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              onBlur={validate}
              placeholder="Contoh: VII A"
              invalid={Boolean(errors.name)}
              autoFocus
            />
          </Field>
          <Field label="Tingkat" htmlFor="class-level" helper="Terisi otomatis dari angka pada nama kelas.">
            <TextInput
              id="class-level"
              value={form.gradeLevel}
              onChange={(event) => setForm({ ...form, gradeLevel: event.target.value })}
              placeholder="Contoh: 07"
            />
          </Field>
          <Field label="Wali Kelas" htmlFor="class-homeroom">
            <TextInput
              id="class-homeroom"
              value={form.homeroom}
              onChange={(event) => setForm({ ...form, homeroom: event.target.value })}
              placeholder="Nama wali kelas"
            />
          </Field>
          <Field label="Tahun Ajaran" htmlFor="class-year">
            <TextInput
              id="class-year"
              value={form.academicYear}
              onChange={(event) => setForm({ ...form, academicYear: event.target.value })}
              placeholder="2026/2027"
            />
          </Field>
        </form>
      </Drawer>

      <KomponenDrawer kelas={komponenKelas} onClose={() => setKomponenKelas(null)} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        busy={busy}
        title="Hapus kelas ini?"
        message={`Kelas "${deleteTarget?.name || ''}" akan dihapus dari ${schoolName(
          deleteTarget?.schoolId,
        )}.`}
        detail={`${formatNumber(deleteStudentCount)} siswa akan tetap tersimpan tanpa kelas (dapat dipindahkan dari menu Siswa), dan seluruh nilai pada kelas ini ikut dihapus.`}
        confirmLabel="Hapus Kelas"
      />
    </div>
  );
}
