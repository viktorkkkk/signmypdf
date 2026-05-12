# @signmypdf/extension

Chrome MV3 extension that opens `signmypdf.io/sign` in a new tab so
the user signs PDFs in the full site editor, not a popup. Thin
bridge by design — see [docs/STAGE_5_SUMMARY.md](../../docs/STAGE_5_SUMMARY.md)
and the root `CLAUDE.md` for the architecture rationale.

## Status (2026-05-12)

- **Code:** all four Stage 5 PRs (#17, #18, #19, #20) merged to `main`.
  Production deploy live on `www.signmypdf.io`.
- **Pre-built test bundle:** [`ext-test-1`](https://github.com/viktorkkkk/signmypdf/releases/tag/ext-test-1)
  GitHub Release. Direct ZIP download:
  <https://github.com/viktorkkkk/signmypdf/releases/download/ext-test-1/signmypdf-extension.zip>.
- **Chrome Web Store:** **not yet submitted.** Production icons +
  screenshots + Trader verification still pending. See the
  *Pre-submission checklist* below.

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

## Local testing (with terminal)

```bash
# From repo root — installs all workspace deps once.
pnpm install

# Build the extension into apps/extension/dist/
pnpm --filter @signmypdf/extension build

# Keep Vite rebuilding on save
pnpm --filter @signmypdf/extension dev

# TypeScript check
pnpm --filter @signmypdf/extension typecheck
```

Load it into Chrome:

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked**.
4. Select `apps/extension/dist`.
5. The icon ("S" on blue) appears in the toolbar.

### Smoke-test matrix

| # | Action | Expected |
|---|---|---|
| 1 | Click the toolbar icon | A new tab opens at `signmypdf.io/sign?from=extension`. Page is in minimal mode: small `SignMyPDF` logo top-left, `No signup` chip top-right, big 720×480 dropzone. No popup. |
| 2 | Drop a PDF on the page dropzone | Editor primes with the file (same code path as the standard `/sign` flow) |
| 3 | Right-click any `*.pdf` link in another tab | Context menu shows **Sign with SignMyPDF** |
| 4 | Click *Sign with SignMyPDF* | New tab opens at `/sign?from=extension`; the PDF is fetched in the service worker, stashed in `chrome.storage.local`, and surfaced via postMessage. The editor primes automatically. |
| 5 | Right-click a link to an auth-gated / 404 PDF | Page falls through to the empty dropzone (the bridge gets no file; SW logs `extension_context_menu_failed` to GA) |
| 6 | Click the small logo on the minimal-mode page | Navigates to `/sign` without query params → full site mode (NavHeader + footer return) |

## Local testing (no terminal)

A pre-built bundle lives on the `test/extension-unpacked` branch and
on the [`ext-test-1` GitHub Release](https://github.com/viktorkkkk/signmypdf/releases/tag/ext-test-1).
Direct ZIP download:
<https://github.com/viktorkkkk/signmypdf/releases/download/ext-test-1/signmypdf-extension.zip>.

The README inside the ZIP walks a non-technical reviewer through
the Load-unpacked flow.

## Producing a fresh test build

Whenever new extension or site code lands in `main` that the
non-terminal reviewer should be able to exercise:

```bash
# 1. From repo root, build the extension production bundle.
pnpm --filter @signmypdf/extension package
# → apps/extension/dist/ and apps/extension/signmypdf-extension.zip

# 2. Refresh the dist-test snapshot on the test branch.
git fetch origin main
git checkout test/extension-unpacked
git reset --hard origin/main          # destructive but the branch is purely test
rm -rf apps/extension/dist-test
cp -r apps/extension/dist apps/extension/dist-test
# (add the dist-test README, see existing branch content for template)
git add apps/extension/dist-test
git commit -m "test: refresh pre-built extension for ext-test-1"
git push --force-with-lease origin test/extension-unpacked

# 3. Replace the asset on the GitHub Release.
# Delete the old asset (asset_id from the API), upload the new ZIP.
# Curl recipes are in the Stage 5 conversation history; the release
# tag (ext-test-1) stays the same so the public download URL never
# changes.
```

## Production zip for Chrome Web Store

```bash
pnpm --filter @signmypdf/extension package
# → apps/extension/signmypdf-extension.zip
```

Upload that ZIP at <https://chrome.google.com/webstore/devconsole>.
The matching landing page and privacy policy are live at
<https://signmypdf.io/chrome> and
<https://signmypdf.io/extension/privacy>.

## Pre-submission checklist

The code is ready; what's missing is creative assets and the
Trader-verification approval on Google's side.

- [ ] **Production icons** 16 / 32 / 48 / 128 px. Replace the
  placeholder files in `public/icons/`. Current ones are solid-blue
  circles with a white "S".
- [ ] **5 screenshots, 1280 × 800 px** for the Web Store listing.
  Suggested shots in [STORE_LISTING.md](STORE_LISTING.md).
- [ ] **Promo tile 440 × 280 px**.
- [ ] **Real screenshots inside `<ChromeLandingClient />`** (the
  *How the extension works* section on `/chrome`). The 400 × 300
  placeholders keep their dimensions so the swap is drop-in.
- [ ] **Trader verification** on the Chrome Web Store developer
  account (`viktor.kolektionok@gmail.com`) — waiting on Google's
  review.
- [ ] **Final smoke-test** of the ZIP from a fresh browser profile,
  then submit. Moderation window is typically 2–5 days.

## Files at a glance

| Path | Role |
|---|---|
| `src/manifest.ts` | MV3 manifest as a typed module — no `default_popup` |
| `src/background/service-worker.ts` | Install hook, icon-click handler, context menu |
| `src/content/bridge.ts` | Site-side reader of `chrome.storage.local` (talks to `/sign` via postMessage) |
| `src/lib/constants.ts` | URLs, storage keys, size limits |
| `src/lib/fileTransfer.ts` | File → base64, validation, `chrome.storage.local` writes |
| `src/lib/analytics.ts` | GA4 Measurement Protocol client |
| `src/types/messages.ts` | TypeScript message shapes |
| `public/icons/icon-*.png` | Placeholder icons (replace before publish) |
| `STORE_LISTING.md` | Copy for the Chrome Web Store listing |
