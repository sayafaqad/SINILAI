/**
 * "Pasang di HP" helpers.
 *
 * SINILAI ships as an installable web app (PWA): Android installs it from Chrome,
 * iPhone/iPad from Safari via "Tambahkan ke Layar Utama". Both give a home-screen
 * icon that opens full screen and keeps working offline.
 */
import { useEffect, useState } from 'react';
import { CheckCircle2, Download, Share, Smartphone, X } from 'lucide-react';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { cx } from '../../lib/format';

const DISMISS_KEY = 'sinilai:install-hint-dismissed';

/** True when the page is already running as an installed app. */
export function isStandalone() {
  if (typeof window === 'undefined') return false;
  // Packaged Android build: the native wrapper injects this bridge.
  if (typeof window.AndroidAplikasi !== 'undefined') return true;
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches;
  const minimal = window.matchMedia?.('(display-mode: minimal-ui)').matches;
  return Boolean(standalone || minimal || window.navigator.standalone === true);
}

function detectPlatform() {
  if (typeof navigator === 'undefined') return 'lain';
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'lain';
}

function readDismissed() {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

function writeDismissed() {
  try {
    window.localStorage.setItem(DISMISS_KEY, '1');
  } catch {
    /* storage blocked — the hint simply shows again next time */
  }
}

/** Shared install state: whether the app is installed and whether we may prompt. */
export function useInstallState() {
  const [installed, setInstalled] = useState(isStandalone);
  const [promptEvent, setPromptEvent] = useState(null);
  const [platform, setPlatform] = useState(detectPlatform);

  useEffect(() => {
    setPlatform(detectPlatform());
    const onPrompt = (event) => {
      event.preventDefault();
      setPromptEvent(event);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    const query = window.matchMedia?.('(display-mode: standalone)');
    const onChange = () => setInstalled(isStandalone());
    query?.addEventListener?.('change', onChange);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      query?.removeEventListener?.('change', onChange);
    };
  }, []);

  async function install() {
    if (!promptEvent) return 'unavailable';
    promptEvent.prompt();
    const choice = await promptEvent.userChoice.catch(() => ({ outcome: 'dismissed' }));
    setPromptEvent(null);
    return choice?.outcome || 'dismissed';
  }

  return { installed, canPrompt: Boolean(promptEvent), platform, install };
}

function Step({ icon: Icon, title, children }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-primary">
        <Icon size={15} aria-hidden="true" />
      </span>
      <span className="text-body-sm">
        <span className="font-medium text-foreground">{title}</span>{' '}
        <span className="text-muted-foreground">{children}</span>
      </span>
    </li>
  );
}

/** Full card with platform-specific steps, shown on the Settings page. */
export function InstallAppCard({ className }) {
  const { installed, canPrompt, platform, install } = useInstallState();
  const [busy, setBusy] = useState(false);

  async function handleInstall() {
    setBusy(true);
    try {
      await install();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className={className} data-component="install-app-card">
      <CardHeader
        title="Pasang sebagai aplikasi di HP"
        description="SINILAI dapat dipasang di Android dan iPhone seperti aplikasi biasa: ikon di layar utama, terbuka penuh tanpa alamat situs, dan tetap bisa dipakai tanpa internet."
        action={
          canPrompt ? (
            <Button icon={Download} onClick={handleInstall} disabled={busy}>
              {busy ? 'Menyiapkan…' : 'Pasang aplikasi'}
            </Button>
          ) : null
        }
      />

      <div className="flex flex-col gap-4 p-5 pt-4">
        {installed ? (
          <p className="flex items-center gap-2 rounded-md bg-success-surface px-4 py-2.5 text-body-sm text-success">
            <CheckCircle2 size={16} aria-hidden="true" />
            Aplikasi sudah terpasang dan sedang dibuka dalam mode aplikasi di perangkat ini.
          </p>
        ) : (
          <p className="rounded-md bg-info-surface px-4 py-2.5 text-body-sm text-info">
            {platform === 'android'
              ? 'Anda membuka dari Android. Ikuti langkah di bawah, atau tekan tombol “Pasang aplikasi” bila muncul.'
              : platform === 'ios'
                ? 'Anda membuka dari iPhone/iPad. Pemasangan dilakukan lewat Safari, dengan langkah berikut.'
                : 'Buka halaman ini dari browser HP (Chrome di Android, Safari di iPhone), lalu ikuti langkah pemasangan.'}
          </p>
        )}

        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <h3 className="flex items-center gap-2 text-label-md text-foreground">
              <Smartphone size={16} aria-hidden="true" />
              Android (Chrome)
            </h3>
            <ol className="mt-2.5 flex flex-col gap-2.5">
              <Step icon={Download} title="Buka SINILAI di Chrome.">
                Tunggu beberapa detik sampai halaman selesai dimuat.
              </Step>
              <Step icon={Smartphone} title="Tekan tombol menu ⋮ di kanan atas.">
                Pilih “Instal aplikasi” atau “Tambahkan ke Layar utama”.
              </Step>
              <Step icon={CheckCircle2} title="Tekan Instal.">
                Ikon SINILAI akan muncul di layar utama seperti aplikasi biasa.
              </Step>
            </ol>
          </div>

          <div>
            <h3 className="flex items-center gap-2 text-label-md text-foreground">
              <Share size={16} aria-hidden="true" />
              iPhone / iPad (Safari)
            </h3>
            <ol className="mt-2.5 flex flex-col gap-2.5">
              <Step icon={Share} title="Buka SINILAI di Safari.">
                Gunakan Safari, bukan browser lain di iPhone.
              </Step>
              <Step icon={Share} title="Tekan tombol Bagikan.">
                Ikon kotak dengan panah ke atas, di bagian bawah layar.
              </Step>
              <Step icon={CheckCircle2} title="Pilih “Tambahkan ke Layar Utama”.">
                Lalu tekan “Tambah”. Ikon SINILAI muncul di layar utama.
              </Step>
            </ol>
          </div>
        </div>

        <p className="text-body-sm text-muted-foreground">
          Setelah dipasang, semua data tetap tersimpan di perangkat ini. Untuk memindahkan data ke
          perangkat lain, gunakan cadangan JSON di kartu “Cadangan &amp; pemulihan data”.
        </p>
      </div>
    </Card>
  );
}

/** Slim dismissible hint shown above the page content until the app is installed. */
export function InstallAppBanner() {
  const { installed, canPrompt, platform, install } = useInstallState();
  const [dismissed, setDismissed] = useState(readDismissed);

  if (installed || dismissed) return null;

  const advice =
    platform === 'ios'
      ? 'Di iPhone: tekan Bagikan lalu “Tambahkan ke Layar Utama”.'
      : platform === 'android'
        ? 'Di Android: buka menu ⋮ lalu “Instal aplikasi”.'
        : 'Buka dari HP untuk memasangnya sebagai aplikasi.';

  return (
    <div
      className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-border bg-accent px-4 py-3 text-body-sm text-accent-foreground no-print"
      data-component="install-banner"
    >
      <Smartphone size={16} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="font-medium">Pasang SINILAI di layar utama HP.</span> {advice}
      </span>
      {canPrompt ? (
        <Button size="sm" icon={Download} onClick={() => install()}>
          Pasang
        </Button>
      ) : null}
      <button
        type="button"
        onClick={() => {
          writeDismissed();
          setDismissed(true);
        }}
        aria-label="Tutup pengingat pemasangan"
        className={cx(
          'grid h-8 w-8 place-items-center rounded-sm hover:bg-card/60',
          'text-accent-foreground',
        )}
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
