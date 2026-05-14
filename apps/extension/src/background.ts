/**
 * Service worker — Sign PDF MV3.
 *
 * Responsibilities:
 *   1. Register the right-click "Sign with Sign PDF" context menu on
 *      links to .pdf URLs.
 *   2. Fetch the PDF for that link, stash it in IndexedDB, open the
 *      editor tab pointed at the stashed id.
 *   3. Accept the popup's `openEditor` message (the popup has already
 *      stashed the blob it picked up via drag-drop) and open the
 *      editor tab + record the tabId → handoff-id mapping so we can
 *      clean up on tab close.
 *   4. On tab close, delete the matching IDB record. The editor also
 *      cleans up on beforeunload, but this catches catastrophic
 *      closes (browser crash, tab forced-killed).
 */

import { putPdf, deletePdf } from './lib/idbHandoff';

const SIGN_PDF_MENU_ID = 'sign-with-sign-pdf';
/** Key inside chrome.storage.session for the tabId → handoff-id map. */
const TAB_MAP_KEY = 'tabIdToHandoffId';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: SIGN_PDF_MENU_ID,
    title: 'Sign with Sign PDF',
    contexts: ['link'],
    targetUrlPatterns: ['*://*/*.pdf*', 'file:///*.pdf*'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== SIGN_PDF_MENU_ID || !info.linkUrl) return;
  try {
    const response = await fetch(info.linkUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const filename = inferFilename(info.linkUrl);
    const id = await putPdf(blob, filename);
    await openEditorWithMapping(id);
  } catch (err) {
    console.error('[Sign PDF] context-menu fetch failed:', err);
    // Open editor anyway so the user lands somewhere; the empty state
    // there shows a dropzone they can drop a local file into.
    await chrome.tabs.create({ url: chrome.runtime.getURL('src/editor/editor.html') });
  }
});

/**
 * The popup writes the dropped PDF blob to IDB itself (no point
 * round-tripping a 30 MB Uint8Array through chrome.runtime messaging),
 * then asks the background to open the editor tab and record the tab
 * mapping. Keeping the tab-mapping logic in one place makes the
 * tabs.onRemoved cleanup symmetric across popup and context-menu paths.
 */
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'openEditor' && typeof msg.id === 'string') {
    (async () => {
      try {
        await openEditorWithMapping(msg.id);
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
    })();
    return true; // async sendResponse
  }
  return false;
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  try {
    const map = await readTabMap();
    const id = map[tabId];
    if (!id) return;
    await deletePdf(id);
    delete map[tabId];
    await writeTabMap(map);
  } catch (e) {
    console.warn('[Sign PDF] tabs.onRemoved cleanup failed:', e);
  }
});

// ── helpers ─────────────────────────────────────────────────────────

async function openEditorWithMapping(id: string): Promise<void> {
  const tab = await chrome.tabs.create({
    url: chrome.runtime.getURL(`src/editor/editor.html?id=${id}`),
  });
  if (tab.id == null) return;
  const map = await readTabMap();
  map[tab.id] = id;
  await writeTabMap(map);
}

async function readTabMap(): Promise<Record<number, string>> {
  const stored = await chrome.storage.session.get(TAB_MAP_KEY);
  return (stored[TAB_MAP_KEY] as Record<number, string>) ?? {};
}

async function writeTabMap(map: Record<number, string>): Promise<void> {
  await chrome.storage.session.set({ [TAB_MAP_KEY]: map });
}

function inferFilename(url: string): string {
  try {
    const u = new URL(url);
    const seg = u.pathname.split('/').pop() ?? '';
    if (!seg) return 'document.pdf';
    return seg.toLowerCase().endsWith('.pdf') ? seg : `${seg}.pdf`;
  } catch {
    return 'document.pdf';
  }
}
