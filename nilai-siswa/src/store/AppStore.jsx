/**
 * Single application store: loads the local dataset once, exposes typed
 * mutations, and keeps every derived index (grade index, per-school grouping)
 * in one place. All persistence goes through the local db adapter.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  clearStores,
  put,
  putMany,
  readAllCollections,
  remove,
  removeMany,
  replaceStore,
  STORES,
} from '../lib/db';
import {
  buildBackup,
  cascadeCounts,
  defaultSettings,
  makeClass,
  makeComponent,
  makeGrade,
  makeSchool,
  makeStudent,
  makeSubject,
  seedComponentsFor,
  seedSubjectsFor,
} from '../lib/repository';
import { gradeKey } from '../lib/grading';
import {
  bedakan,
  berlangganan,
  bacaAntrianTersimpan,
  kirim,
  kumpulkanDariState,
  lepaskanLangganan,
  tambahTombstone,
  simpanAntrianTersimpan,
  tarik,
  terapkanRemote,
} from '../lib/sync';
import { useAuth } from './AuthStore';
import { migrasiKomponenPerKelas } from '../lib/migrasi';

/** Jeda sebelum perubahan lokal dikirim ke server (menggabungkan banyak ketikan). */
const JEDA_KIRIM = 1200;

const AppContext = createContext(null);

const EMPTY_STATE = {
  loading: true,
  error: '',
  schools: [],
  classes: [],
  subjects: [],
  components: [],
  students: [],
  grades: [],
  settings: defaultSettings(),
};

