import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, RotateCcw, Save, TriangleAlert, Users } from 'lucide-react';
import { useApp } from '../store/AppStore';
import { PageHeader, FilterBar, FilterField } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SearchInput, Select } from '../components/ui/Field';
import { ConfirmDialog } from '../components/ui/Overlay';
import { Badge, EmptyState, PredikatBadge, ProgressBar, SegmentedControl, Td, Th } from '../components/ui/Bits';
import { useToast } from '../components/ui/Toast';
import { gradeKey, pairStats, assessmentTypeLabel } from '../lib/grading';
import { EMPTY, cx, formatNumber, formatScore, parseScoreInput } from '../lib/format';

export default function GradesPage() {
  const {
    loading,
    schools,
    classes,
    subjects,
    students,
    componentsByClassSubject,
    gradeIndex,
    saveGrades,
    settings,
  } = useApp();
  const toast = useToast();

  const [schoolId, setSchoolId] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [focusedComponent, setFocusedComponent] = useState('all');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [pendingChange, setPendingChange] = useState(null);

  useEffect(() => {
    if (!schoolId && schools.length > 0) setSchoolId(schools[0].id);
  }, [schools, schoolId]);

  useEffect(() => {
    if (!schoolId) return;
    const scoped = classes.filter((klass) => klass.schoolId === schoolId);
    if (scoped.length > 0 && !scoped.some((klass) => klass.id === classId)) setClassId(scoped[0].id);
    if (scoped.length === 0 && classId) setClassId('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classes, schoolId]);

  useEffect(() => {
    if (!schoolId) return;
    const scoped = subjects.filter((subject) => subject.schoolId === schoolId);
    if (scoped.length > 0 && !scoped.some((subject) => subject.id === subjectId)) {
      setSubjectId(scoped[0].id);
    }
    if (scoped.length === 0 && subjectId) setSubjectId('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjects, schoolId]);

  const components =
    classId && subjectId ? componentsByClassSubject[`${classId}::${subjectId}`] || [] : [];
  const subject = subjects.find((item) => item.id === subjectId) || null;
  const klass = classes.find((item) => item.id === classId) || null;
  const school = schools.find((item) => item.id === schoolId) || null;

  const classStudents = useMemo(
    () =>
      students
        .filter((student) => student.classId === classId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [students, classId],
  );

  const visibleStudents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return classStudents;
    return classStudents.filter(
      (student) =>
        student.name.toLowerCase().includes(needle) ||
        (student.nis || '').toLowerCase().includes(needle),
    );
  }, [classStudents, query]);

  const hasUnsaved = Object.keys(draft).length > 0;

  const valueOf = useCallback(
    (studentId, componentId) => {
      const key = gradeKey(studentId, subjectId, componentId);
      if (draft[key] !== undefined) return draft[key];
      const stored = gradeIndex[key];
      return stored && typeof stored.score === 'number' ? String(stored.score) : '';
    },
    [draft, gradeIndex, subjectId],
  );

  const invalidKeys = useMemo(
    () => Object.entries(draft).filter(([, raw]) => !parseScoreInput(raw).ok).map(([key]) => key),
    [draft],
  );

  const stats = useMemo(
    () =>
      subject && components.length > 0
        ? pairStats({
            students: classStudents,
            components,
            subjectId,
            gradeIndex,
            kkm: subject.kkm,
            thresholds: settings.predikat,
          })
        : null,
    [classStudents, components, subjectId, gradeIndex, subject, settings.predikat],
  );

  useEffect(() => {
    if (!hasUnsaved) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasUnsaved]);

  function requestChange(type, value) {
    if (hasUnsaved) {
      setPendingChange({ type, value });
      return;
    }
    applyChange(type, value);
  }

  function applyChange(type, value) {
    setDraft({});
    if (type === 'school') {
      setSchoolId(value);
      setClassId('');
      setSubjectId('');
    } else if (type === 'class') {
      setClassId(value);
    } else if (type === 'subject') {
      setSubjectId(value);
    }
    setPendingChange(null);
  }

  function handleCellChange(studentId, componentId, raw) {
    const key = gradeKey(studentId, subjectId, componentId);
    const stored = gradeIndex[key];
    const storedValue = stored && typeof stored.score === 'number' ? String(stored.score) : '';
    setDraft((current) => {
      const next = { ...current };
      if (raw === storedValue) delete next[key];
      else next[key] = raw;
      return next;
    });
  }

  async function handleSave() {
    if (invalidKeys.length > 0) {
      toast.error(
        'Ada nilai yang belum benar',
        `${formatNumber(invalidKeys.length)} sel berisi nilai tidak valid. Gunakan angka bulat 0–100.`,
      );
      return;
    }
    const cells = Object.entries(draft).map(([key, raw]) => {
      const [studentId, cellSubjectId, componentId] = key.split('::');
      return {
        studentId,
        subjectId: cellSubjectId,
        componentId,
        score: parseScoreInput(raw).value,
        schoolId,
        classId,
      };
    });
    setSaving(true);
    try {
      const result = await saveGrades(cells);
      setDraft({});
      toast.success(
        'Nilai tersimpan',
        `${formatNumber(result.saved)} nilai disimpan${
          result.cleared > 0 ? `, ${formatNumber(result.cleared)} nilai dikosongkan` : ''
        }.`,
      );
    } catch (error) {
      toast.error('Gagal menyimpan nilai', error?.message || 'Nilai Anda tetap ada di layar — coba simpan lagi.');
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(event, rowIndex, colIndex, rowCount, colCount) {
    let next = null;
    if (event.key === 'Enter' || event.key === 'ArrowDown') next = [rowIndex + 1, colIndex];
    else if (event.key === 'ArrowUp') next = [rowIndex - 1, colIndex];
    if (!next) return;
    event.preventDefault();
    const [r, c] = next;
    if (r < 0 || r >= rowCount || c < 0 || c >= colCount) return;
    const element = document.getElementById(`score-${r}-${c}`);
    if (element) {
      element.focus();
      element.select();
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-body-md text-muted-foreground" role="status">
        Memuat data dari perangkat ini…
      </div>
    );
  }

  if (schools.length === 0) {
    return (
      <div data-component="grades-page">
        <PageHeader title="Input Nilai" description="Input Penilaian Harian, UTS, dan UAS." />
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="Belum ada sekolah"
            description="Mulai dengan menambahkan sekolah, lalu kelas, mata pelajaran, dan siswa sebelum menginput nilai."
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

  const incomplete = !classId || !subjectId || components.length === 0;

  return (
    <div data-component="grades-page">
      <PageHeader
        title="Input Nilai"
        description="Pilih sekolah, kelas, dan mata pelajaran, lalu isi nilai setiap siswa. Tekan Enter atau panah bawah untuk pindah ke siswa berikutnya pada kolom yang sama."
      >
        <FilterBar>
          <FilterField label="Sekolah" className="min-w-[200px]">
            <Select
              value={schoolId}
              onChange={(event) => requestChange('school', event.target.value)}
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
              value={classId}
              onChange={(event) => requestChange('class', event.target.value)}
              aria-label="Pilih kelas"
              disabled={classes.filter((item) => item.schoolId === schoolId).length === 0}
            >
              {classes.filter((item) => item.schoolId === schoolId).length === 0 ? (
                <option value="">Belum ada kelas</option>
              ) : null}
              {classes
                .filter((item) => item.schoolId === schoolId)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </Select>
          </FilterField>
          <FilterField label="Mata Pelajaran" className="min-w-[200px] flex-1">
            <Select
              value={subjectId}
              onChange={(event) => requestChange('subject', event.target.value)}
              aria-label="Pilih mata pelajaran"
              disabled={subjects.filter((item) => item.schoolId === schoolId).length === 0}
            >
              {subjects.filter((item) => item.schoolId === schoolId).length === 0 ? (
                <option value="">Belum ada mapel</option>
              ) : null}
              {subjects
                .filter((item) => item.schoolId === schoolId)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </Select>
          </FilterField>
          <FilterField label="Cari siswa" className="min-w-[180px]">
            <SearchInput value={query} onChange={setQuery} placeholder="Nama atau NIS…" label="Cari siswa" />
          </FilterField>
        </FilterBar>
      </PageHeader>

      {school && klass && subject ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge tone="primary">{school.name}</Badge>
          <Badge tone="neutral">Kelas {klass.name}</Badge>
          <Badge tone="neutral">{subject.name}</Badge>
          <Badge tone="info">KKM {subject.kkm || '—'}</Badge>
          <span className="text-body-sm text-muted-foreground">
            {formatNumber(classStudents.length)} siswa · {components.length} komponen penilaian
          </span>
        </div>
      ) : null}

      {incomplete ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title={
              !classId
                ? 'Kelas belum dipilih'
                : !subjectId
                  ? 'Mata pelajaran belum dipilih'
                  : 'Komponen penilaian belum disiapkan'
            }
            description={
              !classId
                ? 'Tambahkan kelas terlebih dahulu, lalu daftarkan siswanya.'
                : !subjectId
                  ? 'Tambahkan mata pelajaran untuk sekolah ini.'
                  : 'Atur komponen penilaian dan bobotnya di menu Pengaturan.'
            }
            action={
              <Link
                to={!classId ? '/kelas' : !subjectId ? '/mapel' : '/pengaturan'}
                className="inline-flex min-h-touch items-center gap-2 rounded-sm bg-primary px-4 text-label-md font-medium text-primary-foreground hover:bg-primary-700 sm:min-h-control"
              >
                {!classId ? 'Buka Kelas' : !subjectId ? 'Buka Mata Pelajaran' : 'Buka Pengaturan'}
              </Link>
            }
          />
        </Card>
      ) : classStudents.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="Belum ada siswa di kelas ini"
            description={`Kelas ${klass?.name || ''} belum memiliki siswa. Tambahkan satu per satu atau impor dari Excel.`}
            action={
              <Link
                to="/siswa"
                className="inline-flex min-h-touch items-center gap-2 rounded-sm bg-primary px-4 text-label-md font-medium text-primary-foreground hover:bg-primary-700 sm:min-h-control"
              >
                Buka Siswa
              </Link>
            }
          />
        </Card>
      ) : visibleStudents.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="Tidak ada siswa yang cocok"
            description={`Tidak ada siswa dengan kata kunci "${query}" di kelas ini.`}
            action={
              <Button variant="secondary" onClick={() => setQuery('')}>
                Hapus pencarian
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-label-caps uppercase text-muted-foreground">Fokus kolom</span>
              <SegmentedControl
                label="Pilih komponen penilaian yang difokuskan"
                value={focusedComponent}
                onChange={setFocusedComponent}
                options={[
                  { value: 'all', label: 'Semua' },
                  ...components.map((component) => ({ value: component.id, label: component.code })),
                ]}
              />
            </div>
            {stats ? (
              <>
              <p className="text-body-sm text-muted-foreground">
                {formatNumber(stats.filled)} dari {formatNumber(stats.total)} sel terisi · rata-rata{' '}
                {formatScore(stats.average)}
              </p>
              {components.some((component) => component.note) ? (
                <p className="mt-1 text-body-sm text-muted-foreground">
                  {components
                    .filter((component) => component.note)
                    .map((component) => `${component.code}: ${component.note}`)
                    .join(' · ')}
                </p>
              ) : null}
              </>
            ) : null}
          </div>

          <div className="hidden md:block">
            <div className="table-scroll rounded-lg border border-border bg-card">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <Th className="w-10">No</Th>
                    <Th className="min-w-[220px]">
                      Nama Siswa
                    </Th>
                    {components.map((component) => (
                      <Th
                        key={component.id}
                        align="center"
                        className={cx(
                          'min-w-[92px]',
                          focusedComponent === component.id && 'text-primary',
                        )}
                      >
                        <span className="block">{component.code}</span>
                        {component.date ? (
                          <span className="mt-0.5 block text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                            {component.date.split('-').reverse().join('/')}
                          </span>
                        ) : null}
                        <span className="mt-0.5 block text-[10px] font-normal normal-case tracking-normal opacity-80">
                          {component.weight}% · {assessmentTypeLabel(component.type)}
                        </span>
                      </Th>
                    ))}
                    <Th align="right" className="min-w-[110px]">
                      Nilai Akhir
                    </Th>
                    <Th align="center" className="min-w-[96px]">
                      Predikat
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {visibleStudents.map((student, rowIndex) => {
                    const row = stats?.rows.find((item) => item.student.id === student.id);
                    return (
                      <tr key={student.id} className="border-t border-border hover:bg-accent">
                        <Td className="tnum text-muted-foreground">{rowIndex + 1}</Td>
                        <Td className="">
                          <span className="font-medium">{student.name}</span>
                          <span className="mt-0.5 block text-body-sm text-muted-foreground">
                            {student.nis ? `NIS ${student.nis}` : 'Tanpa NIS'}
                          </span>
                        </Td>
                        {components.map((component, colIndex) => {
                          const key = gradeKey(student.id, subjectId, component.id);
                          const raw = valueOf(student.id, component.id);
                          const parsed = raw === '' ? { ok: true } : parseScoreInput(raw);
                          const belowKkm =
                            parsed.ok && parsed.value !== null && subject.kkm && parsed.value < subject.kkm;
                          return (
                            <Td key={component.id} align="center">
                              <input
                                id={`score-${rowIndex}-${colIndex}`}
                                type="number"
                                inputMode="numeric"
                                min="0"
                                max="100"
                                step="1"
                                value={raw}
                                onChange={(event) =>
                                  handleCellChange(student.id, component.id, event.target.value)
                                }
                                onKeyDown={(event) =>
                                  handleKeyDown(
                                    event,
                                    rowIndex,
                                    colIndex,
                                    visibleStudents.length,
                                    components.length,
                                  )
                                }
                                aria-label={`Nilai ${component.code} untuk ${student.name}`}
                                aria-invalid={!parsed.ok ? 'true' : undefined}
                                className={cx(
                                  'tnum h-8 w-14 rounded-sm border text-center text-numeric-md transition-colors',
                                  'focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/35',
                                  !parsed.ok
                                    ? 'border-danger bg-danger-surface text-danger'
                                    : belowKkm
                                      ? 'border-danger/40 bg-danger-surface text-danger'
                                      : 'border-input bg-card text-foreground',
                                  focusedComponent === component.id &&
                                    parsed.ok &&
                                    !belowKkm &&
                                    'bg-primary-50',
                                )}
                              />
                            </Td>
                          );
                        })}
                        <Td align="right">
                          <span className="inline-flex items-center justify-end gap-1.5">
                            {row?.belowKkm ? (
                              <TriangleAlert
                                size={14}
                                className="text-danger"
                                aria-hidden="true"
                              />
                            ) : null}
                            <span
                              className={cx(
                                'tnum text-numeric-md',
                                row?.belowKkm && 'text-danger',
                              )}
                            >
                              {formatScore(row?.na ?? null)}
                            </span>
                          </span>
                          {row?.belowKkm ? (
                            <span className="mt-0.5 block text-[11px] text-danger">Di bawah KKM</span>
                          ) : null}
                        </Td>
                        <Td align="center">
                          <PredikatBadge predikat={row?.predikat} />
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {visibleStudents.map((student, rowIndex) => {
              const row = stats?.rows.find((item) => item.student.id === student.id);
              return (
                <Card key={student.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{student.name}</p>
                      <p className="text-body-sm text-muted-foreground">
                        {student.nis ? `NIS ${student.nis}` : 'Tanpa NIS'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="tnum text-numeric-md">{formatScore(row?.na ?? null)}</p>
                      <PredikatBadge predikat={row?.predikat} />
                    </div>
                  </div>
                  {row?.belowKkm ? (
                    <p className="mt-2 flex items-center gap-1.5 text-body-sm text-danger">
                      <TriangleAlert size={14} aria-hidden="true" />
                      Nilai akhir di bawah KKM {subject.kkm}
                    </p>
                  ) : null}
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {components.map((component, colIndex) => {
                      const raw = valueOf(student.id, component.id);
                      const parsed = raw === '' ? { ok: true } : parseScoreInput(raw);
                      return (
                        <label
                          key={component.id}
                          className="flex items-center justify-between gap-3 rounded-sm bg-muted px-3 py-2"
                        >
                          <span className="min-w-0">
                            <span className="block text-label-md">{component.code}</span>
                            {component.date ? (
                              <span className="block text-[11px] text-muted-foreground">
                                {component.date.split('-').reverse().join('/')}
                              </span>
                            ) : null}
                            <span className="block text-body-sm text-muted-foreground">
                              bobot {component.weight}%
                            </span>
                          </span>
                          <input
                            id={`score-m-${rowIndex}-${colIndex}`}
                            type="number"
                            inputMode="numeric"
                            min="0"
                            max="100"
                            step="1"
                            value={raw}
                            onChange={(event) =>
                              handleCellChange(student.id, component.id, event.target.value)
                            }
                            aria-label={`Nilai ${component.code} untuk ${student.name}`}
                            aria-invalid={!parsed.ok ? 'true' : undefined}
                            className={cx(
                              'tnum h-10 w-16 rounded-sm border text-center text-numeric-md',
                              !parsed.ok
                                ? 'border-danger bg-danger-surface text-danger'
                                : 'border-input bg-card text-foreground',
                            )}
                          />
                        </label>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>

          <div
            className="sticky bottom-0 z-20 mt-6 flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 shadow-pop no-print"
            data-component="sticky-save-bar"
          >
            <div className="min-w-[180px] flex-1">
              <ProgressBar
                value={stats?.completeness ?? 0}
                label={`Kelengkapan input ${stats?.completeness === null ? EMPTY : `${stats?.completeness ?? 0}%`}`}
              />
            </div>
            <p className="flex items-center gap-2 text-body-sm">
              {hasUnsaved ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-warning" aria-hidden="true" />
                  <span className="text-warning">
                    {formatNumber(Object.keys(draft).length)} perubahan belum disimpan
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">Semua perubahan tersimpan</span>
              )}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                icon={RotateCcw}
                onClick={() => setDraft({})}
                disabled={!hasUnsaved || saving}
              >
                Batalkan
              </Button>
              <Button icon={Save} onClick={handleSave} disabled={!hasUnsaved || saving}>
                {saving ? 'Menyimpan…' : 'Simpan Nilai'}
              </Button>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={Boolean(pendingChange)}
        onClose={() => setPendingChange(null)}
        onConfirm={() => pendingChange && applyChange(pendingChange.type, pendingChange.value)}
        title="Nilai belum disimpan"
        message="Anda memiliki nilai yang belum disimpan pada pilihan saat ini."
        detail="Melanjutkan akan membuang perubahan tersebut. Gunakan tombol Simpan Nilai pada bilah bawah bila ingin menyimpannya lebih dahulu."
        confirmLabel="Lanjutkan tanpa menyimpan"
      />
    </div>
  );
}
