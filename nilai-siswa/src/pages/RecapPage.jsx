import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, FileSpreadsheet, Inbox, Printer, TriangleAlert } from 'lucide-react';
import { useApp } from '../store/AppStore';
import { PageHeader, FilterBar, FilterField } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Field';
import { EmptyState, PredikatBadge, SegmentedControl, TableShell, Td, Th } from '../components/ui/Bits';
import { useToast } from '../components/ui/Toast';
import {
  DEFAULT_RECAP_SCOPE,
  RECAP_SCOPES,
  assessmentTypeLabel,
  componentsForScope,
  pairStats,
  predikatFor,
  recapScope,
  roundedMean,
} from '../lib/grading';
import { exportRecap, exportStudentReport } from '../lib/excel';
import { EMPTY, cx, formatNumber, formatScore } from '../lib/format';

export default function RecapPage() {
  const {
    schools,
    classes,
    subjects,
    students,
    componentsByClassSubject,
    gradeIndex,
    settings,
  } = useApp();
  const toast = useToast();

  const [mode, setMode] = useState('class');
  const [scope, setScope] = useState(DEFAULT_RECAP_SCOPE);
  const [schoolId, setSchoolId] = useState(schools[0]?.id || '');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [studentId, setStudentId] = useState('');

  const scopedClasses = classes.filter((klass) => klass.schoolId === schoolId);
  const scopedSubjects = subjects.filter((subject) => subject.schoolId === schoolId);

  const activeClassId = classId || scopedClasses[0]?.id || '';
  const activeSubjectId = subjectId || scopedSubjects[0]?.id || '';

  const school = schools.find((item) => item.id === schoolId) || null;
  const klass = scopedClasses.find((item) => item.id === activeClassId) || null;
  const subject = scopedSubjects.find((item) => item.id === activeSubjectId) || null;
  // Komponen penilaian mengikuti kelas: pada rekap per kelas memakai kelas yang
  // dipilih, pada laporan per siswa memakai kelas siswa tersebut.
  const kelasIdUntukKomponen =
    mode === 'student'
      ? students.find((student) => student.id === studentId)?.classId || ''
      : activeClassId;
  const components =
    kelasIdUntukKomponen && activeSubjectId
      ? componentsByClassSubject[`${kelasIdUntukKomponen}::${activeSubjectId}`] || []
      : [];
  const scopeMeta = recapScope(scope);
  const nilaiLabel = scopeMeta.naLabel;
  // Only the components inside the chosen scope feed the recap figures below.
  const scopedComponents = useMemo(() => componentsForScope(components, scope), [components, scope]);

  const classStudents = useMemo(
    () =>
      students
        .filter((student) => student.classId === activeClassId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [students, activeClassId],
  );

  const stats = useMemo(
    () =>
      subject && scopedComponents.length > 0
        ? pairStats({
            students: classStudents,
            components: scopedComponents,
            subjectId: activeSubjectId,
            gradeIndex,
            kkm: subject.kkm,
            thresholds: settings.predikat,
          })
        : null,
    [classStudents, scopedComponents, activeSubjectId, gradeIndex, subject, settings.predikat],
  );

  const componentAverages = useMemo(() => {
    if (!stats) return [];
    return scopedComponents.map((component) =>
      roundedMean(
        stats.rows
          .map((row) => row.scores[component.id])
          .filter((score) => typeof score === 'number'),
        1,
      ),
    );
  }, [stats, scopedComponents]);

  const activeStudentId = studentId || classStudents[0]?.id || '';
  const activeStudent = classStudents.find((student) => student.id === activeStudentId) || null;

  const studentReport = useMemo(() => {
    if (!activeStudent) return null;
    const rows = scopedSubjects.map((item) => {
      const { na } = pairStats({
        students: [activeStudent],
        components: componentsForScope(
          componentsByClassSubject[`${activeStudent?.classId || ''}::${item.id}`] || [],
          scope,
        ),
        subjectId: item.id,
        gradeIndex,
        kkm: item.kkm,
        thresholds: settings.predikat,
      }).rows[0] || { na: null };
      return {
        subjectId: item.id,
        subjectName: item.name,
        code: item.code,
        kkm: item.kkm,
        na,
        predikat: predikatFor(na, settings.predikat),
      };
    });
    return { rows, average: roundedMean(rows.map((row) => row.na), 1) };
  }, [
    activeStudent,
    scopedSubjects,
    componentsByClassSubject,
    scope,
    gradeIndex,
    settings.predikat,
  ]);

  const canExport = scopedComponents.length > 0 && (mode === 'class' ? Boolean(stats) : Boolean(studentReport));

  function handleExportRecap() {
    if (!stats) return;
    exportRecap({
      schoolName: school?.name,
      className: klass?.name,
      subjectName: subject?.name,
      components: scopedComponents,
      rows: stats.rows,
      kkm: subject?.kkm,
      average: { na: stats.average, perComponent: componentAverages },
      nilaiLabel,
      scopeTitle: scopeMeta.title,
    });
    toast.success('Rekap diekspor', `Berkas Excel berisi rekap ${scopeMeta.title} untuk kelas ini.`);
  }

  function handleExportStudent() {
    if (!studentReport || !activeStudent) return;
    exportStudentReport({
      student: activeStudent,
      className: klass?.name,
      schoolName: school?.name,
      rows: studentReport.rows,
      average: studentReport.average,
      thresholds: settings.predikat,
      nilaiLabel,
      scopeTitle: scopeMeta.title,
    });
    toast.success('Laporan diekspor', `Laporan nilai ${activeStudent.name} disimpan sebagai Excel.`);
  }

  /**
   * Cetak rekap/laporan yang sedang tampil.
   *
   * Di aplikasi Android (WebView) window.print() tidak berfungsi, jadi cetak
   * diserahkan ke jembatan Android: dialog cetak Android terbuka dan pengguna
   * dapat memilih printer atau menyimpan hasilnya sebagai PDF.
   */
  function handleCetak() {
    const jembatan = typeof window !== 'undefined' ? window.AndroidCetak : null;
    if (jembatan && typeof jembatan.cetak === 'function') {
      const judul =
        mode === 'student'
          ? `Laporan Nilai — ${activeStudent?.name || ''}`
          : `Rekap Nilai — ${klass?.name || ''} ${subject?.name || ''}`;
      // WebView tidak selalu menerapkan @media print, jadi tampilan khusus cetak
      // (menu, filter, dan tombol disembunyikan) diaktifkan lewat kelas ini
      // selama dialog cetak mengambil gambar halaman.
      document.documentElement.classList.add('mode-cetak');
      try {
        jembatan.cetak(judul.trim() || 'SINILAI');
      } finally {
        window.setTimeout(() => document.documentElement.classList.remove('mode-cetak'), 4000);
      }
      toast.info('Menyiapkan cetak', 'Pilih printer atau Simpan sebagai PDF pada dialog berikutnya.');
      return;
    }
    // Chrome di Android menyediakan window.print() tetapi tidak menjalankannya,
    // sehingga tombol tampak tidak bereaksi. Untuk kasus itu arahkan pengguna ke
    // menu cetak peramban (yang tetap memakai gaya cetak aplikasi).
    const androidTanpaJembatan = /Android/i.test(navigator.userAgent || '');
    if (typeof window.print === 'function' && !androidTanpaJembatan) {
      window.print();
      return;
    }
    toast.info(
      'Cetak lewat menu peramban',
      'Di Chrome Android, buka menu ⋮ lalu pilih Bagikan → Cetak (atau Cetak). Bisa juga pakai Ekspor Excel.',
    );
  }

  if (schools.length === 0) {
    return (
      <div data-component="recap-page">
        <PageHeader title="Rekap & Laporan" description="Rekapitulasi nilai per kelas dan laporan per siswa." />
        <Card>
          <EmptyState
            icon={FileSpreadsheet}
            title="Belum ada data untuk direkap"
            description="Mulai dengan menambahkan sekolah, kelas, mata pelajaran, dan siswa."
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
    <div data-component="recap-page">
      <PageHeader
        title="Rekap & Laporan"
        description="Lihat rekapitulasi nilai satu kelas untuk satu mata pelajaran, atau laporan lengkap seorang siswa untuk seluruh mata pelajaran. Cakupan penilaian dapat dipilih: keseluruhan PH saja, PH + UTS, atau PH + UTS + UAS. Keduanya dapat diekspor ke Excel dan dicetak."
        action={
          <>
            <Button
              variant="subtle"
              icon={Printer}
              onClick={handleCetak}
              disabled={!canExport}
            >
              Cetak
            </Button>
            <Button
              icon={Download}
              onClick={mode === 'class' ? handleExportRecap : handleExportStudent}
              disabled={!canExport}
            >
              Ekspor Excel
            </Button>
          </>
        }
      >
        <div className="no-print flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-label-caps uppercase text-muted-foreground">Jenis rekap</span>
            <SegmentedControl
              label="Pilih jenis rekap"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'class', label: 'Rekap per kelas' },
                { value: 'student', label: 'Laporan per siswa' },
              ]}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-label-caps uppercase text-muted-foreground">Cakupan nilai</span>
            <SegmentedControl
              label="Pilih cakupan komponen penilaian yang direkap"
              value={scope}
              onChange={setScope}
              options={RECAP_SCOPES.map((item) => ({ value: item.value, label: item.label }))}
            />
          </div>
        </div>
      </PageHeader>

      <FilterBar className="mb-5">
        <FilterField label="Sekolah" className="min-w-[200px]">
          <Select
            value={schoolId}
            onChange={(event) => {
              setSchoolId(event.target.value);
              setClassId('');
              setSubjectId('');
              setStudentId('');
            }}
            aria-label="Pilih sekolah"
          >
            {schools.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label="Kelas" className="min-w-[150px]">
          <Select
            value={activeClassId}
            onChange={(event) => {
              setClassId(event.target.value);
              setStudentId('');
            }}
            aria-label="Pilih kelas"
          >
            {scopedClasses.length === 0 ? <option value="">Belum ada kelas</option> : null}
            {scopedClasses.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </FilterField>
        {mode === 'class' ? (
          <FilterField label="Mata Pelajaran" className="min-w-[200px] flex-1">
            <Select
              value={activeSubjectId}
              onChange={(event) => setSubjectId(event.target.value)}
              aria-label="Pilih mata pelajaran"
            >
              {scopedSubjects.length === 0 ? <option value="">Belum ada mapel</option> : null}
              {scopedSubjects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </FilterField>
        ) : (
          <FilterField label="Siswa" className="min-w-[220px] flex-1">
            <Select
              value={activeStudentId}
              onChange={(event) => setStudentId(event.target.value)}
              aria-label="Pilih siswa"
            >
              {classStudents.length === 0 ? <option value="">Belum ada siswa</option> : null}
              {classStudents.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.nis ? ` — ${item.nis}` : ''}
                </option>
              ))}
            </Select>
          </FilterField>
        )}
      </FilterBar>

      {scopedComponents.length === 0 ? (
        <Card>
          <EmptyState
            icon={Inbox}
            title="Komponen penilaian belum tersedia"
            description={`Sekolah ini belum memiliki komponen untuk cakupan ${scopeMeta.title}. Tambahkan komponen penilaian di menu Pengaturan, atau pilih cakupan lain.`}
            action={
              <Link
                to="/pengaturan"
                className="inline-flex min-h-touch items-center gap-2 rounded-sm bg-primary px-4 text-label-md font-medium text-primary-foreground hover:bg-primary-700 sm:min-h-control"
              >
                Buka Pengaturan
              </Link>
            }
          />
        </Card>
      ) : mode === 'class' ? (
        !stats || stats.rows.length === 0 ? (
          <Card>
            <EmptyState
              icon={Inbox}
              title="Belum ada data untuk direkap"
              description="Pastikan kelas sudah memiliki siswa dan mata pelajaran sudah dipilih. Nilai yang kosong ditampilkan sebagai tanda pisah, bukan angka nol."
              action={
                <Link
                  to="/nilai"
                  className="inline-flex min-h-touch items-center gap-2 rounded-sm bg-primary px-4 text-label-md font-medium text-primary-foreground hover:bg-primary-700 sm:min-h-control"
                >
                  Buka Input Nilai
                </Link>
              }
            />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-headline-md">Rekap Nilai · {scopeMeta.title}</h2>
              <p className="mt-1 text-body-sm text-muted-foreground">
                {school?.name} · Kelas {klass?.name} · {subject?.name} · KKM {subject?.kkm || '—'} ·{' '}
                {scopedComponents.map((component) => `${component.code} ${component.weight}%`).join(' · ')}
              </p>
              <p className="mt-1 text-body-sm text-muted-foreground">
                {nilaiLabel} = Σ(skor × bobot) ÷ Σ(bobot), hanya atas komponen {scopeMeta.title} yang sudah
                ada nilainya. Kosong berarti belum dinilai, bukan nol.
              </p>
            </div>

            <TableShell className="border-0">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr>
                    <Th className="w-10">No</Th>
                    <Th>Nama Siswa</Th>
                    {scopedComponents.map((component) => (
                      <Th key={component.id} align="center" title={assessmentTypeLabel(component.type)}>
                        {component.code}
                      </Th>
                    ))}
                    <Th align="right">{nilaiLabel}</Th>
                    <Th align="center">Predikat</Th>
                  </tr>
                </thead>
                <tbody>
                  {stats.rows.map((row, index) => (
                    <tr key={row.student.id} className="border-t border-border hover:bg-accent">
                      <Td className="tnum text-muted-foreground">{index + 1}</Td>
                      <Td className="">
                        <span className="font-medium">{row.student.name}</span>
                        <span className="mt-0.5 block text-body-sm text-muted-foreground">
                          {row.student.nis ? `NIS ${row.student.nis}` : EMPTY}
                        </span>
                      </Td>
                      {scopedComponents.map((component) => {
                        const score = row.scores[component.id];
                        const below = typeof score === 'number' && subject.kkm && score < subject.kkm;
                        return (
                          <Td key={component.id} align="center">
                            <span className={cx('tnum', below && 'text-danger')}>
                              {typeof score === 'number' ? score : EMPTY}
                            </span>
                          </Td>
                        );
                      })}
                      <Td align="right">
                        <span
                          className={cx('tnum text-numeric-md', row.belowKkm && 'text-danger')}
                          title={row.belowKkm ? 'Nilai akhir di bawah KKM' : undefined}
                        >
                          {formatScore(row.na)}
                          {row.belowKkm ? ' *' : ''}
                        </span>
                      </Td>
                      <Td align="center">
                        <PredikatBadge predikat={row.predikat} />
                      </Td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border bg-muted">
                    <Td />
                    <Td className="bg-muted text-label-md">Rata-rata kelas</Td>
                    {componentAverages.map((value, index) => (
                      <Td key={scopedComponents[index].id} align="center">
                        <span className="tnum text-numeric-md">{formatScore(value)}</span>
                      </Td>
                    ))}
                    <Td align="right">
                      <span className="tnum text-numeric-md">{formatScore(stats.average)}</span>
                    </Td>
                    <Td align="center" muted>
                      {formatNumber(stats.filled)}/{formatNumber(stats.total)} sel
                    </Td>
                  </tr>
                </tbody>
              </table>
            </TableShell>

            {stats.rows.some((row) => row.belowKkm) ? (
              <p className="flex items-center gap-2 border-t border-border px-5 py-3 text-body-sm text-danger">
                <TriangleAlert size={15} aria-hidden="true" />
                Tanda * menandai nilai akhir di bawah KKM {subject?.kkm}. Nilai ini bisa ditindaklanjuti
                lewat perbaikan atau tugas tambahan.
              </p>
            ) : null}
          </Card>
        )
      ) : !activeStudent || !studentReport ? (
        <Card>
          <EmptyState
            icon={Inbox}
            title="Pilih siswa terlebih dahulu"
            description="Laporan per siswa menampilkan nilai seluruh mata pelajaran untuk satu siswa pada kelas yang dipilih."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-headline-md">Laporan Nilai Siswa · {scopeMeta.title}</h2>
            <p className="mt-1 text-body-sm text-muted-foreground">
              {school?.name} · Kelas {klass?.name} · {activeStudent.name}
              {activeStudent.nis ? ` · NIS ${activeStudent.nis}` : ''}
              {activeStudent.nisn ? ` · NISN ${activeStudent.nisn}` : ''}
            </p>
            <p className="mt-1 text-body-sm text-muted-foreground">
              {nilaiLabel} setiap mata pelajaran dihitung dari komponen {scopeMeta.title} yang sudah ada
              nilainya.
            </p>
          </div>

          <TableShell className="border-0">
            <table className="w-full min-w-[680px] border-collapse">
              <thead>
                <tr>
                  <Th className="w-10">No</Th>
                  <Th>Mata Pelajaran</Th>
                  <Th align="right">KKM</Th>
                  <Th align="right">{nilaiLabel}</Th>
                  <Th align="center">Predikat</Th>
                  <Th>Keterangan</Th>
                </tr>
              </thead>
              <tbody>
                {studentReport.rows.map((row, index) => {
                  const tuntas = row.na !== null && row.na >= row.kkm;
                  return (
                    <tr key={row.subjectId} className="border-t border-border hover:bg-accent">
                      <Td className="tnum text-muted-foreground">{index + 1}</Td>
                      <Td className="">
                        <span className="font-medium">{row.subjectName}</span>
                        <span className="ml-2 text-body-sm text-muted-foreground">{row.code}</span>
                      </Td>
                      <Td align="right" muted>
                        {row.kkm || EMPTY}
                      </Td>
                      <Td align="right">
                        <span className={cx('tnum text-numeric-md', row.na !== null && !tuntas && 'text-danger')}>
                          {formatScore(row.na)}
                        </span>
                      </Td>
                      <Td align="center">
                        <PredikatBadge predikat={row.predikat} />
                      </Td>
                      <Td>
                        {row.na === null ? (
                          <span className="text-body-sm text-muted-foreground">Belum ada nilai</span>
                        ) : tuntas ? (
                          <span className="text-body-sm text-success">Tuntas</span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-body-sm text-danger">
                            <TriangleAlert size={14} aria-hidden="true" />
                            Di bawah KKM
                          </span>
                        )}
                      </Td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-border bg-muted">
                  <Td />
                  <Td className="bg-muted text-label-md">Rata-rata</Td>
                  <Td />
                  <Td align="right">
                    <span className="tnum text-numeric-md">{formatScore(studentReport.average)}</span>
                  </Td>
                  <Td align="center">
                    <PredikatBadge predikat={predikatFor(studentReport.average, settings.predikat)} />
                  </Td>
                  <Td>
                    <span className="text-body-sm text-muted-foreground">
                      {formatNumber(
                        studentReport.rows.filter((row) => row.na !== null).length,
                      )}{' '}
                      dari {formatNumber(studentReport.rows.length)} mapel bernilai
                    </span>
                  </Td>
                </tr>
              </tbody>
            </table>
          </TableShell>

          <p className="border-t border-border px-5 py-3 text-body-sm text-muted-foreground">
            Ambang predikat: A ≥ {settings.predikat.A} · B ≥ {settings.predikat.B} · C ≥{' '}
            {settings.predikat.C} · D di bawahnya. Rata-rata dihitung dari {nilaiLabel} yang tersedia
            saja.
          </p>
        </Card>
      )}
    </div>
  );
}