export function AppProvider({ children }) {
  const { idPengguna } = useAuth();
  const [state, setState] = useState(EMPTY_STATE);
  // Diisi setelah fungsi sinkronisasi dibuat; dipakai oleh aksi hapus agar
  // tombstone, antrean, dan pengiriman berjalan seketika tanpa menunggu jeda.
  const hapusSekarangRef = useRef(null);

  /** Baca ulang seluruh data dari penyimpanan perangkat ini. */
  const muatUlang = useCallback(async () => {
    // Data lama (komponen milik sekolah) dirapikan sekali menjadi komponen
    // milik tiap kelas sebelum aplikasi membaca apa pun.
    await migrasiKomponenPerKelas();
    const collections = await readAllCollections();
    const meta = collections.meta.find((row) => row.key === 'app');
    setState({
      loading: false,
      error: '',
      schools: collections.schools,
      classes: collections.classes,
      subjects: collections.subjects,
      components: collections.components,
      students: collections.students,
      grades: collections.grades,
      settings: { ...defaultSettings(), ...(meta || {}) },
    });
  }, []);

  useEffect(() => {
    let dibatalkan = false;
    muatUlang().catch((error) => {
      if (dibatalkan) return;
      setState((previous) => ({
        ...previous,
        loading: false,
        error: error?.message || 'Gagal memuat data lokal di perangkat ini.',
      }));
    });
    return () => {
      dibatalkan = true;
    };
  }, [muatUlang]);

  /* ── derived indexes ───────────────────────────────────────────────── */

  const gradeIndex = useMemo(() => {
    const index = {};
    state.grades.forEach((grade) => {
      index[grade.id] = grade;
    });
    return index;
  }, [state.grades]);

  /** Komponen penilaian tiap kelas, sudah urut sesuai kolom tabel. */
  const componentsByClassSubject = useMemo(() => {
    const grouped = {};
    state.components.forEach((component) => {
      if (!component.classId || !component.subjectId) return;
      const kunci = `${component.classId}::${component.subjectId}`;
      if (!grouped[kunci]) grouped[kunci] = [];
      grouped[kunci].push(component);
    });
    Object.values(grouped).forEach((daftar) => daftar.sort((a, b) => a.order - b.order));
    return grouped;
  }, [state.components]);

  const componentsByClass = useMemo(() => {
    const grouped = {};
    state.classes.forEach((klass) => {
      grouped[klass.id] = state.components
        .filter((component) => component.classId === klass.id)
        .sort((a, b) => a.order - b.order);
    });
    return grouped;
  }, [state.components, state.classes]);

  const componentsBySchool = useMemo(() => {
    const grouped = {};
    state.schools.forEach((school) => {
      grouped[school.id] = state.components
        .filter((component) => component.schoolId === school.id)
        .sort((a, b) => a.order - b.order);
    });
    return grouped;
  }, [state.components, state.schools]);

  const classById = useMemo(
    () => Object.fromEntries(state.classes.map((klass) => [klass.id, klass])),
    [state.classes],
  );
  const schoolById = useMemo(
    () => Object.fromEntries(state.schools.map((school) => [school.id, school])),
    [state.schools],
  );
  const subjectById = useMemo(
    () => Object.fromEntries(state.subjects.map((subject) => [subject.id, subject])),
    [state.subjects],
  );

  /* ── schools ───────────────────────────────────────────────────────── */

  const saveSchool = useCallback(
    async (input, { seedSubjectList = true } = {}) => {
      const existing = input.id ? state.schools.find((school) => school.id === input.id) : null;
      const record = makeSchool(
        { ...existing, ...input, createdAt: existing?.createdAt },
        existing ? existing.order : state.schools.length,
      );
      const newSubjects =
        !existing && seedSubjectList ? seedSubjectsFor(record.id, state.settings?.defaultKkm) : [];
      await put('schools', record);
      if (newSubjects.length > 0) await putMany('subjects', newSubjects);

      setState((previous) => ({
        ...previous,
        schools: existing
          ? previous.schools.map((school) => (school.id === record.id ? record : school))
          : [...previous.schools, record],
        subjects: [...previous.subjects, ...newSubjects],
      }));

      return { record, seededSubjects: newSubjects.length, seededComponents: 0 };
    },
    [state.schools, state.settings],
  );

  const deleteSchool = useCallback(
    async (schoolId) => {
      const counts = cascadeCounts({ schoolId }, state);
      // Komponen penilaian ikut dihapus; sebelumnya hanya dibuang dari tampilan
      // sehingga barisnya tertinggal di perangkat dan di server.
      const componentIds = state.components
        .filter((component) => component.schoolId === schoolId)
        .map((component) => component.id);
      await removeMany('grades', counts.gradeIds);
      await removeMany('students', counts.studentIds);
      await removeMany('subjects', counts.subjectIds);
      await removeMany('components', componentIds);
      await removeMany('classes', counts.classIds);
      await remove('schools', schoolId);

      setState((previous) => ({
        ...previous,
        schools: previous.schools.filter((school) => school.id !== schoolId),
        classes: previous.classes.filter((klass) => klass.schoolId !== schoolId),
        subjects: previous.subjects.filter((subject) => subject.schoolId !== schoolId),
        components: previous.components.filter((component) => component.schoolId !== schoolId),
        students: previous.students.filter((student) => student.schoolId !== schoolId),
        grades: previous.grades.filter((grade) => grade.schoolId !== schoolId),
      }));
      hapusSekarangRef.current?.([
        ...counts.gradeIds.map((id) => ({ collection: 'grades', id })),
        ...counts.studentIds.map((id) => ({ collection: 'students', id })),
        ...counts.subjectIds.map((id) => ({ collection: 'subjects', id })),
        ...componentIds.map((id) => ({ collection: 'components', id })),
        ...counts.classIds.map((id) => ({ collection: 'classes', id })),
        { collection: 'schools', id: schoolId },
      ]);
      return counts;
    },
    [state],
  );

  /* ── classes ───────────────────────────────────────────────────────── */

  const saveClass = useCallback(
    async (input) => {
      const existing = input.id ? state.classes.find((klass) => klass.id === input.id) : null;
      const record = makeClass({ ...existing, ...input }, existing ? existing.order : state.classes.length);
      // Kelas baru memulai dengan komponen PH1, UTS, dan UAS miliknya sendiri;
      // guru menambah PH berikutnya di kelas tersebut.
      // Komponen bergantung pada mata pelajaran: kelas baru mendapat satu set
      // komponen untuk setiap mapel di sekolah itu.
      const mapelSekolah = existing
        ? []
        : state.subjects.filter((subject) => subject.schoolId === record.schoolId);
      const komponenBaru = mapelSekolah.flatMap((subject) =>
        seedComponentsFor(record.id, record.schoolId, subject.id),
      );
      await put('classes', record);
      if (komponenBaru.length > 0) await putMany('components', komponenBaru);
      setState((previous) => ({
        ...previous,
        classes: existing
          ? previous.classes.map((klass) => (klass.id === record.id ? record : klass))
          : [...previous.classes, record],
        components: [...previous.components, ...komponenBaru],
      }));
      return record;
    },
    [state.classes],
  );

  /**
   * Deleting a class keeps its students (they become "belum ada kelas") and
   * removes only the scores recorded for that class.
   */
  const deleteClass = useCallback(
    async (classId) => {
      const affectedStudents = state.students.filter((student) => student.classId === classId);
      const affectedGrades = state.grades.filter((grade) => grade.classId === classId);
      const affectedComponents = state.components.filter((component) => component.classId === classId);
      const updatedStudents = affectedStudents.map((student) => ({ ...student, classId: '' }));

      await removeMany('grades', affectedGrades.map((grade) => grade.id));
      await removeMany('components', affectedComponents.map((component) => component.id));
      if (updatedStudents.length > 0) await putMany('students', updatedStudents);
      await remove('classes', classId);

      setState((previous) => ({
        ...previous,
        classes: previous.classes.filter((klass) => klass.id !== classId),
        students: previous.students.map((student) =>
          student.classId === classId ? { ...student, classId: '' } : student,
        ),
        grades: previous.grades.filter((grade) => grade.classId !== classId),
        components: previous.components.filter((component) => component.classId !== classId),
      }));
      hapusSekarangRef.current?.([
        ...affectedGrades.map((grade) => ({ collection: 'grades', id: grade.id })),
        ...affectedComponents.map((component) => ({ collection: 'components', id: component.id })),
        { collection: 'classes', id: classId },
      ]);
      return { students: updatedStudents.length, grades: affectedGrades.length };
    },
    [state],
  );

  /* ── subjects & assessment components ─────────────────────────────── */

  const saveSubject = useCallback(
    async (input) => {
      const existing = input.id ? state.subjects.find((subject) => subject.id === input.id) : null;
      const record = makeSubject(
        { ...existing, ...input },
        existing ? existing.order : state.subjects.length,
      );
      await put('subjects', record);

      // Mapel baru langsung punya komponen bawaan di setiap kelas sekolah itu.
      const kelasSekolah = existing
        ? []
        : state.classes.filter((klass) => klass.schoolId === record.schoolId);
      const komponenBaru = kelasSekolah.flatMap((klass) =>
        seedComponentsFor(klass.id, record.schoolId, record.id),
      );
      if (komponenBaru.length > 0) await putMany('components', komponenBaru);

      setState((previous) => ({
        ...previous,
        subjects: existing
          ? previous.subjects.map((subject) => (subject.id === record.id ? record : subject))
          : [...previous.subjects, record],
        components: [...previous.components, ...komponenBaru],
      }));
      return record;
    },
    [state.subjects, state.classes],
  );

  const deleteSubject = useCallback(
    async (subjectId) => {
      const affectedGrades = state.grades.filter((grade) => grade.subjectId === subjectId);
      const affectedComponents = state.components.filter(
        (component) => component.subjectId === subjectId,
      );
      await removeMany('grades', affectedGrades.map((grade) => grade.id));
      await removeMany('components', affectedComponents.map((component) => component.id));
      await remove('subjects', subjectId);
      setState((previous) => ({
        ...previous,
        subjects: previous.subjects.filter((subject) => subject.id !== subjectId),
        grades: previous.grades.filter((grade) => grade.subjectId !== subjectId),
        components: previous.components.filter(
          (component) => component.subjectId !== subjectId,
        ),
      }));
      hapusSekarangRef.current?.([
        ...affectedGrades.map((grade) => ({ collection: 'grades', id: grade.id })),
        ...affectedComponents.map((component) => ({ collection: 'components', id: component.id })),
        { collection: 'subjects', id: subjectId },
      ]);
      return { grades: affectedGrades.length };
    },
    [state],
  );

  const saveComponent = useCallback(
    async (input) => {
      const existing = input.id ? state.components.find((item) => item.id === input.id) : null;
      const siblings = state.components.filter(
        (item) =>
          item.classId === input.classId &&
          item.subjectId === input.subjectId &&
          item.id !== input.id,
      );
      const record = makeComponent({ ...existing, ...input }, siblings.length);
      await put('components', record);
      setState((previous) => ({
        ...previous,
        components: existing
          ? previous.components.map((item) => (item.id === record.id ? record : item))
          : [...previous.components, record],
      }));
      return record;
    },
    [state.components],
  );

  const deleteComponent = useCallback(
    async (componentId) => {
      const affectedGrades = state.grades.filter((grade) => grade.componentId === componentId);
      await removeMany('grades', affectedGrades.map((grade) => grade.id));
      await remove('components', componentId);
      setState((previous) => ({
        ...previous,
        components: previous.components.filter((item) => item.id !== componentId),
        grades: previous.grades.filter((grade) => grade.componentId !== componentId),
      }));
      // Penghapusan langsung dikirim supaya tidak sempat ditarik kembali dari server.
      hapusSekarangRef.current?.([
        ...affectedGrades.map((grade) => ({ collection: 'grades', id: grade.id })),
        { collection: 'components', id: componentId },
      ]);
      return { grades: affectedGrades.length };
    },
    [state.grades, state.components],
  );

  /** Rewrite weights of every component of a school in one pass. */
  const saveComponentWeights = useCallback(
    async (schoolId, weights) => {
      const updated = state.components
        .filter((component) => component.schoolId === schoolId)
        .map((component) => ({
          ...component,
          weight: Number(weights[component.id] ?? component.weight) || 0,
        }));
      await putMany('components', updated);
      setState((previous) => ({
        ...previous,
        components: previous.components.map(
          (component) => updated.find((item) => item.id === component.id) || component,
        ),
      }));
      return updated;
    },
    [state.components],
  );

  /* ── students ──────────────────────────────────────────────────────── */

  const saveStudent = useCallback(
    async (input) => {
      const existing = input.id ? state.students.find((student) => student.id === input.id) : null;
      const record = makeStudent({ ...existing, ...input });
      await put('students', record);
      setState((previous) => ({
        ...previous,
        students: existing
          ? previous.students.map((student) => (student.id === record.id ? record : student))
          : [...previous.students, record],
      }));
      return record;
    },
    [state.students],
  );

  const deleteStudents = useCallback(
    async (studentIds) => {
      const affectedGrades = state.grades.filter((grade) => studentIds.includes(grade.studentId));
      await removeMany('grades', affectedGrades.map((grade) => grade.id));
      await removeMany('students', studentIds);
      setState((previous) => ({
        ...previous,
        students: previous.students.filter((student) => !studentIds.includes(student.id)),
        grades: previous.grades.filter((grade) => !studentIds.includes(grade.studentId)),
      }));
      // Tanpa tombstone, tarikan server berikutnya menghidupkan lagi siswa dan
      // nilainya yang baru saja dihapus.
      hapusSekarangRef.current?.([
        ...affectedGrades.map((grade) => ({ collection: 'grades', id: grade.id })),
        ...studentIds.map((id) => ({ collection: 'students', id })),
      ]);
      return { students: studentIds.length, grades: affectedGrades.length };
    },
    [state],
  );

  /** Bulk import: creates missing classes, then inserts or updates students. */
  const importStudents = useCallback(
    async ({ records, newClasses, schoolId }) => {
      const createdClasses = newClasses.map((entry, index) =>
        makeClass(
          { schoolId, name: entry.name, gradeLevel: '' },
          state.classes.filter((klass) => klass.schoolId === schoolId).length + index,
        ),
      );
      const classNameToId = new Map(createdClasses.map((klass) => [klass.name.toLowerCase(), klass.id]));

      const students = records.map((record) => {
        const existing = record.id ? state.students.find((student) => student.id === record.id) : null;
        let classId = record.classId;
        if (typeof classId === 'string' && classId.startsWith('__new__')) {
          classId = classNameToId.get(classId.replace('__new__', '')) || '';
        }
        return makeStudent({ ...existing, ...record, classId });
      });

      if (createdClasses.length > 0) await putMany('classes', createdClasses);
      await putMany('students', students);

      setState((previous) => ({
        ...previous,
        classes: [...previous.classes, ...createdClasses],
        students: [
          ...previous.students.map(
            (student) => students.find((item) => item.id === student.id) || student,
          ),
          ...students.filter((item) => !previous.students.some((student) => student.id === item.id)),
        ],
      }));

      return { students: students.length, classes: createdClasses.length };
    },
    [state.classes, state.students],
  );

  /* ── grades ────────────────────────────────────────────────────────── */

  /**
   * Persist a batch of score cells. A null score clears the stored value
   * instead of writing a misleading zero.
   */
  const saveGrades = useCallback(
    async (cells) => {
      const toWrite = [];
      const toDelete = [];
      cells.forEach((cell) => {
        const key = gradeKey(cell.studentId, cell.subjectId, cell.componentId);
        if (cell.score === null || cell.score === undefined || cell.score === '') {
          if (gradeIndex[key] || state.grades.some((grade) => grade.id === key)) toDelete.push(key);
        } else {
          toWrite.push(makeGrade({ ...cell, score: Number(cell.score) }));
        }
      });

      if (toDelete.length > 0) await removeMany('grades', toDelete);
      if (toWrite.length > 0) await putMany('grades', toWrite);

      const writtenIds = new Set(toWrite.map((grade) => grade.id));
      const deletedIds = new Set(toDelete);
      setState((previous) => ({
        ...previous,
        grades: [
          ...previous.grades.filter((grade) => !writtenIds.has(grade.id) && !deletedIds.has(grade.id)),
          ...toWrite,
        ],
      }));

      return { saved: toWrite.length, cleared: toDelete.length };
    },
    [gradeIndex, state.grades],
  );

  /* ── settings, backup, reset ───────────────────────────────────────── */

  const updateSettings = useCallback(
    async (patch) => {
      const record = { ...state.settings, ...patch, key: 'app' };
      await put('meta', record);
      setState((previous) => ({ ...previous, settings: record }));
      return record;
    },
    [state.settings],
  );

  const exportBackup = useCallback(() => buildBackup(state), [state]);

  const restoreBackup = useCallback(async (data) => {
    await Promise.all([
      replaceStore('schools', data.schools),
      replaceStore('classes', data.classes),
      replaceStore('subjects', data.subjects),
      replaceStore('components', data.components),
      replaceStore('students', data.students),
      replaceStore('grades', data.grades),
      replaceStore('meta', [{ ...data.settings, key: 'app' }]),
    ]);
    setState({
      loading: false,
      error: '',
      schools: data.schools,
      classes: data.classes,
      subjects: data.subjects,
      components: data.components,
      students: data.students,
      grades: data.grades,
      settings: { ...defaultSettings(), ...data.settings },
    });
    return true;
  }, []);

  const resetAll = useCallback(async () => {
    await clearStores(STORES);
    const settings = defaultSettings();
    await put('meta', settings);
    setState({ ...EMPTY_STATE, loading: false, settings });
    return true;
  }, []);

  /** Plain record totals for the settings summary (no scope filtering). */
  const totals = useMemo(
    () => ({
      schools: state.schools.length,
      classes: state.classes.length,
      subjects: state.subjects.length,
      students: state.students.length,
      grades: state.grades.length,
    }),
    [state],
  );

  /* ── sinkronisasi akun: web ⇄ HP ───────────────────────────────────── */

  const stateRef = useRef(state);
  stateRef.current = state;
  // Antrean dihidrasi dari penyimpanan perangkat: perubahan yang belum sempat
  // terkirim (misalnya saat luring atau aplikasi ditutup) tetap dikirim nanti.
  const antrian = useRef(new Map(bacaAntrianTersimpan().map((item) => [`${item.collection}::${item.id}`, item])));
  const snapshot = useRef(null);
  const timerKirim = useRef(null);
  const timerTerapkan = useRef(null);
  const kumpulanRealtime = useRef([]);
  const abaikanBerikutnya = useRef(false);
  const [syncState, setSyncState] = useState({ keadaan: 'diam', pesan: '', waktu: '' });

  /**
   * Ganti akun: buang antrean dan pembanding lama. Tanpa ini, data akun
   * sebelumnya yang masih ada di memori bisa terkirim ke akun baru.
   */
  const idSebelumnyaRef = useRef(idPengguna);
  useEffect(() => {
    const sebelumnya = idSebelumnyaRef.current;
    idSebelumnyaRef.current = idPengguna;
    // Hanya bersihkan saat benar-benar pindah akun. Jangan saat aplikasi baru
    // dibuka (antrean tersimpan harus dikirim, bukan dibuang) atau saat keluar.
    if (!sebelumnya || !idPengguna || sebelumnya === idPengguna) return;
    antrian.current.clear();
    kumpulanRealtime.current = [];
    snapshot.current = null;
    abaikanBerikutnya.current = false;
    if (timerKirim.current) window.clearTimeout(timerKirim.current);
    if (timerTerapkan.current) window.clearTimeout(timerTerapkan.current);
  }, [idPengguna]);

  /** Kirim semua perubahan yang menunggu di antrean. */
  const kirimAntrian = useCallback(async () => {
    // Gabungkan antrean tersimpan (mis. dari migrasi) sebelum mengirim.
    bacaAntrianTersimpan().forEach((item) => {
      const kunci = `${item.collection}::${item.id}`;
      if (!antrian.current.has(kunci)) antrian.current.set(kunci, item);
    });
    console.info('[sinilai:antrian]', antrian.current.size, 'akun:', Boolean(idPengguna));
    if (!idPengguna || antrian.current.size === 0) return;
    const kunci = Array.from(antrian.current.keys());
    const item = kunci.map((k) => antrian.current.get(k)).filter(Boolean);
    if (item.length === 0) return;

    setSyncState({ keadaan: 'mengirim', pesan: '', waktu: '' });
    const hasil = await kirim(item);

    if (!hasil.ok) {
      console.error('[sinilai:kirim] gagal:', hasil.pesan, 'jumlah:', item.length);
      // Tetap di antrean (dan di penyimpanan) untuk dicoba lagi nanti.
      simpanAntrianTersimpan(Array.from(antrian.current.values()));
      setSyncState({ keadaan: 'galat', pesan: hasil.pesan, waktu: new Date().toISOString() });
      return;
    }

    // Buang hanya baris yang benar-benar terkirim; perubahan yang masuk saat
    // pengiriman berlangsung tetap di antrean.
    kunci.forEach((k) => {
      const sekarang = antrian.current.get(k);
      if (sekarang && item.includes(sekarang)) antrian.current.delete(k);
    });
    simpanAntrianTersimpan(Array.from(antrian.current.values()));
    setSyncState({ keadaan: 'diam', pesan: '', waktu: new Date().toISOString() });
  }, [idPengguna]);

  /**
   * Penghapusan dikirim seketika, tanpa menunggu pembanding keadaan setelah
   * render: id-nya ditandai permanen (tombstone), dimasukkan ke antrean, lalu
   * dikirim. Ini yang mencegah data terhapus hidup lagi dari tarikan server
   * ketika aplikasi ditutup sebelum jeda kirim selesai.
   */
  useEffect(() => {
    hapusSekarangRef.current = (daftar) => {
      (daftar || []).forEach(({ collection, id }) => {
        if (!collection || !id) return;
        tambahTombstone(collection, id);
        antrian.current.set(`${collection}::${id}`, {
          collection,
          id,
          payload: {},
          updatedAt: '',
          dihapus: true,
        });
      });
      simpanAntrianTersimpan(Array.from(antrian.current.values()));
      if (timerKirim.current) {
        window.clearTimeout(timerKirim.current);
        timerKirim.current = null;
      }
      kirimAntrian();
    };
  }, [kirimAntrian]);

  const jadwalkanKirim = useCallback(
    (jeda = JEDA_KIRIM) => {
      if (timerKirim.current) window.clearTimeout(timerKirim.current);
      timerKirim.current = window.setTimeout(() => {
        kirimAntrian();
      }, jeda);
    },
    [kirimAntrian],
  );

  // Bandingkan keadaan aplikasi dengan salinan terakhir: yang berbeda dikirim.
  useEffect(() => {
    if (state.loading) return;
    const sekarang = kumpulkanDariState(state);
    const sebelumnya = snapshot.current;
    snapshot.current = sekarang;
    if (!idPengguna || !sebelumnya || abaikanBerikutnya.current) {
      abaikanBerikutnya.current = false;
      return;
    }
    const perbedaan = bedakan(sebelumnya, sekarang);
    console.info('[sinilai:diff]', perbedaan.length, perbedaan.slice(0, 3).map((x) => `${x.collection}:${x.id}${x.dihapus ? ':hapus' : ''}`));
    if (perbedaan.length === 0) return;
    perbedaan.forEach((item) => antrian.current.set(`${item.collection}::${item.id}`, item));
    simpanAntrianTersimpan(Array.from(antrian.current.values()));
    jadwalkanKirim();
  }, [state, idPengguna, jadwalkanKirim]);

  // Setelah masuk: tarik data akun, gabungkan, unggah data lokal yang belum ada,
  // lalu dengarkan perubahan dari perangkat lain.
  useEffect(() => {
    if (!idPengguna) return undefined;
    let batal = false;
    let kanal = null;

    const terapkan = async (rows) => {
      const berubah = await terapkanRemote(rows);
      if (berubah > 0 && !batal) {
        abaikanBerikutnya.current = true;
        await muatUlang();
      }
      return berubah;
    };

    (async () => {
      // Perubahan lokal yang tertunda dikirim lebih dulu, agar tarikan berikutnya
      // tidak menghidupkan kembali data yang sudah dihapus di perangkat ini.
      await kirimAntrian();
      if (batal) return;
      setSyncState({ keadaan: 'menarik', pesan: '', waktu: '' });
      const hasil = await tarik();
      if (batal) return;

      if (!hasil.ok) {
        setSyncState({ keadaan: 'galat', pesan: hasil.pesan, waktu: '' });
      } else {
        await terapkan(hasil.rows);
        if (batal) return;
        const idRemote = new Set(hasil.rows.map((row) => `${row.collection}::${row.id}`));
        const belumAda = kumpulkanDariState(stateRef.current).filter(
          (item) => !idRemote.has(`${item.collection}::${item.id}`),
        );
        if (belumAda.length > 0) {
          const hasilKirim = await kirim(belumAda);
          setSyncState({
            keadaan: hasilKirim.ok ? 'diam' : 'galat',
            pesan: hasilKirim.ok ? '' : hasilKirim.pesan,
            waktu: new Date().toISOString(),
          });
        } else {
          setSyncState({ keadaan: 'diam', pesan: '', waktu: new Date().toISOString() });
        }
      }

      kanal = berlangganan(
        idPengguna,
        (rows) => {
          // Kumpulkan dulu: satu perubahan besar (mis. menambah sekolah yang
          // membuat 12 mapel + 4 komponen) datang sebagai banyak peristiwa.
          kumpulanRealtime.current.push(...rows);
          if (timerTerapkan.current) window.clearTimeout(timerTerapkan.current);
          timerTerapkan.current = window.setTimeout(async () => {
            const kumpulan = kumpulanRealtime.current;
            kumpulanRealtime.current = [];
            const berubah = await terapkan(kumpulan);
            if (berubah > 0) {
              setSyncState({ keadaan: 'menerima', pesan: '', waktu: new Date().toISOString() });
            }
          }, 400);
        },
        (status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setSyncState({
              keadaan: 'galat',
              pesan: 'Sambungan langsung terputus; akan dicoba lagi.',
              waktu: '',
            });
          }
        },
      );
    })();

    return () => {
      batal = true;
      if (timerTerapkan.current) window.clearTimeout(timerTerapkan.current);
      lepaskanLangganan(kanal);
    };
  }, [idPengguna, muatUlang, kirimAntrian]);

  // Saat internet kembali, kirim perubahan yang tertunda.
  useEffect(() => {
    const kembali = () => {
      if (antrian.current.size > 0) kirimAntrian();
    };
    window.addEventListener('online', kembali);
    return () => window.removeEventListener('online', kembali);
  }, [kirimAntrian]);

  /** Tarik data terbaru sekarang juga (dipakai tombol di Pengaturan). */
  const sinkronSekarang = useCallback(async () => {
    if (!idPengguna) return;
    setSyncState({ keadaan: 'menarik', pesan: '', waktu: '' });
    const hasil = await tarik();
    if (!hasil.ok) {
      setSyncState({ keadaan: 'galat', pesan: hasil.pesan, waktu: '' });
      return;
    }
    const berubah = await terapkanRemote(hasil.rows);
    if (berubah > 0) {
      abaikanBerikutnya.current = true;
      await muatUlang();
    }
    await kirimAntrian();
    setSyncState({ keadaan: 'diam', pesan: '', waktu: new Date().toISOString() });
  }, [idPengguna, muatUlang, kirimAntrian]);

  const value = useMemo(
    () => ({
      ...state,
      gradeIndex,
      componentsByClass,
      componentsByClassSubject,
      componentsBySchool,
      classById,
      schoolById,
      subjectById,
      totals,
      saveSchool,
      deleteSchool,
      saveClass,
      deleteClass,
      saveSubject,
      deleteSubject,
      saveComponent,
      deleteComponent,
      saveComponentWeights,
      saveStudent,
      deleteStudents,
      importStudents,
      saveGrades,
      updateSettings,
      exportBackup,
      restoreBackup,
      resetAll,
      cascadeCountsFor: (scope) => cascadeCounts(scope, state),
      sinkron: {
        ...syncState,
        tersambung: Boolean(idPengguna),
        sinkronSekarang,
      },
    }),
    [
      state,
      gradeIndex,
      componentsByClass,
      componentsByClassSubject,
      componentsBySchool,
      classById,
      schoolById,
      subjectById,
      totals,
      saveSchool,
      deleteSchool,
      saveClass,
      deleteClass,
      saveSubject,
      deleteSubject,
      saveComponent,
      deleteComponent,
      saveComponentWeights,
      saveStudent,
      deleteStudents,
      importStudents,
      saveGrades,
      updateSettings,
      exportBackup,
      restoreBackup,
      resetAll,
      syncState,
      idPengguna,
      sinkronSekarang,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp harus dipakai di dalam AppProvider.');
  return context;
}
