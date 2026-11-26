/**
 * Data adapter boundary: entity factories, defaults, cascade accounting and
 * backup/restore serialisation. Components consume normalised records from here
 * instead of embedding storage concerns.
 */
import { uid, normalizeSpaces, toTitleCase, parseGradeLevel } from './format';
import { DEFAULT_PREDIKAT } from './grading';

export const DEFAULT_SUBJECTS = [
  { code: 'PAI', name: 'Pendidikan Agama dan Budi Pekerti', kkm: 75 },
  { code: 'PPKN', name: 'Pendidikan Pancasila dan Kewarganegaraan', kkm: 75 },
  { code: 'BIND', name: 'Bahasa Indonesia', kkm: 75 },
  { code: 'MTK', name: 'Matematika', kkm: 70 },
  { code: 'IPA', name: 'Ilmu Pengetahuan Alam', kkm: 72 },
  { code: 'IPS', name: 'Ilmu Pengetahuan Sosial', kkm: 72 },
  { code: 'BING', name: 'Bahasa Inggris', kkm: 70 },
  { code: 'PJOK', name: 'Pendidikan Jasmani, Olahraga dan Kesehatan', kkm: 75 },
  { code: 'SENI', name: 'Seni Budaya', kkm: 75 },
  { code: 'INF', name: 'Informatika', kkm: 72 },
];

/**
 * Komponen bawaan untuk kelas baru. Setiap kelas memulai dengan satu PH, UTS,
 * dan UAS; guru menambah PH berikutnya di kelas masing-masing karena jumlah
 * penilaian tiap kelas berbeda.
 */
export const DEFAULT_COMPONENTS = [
  { code: 'PH1', label: 'Penilaian Harian 1', type: 'harian', weight: 40 },
  { code: 'UTS', label: 'Ujian Tengah Semester', type: 'uts', weight: 30 },
  { code: 'UAS', label: 'Ujian Akhir Semester', type: 'uas', weight: 30 },
];

export const GENDER_OPTIONS = [
  { value: 'L', label: 'Laki-laki' },
  { value: 'P', label: 'Perempuan' },
];

export const STATUS_OPTIONS = [
  { value: 'aktif', label: 'Aktif' },
  { value: 'nonaktif', label: 'Nonaktif' },
];

export function genderLabel(value) {
  const found = GENDER_OPTIONS.find((o) => o.value === value);
  return found ? found.label : '—';
}

export const DEFAULT_KKM = 75;

export function defaultSettings() {
  return {
    key: 'app',
    activeAcademicYear: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
    predikat: { ...DEFAULT_PREDIKAT },
    defaultKkm: DEFAULT_KKM,
  };
}

export function makeSchool(input, index = 0) {
  return {
    id: input.id || uid('sch'),
    name: normalizeSpaces(input.name),
    npsn: normalizeSpaces(input.npsn),
    address: normalizeSpaces(input.address),
    headmaster: toTitleCase(input.headmaster || ''),
    academicYear: normalizeSpaces(input.academicYear) || defaultSettings().activeAcademicYear,
    createdAt: input.createdAt || new Date().toISOString(),
    order: index,
  };
}

export function makeSubject(input, index = 0) {
  return {
    id: input.id || uid('sub'),
    schoolId: input.schoolId,
    code: normalizeSpaces(input.code).toUpperCase(),
    name: normalizeSpaces(input.name),
    kkm: Number(input.kkm) || 0,
    createdAt: input.createdAt || new Date().toISOString(),
    order: index,
  };
}

export function makeComponent(input, index = 0) {
  return {
    id: input.id || uid('cmp'),
    // Komponen penilaian dimiliki satu kelas, bukan satu sekolah.
    classId: input.classId || '',
    subjectId: input.subjectId || '',
    schoolId: input.schoolId,
    code: normalizeSpaces(input.code).toUpperCase(),
    label: normalizeSpaces(input.label),
    type: input.type || 'harian',
    weight: Number(input.weight) || 0,
    // Kapan penilaian dilakukan dan tentang apa (materi/catatan guru).
    date: normalizeSpaces(input.date || ''),
    note: normalizeSpaces(input.note || ''),
    order: index,
  };
}

