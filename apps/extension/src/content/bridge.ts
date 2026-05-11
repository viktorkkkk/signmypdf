import {
  PENDING_PDF_KEY,
  PENDING_TTL_MS,
} from '../lib/constants';
import type {
  FileTransferMessage,
  PendingPdf,
  RequestFileMessage,
} from '../types/messages';

/**
 * Content script bridge — runs on signmypdf.io pages only.
 *
 * PR 1 (this commit): minimal scaffold. The script registers a
 * `message` listener on the page so we can verify load-and-attach
 * works end-to-end. It will respond to `SIGNMYPDF_REQUEST_FILE` by
 * reading `chrome.storage.local[PENDING_PDF_KEY]`, validating the
 * TTL, posting the file back, and clearing the entry.
 *
 * PR 2: apps/web/app/sign/page.tsx will get the matching
 * useExtensionFile() hook that sends the request and consumes the
 * response. Until that ships, the bridge is silent.
 *
 * Defensive about origin: we only respond to messages whose
 * `event.source === window` and `event.origin === location.origin`
 * to avoid being spoofed by embedded iframes.
 */

function isRequestFile(data: unknown): data is RequestFileMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { type?: unknown }).type === 'SIGNMYPDF_REQUEST_FILE'
  );
}

async function readAndClearPending(): Promise<PendingPdf | null> {
  const stored = await chrome.storage.local.get(PENDING_PDF_KEY);
  const record = stored[PENDING_PDF_KEY] as PendingPdf | undefined;
  if (!record) return null;
  if (Date.now() - record.timestamp > PENDING_TTL_MS) {
    await chrome.storage.local.remove(PENDING_PDF_KEY);
    return null;
  }
  await chrome.storage.local.remove(PENDING_PDF_KEY);
  return record;
}

window.addEventListener('message', async (event) => {
  if (event.source !== window) return;
  if (event.origin !== window.location.origin) return;
  if (!isRequestFile(event.data)) return;

  const record = await readAndClearPending();
  if (!record) return;

  const reply: FileTransferMessage = {
    type: 'SIGNMYPDF_FILE_TRANSFER',
    payload: {
      base64: record.base64,
      filename: record.filename,
      size: record.size,
      source: record.source,
    },
  };
  window.postMessage(reply, window.location.origin);
});
