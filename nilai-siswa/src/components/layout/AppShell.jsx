import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  BookOpen,
  ClipboardList,
  FileSpreadsheet,
  Cloud,
  GraduationCap,
  HardDrive,
  LayoutDashboard,
  Menu,
  Rows3,
  School,
  Settings,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { cx } from '../../lib/format';
import { useAuth } from '../../store/AuthStore';
import { InstallAppBanner } from '../pwa/InstallApp';

export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/sekolah', label: 'Data Sekolah', icon: School },
  { to: '/kelas', label: 'Kelas', icon: Rows3 },
  { to: '/mapel', label: 'Mata Pelajaran', icon: BookOpen },
  { to: '/siswa', label: 'Siswa', icon: Users },
  { to: '/nilai', label: 'Input Nilai', icon: ClipboardList },
  { to: '/rekap', label: 'Rekap & Laporan', icon: FileSpreadsheet },
  { to: '/peringkat', label: 'Peringkat', icon: Trophy },
  { to: '/pengaturan', label: 'Pengaturan', icon: Settings },
];

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
        <GraduationCap size={20} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-headline-sm leading-tight text-foreground">SINILAI</span>
        <span className="block truncate text-body-sm text-muted-foreground">Input Nilai Siswa</span>
      </span>
    </div>
  );
}

function NavList({ onNavigate }) {
  return (
    <nav
      className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain px-3 py-4"
      aria-label="Navigasi utama"
    >
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          onClick={onNavigate}
          className={({ isActive }) =>
            cx(
              'relative flex h-row-dense items-center gap-3 rounded-sm px-3 text-label-md transition-colors',
              isActive
                ? 'bg-accent font-medium text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive ? (
                <span
                  className="absolute bottom-1.5 left-0 top-1.5 w-[3px] rounded-full bg-primary"
                  aria-hidden="true"
                />
              ) : null}
              <item.icon size={18} aria-hidden="true" />
              <span className="truncate">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function LocalChip() {
  const { pengguna, email } = useAuth();

  if (pengguna) {
    return (
      <div className="mx-3 mb-4 shrink-0 rounded-md bg-info-surface px-3 py-2.5 text-body-sm text-info">
        <p className="flex items-center gap-2 font-medium">
          <Cloud size={15} aria-hidden="true" />
          Tersinkron
        </p>
        <p className="mt-1 break-all leading-snug opacity-90">{email}</p>
      </div>
    );
  }

  return (
    <div className="mx-3 mb-4 shrink-0 rounded-md bg-info-surface px-3 py-2.5 text-body-sm text-info">
      <p className="flex items-center gap-2 font-medium">
        <HardDrive size={15} aria-hidden="true" />
        Mode lokal
      </p>
      <p className="mt-1 leading-snug opacity-90">
        Data tersimpan di perangkat ini. Masuk ke akun untuk menyinkronkan.
      </p>
    </div>
  );
}

export function AppShell({ children }) {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-layar lg:flex">
      <aside
        className="fixed inset-y-0 left-0 hidden w-sidebar flex-col border-r border-border bg-card lg:flex no-print"
        data-component="sidebar"
      >
        <div className="border-b border-border px-4 py-4">
          <Brand />
        </div>
        <NavList />
        <LocalChip />
      </aside>

      <div className="print-full flex min-h-layar flex-1 flex-col lg:ml-sidebar">
        <header
          className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 lg:hidden no-print"
          data-component="mobile-topbar"
        >
          <Brand />
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="grid h-touch w-touch place-items-center rounded-sm text-foreground hover:bg-accent"
            aria-label="Buka menu navigasi"
            aria-expanded={navOpen}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
        </header>

        <main className="print-root mx-auto w-full max-w-content flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <InstallAppBanner />
          {children}
        </main>

        <footer className="mx-auto w-full max-w-content px-4 pb-6 text-body-sm text-muted-foreground sm:px-6 no-print">
          SINILAI — aplikasi input nilai siswa multi sekolah, multi mata pelajaran.
        </footer>
      </div>

      {navOpen ? (
        <div className="h-layar fixed inset-x-0 top-0 z-40 lg:hidden no-print">
          <div
            className="absolute inset-0 bg-[rgba(15,26,42,0.45)]"
            onClick={() => setNavOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigasi"
            className="relative flex h-full max-h-full w-[280px] shrink-0 flex-col overflow-hidden rounded-r-xl border-r border-border bg-card shadow-layer"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4">
              <Brand />
              <button
                type="button"
                onClick={() => setNavOpen(false)}
                className="grid h-touch w-touch place-items-center rounded-sm text-muted-foreground hover:bg-accent"
                aria-label="Tutup menu navigasi"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <NavList onNavigate={() => setNavOpen(false)} />
            <LocalChip />
          </div>
        </div>
      ) : null}
    </div>
  );
}
