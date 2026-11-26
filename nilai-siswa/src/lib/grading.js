/**
 * Canonical grading definitions — one source of truth shared by the score grid,
 * the recap, the dashboard charts and every export.
 */

export const DEFAULT_PREDIKAT = { A: 90, B: 80, C: 70 };

export const ASSESSMENT_TYPES = [
  { value: 'harian', label: 'Penilaian Harian' },
  { value: 'uts', label: 'Ujian Tengah Semester' },
  { value: 'uas', label: 'Ujian Akhir Semester' },
];

export function assessmentTypeLabel(type) {
  const found = ASSESSMENT_TYPES.find((item) => item.value === type);
  return found ? found.label : 'Penilaian';
}

/**
 * Recap scopes: which assessment components feed the Nilai Akhir in the recap.
 * `all` keeps the full formula (PH + UTS + UAS); the narrower scopes let a
 * teacher look at daily-assessment progress alone, or before the final exam.
 */
export const RECAP_SCOPES = [
  {
    value: 'ph',
    label: 'PH saja',
    title: 'Keseluruhan PH',
    naLabel: 'Nilai PH',
    types: ['harian'],
  },
  {
    value: 'ph_uts',
    label: 'PH + UTS',
    title: 'Keseluruhan PH + UTS',
    naLabel: 'Nilai PH + UTS',
    types: ['harian', 'uts'],
  },
  {
    value: 'all',
    label: 'PH + UTS + UAS',
    title: 'Keseluruhan PH + UTS + UAS',
    naLabel: 'Nilai Akhir',
    types: ['harian', 'uts', 'uas'],
  },
];

export const DEFAULT_RECAP_SCOPE = 'all';

export function recapScope(value) {
  return RECAP_SCOPES.find((scope) => scope.value === value) || RECAP_SCOPES[RECAP_SCOPES.length - 1];
}

/** Components that belong to a recap scope, keeping the school's stored order. */
/**
 * Cakupan nilai khusus halaman Peringkat: satu jenis penilaian saja
 * (PH / UTS / UAS) atau gabungan ketiganya.
 */
export const RANKING_SCOPES = [
  { value: 'ph', label: 'PH', title: 'PH saja', short: 'PH', types: ['harian'], naLabel: 'Nilai PH' },
  { value: 'uts', label: 'UTS', title: 'UTS saja', short: 'UTS', types: ['uts'], naLabel: 'Nilai UTS' },
  { value: 'uas', label: 'UAS', title: 'UAS saja', short: 'UAS', types: ['uas'], naLabel: 'Nilai UAS' },
  {
    value: 'all',
    label: 'Semua',
    title: 'PH + UTS + UAS',
    short: 'Semua',
    types: ['harian', 'uts', 'uas'],
    naLabel: 'Nilai Akhir',
  },
];

export const DEFAULT_RANKING_SCOPE = 'all';

export function rankingScope(value) {
  return (
    RANKING_SCOPES.find((item) => item.value === value) ||
    RANKING_SCOPES[RANKING_SCOPES.length - 1]
  );
}

/** Komponen penilaian yang termasuk dalam jenis tertentu. */
export function componentsOfTypes(components, types) {
  return components.filter((component) => types.includes(component.type || 'harian'));
}

export function componentsForScope(components, scope) {
  const types = recapScope(scope).types;
  return components.filter((component) => types.includes(component.type || 'harian'));
}

/** Composite key of one score cell: student × subject × assessment component. */
export function gradeKey(studentId, subjectId, componentId) {
  return `${studentId}::${subjectId}::${componentId}`;
}

export function predikatFor(na, thresholds = DEFAULT_PREDIKAT) {
  if (na === null || na === undefined || Number.isNaN(na)) return null;
  if (na >= thresholds.A) return 'A';
  if (na >= thresholds.B) return 'B';
  if (na >= thresholds.C) return 'C';
  return 'D';
}

function trimDecimal(value) {
  return Number(value.toFixed(1));
}

export function predikatRange(letter, thresholds = DEFAULT_PREDIKAT) {
  if (letter === 'A') return `≥ ${thresholds.A}`;
  if (letter === 'B') return `${trimDecimal(thresholds.B)} – ${trimDecimal(thresholds.A - 0.1)}`;
  if (letter === 'C') return `${trimDecimal(thresholds.C)} – ${trimDecimal(thresholds.B - 0.1)}`;
  return `< ${thresholds.C}`;
}

/**
 * Nilai Akhir = Σ(skor × bobot) / Σ(bobot) over components that actually have a
 * score. Missing scores are excluded — never treated as zero. When every weight
 * is 0 the formula degrades honestly to a plain mean of the scored components.
 */
export function computeNilaiAkhir(studentId, subjectId, components, gradeIndex) {
  let weighted = 0;
  let weightSum = 0;
  let plain = 0;
  let scored = 0;
  const scores = {};

  components.forEach((component) => {
    const record = gradeIndex[gradeKey(studentId, subjectId, component.id)];
    const score = record && typeof record.score === 'number' ? record.score : null;
    scores[component.id] = score;
    if (score !== null) {
      const weight = Number(component.weight) || 0;
      weighted += score * weight;
      weightSum += weight;
      plain += score;
      scored += 1;
    }
  });

  let na = null;
  if (weightSum > 0) na = Math.round((weighted / weightSum) * 10) / 10;
  else if (scored > 0) na = Math.round((plain / scored) * 10) / 10;

  return { na, scores, weightSum, scoredCount: scored };
}

