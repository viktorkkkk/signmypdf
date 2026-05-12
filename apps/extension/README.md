# @signmypdf/extension

Chrome MV3 extension that opens `signmypdf.io/sign` in a new tab so
the user signs PDFs in the full site editor, not a popup. Thin bridge
by design — see the root `CLAUDE.md` and the Stage 5 ТЗ for the full
architecture rationale.

## Architecture in one paragraph

Two entry points, one destination:

- **Click the toolbar icon** → `chrome.action.onClicked` fires in the
  service worker and opens `signmypdf.io/sign?from=extension`. The
  site renders a "minimal mode" surface (no NavHeader, no footer,
  no install-nudge banner) so the user feels like they're inside an
  app, not on the marketing site.
- **Right-click a `*.pdf` link** → context menu *Sign with SignMyPDF*
  fetches the PDF in the service worker, base64-encodes it, stashes
  it in `chrome.storage.local`, and opens the same `/sign` URL. The
  page's content script bridge picks up the file via postMessage and
  primes the editor.

No popup, no signing logic in the extension itself, no second tab
to context-switch into.

## What's in this build (Stage 5 PR 4)

- `apps/extension/` Vite + `@crxjs/vite-plugin` build (no popup
  bundle — that was removed in PR 4)
- MV3 `src/manifest.ts` — `action` has no `default_popup`; toolbar
  click is intercepted by the service worker
- Service worker: `extension_installed`, `extension_icon_clicked`,
  context-menu registration on `*.pdf` patterns, fetch + stash +
  open-tab handler
- Content script bridge on signmypdf.io — replies to
  `SIGNMYPDF_REQUEST_FILE` with the stashed `chrome.storage.local`
  entry, then clears it
- GA4 Measurement Protocol client (gtag.js doesn't work in MV3
  service workers)
- Placeholder icons (blue circle, white "S") in
  `public/icons/icon-{16,32,48,128}.png` — replace before publishing

## Site-side surfaces

| URL | Purpose |
|---|---|
| `/sign?from=extension` | Receives the handoff from the toolbar icon or context menu. Renders minimal mode (no chrome) |
| `/chrome` | Marketing landing — hero with embedded dropzone, "Add to Chrome" CTA, screenshots, 3-step how-it-works |
| `/extension/privacy` | Privacy policy required by the Chrome Web Store reviewer |

## Local testing (with terminal)

```bash
# From repo root — installs all workspace deps once.
pnpm install

# Build the extension into apps/extension/dist/
pnpm --filter @signmypdf/extension build

# Or keep Vite rebuilding on save
pnpm --filter @signmypdf/extension dev
```

Load it into Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select `apps/extension/dist`
5. The icon ("S" on blue) appears in the toolbar

### Smoke tests

| # | Action | Expected |
|---|---|---|
| 1 | Click the toolbar icon | A new tab opens at `signmypdf.io/sign?from=extension`. Page is in minimal mode: small `SignMyPDF` logo top-left, big dropzone, no nav/footer. No popup. |
| 2 | Drop a PDF on that page's dropzone | Editor primes with the file (same as the standard `/sign` flow) |
| 3 | Right-click any `*.pdf` link in another tab | Context menu shows **Sign with SignMyPDF** |
| 4 | Click *Sign with SignMyPDF* | A new tab opens at `/sign?from=extension`, the PDF is fetched in the service worker, stashed in `chrome.storage.local`, and the page's bridge surfaces it via postMessage — editor primes automatically |
| 5 | Right-click a link to a PDF behind auth / 404 | Page falls through to the empty dropzone (the bridge gets no file, the SW logged a console warning) |
| 6 | Click the small logo on the minimal-mode page | Navigates to `/sign` without query params → full site mode (NavHeader + footer return) |

## Local testing (no terminal)

A pre-built bundle lives on the `test/extension-unpacked` branch and
on the [`ext-test-1` GitHub Release][release]. Download the ZIP,
extract it, and `Load unpacked` the resulting folder.

[release]: https://github.com/viktorkkkk/signmypdf/releases/tag/ext-test-1

## Production zip for Chrome Web Store

```bash
pnpm --filter @signmypdf/extension package
# → apps/extension/signmypdf-extension.zip
```

Upload that ZIP at <https://chrome.google.com/webstore/devconsole>.
The matching landing page and privacy policy are live at
<https://signmypdf.io/chrome> and
<https://signmypdf.io/extension/privacy>.

## Files at a glance

| Path | Role |
|---|---|
| `src/manifest.ts` | MV3 manifest as a typed module — no `default_popup` |
| `src/background/service-worker.ts` | Install hook, icon-click handler, context menu |
| `src/content/bridge.ts` | Site-side reader of `chrome.storage.local` (talks to /sign via postMessage) |
| `src/lib/constants.ts` | URLs, storage keys, size limits |
| `src/lib/fileTransfer.ts` | File → base64, validation, `chrome.storage.local` writes |
| `src/lib/analytics.ts` | GA4 Measurement Protocol client |
| `src/types/messages.ts` | TypeScript message shapes |
| `public/icons/icon-*.png` | Placeholder icons |
| `STORE_LISTING.md` | Copy for the Chrome Web Store listing |
