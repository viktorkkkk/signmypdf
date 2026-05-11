# @signmypdf/extension

Chrome MV3 extension that hands a PDF off to `signmypdf.io/sign` for
signing. Thin bridge by design — see the root `CLAUDE.md` and the
Stage 5 ТЗ for the full architecture rationale.

## Architecture in one paragraph

The popup (`src/popup/`) accepts a drag/drop or right-click PDF,
base64-encodes it, writes it to `chrome.storage.local`, and opens
`signmypdf.io/sign?from=extension`. A content script bridge
(`src/content/bridge.ts`) running on that page reads the file out of
extension storage and posts it to the web app. The web app then
reconstitutes the `File` and feeds it into the existing signing
editor — no signing logic in the extension itself. PR 1 ships
everything except the matching web-app receiver (PR 2).

## What's in PR 1

- `apps/extension/` skeleton with Vite + `@crxjs/vite-plugin` build
- MV3 `src/manifest.ts` (single source of truth — crxjs emits the
  final `dist/manifest.json`)
- Popup UI: drag/drop, file-picker, base64 → `chrome.storage.local`,
  open new tab on success
- Service worker: `extension_installed` event, right-click context
  menu on `*.pdf` links, fetch + stash + open `/sign`
- Content script bridge stub — listens for `SIGNMYPDF_REQUEST_FILE`
  but no caller exists yet (web-app hook lands in PR 2)
- GA4 Measurement Protocol client (no `gtag.js` in service workers)
- Placeholder icons (blue circle, white "S") in
  `public/icons/icon-{16,32,48,128}.png` — replace before publish

## What's NOT here yet

PR 2:
- `apps/web/app/sign/page.tsx` reader hook for `?from=extension`
- Site → extension postMessage handshake gets a caller

PR 3:
- `apps/web/app/chrome/` landing page
- `apps/web/app/extension/privacy/` policy
- Banner on `/sign` advertising the extension
- Production icons + Chrome Web Store submission artefacts

## Local testing

```bash
# From repo root — installs all workspace deps once.
pnpm install

# Build the extension into apps/extension/dist/
pnpm --filter @signmypdf/extension build

# Or keep Vite rebuilding on save
pnpm --filter @signmypdf/extension dev
```

Then load it into Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select `apps/extension/dist`
5. The icon ("S" on blue) appears in the toolbar

### Smoke tests (PR 1)

| # | Action | Expected |
|---|---|---|
| 1 | Click the extension icon | Popup opens, drop zone visible |
| 2 | Drop or pick a small PDF | Status flips to "Opening editor…", popup closes, a new tab opens at `signmypdf.io/sign?from=extension` |
| 3 | Drop a > 7 MB PDF | Error "File is N MB — extension limit is 7 MB" + link to signmypdf.io/sign |
| 4 | Drop a non-PDF | Error "Only PDF files are supported in the extension." |
| 5 | After (2), open chrome://extensions → Inspect views → service worker → Application → Storage → IndexedDB / Local Storage | `pendingPdf` entry visible until the bridge consumes it (PR 2) OR until 60 s elapse |
| 6 | Right-click a `*.pdf` link in any tab | Context menu shows "Sign with SignMyPDF" |
| 7 | Click that item | A new tab opens at `signmypdf.io/sign?from=extension`. The file is in `chrome.storage.local` — PR 2 will surface it on the page. |

The site-side reading of `pendingPdf` is **not** yet wired (PR 2). In
PR 1, the handoff record is visible only via the extension's storage
inspector.

## Production zip for Chrome Web Store

```bash
pnpm --filter @signmypdf/extension package
# → apps/extension/signmypdf-extension.zip
```

Upload that ZIP at <https://chrome.google.com/webstore/devconsole>.
PR 3 lands the matching landing page + privacy policy required for
the listing.

## Files at a glance

| Path | Role |
|---|---|
| `src/manifest.ts` | MV3 manifest as a typed module |
| `src/popup/popup.html`, `popup.tsx`, `popup.css`, `DropZone.tsx` | Popup UI |
| `src/background/service-worker.ts` | Install hook, context menu |
| `src/content/bridge.ts` | Stub site-side reader (PR 2 plugs in) |
| `src/lib/constants.ts` | URLs, storage keys, size limits |
| `src/lib/fileTransfer.ts` | File → base64, validation, `chrome.storage.local` writes |
| `src/lib/analytics.ts` | GA4 Measurement Protocol client |
| `src/types/messages.ts` | TypeScript message shapes |
| `public/icons/icon-*.png` | Placeholder icons |
| `STORE_LISTING.md` | Copy for the Chrome Web Store listing |
