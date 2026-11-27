import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, FileSpreadsheet } from 'lucide-react';
import { useApp } from '../store/AppStore';
import { FilterBar, FilterField, PageHeader } from '../components/layout/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Select } from '../components/ui/Field';
import {
  EmptyState,
  PredikatBadge,
  SegmentedControl,
  TableShell,
  Td,
  Th,
} from '../components/ui/Bits';
import {
  DEFAULT_RANKING_SCOPE,
  RANKING_SCOPES,
  componentsOfTypes,
  pairStats,
  rankingScope,
} from '../lib/grading';
import { formatNumber, formatScore } from '../lib/format';

/**
 * Peringkat nilai tertinggi satu mata pelajaran:
 * - per kelas: siswa terbaik di kelas yang dipilih;
 * - per sekolah: siswa terbaik dari seluruh kelas di sekolah itu.
 *
 * Peringkat dihitung dari Nilai Akhir yang sama seperti di menu Rekap
 * (Penilaian Harian, UTS, dan UAS dengan bobot masing-masing).
 */
export default function RankingPage() {
  const { schools, classes, subjects, students, componentsByClassSubject, gradeIndex, settings } =
    useApp();

  const [mode, setMode] = useState('kelas');
  const [schoolId, setSchoolId] = useState(schools[0]?.id || '');

  // Data sekolah dimuat setelah halaman ini dipasang. Tanpa penyesuaian ini
  // filter sekolah tetap kosong, sehingga halaman tampak "belum ada data"
  // padahal datanya sudah tersimpan (mis. saat halaman dimuat ulang langsung
  // di alamat ini).
  useEffect(() => {
    if (!schoolId && schools.length > 0) setSchoolId(schools[0].id);
  }, [schoolId, schools]);
  const [subjectId, setSubjectId] = useState('');
  const [classId, setClassId] = useState('');
  const [scope, setScope] = useState(DEFAULT_RANKING_SCOPE);

  const scopedClasses = classes.filter((klass) => klass.schoolId === schoolId);
  const scopedSubjects = subjects.filter((subject) => subject.schoolId === schoolId);
  const activeClassId = classId || scopedClasses[0]?.id || '';
  const activeSubjectId = subjectId || scopedSubjects[0]?.id || '';

  const school = schools.find((item) => item.id === schoolId) || null;
  const subject = scopedSubjects.find((item) => item.id === activeSubjectId) || null;
  const scopeMeta = rankingScope(scope);
  // Komponen penilaian milik kelas, disaring sesuai cakupan yang dipilih.
  const komponenKelas = (idKelas) =>
    componentsOfTypes(
      idKelas && activeSubjectId
        ? componentsByClassSubject[`${idKelas}::${activeSubjectId}`] || []
        : [],
      scopeMeta.types,
    );
  const kelasCakupan = mode === 'kelas' ? [activeClassId] : scopedClasses.map((k) => k.id);
  const adaKomponen = kelasCakupan.some((idKelas) => komponenKelas(idKelas).length > 0);

  const kelasTujuan =
    mode === 'kelas' ? scopedClasses.filter((klass) => klass.id === activeClassId) : scopedClasses;

  const dinilai = [];
  if (subject && adaKomponen) {
    kelasTujuan.forEach((klass) => {
      const anggota = students.filter(
        (student) => student.classId === klass.id && student.status !== 'nonaktif',
      );
      if (anggota.length === 0) return;
      const komponen = komponenKelas(klass.id);
      if (komponen.length === 0) return;
      const { rows } = pairStats({
        students: anggota,
        components: komponen,
        subjectId: subject.id,
        gradeIndex,
        kkm: subject.kkm,
        thresholds: settings.predikat,
      });
      rows
        .filter((row) => row.na !== null)
        .forEach((row) => dinilai.push({ ...row, kelas: klass }));
    });
  }

  dinilai.sort(
    (a, b) => Number(b.na) - Number(a.na) || a.student.name.localeCompare(b.student.name, 'id'),
  );

  // Nilai yang sama memperoleh peringkat yang sama.
  let nomorTerakhir = 0;
  let nilaiTerakhir = null;
  const baris = dinilai.map((row, index) => {
    if (nilaiTerakhir === null || row.na !== nilaiTerakhir) {
      nomorTerakhir = index + 1;
      nilaiTerakhir = row.na;
    }
    return { ...row, nomor: nomorTerakhir };
  });

  const juara = baris[0] || null;

  if (schools.length === 0) {
    return (
      <div data-component="peringkat-page">
        <PageHeader
          title="Peringkat"
          description="Siswa dengan nilai tertinggi pada satu mata pelajaran, per kelas maupun per sekolah."
        />
        <Card>
          <EmptyState
            icon={FileSpreadsheet}
            title="Belum ada data untuk diperingkat"
            description="Tambahkan sekolah, kelas, mata pelajaran, siswa, lalu isi nilainya."
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
    <div data-component="peringkat-page">
      <PageHeader
        title="Peringkat"
        description="Siswa dengan nilai tertinggi pada satu mata pelajaran — per kelas maupun di seluruh sekolah. Cakupan nilai dapat dipilih: PH saja, UTS saja, UAS saja, atau keseluruhannya."
      />

      <FilterBar className="mb-5">
        <FilterField label="Tampilan">
          <SegmentedControl
            label="Pilih tampilan peringkat"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'kelas', label: 'Per kelas' },
              { value: 'sekolah', label: 'Per sekolah' },
            ]}
          />
        </FilterField>

        <FilterField label="Cakupan nilai">
          <SegmentedControl
            label="Pilih cakupan nilai yang diperingkat"
            value={scope}
            onChange={setScope}
            options={RANKING_SCOPES.map((item) => ({ value: item.value, label: item.label }))}
          />
        </FilterField>

        <FilterField label="Sekolah" className="min-w-[200px]">
          <Select
            value={schoolId}
            onChange={(event) => {
              setSchoolId(event.target.value);
              setClassId('');
              setSubjectId('');
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

        {mode === 'kelas' ? (
          <FilterField label="Kelas" className="min-w-[150px]">
            <Select
              value={activeClassId}
              onChange={(event) => setClassId(event.target.value)}
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
        ) : null}

        <FilterField label="Mata Pelajaran" className="min-w-[180px]">
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
      </FilterBar>

      <Card className="mb-5">
        {!adaKomponen ? (
          <EmptyState
            icon={FileSpreadsheet}
            title="Komponen penilaian belum tersedia"
            description={`Kelas yang dipilih belum memiliki komponen untuk cakupan ${scopeMeta.title}. Tambahkan komponen penilaian di menu Kelas, atau pilih cakupan lain.`}
          />
        ) : !juara ? (
          <EmptyState
            icon={Award}
            title="Belum ada nilai untuk mata pelajaran ini"
            description={`Belum ada nilai ${scopeMeta.title} untuk ${
              subject?.name || ''
            }. Isi nilainya di menu Input Nilai agar peringkat dapat dihitung.`}
            action={
              <Link
                to="/nilai"
                className="inline-flex min-h-touch items-center gap-2 rounded-sm bg-primary px-4 text-label-md font-medium text-primary-foreground hover:bg-primary-700 sm:min-h-control"
              >
                Buka Input Nilai
              </Link>
            }
          />
        ) : (
          <div
            className="flex flex-wrap items-center gap-4 p-5"
            data-component="juara-sorotan"
          >
            <span
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"
              aria-hidden="true"
            >
              <Award size={24} />
            </span>
            <div className="min-w-0">
              <p className="text-label-caps uppercase text-muted-foreground">
                Nilai tertinggi · {subject?.name} · {scopeMeta.short}
              </p>
              <p className="truncate text-headline-md text-foreground">{juara.student.name}</p>
              <p className="text-body-sm text-muted-foreground">
                Kelas {juara.kelas.name}
                {mode === 'sekolah' && baris.length > 0
                  ? ` · peringkat 1 dari ${formatNumber(baris.length)} siswa yang sudah dinilai se-${school?.name || 'sekolah ini'}`
                  : ''}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="tnum text-headline-lg text-primary">{formatScore(juara.na)}</p>
              <PredikatBadge predikat={juara.predikat} />
            </div>
          </div>
        )}
      </Card>

      {juara ? (
        <Card className="overflow-hidden">
          <CardHeader
            title={`Daftar peringkat — ${subject?.name || ''} · ${scopeMeta.title}`}
            description={
              mode === 'kelas'
                ? `Kelas ${
                    scopedClasses.find((klass) => klass.id === activeClassId)?.name || '—'
                  } · ${formatNumber(baris.length)} siswa sudah dinilai`
                : `${school?.name || ''} · ${formatNumber(
                    baris.length,
                  )} siswa sudah dinilai dari ${formatNumber(scopedClasses.length)} kelas`
            }
          />
          <TableShell className="rounded-none border-0">
            <table className="w-full min-w-[520px] border-collapse">
              <thead>
                <tr>
                  <Th className="w-20">Peringkat</Th>
                  <Th>Nama Siswa</Th>
                  {mode === 'sekolah' ? <Th>Kelas</Th> : null}
                  <Th align="right">{scopeMeta.naLabel}</Th>
                  <Th align="center">Predikat</Th>
                </tr>
              </thead>
              <tbody>
                {baris.map((row) => (
                  <tr key={row.student.id} className="border-t border-border">
                    <Td className="tnum text-muted-foreground">{row.nomor}</Td>
                    <Td className="font-medium">{row.student.name}</Td>
                    {mode === 'sekolah' ? <Td muted>{row.kelas.name}</Td> : null}
                    <Td align="right" className="font-medium">
                      {formatScore(row.na)}
                    </Td>
                    <Td align="center">
                      <PredikatBadge predikat={row.predikat} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
          <p className="border-t border-border px-5 py-3 text-body-sm text-muted-foreground">
            {scopeMeta.naLabel} = Σ(skor × bobot) ÷ Σ(bobot) atas {scopeMeta.title} masing-masing
            siswa. Siswa yang belum memiliki nilai pada cakupan ini belum masuk daftar, dan nilai yang
            sama memperoleh peringkat yang sama.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
