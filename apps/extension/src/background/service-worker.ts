import { SIGN_URL } from '../lib/constants';
import { stashPdfFromUrl } from '../lib/fileTransfer';
import { track } from '../lib/analytics';

const CONTEXT_MENU_ID = 'signmypdf-sign-with';

/**
 * Background service worker.
 *
 * Stage 5 PR 4 — no-popup UX. The toolbar icon no longer opens a
 * popup; clicking it opens `signmypdf.io/sign?from=extension`
 * directly so the experience feels like one application, not a
 * tiny side panel that hands off to the real tool. The right-click
 * context menu still grabs PDF link URLs and routes them through
 * the same handoff path.
 *
 * Jobs:
 *   1. Fire `extension_installed` once on first install.
 *   2. Toolbar-icon click → open `/sign?from=extension` in a new
 *      tab. `chrome.action.onClicked` only fires when the action
 *      has no `default_popup` set (see manifest.ts).
 *   3. Right-click "Sign with SignMyPDF" on `*.pdf` links → fetch
 *      the PDF in the SW, stash it in `chrome.storage.local`, then
 *      open `/sign?from=extension`. The site-side bridge picks the
 *      file up via the postMessage handshake.
 */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    void track('extension_installed');
  }

  // Context menus are stateful — recreate on every install/update
  // so we never end up with duplicate entries after an upgrade.
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: 'Sign with SignMyPDF',
      // `targetUrlPatterns` scopes the menu to links pointing at PDFs.
      // We don't grab the page itself (no `pageUrl` patterns) — the
      // menu only appears on right-click of a link/file.
      contexts: ['link'],
      targetUrlPatterns: [
        '*://*/*.pdf',
        '*://*/*.pdf?*',
        '*://*/*.PDF',
        '*://*/*.PDF?*',
      ],
    });
  });
});

chrome.action.onClicked.addListener(async () => {
  void track('extension_icon_clicked');
  await chrome.tabs.create({ url: SIGN_URL });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== CONTEXT_MENU_ID) return;
  const linkUrl = info.linkUrl;
  if (!linkUrl) return;

  void track('extension_context_menu_used');

  const result = await stashPdfFromUrl(linkUrl);
  if (!result.ok) {
    // We can't surface a popup error here — service workers have no
    // DOM. The simplest user-visible feedback is to open /sign
    // anyway; the bridge detects the missing file and falls through
    // to the page's own dropzone (minimal mode). Log for `chrome://
    // extensions → service worker` debug visibility.
    console.warn('[SignMyPDF] context-menu fetch failed:', result.reason, linkUrl);
    void track('extension_context_menu_failed', { reason: result.reason });
  }

  await chrome.tabs.create({ url: SIGN_URL });
});
