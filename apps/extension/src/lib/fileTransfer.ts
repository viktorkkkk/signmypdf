import { MAX_PDF_BYTES, PENDING_PDF_KEY } from './constants';
import type { PendingPdf } from '../types/messages';

/** Result of attempting to stash a PDF for handoff. */
export type StashResult =
  | { ok: true; size: number }
  | { ok: false; reason: 'too-large' | 'not-pdf' | 'storage' };

/**
 * Read a File as base64 (no `data:` prefix). The browser's
 * `FileReader.readAsDataURL` returns the prefix-laden form, so we
 * strip it here — bridge.ts re-attaches the right MIME prefix when
 * reconstituting the Blob on the page side.
 */
export async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + CHUNK)),
    );
  }
  return btoa(binary);
}

/** Strip path separators, keep only the basename. */
function sanitiseFilename(name: string): string {
  return name.replace(/^.*[\\/]/, '').slice(0, 200) || 'document.pdf';
}

/**
 * Validate, encode, and stash a PDF into `chrome.storage.local`.
 * Returns a discriminated result so callers can render the right
 * empty-state / error UI.
 *
 * Internal helper now — popup was removed in Stage 5 PR 4, so the
 * only call site is the context-menu path below. Kept un-exported
 * so accidental new callers don't bypass the URL-fetch wrapper.
 */
async function stashPdfForHandoff(
  file: File,
  source: PendingPdf['source'],
): Promise<StashResult> {
  if (file.type && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return { ok: false, reason: 'not-pdf' };
  }
  if (file.size > MAX_PDF_BYTES) {
    return { ok: false, reason: 'too-large' };
  }
  try {
    const base64 = await fileToBase64(file);
    const record: PendingPdf = {
      base64,
      filename: sanitiseFilename(file.name),
      size: file.size,
      timestamp: Date.now(),
      source,
    };
    await chrome.storage.local.set({ [PENDING_PDF_KEY]: record });
    return { ok: true, size: file.size };
  } catch {
    return { ok: false, reason: 'storage' };
  }
}

/** Helper for the service worker context-menu path. */
export async function stashPdfFromUrl(url: string): Promise<StashResult> {
  try {
    const res = await fetch(url);
    if (!res.ok) return { ok: false, reason: 'storage' };
    const blob = await res.blob();
    const guessedName = url.split('/').pop()?.split('?')[0] || 'document.pdf';
    const file = new File([blob], guessedName, { type: 'application/pdf' });
    return stashPdfForHandoff(file, 'context-menu');
  } catch {
    return { ok: false, reason: 'storage' };
  }
}
