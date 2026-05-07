/**
 * Persistent blob store for FileHistory items.
 *
 * Each HistoryItem.id maps to a Blob in IndexedDB. Replaces the old
 * base64-into-localStorage approach, which exhausted the ~5 MB localStorage
 * quota on a single moderate merge and caused fresh files to flash the
 * "storage full" chip the moment they were created.
 *
 * Lifecycle:
 * - `saveHistoryBlob(id, blob)` writes the blob; resolves to `false` if
 *   the IDB write fails (private mode, quota for the IDB store) so the
 *   caller can flag the item as locked from the start.
 * - `getHistoryBlob(id)` reads it back during re-download.
 * - `pruneHistoryBlobs(idsToKeep)` evicts blobs for items no longer in
 *   the metadata list (the item dropped off the MAX_ITEMS-trimmed list,
 *   or its TTL expired).
 *
 * Pure no-ops on the server, in private mode without IDB, or on
 * unexpected errors — the FileHistory component handles missing blobs
 * by surfacing the lock UI.
 */

import { DB_STORES, txStore } from './db';

const STORE = DB_STORES.history;

interface HistoryBlobEntry {
  blob: Blob;
  createdAt: number;
}

export async function saveHistoryBlob(id: string, blob: Blob): Promise<boolean> {
  if (typeof indexedDB === 'undefined') return false;
  try {
    await txStore<IDBValidKey>(STORE, 'readwrite', store =>
      store.put({ blob, createdAt: Date.now() } as HistoryBlobEntry, id),
    );
    return true;
  } catch {
    return false;
  }
}

export async function getHistoryBlob(id: string): Promise<Blob | null> {
  if (typeof indexedDB === 'undefined') return null;
  try {
    const entry = await txStore<HistoryBlobEntry | undefined>(STORE, 'readonly', store =>
      store.get(id),
    );
    return entry?.blob ?? null;
  } catch {
    return null;
  }
}

export async function deleteHistoryBlob(id: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  try {
    await txStore<undefined>(STORE, 'readwrite', store => store.delete(id));
  } catch {
    // ignore
  }
}

export async function pruneHistoryBlobs(idsToKeep: Set<string>): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  try {
    const keys = await txStore<IDBValidKey[]>(STORE, 'readonly', store =>
      store.getAllKeys(),
    );
    const toDelete = keys.filter(k => typeof k === 'string' && !idsToKeep.has(k));
    for (const k of toDelete) {
      await txStore<undefined>(STORE, 'readwrite', store => store.delete(k));
    }
  } catch {
    // ignore
  }
}
