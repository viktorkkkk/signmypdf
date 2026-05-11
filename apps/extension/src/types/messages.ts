/**
 * Message shapes flowing between the three Chrome contexts:
 *   - popup (popup.tsx)
 *   - background service worker (service-worker.ts)
 *   - content script bridge (bridge.ts, runs on signmypdf.io pages)
 *
 * Each message has a unique `type` so the receiver can switch on it
 * without runtime guessing.
 */

/** What the popup writes into `chrome.storage.local[PENDING_PDF_KEY]`. */
export interface PendingPdf {
  /** Base64-encoded PDF payload (raw bytes, no `data:` prefix). */
  base64: string;
  /** Original filename, sanitised on the popup side. */
  filename: string;
  /** Bytes of the original PDF (pre-base64). */
  size: number;
  /** `Date.now()` at write time — bridge rejects stale entries. */
  timestamp: number;
  /** How the PDF entered: popup drop vs. right-click on a link. */
  source: 'popup' | 'context-menu';
}

/** popup → service-worker — open the sign tab. */
export interface OpenSignTabMessage {
  type: 'OPEN_SIGN_TAB';
}

/** content (signmypdf.io) → window → bridge → service-worker. */
export interface RequestFileMessage {
  type: 'SIGNMYPDF_REQUEST_FILE';
}

/** bridge → page (signmypdf.io). PR 2 will wire the receiver in /sign. */
export interface FileTransferMessage {
  type: 'SIGNMYPDF_FILE_TRANSFER';
  payload: {
    base64: string;
    filename: string;
    size: number;
    source: PendingPdf['source'];
  };
}

export type ExtensionMessage =
  | OpenSignTabMessage
  | RequestFileMessage
  | FileTransferMessage;
