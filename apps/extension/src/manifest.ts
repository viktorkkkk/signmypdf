import { defineManifest } from '@crxjs/vite-plugin';
import pkg from '../package.json' with { type: 'json' };

/**
 * Chrome MV3 manifest — standalone signing extension.
 *
 * No network calls to signmypdf.io. All PDF processing happens inside
 * the extension via PDF.js + pdf-lib (bundled local copies).
 *
 * Permissions are intentionally minimal:
 *   - contextMenus  — right-click "Sign with Sign PDF" on PDF links
 *   - downloads     — chrome.downloads.download for the signed PDF
 *   - storage       — chrome.storage.session for popup → editor handoff
 *                     fallback (IndexedDB is primary, session is fallback)
 *
 * NO `<all_urls>`, NO `tabs`, NO `activeTab`, NO host_permissions.
 */
export default defineManifest({
  manifest_version: 3,
  name: 'Sign PDF — Signature & eSign Tool',
  short_name: 'Sign PDF',
  version: pkg.version,
  description:
    'Sign PDF files in your browser. Free, no signup. Right-click any PDF link to sign. Files never leave your device.',
  icons: {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
  },
  action: {
    default_popup: 'src/popup/popup.html',
    default_icon: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
    },
  },
  background: {
    service_worker: 'src/background.ts',
    type: 'module',
  },
  permissions: ['contextMenus', 'downloads', 'storage'],
  web_accessible_resources: [
    {
      resources: ['src/editor/editor.html', 'pdf.worker.min.mjs'],
      matches: ['<all_urls>'],
    },
  ],
});
