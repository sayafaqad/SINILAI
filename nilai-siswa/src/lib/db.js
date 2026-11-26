/**
 * Local persistence adapter.
 *
 * SINILAI stores everything in this browser only — no login, no server, no sync.
 * Primary engine is IndexedDB (handles tens of thousands of score records);
 * when IndexedDB is unavailable the same API silently falls back to
 * localStorage so the app keeps working honestly in local mode.
 */

const DB_NAME = 'sinilai-local';
const DB_VERSION = 1;
const LS_PREFIX = 'sinilai:store:';

export const STORES = ['schools', 'classes', 'subjects', 'components', 'students', 'grades', 'meta'];

/** meta is a single-row store keyed by `key`; everything else is keyed by `id`. */
function keyPathOf(store) {
  return store === 'meta' ? 'key' : 'id';
}

let mode = 'indexeddb';
let dbPromise = null;

function openDatabase() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      mode = 'localstorage';
      resolve(null);
      return;
    }
    let request;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      mode = 'localstorage';
      resolve(null);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      STORES.forEach((store) => {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: keyPathOf(store) });
        }
      });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      mode = 'localstorage';
      resolve(null);
    };
    request.onblocked = () => {
      mode = 'localstorage';
      resolve(null);
    };
  });
  return dbPromise;
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/* ── localStorage fallback ─────────────────────────────────────────────── */

function lsRead(store) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + store);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function lsWrite(store, rows) {
  try {
    localStorage.setItem(LS_PREFIX + store, JSON.stringify(rows));
  } catch {
    /* storage full or blocked — the in-memory state stays the truth for this session */
  }
}

function lsPut(store, record) {
  const key = keyPathOf(store);
  const rows = lsRead(store);
  const index = rows.findIndex((row) => row[key] === record[key]);
  if (index >= 0) rows[index] = record;
  else rows.push(record);
  lsWrite(store, rows);
  return record;
}

/* ── public API ────────────────────────────────────────────────────────── */

export function storageMode() {
  return mode;
}

export async function readAll(store) {
  const db = await openDatabase();
  if (!db) return lsRead(store);
  const tx = db.transaction(store, 'readonly');
  const rows = await requestToPromise(tx.objectStore(store).getAll());
  await transactionDone(tx);
  return rows || [];
}

export async function readAllCollections() {
  const entries = await Promise.all(STORES.map(async (store) => [store, await readAll(store)]));
  return Object.fromEntries(entries);
}

export async function put(store, record) {
  const db = await openDatabase();
  if (!db) return lsPut(store, record);
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).put(record);
  await transactionDone(tx);
  return record;
}

export async function putMany(store, records) {
  if (!records || records.length === 0) return [];
  const db = await openDatabase();
  if (!db) {
    records.forEach((record) => lsPut(store, record));
    return records;
  }
  const tx = db.transaction(store, 'readwrite');
  const objectStore = tx.objectStore(store);
  records.forEach((record) => objectStore.put(record));
  await transactionDone(tx);
  return records;
}

export async function remove(store, id) {
  const db = await openDatabase();
  if (!db) {
    const key = keyPathOf(store);
    lsWrite(
      store,
      lsRead(store).filter((row) => row[key] !== id),
    );
    return;
  }
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).delete(id);
  await transactionDone(tx);
}

export async function removeMany(store, ids) {
  if (!ids || ids.length === 0) return;
  const db = await openDatabase();
  if (!db) {
    const key = keyPathOf(store);
    const unwanted = new Set(ids);
    lsWrite(
      store,
      lsRead(store).filter((row) => !unwanted.has(row[key])),
    );
    return;
  }
  const tx = db.transaction(store, 'readwrite');
  const objectStore = tx.objectStore(store);
  ids.forEach((id) => objectStore.delete(id));
  await transactionDone(tx);
}

export async function clearStores(stores) {
  const db = await openDatabase();
  if (!db) {
    stores.forEach((store) => lsWrite(store, []));
    return;
  }
  const tx = db.transaction(stores, 'readwrite');
  stores.forEach((store) => tx.objectStore(store).clear());
  await transactionDone(tx);
}

/** Atomically replace a whole collection (used by restore). */
export async function replaceStore(store, records) {
  const db = await openDatabase();
  if (!db) {
    lsWrite(store, records);
    return records;
  }
  const tx = db.transaction(store, 'readwrite');
  const objectStore = tx.objectStore(store);
  objectStore.clear();
  records.forEach((record) => objectStore.put(record));
  await transactionDone(tx);
  return records;
}