export function mean(values) {
  const clean = values.filter((value) => typeof value === 'number' && !Number.isNaN(value));
  if (clean.length === 0) return null;
  return clean.reduce((a, b) => a + b, 0) / clean.length;
}

export function roundedMean(values, digits = 1) {
  const value = mean(values);
  if (value === null) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * Canonical statistics collection used by the dashboard, the recap and exports.
 * Everything derives from stored records only — no targets, forecasts, or
 * period comparisons are invented.
 */
export function collectStats({
  classes = [],
  subjects = [],
  componentsByClassSubject = {},
  students = [],
  gradeIndex = {},
  thresholds = DEFAULT_PREDIKAT,
  schoolId = null,
  classId = null,
  subjectId = null,
}) {
  const scopedClasses = classes.filter(
    (klass) => (!schoolId || klass.schoolId === schoolId) && (!classId || klass.id === classId),
  );
  const scopedSubjects = subjects.filter(
    (subject) => (!schoolId || subject.schoolId === schoolId) && (!subjectId || subject.id === subjectId),
  );
  const scopedClassIds = new Set(scopedClasses.map((klass) => klass.id));
  const scopedSubjectIds = new Set(scopedSubjects.map((subject) => subject.id));

  const scopedStudents = students.filter(
    (student) =>
      (!schoolId || student.schoolId === schoolId) && (!classId || student.classId === classId),
  );
  // Averages and completeness only consider students that belong to a scoped
  // class, because scores always hang off a class context.
  const gradedCohort = scopedStudents.filter((student) => scopedClassIds.has(student.classId));

  const perSubject = scopedSubjects.map((subject) => {
    const cohort = gradedCohort.filter((student) => student.schoolId === subject.schoolId);
    const naValues = [];
    let filled = 0;
    let total = 0;
    cohort.forEach((student) => {
      const components = componentsByClassSubject[`${student.classId}::${subject.id}`] || [];
      const { na, scoredCount } = computeNilaiAkhir(student.id, subject.id, components, gradeIndex);
      filled += scoredCount;
      total += components.length;
      if (na !== null) naValues.push(na);
    });
    return {
      subjectId: subject.id,
      subjectName: subject.name,
      code: subject.code,
      kkm: subject.kkm,
      average: roundedMean(naValues, 1),
      gradedStudents: naValues.length,
      studentCount: cohort.length,
      filled,
      total,
      completeness: total > 0 ? Math.round((filled / total) * 100) : null,
    };
  });

  const perClass = scopedClasses.map((klass) => {
    const classStudents = students.filter((student) => student.classId === klass.id);
    const classSubjects = subjects.filter(
      (subject) => subject.schoolId === klass.schoolId && scopedSubjectIds.has(subject.id),
    );
    const naValues = [];
    let filled = 0;
    let total = 0;
    classStudents.forEach((student) => {
      classSubjects.forEach((subject) => {
        const components = componentsByClassSubject[`${klass.id}::${subject.id}`] || [];
        const { na, scoredCount } = computeNilaiAkhir(student.id, subject.id, components, gradeIndex);
        filled += scoredCount;
        total += components.length;
        if (na !== null) naValues.push(na);
      });
    });
    return {
      classId: klass.id,
      className: klass.name,
      schoolId: klass.schoolId,
      studentCount: classStudents.length,
      subjectCount: classSubjects.length,
      average: roundedMean(naValues, 1),
      filled,
      total,
      completeness: total > 0 ? Math.round((filled / total) * 100) : null,
    };
  });

  const prodiAll = { A: 0, B: 0, C: 0, D: 0, none: 0 };
  const allNa = [];
  let belowKkm = 0;
  let filledCells = 0;
  let totalCells = 0;

  gradedCohort.forEach((student) => {
    subjects
      .filter((subject) => subject.schoolId === student.schoolId && scopedSubjectIds.has(subject.id))
      .forEach((subject) => {
        const components = componentsByClassSubject[`${student.classId}::${subject.id}`] || [];
        const { na, scoredCount } = computeNilaiAkhir(student.id, subject.id, components, gradeIndex);
        filledCells += scoredCount;
        totalCells += components.length;
        if (na === null) {
          prodiAll.none += 1;
        } else {
          allNa.push(na);
          prodiAll[predikatFor(na, thresholds)] += 1;
          if (subject.kkm && na < subject.kkm) belowKkm += 1;
        }
      });
  });

  return {
    students: scopedStudents.length,
    gradedStudents: gradedCohort.length,
    classes: scopedClasses.length,
    subjects: scopedSubjects.length,
    averageNa: roundedMean(allNa, 1),
    gradedCount: allNa.length,
    belowKkm,
    filledCells,
    totalCells,
    completeness: totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : null,
    predikat: prodiAll,
    perSubject,
    perClass,
  };
}

/** Completeness of one class × subject pair (used by the score grid and recap). */
export function pairStats({ students, components, subjectId, gradeIndex, kkm, thresholds = DEFAULT_PREDIKAT }) {
  let filled = 0;
  const total = students.length * components.length;
  const naValues = [];
  const rows = students.map((student) => {
    const { na, scores, scoredCount } = computeNilaiAkhir(
      student.id,
      subjectId,
      components,
      gradeIndex,
    );
    filled += scoredCount;
    if (na !== null) naValues.push(na);
    return {
      student,
      na,
      scores,
      predikat: predikatFor(na, thresholds),
      belowKkm: na !== null && Boolean(kkm) && na < kkm,
    };
  });
  return {
    rows,
    filled,
    total,
    completeness: total > 0 ? Math.round((filled / total) * 100) : null,
    average: roundedMean(naValues, 1),
  };
}
