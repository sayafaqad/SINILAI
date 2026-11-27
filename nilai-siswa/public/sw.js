/*
 * Service worker SINILAI.
 *
 * Tujuan: aplikasi tetap terbuka tanpa internet, tetapi pembaruan tidak pernah
 * tertahan di cache lama.
 *
 * Aturan:
 * - Halaman (navigasi) selalu diambil dari jaringan lebih dulu; cache hanya
 *   dipakai bila jaringan gagal. Ini yang mencegah "versi lama" muncul terus.
 * - Berkas statis (JS/CSS/ikon) memakai cache sambil memperbarui di latar.
 * - Cache lama dihapus setiap kali berkas ini berubah (nama cache berisi versi).
 * - Pada server pengembangan lokal (vite dev) tidak ada yang di-cache.
 */
const VERSI_CACHE = 'sinilai-v5';
const CACHE_HALAMAN = `${VERSI_CACHE}-halaman`;
const CACHE_ASET = `${VERSI_CACHE}-aset`;
const JALUR_DEV = ['/src/', '/@', '/node_modules/', '/__vite'];
const LOOPBACK = ['127.0.0.1', 'localhost', '[::1]'].includes(self.location.hostname);

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_HALAMAN));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const nama = await caches.keys();
      await Promise.all(
        nama
          .filter((n) => !n.startsWith(VERSI_CACHE))
          .map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

function bolehCache(request) {
  if (request.method !== 'GET') return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  if (JALUR_DEV.some((awalan) => url.pathname.startsWith(awalan))) return false;
  if (url.pathname.endsWith('.jsx') || url.pathname.endsWith('.tsx')) return false;
  return true;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!bolehCache(request)) return;

  // Navigasi: jaringan dulu (maks 3,5 detik), cache hanya sebagai cadangan.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_HALAMAN);
        try {
          const batas = new Promise((_, tolak) => setTimeout(tolak, 3500));
          const respons = await Promise.race([fetch(request), batas]);
          if (respons && respons.ok) {
            const salinan = respons.clone();
            cache.put(new Request(self.registration.scope), salinan);
          }
          return respons;
        } catch (error) {
          const tersimpan =
            (await cache.match(new Request(self.registration.scope))) ||
            (await cache.match('./index.html')) ||
            (await cache.match('./'));
          if (tersimpan) return tersimpan;
          return new Response(
            '<!doctype html><meta charset="utf-8"><title>SINILAI</title>' +
              '<p style="font:16px system-ui;padding:24px">Aplikasi belum tersimpan untuk mode luring. ' +
              'Sambungkan internet lalu buka kembali.</p>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
          );
        }
      })(),
    );
    return;
  }

  if (LOOPBACK) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_ASET);
      const tersimpan = await cache.match(request);
      const dariJaringan = fetch(request)
        .then((respons) => {
          if (respons && respons.ok) cache.put(request, respons.clone());
          return respons;
        })
        .catch(() => null);
      return tersimpan || (await dariJaringan) || Response.error();
    })(),
  );
});
