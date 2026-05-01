/**
 * Shared IndexedDB schema for the SignMyPDF app.
 *
 * Two object stores live in the same DB:
 *
 * - `pendingUpload` — single-key handoff for the hub→tool flow. Stores
 *   the File a user dropped on `/`, picked up and consumed on the
 *   destination tool page.
 * - `historyBlobs` — keyed by HistoryItem.id, stores the produced PDF
 *   Blob so re-download works even after the page is closed and reopened.
 *   Replaces the old base64-in-localStorage storage, which blew the
 *   ~5 MB localStorage quota on a single merge of moderate-size PDFs
 *   and caused the "storage full" chip to flash on freshly-created files.
 *
 * Bumping DB_VERSION runs `onupgradeneeded`; the handler creates whichever
 * stores are missing, so old browsers (with only `pendingUpload` from v1)
 * gain `historyBlobs` cleanly without losing the existing pending entry.
 */

const DB_NAME = 'signmypdf';
const DB_VERSION = 2;

export const DB_STORES = {
  pending: 'pendingUpload',
  history: 'historyBlobs',
} as const;

export function openSignmypdfDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORES.pending)) {
        db.createObjectStore(DB_STORES.pending);
      }
      if (!db.objectStoreNames.contains(DB_STORES.history)) {
        db.createObjectStore(DB_STORES.history);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function txStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openSignmypdfDB();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(storeName, mode);
    const store = t.objectStore(storeName);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    t.oncomplete = () => db.close();
    t.onerror = () => db.close();
  });
}
