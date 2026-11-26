/**
 * Excel (SheetJS) import/export. Runs entirely in the browser from local data —
 * nothing is uploaded anywhere.
 */
import * as XLSX from 'xlsx';
import { normalizeSpaces, toTitleCase } from './format';

export const IMPORT_FIELDS = [
  { key: 'nis', label: 'NIS', required: false },
  { key: 'nisn', label: 'NISN', required: false },
  { key: 'name', label: 'Nama Lengkap', required: true },
  { key: 'gender', label: 'Jenis Kelamin', required: false },
  { key: 'className', label: 'Kelas', required: false },
];

const HEADER_ALIASES = {
  nis: ['nis', 'no induk', 'nomor induk', 'induk siswa', 'nis siswa'],
  nisn: ['nisn', 'nomor induk nasional'],
  name: ['nama lengkap', 'nama siswa', 'nama peserta didik', 'nama'],
  gender: ['jenis kelamin', 'jk', 'l/p', 'gender', 'sex'],
  className: ['kelas', 'rombel', 'rombongan belajar', 'class'],
};

function normalizeHeader(value) {
  return normalizeSpaces(value).toLowerCase().replace(/[._]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Auto-detect a column per field; the UI lets the user override every choice. */
export function detectColumnMapping(headers) {
  const normalized = headers.map(normalizeHeader);
  const mapping = {};

  Object.entries(HEADER_ALIASES).forEach(([field, aliases]) => {
    let index = -1;
    for (const alias of aliases) {
      const found = normalized.findIndex((header) => header === alias);
      if (found >= 0) {
        index = found;
        break;
      }
    }
    if (index < 0) {
      for (const alias of aliases) {
        const found = normalized.findIndex((header) => {
          if (!header.includes(alias)) return false;
          // "nis" must never swallow the "nisn" column.
          if (field === 'nis' && header === 'nisn') return false;
          return true;
        });
        if (found >= 0) {
          index = found;
          break;
        }
      }
    }
    mapping[field] = index >= 0 ? index : '';
  });

  return mapping;
}

export async function readStudentSheet(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { headers: [], rows: [], sheetName: '' };
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    blankrows: false,
    defval: '',
    raw: false,
  });
  if (matrix.length === 0) return { headers: [], rows: [], sheetName };
  const headers = matrix[0].map((cell) => normalizeSpaces(cell));
  const rows = matrix
    .slice(1)
    .map((row, index) => ({ sourceRow: index + 2, cells: row }))
    .filter((row) => row.cells.some((cell) => normalizeSpaces(cell) !== ''));
  return { headers, rows, sheetName };
}

export function normalizeGender(value) {
  const text = normalizeSpaces(value).toLowerCase();
  if (!text) return '';
  if (['l', 'lk', 'laki-laki', 'laki laki', 'laki2', 'putra', 'male', 'm'].includes(text)) return 'L';
  if (['p', 'pr', 'perempuan', 'putri', 'female', 'f'].includes(text)) return 'P';
  if (text.startsWith('l')) return 'L';
  if (text.startsWith('p')) return 'P';
  return null;
}

function cellAt(cells, index) {
  if (index === '' || index === null || index === undefined) return '';
  return normalizeSpaces(cells[index]);
}

/**
 * Validate and shape imported rows against the selected school.
 * Returns ready-to-save student records plus a per-row report; nothing is
 * written here, so the user always reviews the result before importing.
 */
