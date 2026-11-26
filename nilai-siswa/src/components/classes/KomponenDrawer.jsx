/**
 * Panel daftar komponen penilaian satu kelas: PH, UTS, UAS.
 *
 * Setiap komponen milik kelas ini saja, jadi jumlah PH di kelas 7 bisa berbeda
 * dengan kelas 8. Tiap komponen menyimpan tanggal penilaian dan catatan materi
 * agar guru tahu kapan nilai diinput dan tentang apa.
 */
import { useState } from 'react';
import { ListChecks, Pencil, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../../store/AppStore';
import { Button, IconButton } from '../ui/Button';
import { ConfirmDialog, Drawer } from '../ui/Overlay';
import { Field, Select, TextInput } from '../ui/Field';
import { EmptyState, TableShell, Td, Th } from '../ui/Bits';
import { ASSESSMENT_TYPES, assessmentTypeLabel } from '../../lib/grading';
import { formatNumber } from '../../lib/format';
import { useToast } from '../ui/Toast';

const KOSONG = {
  id: '',
  subjectId: '',
  code: '',
  label: '',
  type: 'harian',
  weight: '20',
  date: '',
  note: '',
};

export default function KomponenDrawer({ kelas, onClose }) {
  const { componentsByClass, subjects, saveComponent, deleteComponent } = useApp();
  const toast = useToast();
  const [form, setForm] = useState(KOSONG);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [hapus, setHapus] = useState(null);

  const komponen = kelas ? componentsByClass[kelas.id] || [] : [];
  const mapelSekolah = kelas ? subjects.filter((item) => item.schoolId === kelas.schoolId) : [];
  const mapelById = Object.fromEntries(mapelSekolah.map((item) => [item.id, item]));
  const menyunting = Boolean(form.id);

  function mulaiTambah() {
    setForm({ ...KOSONG, subjectId: mapelSekolah[0]?.id || '' });
    setErrors({});
  }

  function mulaiUbah(item) {
    setForm({
      id: item.id,
      subjectId: item.subjectId || '',
      code: item.code,
      label: item.label,
      type: item.type || 'harian',
      weight: String(item.weight ?? ''),
      date: item.date || '',
      note: item.note || '',
    });
    setErrors({});
  }

  function validasi() {
    const next = {};
    const kode = form.code.trim().toUpperCase();
    if (!form.subjectId) next.subjectId = 'Pilih mata pelajaran terlebih dahulu.';
    if (!kode) next.code = 'Kode wajib diisi, misalnya PH2.';
    const kembar = komponen.find(
      (item) =>
        item.id !== form.id &&
        item.subjectId === form.subjectId &&
        item.code.trim().toUpperCase() === kode,
    );
    if (kembar && kode) {
      next.code = `Kode ${kode} sudah dipakai pada mata pelajaran ini.`;
    }
    const bobot = Number(form.weight);
    if (Number.isNaN(bobot) || bobot < 0 || bobot > 100) next.weight = 'Bobot berupa angka 0–100.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function simpan(event) {
    event.preventDefault();
    if (!validasi()) return;
    setBusy(true);
    try {
      await saveComponent({
        id: form.id || undefined,
        classId: kelas.id,
        schoolId: kelas.schoolId,
        subjectId: form.subjectId,
        code: form.code,
        label: form.label || form.code,
        type: form.type,
        weight: Number(form.weight) || 0,
        date: form.date,
        note: form.note,
      });
      toast.success(
        menyunting ? 'Komponen diperbarui' : 'Komponen ditambahkan',
        `${form.code.trim().toUpperCase()} tersimpan pada kelas ${kelas.name}.`,
      );
      setForm(KOSONG);
    } catch (error) {
      toast.error('Gagal menyimpan komponen', error?.message || 'Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  async function hapusKomponen() {
    if (!hapus) return;
    setBusy(true);
    try {
      const hasil = await deleteComponent(hapus.id);
      toast.success(
        'Komponen dihapus',
        `${hapus.code} dihapus${hasil.grades > 0 ? ` beserta ${formatNumber(hasil.grades)} nilai` : ''}.`,
      );
      setHapus(null);
      if (form.id === hapus.id) setForm(KOSONG);
    } catch (error) {
      toast.error('Gagal menghapus komponen', error?.message || 'Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Drawer
        open={Boolean(kelas)}
        onClose={onClose}
        title={`Komponen penilaian — ${kelas?.name || ''}`}
        description={`Daftar penilaian untuk kelas ini saja. Kelas lain memiliki komponennya sendiri. Total bobot sekarang ${formatNumber(
          komponen.reduce((total, item) => total + (Number(item.weight) || 0), 0),
        )}%.`}
        footer={
          <span className="flex w-full items-center justify-between gap-3">
            <span className="text-body-sm text-muted-foreground">
              {formatNumber(komponen.length)} komponen
            </span>
            <Button variant="subtle" onClick={onClose}>
              Tutup
            </Button>
          </span>
        }
      >
        <div className="space-y-6">
          <form onSubmit={simpan} className="rounded-md border border-border p-4" noValidate>
            <p className="mb-3 text-label-caps uppercase text-muted-foreground">
              {menyunting ? `Ubah ${form.code}` : 'Tambah komponen'}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Mata pelajaran"
                htmlFor="komponen-mapel"
                required
                error={errors.subjectId}
                helper="Komponen hanya berlaku untuk mapel ini."
              >
                <Select
                  id="komponen-mapel"
                  value={form.subjectId}
                  onChange={(event) => setForm({ ...form, subjectId: event.target.value })}
                  invalid={Boolean(errors.subjectId)}
                >
                  <option value="">Pilih mata pelajaran…</option>
                  {mapelSekolah.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.code} — {subject.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Kode" htmlFor="komponen-kode" required error={errors.code}>
                <TextInput
                  id="komponen-kode"
                  value={form.code}
                  onChange={(event) =>
                    setForm({ ...form, code: event.target.value.toUpperCase() })
                  }
                  placeholder="PH2"
                  invalid={Boolean(errors.code)}
                />
              </Field>
              <Field label="Nama penilaian" htmlFor="komponen-nama">
                <TextInput
                  id="komponen-nama"
                  value={form.label}
                  onChange={(event) => setForm({ ...form, label: event.target.value })}
                  placeholder="Penilaian Harian 2"
                />
              </Field>
              <Field label="Jenis" htmlFor="komponen-jenis">
                <Select
                  id="komponen-jenis"
                  value={form.type}
                  onChange={(event) => setForm({ ...form, type: event.target.value })}
                >
                  {ASSESSMENT_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Bobot (%)"
                htmlFor="komponen-bobot"
                error={errors.weight}
                helper="Perbandingan bobot antar komponen, misalnya PH 20 dan UAS 30."
              >
                <TextInput
                  id="komponen-bobot"
                  value={form.weight}
                  onChange={(event) => setForm({ ...form, weight: event.target.value })}
                  inputMode="numeric"
                  invalid={Boolean(errors.weight)}
                />
              </Field>
              <Field
                label="Tanggal penilaian"
                htmlFor="komponen-tanggal"
                helper="Kapan penilaian ini dilaksanakan."
              >
                <TextInput
                  id="komponen-tanggal"
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm({ ...form, date: event.target.value })}
                />
              </Field>
              <Field
                label="Catatan / materi"
                htmlFor="komponen-catatan"
                helper="Misalnya: pecahan, bab 3, atau ulangan susulan."
              >
                <TextInput
                  id="komponen-catatan"
                  value={form.note}
                  onChange={(event) => setForm({ ...form, note: event.target.value })}
                  placeholder="Bab 3 — pecahan"
                />
              </Field>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button type="submit" icon={menyunting ? Pencil : Plus} disabled={busy}>
                {menyunting ? 'Simpan perubahan' : 'Tambah komponen'}
              </Button>
              {menyunting ? (
                <Button type="button" variant="ghost" onClick={mulaiTambah}>
                  Batal ubah
                </Button>
              ) : null}
            </div>
          </form>

          {komponen.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title="Belum ada komponen"
              description="Tambahkan PH, UTS, atau UAS untuk kelas ini melalui formulir di atas."
            />
          ) : (
            <TableShell>
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr>
                    <Th>Kode</Th>
                    <Th>Mata Pelajaran</Th>
                    <Th>Nama</Th>
                    <Th>Jenis</Th>
                    <Th align="right">Bobot</Th>
                    <Th>Tanggal</Th>
                    <Th>Catatan</Th>
                    <Th align="right">Aksi</Th>
                  </tr>
                </thead>
                <tbody>
                  {komponen.map((item) => (
                    <tr key={item.id} className="border-t border-border">
                      <Td className="font-medium">{item.code}</Td>
                      <Td muted>{mapelById[item.subjectId]?.code || '—'}</Td>
                      <Td muted>{item.label || '—'}</Td>
                      <Td muted>{assessmentTypeLabel(item.type)}</Td>
                      <Td align="right">{item.weight || 0}%</Td>
                      <Td muted>{item.date ? item.date.split('-').reverse().join('/') : '—'}</Td>
                      <Td muted>{item.note || '—'}</Td>
                      <Td align="right">
                        <span className="flex justify-end gap-1">
                          <IconButton
                            label={`Ubah ${item.code}`}
                            icon={Pencil}
                            onClick={() => mulaiUbah(item)}
                          />
                          <IconButton
                            label={`Hapus ${item.code}`}
                            icon={Trash2}
                            tone="danger"
                            onClick={() => setHapus(item)}
                          />
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableShell>
          )}
        </div>
      </Drawer>

      <ConfirmDialog
        open={Boolean(hapus)}
        onClose={() => setHapus(null)}
        onConfirm={hapusKomponen}
        busy={busy}
        title="Hapus komponen ini?"
        message={`${hapus?.code || ''} akan dihapus dari kelas ${kelas?.name || ''}.`}
        detail="Seluruh nilai yang tercatat pada komponen ini ikut terhapus dan tidak dapat dikembalikan."
        confirmLabel="Hapus komponen"
      />
    </>
  );
}