export function makeClass(input, index = 0) {
  return {
    id: input.id || uid('cls'),
    schoolId: input.schoolId,
    name: normalizeSpaces(input.name),
    gradeLevel: normalizeSpaces(input.gradeLevel) || parseGradeLevel(input.name),
    homeroom: toTitleCase(input.homeroom || ''),
    academicYear: normalizeSpaces(input.academicYear),
    createdAt: input.createdAt || new Date().toISOString(),
    order: index,
  };
}

export function makeStudent(input) {
  return {
    id: input.id || uid('std'),
    schoolId: input.schoolId,
    classId: input.classId || '',
    subjectId: input.subjectId || '',
    nis: normalizeSpaces(input.nis),
    nisn: normalizeSpaces(input.nisn),
    name: toTitleCase(input.name),
    gender: input.gender === 'P' ? 'P' : input.gender === 'L' ? 'L' : '',
    status: input.status === 'nonaktif' ? 'nonaktif' : 'aktif',
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function makeGrade({ schoolId, classId, studentId, subjectId, componentId, score }) {
  return {
    id: `${studentId}::${subjectId}::${componentId}`,
    schoolId,
    classId,
    studentId,
    subjectId,
    componentId,
    score,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Subjects seeded for a brand-new school. When the user has set a default KKM in
 * Settings it is applied to every seeded subject; otherwise each subject keeps
 * its own built-in KKM.
 */
export function seedSubjectsFor(schoolId, defaultKkm = 0) {
  const uniform = Number(defaultKkm) > 0 ? Number(defaultKkm) : null;
  return DEFAULT_SUBJECTS.map((subject, index) =>
    makeSubject({ ...subject, kkm: uniform ?? subject.kkm, schoolId }, index),
  );
}

/** Komponen bawaan untuk satu kelas (PH1, UTS, UAS). */
export function seedComponentsFor(classId, schoolId, subjectId) {
  return DEFAULT_COMPONENTS.map((component, index) =>
    makeComponent({ ...component, classId, schoolId, subjectId }, index),
  );
}

/** What a cascade delete will actually remove — shown in the confirmation copy. */
export function cascadeCounts({ schoolId, classId = null, subjectId = null, studentIds = null }, state) {
  const classes = state.classes.filter(
    (c) => (schoolId ? c.schoolId === schoolId : true) && (classId ? c.id === classId : true),
  );
  const classIds = new Set(classes.map((c) => c.id));
  const subjects = state.subjects.filter(
    (s) => (schoolId ? s.schoolId === schoolId : true) && (subjectId ? s.id === subjectId : true),
  );
  const subjectIds = new Set(subjects.map((s) => s.id));
  const students = state.students.filter((s) => {
    if (studentIds) return studentIds.includes(s.id);
    if (classId) return s.classId === classId;
    if (schoolId) return s.schoolId === schoolId;
    return false;
  });
  const studentIdSet = new Set(students.map((s) => s.id));
  const grades = state.grades.filter((g) => {
    if (studentIds) return studentIdSet.has(g.studentId) || subjectIds.has(g.subjectId);
    if (classId) return studentIdSet.has(g.studentId) || subjectIds.has(g.subjectId);
    if (schoolId) return g.schoolId === schoolId;
    return false;
  });

  return {
    classes: classes.length,
    students: students.length,
    subjects: subjects.length,
    grades: grades.length,
    classIds: [...classIds],
    subjectIds: [...subjectIds],
    studentIds: [...studentIdSet],
    gradeIds: grades.map((g) => g.id),
  };
}

export function buildBackup(state) {
  return {
    app: 'SINILAI',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    settings: state.settings,
    schools: state.schools,
    classes: state.classes,
    subjects: state.subjects,
    components: state.components,
    students: state.students,
    grades: state.grades,
  };
}

export function parseBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Berkas bukan JSON yang valid.' };
  }
  if (!data || data.app !== 'SINILAI' || !Array.isArray(data.schools)) {
    return { ok: false, error: 'Berkas ini bukan cadangan SINILAI.' };
  }
  const required = ['schools', 'classes', 'subjects', 'components', 'students', 'grades'];
  const missing = required.filter((key) => !Array.isArray(data[key]));
  if (missing.length > 0) {
    return { ok: false, error: `Struktur cadangan tidak lengkap: ${missing.join(', ')}.` };
  }
  return {
    ok: true,
    data: {
      settings: data.settings && typeof data.settings === 'object' ? data.settings : defaultSettings(),
      schools: data.schools,
      classes: data.classes,
      subjects: data.subjects,
      components: data.components,
      students: data.students,
      grades: data.grades,
    },
  };
}