export function buildStudentImport({ rows, mapping, schoolId, classes, students, autoCreateClass }) {
  const errors = [];
  const warnings = [];
  const records = [];
  const newClasses = [];
  const seen = new Map();

  const classByName = new Map(classes.map((klass) => [klass.name.toLowerCase(), klass]));

  rows.forEach(({ sourceRow, cells }) => {
    const nis = cellAt(cells, mapping.nis);
    const name = cellAt(cells, mapping.name);
    const nisn = cellAt(cells, mapping.nisn);
    const rawGender = cellAt(cells, mapping.gender);
    const rawClass = cellAt(cells, mapping.className);

    if (!name) {
      errors.push({ row: sourceRow, message: 'Nama siswa kosong — baris dilewati.' });
      return;
    }
    // NIS is optional. Without it the row is matched by student name instead, so
    // a school that issues no student number can still import and update data.
    const displayName = toTitleCase(name);
    const matchKey = nis ? `nis:${nis.toLowerCase()}` : `nama:${displayName.toLowerCase()}`;
    if (seen.has(matchKey)) {
      errors.push({
        row: sourceRow,
        message: nis
          ? `NIS ${nis} ganda di dalam berkas (sudah ada di baris ${seen.get(matchKey)}).`
          : `Nama "${displayName}" ganda di dalam berkas (sudah ada di baris ${seen.get(matchKey)}).`,
      });
      return;
    }
    seen.set(matchKey, sourceRow);

    const gender = normalizeGender(rawGender);
    if (gender === null) {
      warnings.push({
        row: sourceRow,
        message: `Jenis kelamin "${rawGender}" tidak dikenali — dikosongkan.`,
      });
    }

    let classId = '';
    if (rawClass) {
      const found = classByName.get(rawClass.toLowerCase());
      if (found) {
        classId = found.id;
      } else if (autoCreateClass) {
        newClasses.push({ name: rawClass, schoolId });
        classId = `__new__${rawClass.toLowerCase()}`;
        classByName.set(rawClass.toLowerCase(), { id: classId, name: rawClass });
      } else {
        warnings.push({
          row: sourceRow,
          message: `Kelas "${rawClass}" belum ada di sekolah ini — siswa diimpor tanpa kelas.`,
        });
      }
    }

    const existing = nis
      ? students.find((student) => student.nis === nis)
      : students.find((student) => student.name.toLowerCase() === displayName.toLowerCase());

    records.push({
      id: existing ? existing.id : undefined,
      schoolId,
      classId,
      nis: nis || (existing ? existing.nis : ''),
      nisn,
      name: displayName,
      gender: gender || '',
      status: existing ? existing.status : 'aktif',
      isUpdate: Boolean(existing),
      sourceRow,
    });
  });

  const added = records.filter((record) => !record.isUpdate).length;
  const updated = records.filter((record) => record.isUpdate).length;

  return {
    records,
    newClasses,
    errors,
    warnings,
    summary: {
      totalRows: rows.length,
      added,
      updated,
      skipped: rows.length - records.length,
    },
  };
}

/**
 * Hand a generated file to the user.
 *
 * In a browser this is an ordinary download. Inside the packaged Android app,
 * blob downloads are not supported by the system WebView, so the file is passed
 * to a small native bridge that stores it and opens the share sheet — from there
 * the teacher can save it, send it, or open it in Excel.
 */
function download(blob, filename) {
  const bridge = typeof window !== 'undefined' ? window.AndroidSimpan : null;
  if (bridge && typeof bridge.simpanDanBagikan === 'function') {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result || '').split(',')[1] || '';
      try {
        bridge.simpanDanBagikan(filename, base64);
      } catch {
        /* the app keeps working; the file can still be exported from the web version */
      }
    };
    reader.readAsDataURL(blob);
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function writeWorkbook(workbook, filename) {
  const output = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  download(
    new Blob([output], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename,
  );
}

export function downloadStudentTemplate() {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ['NIS', 'NISN', 'Nama Lengkap', 'Jenis Kelamin', 'Kelas'],
    ['2024001', '0091234567', 'Ahmad Fauzi', 'L', 'VII A'],
    ['2024002', '0091234568', 'Siti Aminah', 'P', 'VII A'],
  ]);
  sheet['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 30 }, { wch: 16 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(workbook, sheet, 'Siswa');

  const guide = XLSX.utils.aoa_to_sheet([
    ['Petunjuk pengisian template impor siswa'],
    [''],
    ['1. Isi satu baris untuk setiap siswa. Jangan mengubah baris judul kolom (baris 1).'],
    ['2. Nama Lengkap wajib diisi.'],
    ['3. NIS opsional — boleh dikosongkan bila sekolah tidak memakai nomor induk siswa.'],
    ['4. Bila NIS diisi, NIS harus unik di dalam sekolah yang dipilih.'],
    ['5. Jenis Kelamin: tulis L untuk laki-laki atau P untuk perempuan (boleh dikosongkan).'],
    ['6. Kelas: tulis nama kelas, misalnya "VII A". Jika kelas belum ada, aplikasi dapat membuatnya otomatis.'],
    ['7. Baris contoh (baris 2 dan 3) boleh dihapus sebelum berkas diunggah.'],
    ['8. Pencocokan data: baris dengan NIS yang sudah ada akan memperbarui siswa tersebut.'],
    ['   Baris tanpa NIS dicocokkan berdasarkan nama lengkap.'],
  ]);
  guide['!cols'] = [{ wch: 100 }];
  XLSX.utils.book_append_sheet(workbook, guide, 'Petunjuk');

  writeWorkbook(workbook, 'template-impor-siswa.xlsx');
}

