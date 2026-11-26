import { useMemo, useState } from 'react';
import { Inbox, Pencil, Plus, School, Trash2 } from 'lucide-react';
import { useApp } from '../store/AppStore';
import { PageHeader, FilterBar, FilterField } from '../components/layout/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Button, IconButton } from '../components/ui/Button';
import { Field, SearchInput, TextArea, TextInput } from '../components/ui/Field';
import { ConfirmDialog, Drawer } from '../components/ui/Overlay';
import { EmptyState, TableShell, Td, Th } from '../components/ui/Bits';
import { useToast } from '../components/ui/Toast';
import { formatNumber } from '../lib/format';

const EMPTY_FORM = { name: '', npsn: '', address: '', headmaster: '', academicYear: '' };

export default function SchoolsPage() {
  const { schools, classes, students, settings, saveSchool, deleteSchool, cascadeCountsFor } = useApp();
  const toast = useToast();

  const [query, setQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return schools
      .filter(
        (school) =>
          !needle ||
          school.name.toLowerCase().includes(needle) ||
          school.npsn.toLowerCase().includes(needle) ||
          school.address.toLowerCase().includes(needle),
      )
      .map((school) => ({
        ...school,
        classCount: classes.filter((klass) => klass.schoolId === school.id).length,
        studentCount: students.filter((student) => student.schoolId === school.id).length,
      }));
  }, [schools, classes, students, query]);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, academicYear: settings.activeAcademicYear });
    setErrors({});
    setDrawerOpen(true);
  }

  function openEdit(school) {
    setEditing(school);
    setForm({
      name: school.name,
      npsn: school.npsn,
      address: school.address,
      headmaster: school.headmaster,
      academicYear: school.academicYear,
    });
    setErrors({});
    setDrawerOpen(true);
  }

  function validate() {
    const next = {};
    if (!form.name.trim()) next.name = 'Nama sekolah wajib diisi.';
    if (form.npsn && !/^\d{6,12}$/.test(form.npsn.trim())) {
      next.npsn = 'NPSN berisi 6–12 angka.';
    }
    const duplicate = schools.find(
      (school) =>
        school.id !== editing?.id &&
        school.name.trim().toLowerCase() === form.name.trim().toLowerCase(),
    );
    if (duplicate) next.name = 'Nama sekolah ini sudah terdaftar.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      const result = await saveSchool({ ...form, id: editing?.id });
      if (editing) {
        toast.success('Perubahan sekolah disimpan', `${result.record.name} diperbarui.`);
      } else {
        toast.success(
          'Sekolah ditambahkan',
          `${result.seededSubjects} mata pelajaran dan ${result.seededComponents} komponen penilaian bawaan disiapkan. Sesuaikan bobotnya di menu Pengaturan.`,
        );
      }
      setDrawerOpen(false);
    } catch (error) {
      toast.error('Gagal menyimpan sekolah', error?.message || 'Penyimpanan lokal menolak penulisan.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const counts = cascadeCountsFor({ schoolId: deleteTarget.id });
    setBusy(true);
    try {
      await deleteSchool(deleteTarget.id);
      toast.success(
        'Sekolah dihapus',
        `${formatNumber(counts.classes)} kelas, ${formatNumber(counts.students)} siswa, dan ${formatNumber(
          counts.grades,
        )} nilai ikut terhapus.`,
      );
      setDeleteTarget(null);
    } catch (error) {
      toast.error('Gagal menghapus sekolah', error?.message || 'Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  const deleteCounts = deleteTarget ? cascadeCountsFor({ schoolId: deleteTarget.id }) : null;

  return (
    <div data-component="schools-page">
      <PageHeader
        title="Data Sekolah"
        description="SINILAI menangani lebih dari satu sekolah. Setiap sekolah memiliki kelas, mata pelajaran, komponen penilaian, siswa, dan nilainya sendiri."
        action={
          <Button icon={Plus} onClick={openCreate}>
            Tambah Sekolah
          </Button>
        }
      />

      <FilterBar className="mb-4">
        <FilterField label="Cari" className="min-w-[260px] flex-1">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Cari nama sekolah, NPSN, atau alamat…"
            label="Cari sekolah"
          />
        </FilterField>
        <p className="ml-auto text-body-sm text-muted-foreground">
          {formatNumber(rows.length)} dari {formatNumber(schools.length)} sekolah
        </p>
      </FilterBar>

      {schools.length === 0 ? (
        <Card>
          <EmptyState
            icon={School}
            title="Belum ada sekolah"
            description="Tambahkan sekolah pertama. Mata pelajaran umum dan komponen penilaian (Penilaian Harian 1 & 2, UTS, UAS) akan dibuat otomatis agar Anda bisa langsung menginput nilai."
            action={
              <Button icon={Plus} onClick={openCreate}>
                Tambah Sekolah
              </Button>
            }
          />
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={Inbox}
            title="Tidak ada sekolah yang cocok"
            description={`Tidak ada sekolah yang cocok dengan pencarian "${query}".`}
            action={
              <Button variant="secondary" onClick={() => setQuery('')}>
                Hapus pencarian
              </Button>
            }
          />
        </Card>
      ) : (
        <TableShell>
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr>
                <Th>Nama Sekolah</Th>
                <Th>NPSN</Th>
                <Th>Kepala Sekolah</Th>
                <Th>Tahun Ajaran</Th>
                <Th align="right">Kelas</Th>
                <Th align="right">Siswa</Th>
                <Th align="right">Aksi</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((school) => (
                <tr key={school.id} className="border-t border-border hover:bg-accent">
                  <Td className="">
                    <span className="font-medium">{school.name}</span>
                    {school.address ? (
                      <span className="mt-0.5 block max-w-[28ch] truncate text-body-sm text-muted-foreground">
                        {school.address}
                      </span>
                    ) : null}
                  </Td>
                  <Td muted>{school.npsn || '—'}</Td>
                  <Td muted>{school.headmaster || '—'}</Td>
                  <Td muted>{school.academicYear || '—'}</Td>
                  <Td align="right">{formatNumber(school.classCount)}</Td>
                  <Td align="right">{formatNumber(school.studentCount)}</Td>
                  <Td align="right">
                    <span className="flex justify-end gap-1">
                      <IconButton label={`Ubah ${school.name}`} icon={Pencil} onClick={() => openEdit(school)} />
                      <IconButton
                        label={`Hapus ${school.name}`}
                        icon={Trash2}
                        tone="danger"
                        onClick={() => setDeleteTarget(school)}
                      />
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      )}

      <Card className="mt-6">
        <CardHeader
          title="Catatan tentang penghapusan"
          description="Menghapus sekolah juga menghapus kelas, mata pelajaran, siswa, dan seluruh nilainya. Jumlah yang terpengaruh selalu ditampilkan lebih dulu sebelum Anda mengonfirmasi. Untuk menyimpan cadangan, gunakan menu Pengaturan."
        />
      </Card>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? 'Ubah Sekolah' : 'Tambah Sekolah'}
        description={
          editing
            ? 'Perbarui identitas sekolah. Perubahan berlaku untuk semua data di dalamnya.'
            : 'Mata pelajaran umum dan komponen penilaian bawaan akan dibuat otomatis setelah sekolah disimpan.'
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" form="school-form" disabled={busy}>
              {busy ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </>
        }
      >
        <form id="school-form" onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Field label="Nama Sekolah" htmlFor="school-name" required error={errors.name}>
            <TextInput
              id="school-name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              onBlur={validate}
              placeholder="Contoh: SMP Negeri 1 Bandung"
              invalid={Boolean(errors.name)}
              autoFocus
            />
          </Field>
          <Field
            label="NPSN"
            htmlFor="school-npsn"
            error={errors.npsn}
            helper="Nomor Pokok Sekolah Nasional (6–12 angka), boleh dikosongkan."
          >
            <TextInput
              id="school-npsn"
              value={form.npsn}
              onChange={(event) => setForm({ ...form, npsn: event.target.value })}
              inputMode="numeric"
              invalid={Boolean(errors.npsn)}
            />
          </Field>
          <Field label="Kepala Sekolah" htmlFor="school-headmaster">
            <TextInput
              id="school-headmaster"
              value={form.headmaster}
              onChange={(event) => setForm({ ...form, headmaster: event.target.value })}
              placeholder="Nama kepala sekolah"
            />
          </Field>
          <Field label="Tahun Ajaran" htmlFor="school-year" helper="Contoh format: 2026/2027">
            <TextInput
              id="school-year"
              value={form.academicYear}
              onChange={(event) => setForm({ ...form, academicYear: event.target.value })}
              placeholder="2026/2027"
            />
          </Field>
          <Field label="Alamat" htmlFor="school-address">
            <TextArea
              id="school-address"
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
              placeholder="Alamat sekolah (opsional)"
            />
          </Field>
        </form>
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        busy={busy}
        title="Hapus sekolah ini?"
        message={`Sekolah "${deleteTarget?.name || ''}" akan dihapus permanen.`}
        detail={
          deleteCounts
            ? `Ikut terhapus: ${formatNumber(deleteCounts.classes)} kelas, ${formatNumber(
                deleteCounts.subjects,
              )} mata pelajaran, ${formatNumber(deleteCounts.students)} siswa, dan ${formatNumber(
                deleteCounts.grades,
              )} nilai. Tindakan ini tidak dapat dibatalkan.`
            : ''
        }
        confirmLabel="Hapus Sekolah"
      />
    </div>
  );
}
