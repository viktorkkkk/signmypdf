# sign-pdf-extension

Standalone Chrome MV3 extension that signs PDFs entirely in the
browser. No network calls at runtime, no signup, no watermark, no
storage between sessions.

## Status (2026-05-17)

Rewrite of the previous "shortcut" extension. The old extension opened
`signmypdf.io/sign` in a new tab; this one carries the full editor
inside the extension and never talks to signmypdf.io after install.

Awaiting Chrome Web Store submission. Final brand icons shipped in
v2.6.1 (replaced the pen-on-blue placeholders).

## Architecture in one paragraph

Three surfaces, all local:

- **Toolbar popup** — drag-drop or click-to-choose a PDF. The popup
  writes the blob to a short-lived IndexedDB record (`sign-pdf-handoff`
  database) and asks the background service worker to open the editor
  tab.
- **Background service worker** — registers the right-click *Sign with
  Sign PDF* context menu on links to `*.pdf`, fetches the linked PDF
  into the same IDB record, opens the editor tab, and records a
  `tabId → handoff-id` mapping in `chrome.storage.session` so the
  cleanup on `chrome.tabs.onRemoved` knows what to delete.
- **Editor tab** (`src/editor/editor.html?id=…`) — reads the blob from
  IDB, mounts `FillSignEditor` (the React component shared with the
  website's `/sign-nda`, copied into this app and stripped of
  auth/billing/analytics/limits), and on Sign & Download hands the
  finished blob to `chrome.downloads`.

PDF.js + pdf-lib are bundled locally. The worker file is copied from
`node_modules` into `public/` at postinstall time so the version
always matches the API. The Type-tab signature uses a locally-bundled
Dancing Script woff2 (Latin subset, ~24 KB) — no Google Fonts CDN.

## Folder layout

```
src/
  manifest.ts            ← Chrome MV3 manifest, single source of truth
  background.ts          ← service worker: context menu + tab tracking
  lib/
    idbHandoff.ts        ← putPdf / getPdf / deletePdf / cleanupOldEntries
  popup/
    popup.html + popup.tsx + popup.css
  editor/
    editor.html + editor.tsx + editor.css
    FillSignEditor.tsx   ← copy of apps/web's, cleaned for the extension
    fillSignPdf.ts       ← copy of apps/web's, used as-is
public/
  icons/icon-{16,32,48,128}.png   ← brand icons (shipped v2.6.1)
  logo.png                        ← 512×512 brand logo used in the editor top-bar
  fonts/dancing-script.woff2      ← copied at postinstall time
  pdf.worker.min.mjs              ← copied at postinstall time
scripts/
  copy-assets.mjs            ← runs in postinstall
PRIVACY.md
```

## Permissions

`manifest.json` requests exactly three:

- `contextMenus` — right-click *Sign with Sign PDF* on PDF links.
- `downloads` — save the signed PDF.
- `storage` — `chrome.storage.session` for the tab → handoff-id map.

No `<all_urls>`, no `tabs`, no `activeTab`, no host permissions to
any domain. The Chrome Web Store reviewer should not find anything
the extension uses but doesn't declare.

## Development

```bash
# From the monorepo root:
pnpm install                                # postinstall copies assets
pnpm --filter sign-pdf-extension build      # vite build → dist/
pnpm --filter sign-pdf-extension dev        # vite build --watch
pnpm --filter sign-pdf-extension typecheck  # tsc --noEmit
pnpm --filter sign-pdf-extension package    # produces sign-pdf-extension.zip
```

Then `chrome://extensions` → enable Developer Mode → *Load unpacked*
→ select `apps/extension/dist/`.

## Pre-submission checklist (Chrome Web Store)

- [x] Replace placeholder icons in `public/icons/` with finished art (v2.6.1).
- [ ] 5 screenshots 1280×800 for the store listing.
- [ ] Promo tile 440×280.
- [ ] Final smoke-test of the production ZIP via *Load unpacked*.
- [ ] Submit for review (2–5 day moderation window typically).
