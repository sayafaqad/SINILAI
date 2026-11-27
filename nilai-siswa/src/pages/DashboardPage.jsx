import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  ClipboardList,
  GraduationCap,
  Inbox,
  Rows3,
  School,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { useApp } from '../store/AppStore';
import { PageHeader, FilterBar, FilterField } from '../components/layout/PageHeader';
import { Card, CardHeader, StatCard } from '../components/ui/Card';
import { Badge, EmptyState, TableShell, Th, Td } from '../components/ui/Bits';
import { Select } from '../components/ui/Field';
import {
  CompletenessList,
  HorizontalBarChart,
  PredikatDistribution,
} from '../components/charts/Charts';
import { collectStats } from '../lib/grading';
import { formatNumber, formatScore, EMPTY } from '../lib/format';

export default function DashboardPage() {
  const {
    loading,
    error,
    schools,
    classes,
    subjects,
    students,
    gradeIndex,
    componentsByClassSubject,
    settings,
  } = useApp();

  const [schoolId, setSchoolId] = useState('');
  const [classId, setClassId] = useState('');

  const scopedClasses = useMemo(
    () => classes.filter((klass) => !schoolId || klass.schoolId === schoolId),
    [classes, schoolId],
  );

  const stats = useMemo(
    () =>
      collectStats({
        classes,
        subjects,
        componentsByClassSubject,
        students,
        gradeIndex,
        thresholds: settings.predikat,
        schoolId: schoolId || null,
        classId: classId || null,
      }),
    [classes, subjects, componentsByClassSubject, students, gradeIndex, settings.predikat, schoolId, classId],
  );

  if (loading) {
    return (
      <div className="py-20 text-center text-body-md text-muted-foreground" role="status">
        Memuat data dari perangkat ini…
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={TriangleAlert}
        title="Data lokal tidak dapat dibuka"
        description={`${error} Muat ulang halaman ini. Jika masih gagal, periksa pengaturan privasi browser agar penyimpanan lokal tidak diblokir.`}
      />
    );
  }

  if (schools.length === 0) {
    return (
      <div data-component="first-run">
        <PageHeader
          title="Dashboard"
          description="Ringkasan nilai siswa lintas sekolah. Belum ada data karena sekolah pertama belum dibuat."
        />
        <Card>
          <EmptyState
            icon={School}
            title="Tambahkan sekolah pertama Anda"
            description="SINILAI dapat menangani banyak sekolah sekaligus. Mulai dengan membuat satu sekolah, lalu tambahkan kelas, mata pelajaran, dan siswa. Mata pelajaran serta komponen penilaian bawaan (Penilaian Harian, UTS, UAS) akan disiapkan otomatis."
            action={
              <Link
                to="/sekolah"
                className="inline-flex min-h-touch items-center gap-2 rounded-sm bg-primary px-4 text-label-md font-medium text-primary-foreground hover:bg-primary-700 sm:min-h-control"
              >
                Tambah Sekolah
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  const selectedSchool = schools.find((school) => school.id === schoolId);

  return (
    <div data-component="dashboard-page">
      <PageHeader
        title="Dashboard"
        description="Ringkasan jumlah data dan capaian nilai pada lingkup yang dipilih. Semua angka dihitung dari nilai yang sudah diinput di perangkat ini."
      >
        <FilterBar>
          <FilterField label="Sekolah" className="min-w-[220px]">
            <Select
              value={schoolId}
              onChange={(event) => {
                setSchoolId(event.target.value);
                setClassId('');
              }}
              aria-label="Filter sekolah"
            >
              <option value="">Semua sekolah ({schools.length})</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </Select>
          </FilterField>
          <FilterField label="Kelas" className="min-w-[180px]">
            <Select
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
              aria-label="Filter kelas"
            >
              <option value="">Semua kelas</option>
              {scopedClasses.map((klass) => (
                <option key={klass.id} value={klass.id}>
                  {klass.name}
                </option>
              ))}
            </Select>
          </FilterField>
          <p className="ml-auto text-body-sm text-muted-foreground">
            {selectedSchool ? selectedSchool.name : 'Seluruh sekolah'} · tahun ajaran{' '}
            {settings.activeAcademicYear}
          </p>
        </FilterBar>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Sekolah"
          value={formatNumber(schoolId ? 1 : schools.length)}
          hint={schoolId ? selectedSchool?.name : 'Terdaftar di aplikasi'}
          icon={School}
        />
        <StatCard
          label="Kelas"
          value={formatNumber(stats.classes)}
          hint={`${formatNumber(
            classes.filter((klass) => !schoolId || klass.schoolId === schoolId).length,
          )} kelas pada lingkup ini`}
          icon={Rows3}
        />
        <StatCard
          label="Siswa"
          value={formatNumber(stats.students)}
          hint={`${formatNumber(stats.gradedStudents)} siswa terhubung ke kelas`}
          icon={Users}
        />
        <StatCard
          label="Mata Pelajaran"
          value={formatNumber(stats.subjects)}
          hint="Termasuk KKM tiap mapel"
          icon={BookOpen}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Rata-rata Nilai Akhir"
          value={formatScore(stats.averageNa)}
          hint={`Dari ${formatNumber(stats.gradedCount)} nilai akhir siswa`}
          icon={ClipboardList}
        />
        <StatCard
          label="Kelengkapan Input"
          value={stats.completeness === null ? EMPTY : `${stats.completeness}%`}
          hint={`${formatNumber(stats.filledCells)} dari ${formatNumber(stats.totalCells)} sel terisi`}
        />
        <StatCard
          label="Nilai di Bawah KKM"
          value={formatNumber(stats.belowKkm)}
          hint="Nilai akhir per siswa per mapel"
        />
        <StatCard
          label="Belum Ada Nilai"
          value={formatNumber(stats.predikat.none)}
          hint="Kombinasi siswa–mapel tanpa nilai akhir"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card data-component="chart-card">
          <CardHeader
            title="Rata-rata nilai per mata pelajaran"
            description="Rata-rata Nilai Akhir seluruh siswa pada lingkup terpilih, diurutkan dari tertinggi."
          />
          <div className="p-5">
            <HorizontalBarChart
              items={stats.perSubject.map((item) => ({
                key: item.subjectId,
                label: item.subjectName,
                value: item.average,
              }))}
              ariaLabel="Rata-rata nilai per mata pelajaran"
              emptyTitle="Belum ada nilai akhir"
              emptyDescription="Grafik muncul setelah nilai diinput pada menu Input Nilai."
            />
          </div>
        </Card>

        <Card data-component="chart-card">
          <CardHeader
            title="Distribusi predikat"
            description={`Sebaran Nilai Akhir pada band predikat A ≥ ${settings.predikat.A}, B ≥ ${settings.predikat.B}, C ≥ ${settings.predikat.C}, D di bawahnya.`}
          />
          <div className="p-5">
            <PredikatDistribution counts={stats.predikat} />
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card data-component="completeness-card">
          <CardHeader
            title="Kelengkapan input nilai per kelas"
            description="Persentase sel nilai yang sudah terisi dari seluruh kombinasi siswa, mata pelajaran, dan komponen penilaian."
          />
          <div className="p-5">
            <CompletenessList
              items={stats.perClass}
              emptyTitle="Belum ada kelas pada lingkup ini"
              emptyDescription="Tambahkan kelas pada menu Kelas untuk mulai menginput nilai."
            />
          </div>
        </Card>

        <Card data-component="subject-table-card">
          <CardHeader
            title="Ringkasan per mata pelajaran"
            description="Jumlah siswa yang sudah memiliki nilai akhir beserta kelengkapannya."
          />
          <div className="p-5 pt-0">
            {stats.perSubject.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="Belum ada mata pelajaran"
                description="Tambahkan mata pelajaran pada menu Mata Pelajaran."
              />
            ) : (
              <TableShell className="mt-4">
                <table className="w-full min-w-[520px] border-collapse">
                  <thead>
                    <tr>
                      <Th>Siswa dinilai</Th>
                      <Th>Kelengkapan</Th>
                      <Th align="right">Rata-rata</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.perSubject.map((item) => (
                      <tr key={item.subjectId} className="border-t border-border hover:bg-accent">
                        <Td>
                          <span className="font-medium">{item.subjectName}</span>
                          <span className="ml-2 text-body-sm text-muted-foreground">{item.code}</span>
                        </Td>
                        <Td muted>
                          {formatNumber(item.gradedStudents)} dari {formatNumber(item.studentCount)} siswa
                          {item.completeness === null ? '' : ` · ${item.completeness}% terisi`}
                        </Td>
                        <Td align="right">{formatScore(item.average)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableShell>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-5 py-4">
        <Badge tone="info">Langkah berikutnya</Badge>
        <p className="text-body-md text-muted-foreground">
          Input nilai Penilaian Harian, UTS, dan UAS per kelas dan mata pelajaran.
        </p>
        <Link
          to="/nilai"
          className="ml-auto inline-flex min-h-touch items-center gap-2 rounded-sm bg-primary px-4 text-label-md font-medium text-primary-foreground hover:bg-primary-700 sm:min-h-control"
        >
          <GraduationCap size={17} aria-hidden="true" />
          Input Nilai
        </Link>
      </div>
    </div>
  );
}
