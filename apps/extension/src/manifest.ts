import { defineManifest } from '@crxjs/vite-plugin';
import pkg from '../package.json' with { type: 'json' };

/**
 * Chrome MV3 manifest, single source of truth.
 *
 * Permissions intentionally minimal — see ТЗ Этап 5:
 *   - No `<all_urls>` (red flag for store review)
 *   - No `tabs` (we use `activeTab` for context-menu URL access)
 *   - No `downloads` (signing/downloading happens on signmypdf.io)
 *
 * `host_permissions` is scoped to signmypdf.io only so the content
 * script bridge can read `chrome.storage.local` from the page.
 */
export default defineManifest({
  manifest_version: 3,
  name: 'Sign PDF Free',
  short_name: 'SignMyPDF',
  version: pkg.version,
  description:
    'Sign PDF files in your browser. Free, no signup, no watermark. Drag, drop, sign, download.',
  icons: {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
  },
  // No `default_popup` — clicking the toolbar icon should open the
  // signing tool directly in a new tab. The service worker's
  // `chrome.action.onClicked` listener handles that, which only
  // fires when the action has no popup. See service-worker.ts.
  action: {
    default_title: 'Sign PDF Free',
    default_icon: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
    },
  },
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: [
        'https://signmypdf.io/*',
        'https://www.signmypdf.io/*',
      ],
      js: ['src/content/bridge.ts'],
      run_at: 'document_idle',
    },
  ],
  permissions: ['storage', 'contextMenus', 'activeTab'],
  host_permissions: [
    'https://signmypdf.io/*',
    'https://www.signmypdf.io/*',
  ],
  homepage_url: 'https://signmypdf.io/chrome',
});
