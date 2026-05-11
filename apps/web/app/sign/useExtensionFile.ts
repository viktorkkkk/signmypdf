'use client';

import { useEffect, useRef } from 'react';

/**
 * Site-side receiver for the Chrome extension handoff.
 *
 * Architecture (matches apps/extension/src/content/bridge.ts):
 *   1. /sign mounts with `?from=extension` in the URL.
 *   2. We attach a `message` listener and post
 *      `{ type: 'SIGNMYPDF_REQUEST_FILE' }` to our own window.
 *   3. The extension's content-script bridge — already injected at
 *      `document_idle` — reads `chrome.storage.local.pendingPdf`,
 *      validates TTL, removes the entry, and posts back
 *      `{ type: 'SIGNMYPDF_FILE_TRANSFER', payload: { base64, ... } }`.
 *   4. We reconstitute the `File` and call `onFile`, which primes
 *      the existing sign editor state.
 *
 * If the extension is not installed, no reply ever arrives — the
 * page falls back to the upload step with the dropzone visible.
 * The hook is intentionally a no-op when `?from=extension` is
 * absent so it has zero cost for normal traffic.
 *
 * Retries on a short backoff (250 / 750 / 1500 ms) cover the rare
 * case where the page's `useEffect` fires before the content
 * script's `message` listener attaches.
 */

export interface ExtensionFileMeta {
  /** Bytes of the original PDF before base64 encoding. */
  size: number;
  /** How the file entered the extension: drag/drop popup or right-click on a link. */
  source: 'popup' | 'context-menu';
}

interface FileTransferPayload {
  base64: string;
  filename: string;
  size: number;
  source: ExtensionFileMeta['source'];
}

interface FileTransferMessage {
  type: 'SIGNMYPDF_FILE_TRANSFER';
  payload: FileTransferPayload;
}

function isFileTransfer(data: unknown): data is FileTransferMessage {
  if (typeof data !== 'object' || data === null) return false;
  const m = data as { type?: unknown; payload?: { base64?: unknown; filename?: unknown } };
  return (
    m.type === 'SIGNMYPDF_FILE_TRANSFER' &&
    typeof m.payload?.base64 === 'string' &&
    typeof m.payload?.filename === 'string'
  );
}

function base64ToBlob(base64: string, mime = 'application/pdf'): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

interface UseExtensionFileOpts {
  /**
   * Invoked exactly once when the extension hands a PDF over.
   * The caller is responsible for priming `/sign`'s editor state.
   */
  onFile: (file: File, meta: ExtensionFileMeta) => void;
}

export function useExtensionFile({ onFile }: UseExtensionFileOpts): void {
  // Keep the latest callback in a ref so we attach the listener
  // exactly once — re-runs would tear down/re-attach on every
  // render and lose in-flight retries.
  const onFileRef = useRef(onFile);
  useEffect(() => {
    onFileRef.current = onFile;
  }, [onFile]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('from') !== 'extension') return;

    const origin = window.location.origin;
    let consumed = false;

    const handler = (event: MessageEvent) => {
      if (consumed) return;
      if (event.source !== window) return;
      if (event.origin !== origin) return;
      if (!isFileTransfer(event.data)) return;

      const { base64, filename, size, source } = event.data.payload;
      try {
        const blob = base64ToBlob(base64);
        const file = new File([blob], filename, { type: 'application/pdf' });
        consumed = true;
        onFileRef.current(file, { size, source });
        // Strip the query param so a page refresh doesn't keep
        // requesting (the bridge would also drop the now-empty
        // storage entry, but cleaning the URL is the obvious tell).
        window.history.replaceState({}, '', '/sign');
      } catch {
        // Decode failed — the extension sent garbage. Leave the
        // page on the upload step; the dropzone is the safety net.
      }
    };
    window.addEventListener('message', handler);

    const post = () => {
      if (consumed) return;
      window.postMessage({ type: 'SIGNMYPDF_REQUEST_FILE' }, origin);
    };
    post();
    const timers = [250, 750, 1500].map((delay) => setTimeout(post, delay));

    return () => {
      window.removeEventListener('message', handler);
      timers.forEach((t) => clearTimeout(t));
    };
    // Intentionally run-once: the request/response handshake happens
    // at most once per page load. `onFile` is read via ref above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
