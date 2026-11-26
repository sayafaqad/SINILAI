import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

/*
 * Register the service worker so an installed copy of SINILAI keeps working
 * without internet. The worker itself skips caching on the local preview, so
 * development stays unaffected.
 */
const supportsServiceWorker =
  'serviceWorker' in navigator && window.location.protocol.indexOf('http') === 0;

if (supportsServiceWorker) {
  window.addEventListener('load', () => {
    const workerUrl = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker.register(workerUrl, { scope: import.meta.env.BASE_URL }).catch(() => {
      /* offline support is optional — the app still works without it */
    });
  });
}
