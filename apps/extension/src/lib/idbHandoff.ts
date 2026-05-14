/**
 * IndexedDB transport for handing a PDF blob from the popup or the
 * service worker into the editor tab.
 *
 * Why IndexedDB and not chrome.storage.session:
 *   - chrome.storage.session has a 10 MB hard quota across the whole
 *     extension; scanned PDFs of 30-80 MB are common, so we'd reject
 *     real files. IDB has effectively no quota for our use case.
 *   - Storage is tab-local for the lifetime of the editor session and
 *     wiped on three triggers: editor's beforeunload, background's
 *     chrome.tabs.onRemoved, and a TTL sweep on every editor mount.
 *
 * Schema:
 *   DB:    "sign-pdf-handoff"
 *   store: "pdfs"
 *   keyPath: "id"
 *   record: { id, blob, filename, createdAt }
 */

const DB_NAME = 'sign-pdf-handoff';
const STORE = 'pdfs';
const DB_VERSION = 1;
/** TTL for orphaned records swept on editor mount (1 hour). */
export const HANDOFF_TTL_MS = 60 * 60 * 1000;

export interface HandoffRecord {
  id: string;
  blob: Blob;
  filename: string;
  createdAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Promise-wrap a single transaction; resolves on `oncomplete` so the
 *  caller can rely on the write being durable across IDB connections. */
function tx<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T> | undefined,
): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    let value: T | undefined;
    const req = run(store);
    if (req) {
      req.onsuccess = () => { value = req.result; };
      req.onerror = () => reject(req.error);
    }
    t.oncomplete = () => resolve(value);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

function newId(): string {
  // crypto.randomUUID is available in extension contexts (service worker,
  // popup, editor page) since Chrome 92.
  return crypto.randomUUID();
}

/** Write a PDF blob and return its handoff id. */
export async function putPdf(blob: Blob, filename: string): Promise<string> {
  const db = await openDb();
  const id = newId();
  await tx(db, 'readwrite', store =>
    store.put({ id, blob, filename, createdAt: Date.now() } satisfies HandoffRecord),
  );
  db.close();
  return id;
}

/** Read a PDF blob by id, or null if it's gone (cleaned up / expired). */
export async function getPdf(id: string): Promise<HandoffRecord | null> {
  const db = await openDb();
  const rec = await tx<HandoffRecord>(db, 'readonly', store => store.get(id));
  db.close();
  return rec ?? null;
}

/** Delete one record. Used by the editor on beforeunload and by the
 *  background's tabs.onRemoved listener as a backstop. */
export async function deletePdf(id: string): Promise<void> {
  const db = await openDb();
  await tx(db, 'readwrite', store => store.delete(id));
  db.close();
}

/** Sweep records older than maxAgeMs. Returns the number removed.
 *  Runs on every editor mount so crashes that miss the beforeunload
 *  cleanup don't accumulate stale blobs. */
export async function cleanupOldEntries(maxAgeMs: number = HANDOFF_TTL_MS): Promise<number> {
  const db = await openDb();
  const cutoff = Date.now() - maxAgeMs;
  const removed = await new Promise<number>((resolve, reject) => {
    const t = db.transaction(STORE, 'readwrite');
    const store = t.objectStore(STORE);
    let count = 0;
    const cursorReq = store.openCursor();
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (!cursor) return;
      const rec = cursor.value as HandoffRecord;
      if (rec.createdAt < cutoff) {
        cursor.delete();
        count++;
      }
      cursor.continue();
    };
    cursorReq.onerror = () => reject(cursorReq.error);
    t.oncomplete = () => resolve(count);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
  db.close();
  return removed;
}