export function exportStudents({ schoolName, className, students }) {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ['NIS', 'NISN', 'Nama Lengkap', 'Jenis Kelamin', 'Kelas', 'Status'],
    ...students.map((student) => [
      student.nis,
      student.nisn,
      student.name,
      student.gender === 'L' ? 'Laki-laki' : student.gender === 'P' ? 'Perempuan' : '',
      student.classLabel || '',
      student.status === 'aktif' ? 'Aktif' : 'Nonaktif',
    ]),
  ]);
  sheet['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 30 }, { wch: 16 }, { wch: 12 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(workbook, sheet, 'Siswa');
  writeWorkbook(
    workbook,
    `daftar-siswa-${(schoolName || 'sekolah').toLowerCase().replace(/\s+/g, '-')}${
      className ? `-${className.toLowerCase().replace(/\s+/g, '-')}` : ''
    }.xlsx`,
  );
}

export function exportRecap({
  schoolName,
  className,
  subjectName,
  components,
  rows,
  average,
  kkm,
  nilaiLabel = 'Nilai Akhir',
  scopeTitle = '',
}) {
  const workbook = XLSX.utils.book_new();
  const header = ['No', 'NIS', 'Nama Siswa', ...components.map((c) => c.code), nilaiLabel, 'Predikat'];
  const body = rows.map((row, index) => [
    index + 1,
    row.student.nis,
    row.student.name,
    ...components.map((c) => (typeof row.scores[c.id] === 'number' ? row.scores[c.id] : '')),
    row.na === null ? '' : row.na,
    row.predikat || '',
  ]);
  const averageRow = [
    '',
    '',
    'Rata-rata kelas',
    ...components.map((_, i) => average?.perComponent?.[i] ?? ''),
    average?.na ?? '',
    '',
  ];
  const sheet = XLSX.utils.aoa_to_sheet([header, ...body, averageRow]);
  sheet['!cols'] = [{ wch: 4 }, { wch: 12 }, { wch: 28 }, ...components.map(() => ({ wch: 10 })), { wch: 12 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(workbook, sheet, 'Rekap Nilai');

  const info = XLSX.utils.aoa_to_sheet([
    ['Rekap Nilai'],
    ['Sekolah', schoolName || ''],
    ['Kelas', className || ''],
    ['Mata Pelajaran', subjectName || ''],
    ['KKM', kkm ?? ''],
    ...(scopeTitle ? [['Cakupan penilaian', scopeTitle]] : []),
    [
      'Komponen penilaian',
      components
        .map(
          (c) =>
            `${c.code} (${c.weight}%)${c.date ? ` — ${c.date}` : ''}${c.note ? ` — ${c.note}` : ''}`,
        )
        .join(', '),
    ],
    [
      nilaiLabel,
      `Σ(skor × bobot) ÷ Σ(bobot) atas komponen ${scopeTitle || 'seluruh penilaian'} yang sudah ada nilainya`,
    ],
  ]);
  info['!cols'] = [{ wch: 22 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(workbook, info, 'Keterangan');

  writeWorkbook(
    workbook,
    `rekap-${(className || 'kelas').toLowerCase().replace(/\s+/g, '-')}-${(subjectName || 'mapel')
      .toLowerCase()
      .replace(/\s+/g, '-')}.xlsx`,
  );
}

export function exportStudentReport({
  student,
  className,
  schoolName,
  rows,
  average,
  thresholds,
  nilaiLabel = 'Nilai Akhir',
  scopeTitle = '',
}) {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Laporan Nilai Siswa'],
    ['Sekolah', schoolName || ''],
    ['Kelas', className || ''],
    ['NIS', student.nis || '—'],
    ['Nama', student.name],
    ...(scopeTitle ? [['Cakupan penilaian', scopeTitle]] : []),
    [''],
    ['No', 'Mata Pelajaran', nilaiLabel, 'Predikat', 'KKM', 'Keterangan'],
    ...rows.map((row, index) => [
      index + 1,
      row.subjectName,
      row.na === null ? '' : row.na,
      row.predikat || '',
      row.kkm || '',
      row.na === null ? 'Belum ada nilai' : row.na < row.kkm ? 'Di bawah KKM' : 'Tuntas',
    ]),
    ['', 'Rata-rata', average === null ? '' : average],
    [''],
    ['Ambang predikat', `A ≥ ${thresholds.A}, B ≥ ${thresholds.B}, C ≥ ${thresholds.C}, D < ${thresholds.C}`],
  ]);
  sheet['!cols'] = [{ wch: 4 }, { wch: 34 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(workbook, sheet, 'Laporan');
  writeWorkbook(
    workbook,
    `laporan-${student.nis || 'tanpa-nis'}-${student.name.toLowerCase().replace(/\s+/g, '-')}.xlsx`,
  );
}

export function exportJsonBackup(data) {
  download(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    `cadangan-sinilai-${new Date().toISOString().slice(0, 10)}.json`,
  );
}

export function readTextFile(file) {
  return file.text();
}
