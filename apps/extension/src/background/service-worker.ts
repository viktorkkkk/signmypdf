import { SIGN_URL } from '../lib/constants';
import { stashPdfFromUrl } from '../lib/fileTransfer';
import { track } from '../lib/analytics';

const CONTEXT_MENU_ID = 'signmypdf-sign-with';

/**
 * Background service worker.
 *
 * Three jobs in PR 1:
 *   1. Fire `extension_installed` once on first install.
 *   2. Register a right-click context menu on PDF links so users
 *      can hand a remote PDF off to signmypdf.io without opening
 *      the popup.
 *   3. Handle the context-menu click: fetch the PDF, stash it in
 *      `chrome.storage.local`, then open `/sign?from=extension`.
 *
 * Site-side bridge that actually loads the file into the editor
 * lands in PR 2 — for now, PR 1 just verifies that the handoff
 * record appears in extension storage (visible via DevTools →
 * Application → Storage on the extension's background page).
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

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== CONTEXT_MENU_ID) return;
  const linkUrl = info.linkUrl;
  if (!linkUrl) return;

  void track('extension_context_menu_used');

  const result = await stashPdfFromUrl(linkUrl);
  if (!result.ok) {
    // We can't surface a popup error here — service workers have no
    // DOM. The simplest user-visible feedback is to open /sign
    // anyway; PR 2's bridge will detect the missing file and fall
    // through to the existing dropzone. We log here for `chrome://
    // extensions → service worker` debug visibility.
    console.warn('[SignMyPDF] context-menu fetch failed:', result.reason, linkUrl);
  }

  await chrome.tabs.create({ url: SIGN_URL });
});
