import { useMemo, useState } from 'react';
import { CircleAlert, Download, FileSpreadsheet, TriangleAlert, Upload } from 'lucide-react';
import { Drawer } from '../ui/Overlay';
import { Button } from '../ui/Button';
import { Field, Select } from '../ui/Field';
import { Badge, TableShell, Td, Th } from '../ui/Bits';
import { useToast } from '../ui/Toast';
import {
  IMPORT_FIELDS,
  buildStudentImport,
  detectColumnMapping,
  downloadStudentTemplate,
  readStudentSheet,
} from '../../lib/excel';
import { formatNumber } from '../../lib/format';

const EMPTY = {
  step: 'file',
  fileName: '',
  headers: [],
  rows: [],
  mapping: {},
};

export function ImportDrawer({ open, onClose, school, classes, students, onImport }) {
  const toast = useToast();
  const [state, setState] = useState(EMPTY);
  const [autoCreateClass, setAutoCreateClass] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  function reset() {
    setState(EMPTY);
    setAutoCreateClass(true);
    setResult(null);
    setBusy(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  const report = useMemo(() => {
    if (state.step === 'file' || state.rows.length === 0 || !school) return null;
    return buildStudentImport({
      rows: state.rows,
      mapping: state.mapping,
      schoolId: school.id,
      classes,
      students,
      autoCreateClass,
    });
  }, [state, school, classes, students, autoCreateClass]);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const sheet = await readStudentSheet(file);
      if (sheet.headers.length === 0 || sheet.rows.length === 0) {
        toast.error(
          'Berkas tidak berisi data',
          'Pastikan baris pertama berisi judul kolom (NIS, Nama, Kelas, …) dan ada minimal satu baris siswa.',
        );
        return;
      }
      setState({
        step: 'map',
        fileName: file.name,
        headers: sheet.headers,
        rows: sheet.rows,
        mapping: detectColumnMapping(sheet.headers),
      });
    } catch (error) {
      toast.error('Gagal membaca berkas', error?.message || 'Format berkas tidak dikenali.');
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  }

  async function handleImport() {
    if (!report || !school) return;
    if (report.records.length === 0) {
      toast.error('Tidak ada baris valid', 'Perbaiki laporan kesalahan lalu unggah ulang berkasnya.');
      return;
    }
    setBusy(true);
    try {
      const imported = await onImport(report);
      setResult({ ...report.summary, ...imported, errors: report.errors, warnings: report.warnings });
      setState((previous) => ({ ...previous, step: 'done' }));
    } catch (error) {
      toast.error('Impor gagal', error?.message || 'Penyimpanan lokal menolak penulisan.');
    } finally {
      setBusy(false);
    }
  }

  const previewRows = report ? report.records.slice(0, 8) : [];

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      title="Impor Siswa dari Excel"
      description={
        school
          ? `Berkas akan dibaca di perangkat ini saja, lalu dimasukkan ke ${school.name}.`
          : 'Pilih sekolah terlebih dahulu pada filter halaman ini.'
      }
      footer={
        state.step === 'file' ? (
          <Button variant="secondary" onClick={handleClose}>
            Tutup
          </Button>
        ) : state.step === 'map' ? (
          <>
            <Button variant="secondary" onClick={reset} disabled={busy}>
              Ganti berkas
            </Button>
            <Button
              onClick={handleImport}
              disabled={busy || !report || report.records.length === 0}
              icon={Upload}
            >
              {busy
                ? 'Mengimpor…'
                : `Impor ${report ? formatNumber(report.records.length) : 0} baris`}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={reset} disabled={busy}>
              Impor berkas lain
            </Button>
            <Button onClick={handleClose}>Selesai</Button>
          </>
        )
      }
    >
      {state.step === 'file' ? (
        <div className="flex flex-col gap-5">
          <div className="rounded-md bg-info-surface px-4 py-3 text-body-sm text-info">
            <p className="font-medium">Kolom yang dikenali</p>
            <p className="mt-1 leading-relaxed">
              Nama Lengkap (wajib) · NIS (opsional) · NISN · Jenis Kelamin · Kelas. Nama kolom boleh
              berbeda — Anda dapat menyesuaikannya di langkah berikutnya.
            </p>
          </div>

          <div className="flex flex-col gap-3 rounded-md border border-dashed border-input px-4 py-6 text-center">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-accent text-primary">
              <FileSpreadsheet size={20} aria-hidden="true" />
            </span>
            <p className="text-body-md font-medium">Pilih berkas Excel (.xlsx) atau .csv</p>
            <p className="text-body-sm text-muted-foreground">
              Berkas tidak diunggah ke internet — semuanya diproses di browser ini.
            </p>
            <label className="mt-2 inline-flex cursor-pointer items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-label-md font-medium text-primary-foreground hover:bg-primary-700">
              <Upload size={17} aria-hidden="true" />
              {busy ? 'Membaca berkas…' : 'Pilih berkas'}
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="sr-only"
                onChange={handleFile}
                disabled={busy || !school}
              />
            </label>
            {!school ? (
              <p className="text-body-sm text-danger" role="alert">
                Pilih sekolah pada filter halaman Siswa sebelum mengimpor.
              </p>
            ) : null}
          </div>

          <Button variant="subtle" icon={Download} onClick={downloadStudentTemplate}>
            Unduh template Excel
          </Button>
        </div>
      ) : null}

      {state.step === 'map' ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="info">{state.fileName}</Badge>
            <span className="text-body-sm text-muted-foreground">
              {formatNumber(state.rows.length)} baris data · {formatNumber(state.headers.length)} kolom
            </span>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-headline-sm">Pemetaan kolom</h3>
            {IMPORT_FIELDS.map((field) => (
              <Field
                key={field.key}
                label={field.label}
                htmlFor={`map-${field.key}`}
                required={field.required}
              >
                <Select
                  id={`map-${field.key}`}
                  value={state.mapping[field.key] ?? ''}
                  onChange={(event) =>
                    setState((previous) => ({
                      ...previous,
                      mapping: {
                        ...previous.mapping,
                        [field.key]: event.target.value === '' ? '' : Number(event.target.value),
                      },
                    }))
                  }
                >
                  <option value="">— tidak dipakai —</option>
                  {state.headers.map((header, index) => (
                    <option key={`${header}-${index}`} value={index}>
                      {header || `Kolom ${index + 1}`}
                    </option>
                  ))}
                </Select>
              </Field>
            ))}
          </div>

          <label className="flex items-start gap-2.5 rounded-md border border-border px-3 py-2.5">
            <input
              type="checkbox"
              checked={autoCreateClass}
              onChange={(event) => setAutoCreateClass(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
            />
            <span className="text-body-sm">
              <span className="font-medium">Buat kelas otomatis</span> bila nama kelas pada berkas belum
              ada di sekolah ini.
            </span>
          </label>

          {report ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-md bg-success-surface px-3 py-2.5">
                  <p className="text-label-caps uppercase text-success">Baru</p>
                  <p className="tnum mt-1 text-numeric-md text-success">
                    {formatNumber(report.summary.added)}
                  </p>
                </div>
                <div className="rounded-md bg-accent px-3 py-2.5">
                  <p className="text-label-caps uppercase text-accent-foreground">Diperbarui</p>
                  <p className="tnum mt-1 text-numeric-md text-accent-foreground">
                    {formatNumber(report.summary.updated)}
                  </p>
                </div>
                <div className="rounded-md bg-danger-surface px-3 py-2.5">
                  <p className="text-label-caps uppercase text-danger">Dilewati</p>
                  <p className="tnum mt-1 text-numeric-md text-danger">
                    {formatNumber(report.summary.skipped)}
                  </p>
                </div>
              </div>

              {report.newClasses.length > 0 ? (
                <p className="rounded-md bg-info-surface px-4 py-2.5 text-body-sm text-info">
                  Kelas baru yang akan dibuat: {report.newClasses.map((item) => item.name).join(', ')}
                </p>
              ) : null}

              <div>
                <h3 className="mb-2 text-headline-sm">Pratinjau data</h3>
                <TableShell>
                  <table className="w-full min-w-[420px] border-collapse">
                    <thead>
                      <tr>
                        <Th>NIS</Th>
                        <Th>Nama</Th>
                        <Th>JK</Th>
                        <Th>Kelas</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((record) => (
                        <tr key={`${record.sourceRow}`} className="border-t border-border">
                          <Td>{record.nis || '—'}</Td>
                          <Td>{record.name}</Td>
                          <Td muted>{record.gender || '—'}</Td>
                          <Td muted>
                            {record.classId && record.classId.startsWith('__new__')
                              ? `${record.classId.replace('__new__', '')} (baru)`
                              : classes.find((klass) => klass.id === record.classId)?.name || '—'}
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableShell>
                {report.records.length > previewRows.length ? (
                  <p className="mt-2 text-body-sm text-muted-foreground">
                    Menampilkan {formatNumber(previewRows.length)} baris pertama dari{' '}
                    {formatNumber(report.records.length)} baris valid.
                  </p>
                ) : null}
              </div>

              {report.errors.length > 0 ? (
                <div className="rounded-md bg-danger-surface px-4 py-3 text-danger">
                  <p className="flex items-center gap-2 text-label-md font-medium">
                    <CircleAlert size={16} aria-hidden="true" />
                    {formatNumber(report.errors.length)} baris bermasalah
                  </p>
                  <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-body-sm">
                    {report.errors.slice(0, 30).map((error) => (
                      <li key={`${error.row}-${error.message}`}>
                        Baris {error.row}: {error.message}
                      </li>
                    ))}
                  </ul>
                  {report.errors.length > 30 ? (
                    <p className="mt-1 text-body-sm">
                      …dan {formatNumber(report.errors.length - 30)} baris lainnya.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {report.warnings.length > 0 ? (
                <div className="rounded-md bg-warning-surface px-4 py-3 text-warning">
                  <p className="flex items-center gap-2 text-label-md font-medium">
                    <TriangleAlert size={16} aria-hidden="true" />
                    {formatNumber(report.warnings.length)} peringatan
                  </p>
                  <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-body-sm">
                    {report.warnings.slice(0, 20).map((warning) => (
                      <li key={`${warning.row}-${warning.message}`}>
                        Baris {warning.row}: {warning.message}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}

      {state.step === 'done' && result ? (
        <div className="flex flex-col gap-5">
          <div className="rounded-md bg-success-surface px-4 py-4 text-success">
            <p className="text-headline-sm">Impor selesai</p>
            <p className="mt-1 text-body-sm">
              {formatNumber(result.added)} siswa baru ditambahkan, {formatNumber(result.updated)} siswa
              diperbarui, {formatNumber(result.skipped)} baris dilewati
              {result.classes > 0 ? `, ${formatNumber(result.classes)} kelas baru dibuat` : ''}.
            </p>
          </div>

          {result.errors.length > 0 ? (
            <div className="rounded-md bg-danger-surface px-4 py-3 text-danger">
              <p className="text-label-md font-medium">Baris yang dilewati</p>
              <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-body-sm">
                {result.errors.map((error) => (
                  <li key={`${error.row}-${error.message}`}>
                    Baris {error.row}: {error.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="text-body-sm text-muted-foreground">
            Data tersimpan di perangkat ini. Anda dapat memeriksa hasilnya pada tabel siswa, lalu
            melanjutkan ke menu Input Nilai.
          </p>
        </div>
      ) : null}
    </Drawer>
  );
}
