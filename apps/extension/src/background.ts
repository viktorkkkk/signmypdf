/**
 * Service worker — Sign PDF MV3.
 *
 * Responsibilities:
 *   1. Open the editor in a new tab whenever the user clicks the
 *      toolbar icon (no popup — the editor's empty-state dropzone
 *      replaces it).
 *   2. Register the right-click "Sign with Sign PDF" context menu on
 *      links to .pdf URLs and, on click, fetch the PDF, stash it in
 *      IndexedDB, and open the editor tab pointed at the stashed id.
 *   3. On tab close, delete the matching IDB record. The editor also
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

/**
 * Toolbar icon click — no popup, open the editor straight away.
 * Empty-state dropzone in editor.tsx handles file pick from there.
 */
chrome.action.onClicked.addListener(async () => {
  await chrome.tabs.create({ url: chrome.runtime.getURL('src/editor/editor.html') });
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
