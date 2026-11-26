import { Link, useLocation } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/Bits';
import { NAV_ITEMS } from '../components/layout/AppShell';

export default function NotFoundPage() {
  const location = useLocation();

  return (
    <div data-component="not-found-page">
      <Card>
        <EmptyState
          icon={Compass}
          title="Halaman tidak ditemukan"
          description={`Alamat "${location.pathname}" tidak ada di dalam aplikasi ini. Pilih salah satu halaman berikut untuk melanjutkan.`}
          action={
            <Link
              to="/"
              className="inline-flex min-h-touch items-center gap-2 rounded-sm bg-primary px-4 text-label-md font-medium text-primary-foreground hover:bg-primary-700 sm:min-h-control"
            >
              Kembali ke Dashboard
            </Link>
          }
        />
      </Card>

      <nav className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" aria-label="Daftar halaman">
        {NAV_ITEMS.filter((item) => item.to !== '/').map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 hover:border-input hover:bg-accent"
          >
            <item.icon size={18} className="text-primary" aria-hidden="true" />
            <span className="text-label-md">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
