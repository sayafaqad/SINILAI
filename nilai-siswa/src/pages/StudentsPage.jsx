import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Pencil,
  Plus,
  Trash2,
  Upload,
  UserPlus,
  Users,
} from 'lucide-react';
import { useApp } from '../store/AppStore';
import { PageHeader, FilterBar, FilterField } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button, IconButton } from '../components/ui/Button';
import { Field, SearchInput, Select, TextInput } from '../components/ui/Field';
import { ConfirmDialog, Drawer } from '../components/ui/Overlay';
import { Badge, EmptyState, TableShell, Td, Th } from '../components/ui/Bits';
import { useToast } from '../components/ui/Toast';
import { ImportDrawer } from '../components/students/ImportDrawer';
import { exportStudents } from '../lib/excel';
import { EMPTY, formatNumber } from '../lib/format';
import { GENDER_OPTIONS, STATUS_OPTIONS } from '../lib/repository';

const PAGE_SIZE = 50;
const EMPTY_FORM = {
  schoolId: '',
  classId: '',
  nis: '',
  nisn: '',
  name: '',
  gender: '',
  status: 'aktif',
};

export default function StudentsPage() {
  const {
    schools,
    classes,
    students,
    importStudents,
    saveStudent,
    deleteStudents,
  } = useApp();
  const toast = useToast();

  const [schoolFilter, setSchoolFilter] = useState(schools[0]?.id || '');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!schoolFilter && schools.length > 0) setSchoolFilter(schools[0].id);
  }, [schools, schoolFilter]);

  useEffect(() => {
    setPage(1);
    setSelected([]);
  }, [schoolFilter, classFilter, statusFilter, query]);

  const scopedClasses = useMemo(
    () => classes.filter((klass) => !schoolFilter || klass.schoolId === schoolFilter),
    [classes, schoolFilter],
  );

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return students
      .filter((student) => !schoolFilter || student.schoolId === schoolFilter)
      .filter((student) =>
        classFilter === '__none__'
          ? !student.classId
          : !classFilter || student.classId === classFilter,
      )
      .filter((student) => !statusFilter || student.status === statusFilter)
      .filter(
        (student) =>
          !needle ||
          student.name.toLowerCase().includes(needle) ||
          (student.nis || '').toLowerCase().includes(needle) ||
          student.nisn.toLowerCase().includes(needle),
      )
      .sort((a, b) => {
        const classA = classes.find((klass) => klass.id === a.classId)?.name || '';
        const classB = classes.find((klass) => klass.id === b.classId)?.name || '';
        if (classA !== classB) return classA.localeCompare(classB);
        return a.name.localeCompare(b.name);
      });
  }, [students, classes, schoolFilter, classFilter, statusFilter, query]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pageIds = pageRows.map((student) => student.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const selectedSchool = schools.find((school) => school.id === schoolFilter) || null;

  function toggleAllOnPage() {
    setSelected((current) =>
      allPageSelected ? current.filter((id) => !pageIds.includes(id)) : [...new Set([...current, ...pageIds])],
    );
  }

  function toggleOne(id) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function openCreate() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      schoolId: schoolFilter || schools[0]?.id || '',
      classId: classFilter || '',
    });
    setErrors({});
    setDrawerOpen(true);
  }

  function openEdit(student) {
    setEditing(student);
    setForm({
      schoolId: student.schoolId,
      classId: student.classId,
      nis: student.nis,
      nisn: student.nisn,
      name: student.name,
      gender: student.gender,
      status: student.status,
    });
    setErrors({});
    setDrawerOpen(true);
  }

  function validate() {
    const next = {};
    if (!form.schoolId) next.schoolId = 'Pilih sekolah terlebih dahulu.';
    if (!form.name.trim()) next.name = 'Nama siswa wajib diisi.';
    // NIS is optional: schools that do not issue one simply leave it empty.
    if (form.nis.trim()) {
      const duplicate = students.find(
        (student) =>
          student.id !== editing?.id &&
          student.schoolId === form.schoolId &&
          student.nis.trim().toLowerCase() === form.nis.trim().toLowerCase(),
      );
      if (duplicate) next.nis = `NIS ${form.nis} sudah dipakai ${duplicate.name}.`;
    }
    const classSchool = classes.find((klass) => klass.id === form.classId);
    if (classSchool && classSchool.schoolId !== form.schoolId) {
      next.classId = 'Kelas yang dipilih bukan milik sekolah ini.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      await saveStudent({ ...form, id: editing?.id });
      toast.success(editing ? 'Perubahan siswa disimpan' : 'Siswa ditambahkan', form.name);
      setDrawerOpen(false);
    } catch (error) {
      toast.error('Gagal menyimpan siswa', error?.message || 'Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteSingle() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const result = await deleteStudents([deleteTarget.id]);
      toast.success(
        'Siswa dihapus',
        `${deleteTarget.name} dihapus bersama ${formatNumber(result.grades)} nilainya.`,
      );
      setDeleteTarget(null);
    } catch (error) {
      toast.error('Gagal menghapus siswa', error?.message || 'Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  async function handleBulkDelete() {
    setBusy(true);
    try {
      const result = await deleteStudents(selected);
      toast.success(
        'Siswa terpilih dihapus',
        `${formatNumber(result.students)} siswa dan ${formatNumber(result.grades)} nilainya terhapus.`,
      );
      setSelected([]);
      setBulkDeleteOpen(false);
    } catch (error) {
      toast.error('Gagal menghapus siswa terpilih', error?.message || 'Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  async function handleImport(report) {
    if (!selectedSchool) throw new Error('Pilih sekolah terlebih dahulu.');
    return importStudents({
      records: report.records,
      newClasses: report.newClasses,
      schoolId: selectedSchool.id,
    });
  }

  function handleExport() {
    exportStudents({
      schoolName: selectedSchool?.name || 'semua-sekolah',
      className: classes.find((klass) => klass.id === classFilter)?.name || '',
      students: rows.map((student) => ({
        ...student,
        classLabel: classes.find((klass) => klass.id === student.classId)?.name || '',
      })),
    });
    toast.success('Daftar siswa diekspor', `${formatNumber(rows.length)} baris disimpan sebagai berkas Excel.`);
  }

  const formClasses = classes.filter((klass) => klass.schoolId === form.schoolId);

  if (schools.length === 0) {
    return (
      <div data-component="students-page">
        <PageHeader title="Siswa" description="Kelola data siswa dan impor massal dari Excel." />
        <Card>
          <EmptyState
            icon={Users}
            title="Sekolah belum tersedia"
            description="Siswa terdaftar pada satu sekolah. Tambahkan sekolah dan kelas terlebih dahulu."
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
    <div data-component="students-page">
      <PageHeader
        title="Siswa"
        description="Tambah siswa satu per satu atau impor massal dari berkas Excel. Impor juga dapat membuat kelas baru secara otomatis."
        action={
          <>
            <Button variant="subtle" icon={Download} onClick={handleExport} disabled={rows.length === 0}>
              Ekspor daftar
            </Button>
            <Button
              variant="secondary"
              icon={Upload}
              onClick={() => setImportOpen(true)}
              disabled={!selectedSchool}
              title={selectedSchool ? undefined : 'Pilih sekolah pada filter terlebih dahulu'}
            >
              Impor Excel
            </Button>
            <Button icon={Plus} onClick={openCreate}>
              Tambah Siswa
            </Button>
          </>
        }
      />

      <FilterBar className="mb-4">
        <FilterField label="Sekolah" className="min-w-[210px]">
          <Select
            value={schoolFilter}
            onChange={(event) => {
              setSchoolFilter(event.target.value);
              setClassFilter('');
            }}
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
        <FilterField label="Kelas" className="min-w-[160px]">
          <Select
            value={classFilter}
            onChange={(event) => setClassFilter(event.target.value)}
            aria-label="Filter kelas"
          >
            <option value="">Semua kelas</option>
            {scopedClasses.map((klass) => (
              <option key={klass.id} value={klass.id}>
                {klass.name}
              </option>
            ))}
            <option value="__none__">Belum ada kelas</option>
          </Select>
        </FilterField>
        <FilterField label="Status" className="min-w-[140px]">
          <Select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter status"
          >
            <option value="">Semua status</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label="Cari" className="min-w-[200px] flex-1">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Cari nama, NIS, atau NISN…"
            label="Cari siswa"
          />
        </FilterField>
      </FilterBar>

      {selected.length > 0 ? (
        <div
          className="mb-4 flex flex-wrap items-center gap-3 rounded-md bg-primary-800 px-4 py-3 text-primary-foreground"
          data-component="bulk-action-bar"
        >
          <span className="tnum text-label-md">{formatNumber(selected.length)} siswa dipilih</span>
          <Button
            variant="destructive"
            size="sm"
            icon={Trash2}
            onClick={() => setBulkDeleteOpen(true)}
            disabled={busy}
          >
            Hapus terpilih
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected([])} className="text-primary-100">
            Bersihkan pilihan
          </Button>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={students.length === 0 ? UserPlus : Users}
            title={
              students.length === 0
                ? 'Belum ada data siswa'
                : selectedSchool && classFilter
                  ? 'Tidak ada siswa pada kelas ini'
                  : 'Tidak ada siswa yang cocok'
            }
            description={
              students.length === 0
                ? 'Tambahkan siswa satu per satu, atau impor sekaligus dari berkas Excel dengan mengunduh template terlebih dahulu.'
                : 'Ubah filter atau kata kunci pencarian untuk melihat data lain.'
            }
            action={
              students.length === 0 ? (
                <div className="flex flex-wrap justify-center gap-2">
                  <Button icon={Plus} onClick={openCreate}>
                    Tambah Siswa
                  </Button>
                  <Button
                    variant="secondary"
                    icon={Upload}
                    onClick={() => setImportOpen(true)}
                    disabled={!selectedSchool}
                  >
                    Impor Excel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery('');
                    setClassFilter('');
                    setStatusFilter('');
                  }}
                >
                  Reset filter
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <>
          <TableShell>
            <table className="w-full min-w-[880px] border-collapse">
              <thead>
                <tr>
                  <Th className="w-10">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleAllOnPage}
                      aria-label="Pilih semua siswa pada halaman ini"
                      className="h-4 w-4 accent-[hsl(var(--primary))]"
                    />
                  </Th>
                  <Th className="left-10">
                    Nama Siswa
                  </Th>
                  <Th>NIS</Th>
                  <Th>NISN</Th>
                  <Th>JK</Th>
                  <Th>Kelas</Th>
                  <Th>Status</Th>
                  <Th align="right">Aksi</Th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((student) => (
                  <tr key={student.id} className="border-t border-border hover:bg-accent">
                    <Td className="w-10">
                      <input
                        type="checkbox"
                        checked={selected.includes(student.id)}
                        onChange={() => toggleOne(student.id)}
                        aria-label={`Pilih ${student.name}`}
                        className="h-4 w-4 accent-[hsl(var(--primary))]"
                      />
                    </Td>
                    <Td className="left-10 font-medium">{student.name}</Td>
                    <Td muted>{student.nis || EMPTY}</Td>
                    <Td muted>{student.nisn || '—'}</Td>
                    <Td muted>{student.gender || '—'}</Td>
                    <Td muted>
                      {classes.find((klass) => klass.id === student.classId)?.name || (
                        <span className="text-warning">Belum ada kelas</span>
                      )}
                    </Td>
                    <Td>
                      <Badge tone={student.status === 'aktif' ? 'success' : 'neutral'}>
                        {student.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </Td>
                    <Td align="right">
                      <span className="flex justify-end gap-1">
                        <IconButton
                          label={`Ubah ${student.name}`}
                          icon={Pencil}
                          onClick={() => openEdit(student)}
                        />
                        <IconButton
                          label={`Hapus ${student.name}`}
                          icon={Trash2}
                          tone="danger"
                          onClick={() => setDeleteTarget(student)}
                        />
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-body-sm text-muted-foreground">
              Menampilkan {formatNumber((currentPage - 1) * PAGE_SIZE + 1)}–
              {formatNumber(Math.min(currentPage * PAGE_SIZE, rows.length))} dari{' '}
              {formatNumber(rows.length)} siswa
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="subtle"
                size="sm"
                icon={ChevronLeft}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={currentPage <= 1}
              >
                Sebelumnya
              </Button>
              <span className="tnum text-body-sm text-muted-foreground">
                Halaman {currentPage} / {totalPages}
              </span>
              <Button
                variant="subtle"
                size="sm"
                iconRight={ChevronRight}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={currentPage >= totalPages}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        </>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? 'Ubah Siswa' : 'Tambah Siswa'}
        description="NIS bersifat opsional. Bila diisi, NIS harus unik di dalam satu sekolah dan dipakai untuk mencocokkan data saat impor Excel."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" form="student-form" disabled={busy}>
              {busy ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </>
        }
      >
        <form id="student-form" onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Field label="Sekolah" htmlFor="student-school" required error={errors.schoolId}>
            <Select
              id="student-school"
              value={form.schoolId}
              onChange={(event) => setForm({ ...form, schoolId: event.target.value, classId: '' })}
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
          <Field
            label="Kelas"
            htmlFor="student-class"
            error={errors.classId}
            helper={formClasses.length === 0 ? 'Sekolah ini belum punya kelas.' : undefined}
          >
            <Select
              id="student-class"
              value={form.classId}
              onChange={(event) => setForm({ ...form, classId: event.target.value })}
              invalid={Boolean(errors.classId)}
            >
              <option value="">Belum ada kelas</option>
              {formClasses.map((klass) => (
                <option key={klass.id} value={klass.id}>
                  {klass.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="NIS"
            htmlFor="student-nis"
            error={errors.nis}
            helper="Opsional. Bila diisi, NIS harus unik di sekolah ini dan dipakai untuk mencocokkan data saat impor Excel."
          >
            <TextInput
              id="student-nis"
              value={form.nis}
              onChange={(event) => setForm({ ...form, nis: event.target.value })}
              onBlur={validate}
              placeholder="Contoh: 2024001"
              invalid={Boolean(errors.nis)}
              autoFocus
            />
          </Field>
          <Field label="NISN" htmlFor="student-nisn" helper="Nomor Induk Siswa Nasional (opsional).">
            <TextInput
              id="student-nisn"
              value={form.nisn}
              onChange={(event) => setForm({ ...form, nisn: event.target.value })}
              inputMode="numeric"
            />
          </Field>
          <Field label="Nama Lengkap" htmlFor="student-name" required error={errors.name}>
            <TextInput
              id="student-name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              onBlur={validate}
              placeholder="Nama lengkap siswa"
              invalid={Boolean(errors.name)}
            />
          </Field>
          <Field label="Jenis Kelamin" htmlFor="student-gender">
            <Select
              id="student-gender"
              value={form.gender}
              onChange={(event) => setForm({ ...form, gender: event.target.value })}
            >
              <option value="">Belum diisi</option>
              {GENDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status" htmlFor="student-status" helper="Siswa nonaktif tetap tersimpan beserta nilainya.">
            <Select
              id="student-status"
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </form>
      </Drawer>

      <ImportDrawer
        open={importOpen}
        onClose={() => setImportOpen(false)}
        school={selectedSchool}
        classes={scopedClasses}
        students={students.filter((student) => student.schoolId === selectedSchool?.id)}
        onImport={handleImport}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteSingle}
        busy={busy}
        title="Hapus siswa ini?"
        message={`${deleteTarget?.name || ''}${
          deleteTarget?.nis ? ` (NIS ${deleteTarget.nis})` : ''
        } akan dihapus permanen.`}
        confirmLabel="Hapus Siswa"
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        busy={busy}
        title="Hapus siswa terpilih?"
        message={`${formatNumber(selected.length)} siswa akan dihapus dari daftar.`}
        detail="Seluruh nilai milik siswa tersebut juga terhapus. Tindakan ini tidak dapat dibatalkan."
        confirmLabel={`Hapus ${formatNumber(selected.length)} Siswa`}
      />
    </div>
  );
}
