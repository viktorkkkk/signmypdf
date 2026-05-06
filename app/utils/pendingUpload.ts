/**
 * Cross-page file handoff via IndexedDB.
 *
 * The hub page at "/" accepts drag-and-drop uploads, stores the File here,
 * then routes to /sign (or any tool page). The target page reads and
 * CONSUMES the file on mount, clearing it from storage so refresh doesn't
 * re-trigger the flow.
 *
 * Why IndexedDB over sessionStorage: PDFs up to 100MB are allowed; base64
 * in sessionStorage caps at ~4-10MB depending on browser and fails silently
 * over the limit. IndexedDB handles blobs natively with a >50MB quota.
 *
 * TTL: entries older than 5 minutes are discarded — a stale handoff is
 * almost always a bug or an abandoned flow, not a legitimate retry.
 */

import { DB_STORES, txStore } from './db';

const STORE = DB_STORES.pending;
const KEY = 'current';
const TTL_MS = 5 * 60 * 1000;

interface Pending {
  blob: Blob;
  name: string;
  type: string;
  createdAt: number;
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return txStore<T>(STORE, mode, fn);
}

/** Store a File for pickup by a tool page. Overwrites any existing entry. */
export async function storePendingFile(file: File): Promise<void> {
  if (typeof indexedDB === 'undefined') {
    console.warn('[idb:store] indexedDB undefined — skipped', file.name);
    return;
  }
  const payload: Pending = {
    blob: file,
    name: file.name,
    type: file.type || 'application/pdf',
    createdAt: Date.now(),
  };
  console.log('[idb:store] put start', { name: file.name, size: file.size, type: payload.type });
  try {
    await tx('readwrite', store => store.put(payload, KEY));
    console.log('[idb:store] put OK', file.name);
  } catch (e) {
    // IndexedDB blocked (private mode, quota) — no-op; the tool page's own
    // dropzone is the user's fallback.
    console.error('[idb:store] put FAIL', e);
  }
}

/** Read and delete the pending File. Returns null if none or expired. */
export async function consumePendingFile(): Promise<File | null> {
  if (typeof indexedDB === 'undefined') {
    console.warn('[idb:consume] indexedDB undefined — null');
    return null;
  }
  try {
    console.log('[idb:consume] get start');
    const entry = await tx<Pending | undefined>('readonly', store => store.get(KEY));
    if (!entry) {
      console.log('[idb:consume] get → no entry');
      return null;
    }
    const ageMs = Date.now() - entry.createdAt;
    console.log('[idb:consume] get → entry', { name: entry.name, ageMs, expired: ageMs > TTL_MS });
    if (ageMs > TTL_MS) {
      await clearPendingFile();
      console.log('[idb:consume] expired, cleared');
      return null;
    }
    await clearPendingFile();
    console.log('[idb:consume] returning File', entry.name);
    return new File([entry.blob], entry.name, { type: entry.type });
  } catch (e) {
    console.error('[idb:consume] FAIL', e);
    return null;
  }
}

export async function clearPendingFile(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  try {
    await tx('readwrite', store => store.delete(KEY));
  } catch {
    // ignore
  }
}
