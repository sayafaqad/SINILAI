/*
 * SINILAI service worker — membuat aplikasi tetap terbuka tanpa internet.
 *
 * Aturan agar tetap aman:
 * - Hanya permintaan GET dari origin yang sama yang ditangani.
 * - Permintaan modul saat pengembangan selalu diteruskan ke jaringan, dan
 *   halaman pengembangan (yang memuat /@vite/client) tidak pernah disimpan ke
 *   cache, sehingga server pengembangan dan hot reload tetap berjalan normal.
 * - Navigasi: jaringan lebih dahulu, dengan kerangka aplikasi yang tersimpan
 *   sebagai cadangan saat luring.
 * - Berkas lain: disajikan dari cache lalu diperbarui di latar belakang.
 */

const CACHE = 'sinilai-v2';
const SHELL = ['./index.html'];
const PRACACHE = ['./manifest.webmanifest', './assets/images/icon-512.png'];

function isDevRequest(url) {
  return (
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.startsWith('/__vite') ||
    /\.(jsx|ts|tsx)$/.test(url.pathname)
  );
}

/** Halaman hasil server pengembangan tidak boleh masuk cache. */
function isDevHtml(teks) {
  return teks.includes('/@vite/client') || teks.includes('/src/main.jsx');
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(PRACACHE).catch(() => undefined);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isDevRequest(url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const salinan = response.clone();
          salinan
            .text()
            .then(async (teks) => {
              if (teks && !isDevHtml(teks)) {
                const cache = await caches.open(CACHE);
                await cache.put('./index.html', response.clone());
              }
            })
            .catch(() => undefined);
          return response;
        } catch {
          const cached = await caches.match('./index.html');
          return cached || Response.error();
        }
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok && response.type === 'basic') {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => null);
      return cached || (await network) || Response.error();
    })(),
  );
});
