# Stage 5 — Chrome Extension · Closure Summary

**Status:** shipped to production (web side), pre-built test ZIP hosted on
GitHub Releases, awaiting Chrome Web Store submission.

**Completed:** 2026-05-12.

**Source-of-truth:** all four PRs (#17, #18, #19, #20) merged to `main`,
production deploy ran from repo root via `vercel deploy --prod`.

## What shipped, by PR

### [PR #17](https://github.com/viktorkkkk/signmypdf/pull/17) — extension skeleton (squash `bc9df26`)

- `apps/extension/` scaffold built with Vite + `@crxjs/vite-plugin`.
- Typed `src/manifest.ts` (single source of truth, `crxjs` emits the
  final `dist/manifest.json` with bundled paths).
- Service worker registers the right-click *Sign with SignMyPDF*
  context menu on `*.pdf` link patterns and fires
  `extension_installed` once.
- Content-script bridge (`src/content/bridge.ts`) on signmypdf.io —
  origin-locked, listens for `SIGNMYPDF_REQUEST_FILE`, replies with
  the stashed file, then clears it.
- GA4 Measurement Protocol client (`src/lib/analytics.ts`) — gtag.js
  cannot run in an MV3 service worker.
- Placeholder icons in `public/icons/icon-{16,32,48,128}.png`
  (blue circle, white "S"). Replace before publish.
- 7 MB ceiling on PDFs (base64 inflates ~1.33×, `chrome.storage.local`
  is 10 MB).
- Permissions: `storage`, `contextMenus`, `activeTab` +
  `host_permissions: signmypdf.io`. No `<all_urls>`, no `tabs`, no
  `downloads` — keeps Chrome Web Store review predictable.

### [PR #18](https://github.com/viktorkkkk/signmypdf/pull/18) — `useExtensionFile()` hook (squash `e03d300`)

- New `apps/web/app/sign/useExtensionFile.ts` — origin-locked
  `window.message` listener.
- On mount, if `?from=extension` is in the URL, posts
  `{ type: 'SIGNMYPDF_REQUEST_FILE' }` and retries at 250 / 750 /
  1500 ms to cover the rare race where the content script attaches
  after React.
- On receiving `{ type: 'SIGNMYPDF_FILE_TRANSFER', payload }`,
  base64-decodes to a `Blob`, builds a `File`, calls the page's
  `onFile` callback (primes `setPdfFile` / `setStep('sign')` /
  `setSelectedPages` / `setPlacements` / `trackEvent('pdf_from_extension')`)
  and `replaceState`s the URL to `/sign`.
- Latest `onFile` is held in a `useRef` so the listener attaches
  exactly once; no flicker on hydration.

### [PR #19](https://github.com/viktorkkkk/signmypdf/pull/19) — `/chrome` landing + privacy + install banner (squash `fd9b2fe`)

- **`apps/web/app/chrome/page.tsx`** — Metadata + JSON-LD
  (`WebPage` + `SoftwareApplication`), canonical `/chrome`.
- **`apps/web/app/chrome/ChromeLandingClient.tsx`** — hero (H1 +
  subtitle + working dropzone + install card), screenshot
  placeholders, features grid, FAQ, final CTA. Fires
  `chrome_landing_view` on mount and `chrome_install_clicked` on
  both CTAs.
- **`apps/web/app/extension/privacy/page.tsx`** — Chrome Web Store
  required privacy policy. What's collected, what's not, each
  permission explained, what happens after the file reaches
  signmypdf.io. Cross-links to the main `/privacy`.
- **`apps/web/app/components/ExtensionBanner.tsx`** — two-mode
  install nudge. Sticky variant under NavHeader on `/sign`,
  post-success variant on the done step. Hidden on mobile, hidden
  on `?from=extension`, persisted 7-day dismiss for the sticky
  variant.
- Sitemap entries for `/chrome` (priority 0.85) and
  `/extension/privacy` (priority 0.3).
- Footer links to *Extension Privacy* and *Chrome Extension*.
- Top callout on `/privacy` pointing to `/extension/privacy`.
- `.ext-banner-*` CSS in `apps/web/app/globals.css` (~95 lines,
  hidden below 540 px).

### [PR #20](https://github.com/viktorkkkk/signmypdf/pull/20) — no-popup UX redesign (squash `093f368`)

The final reshape. Four big moves:

1. **Popup removed.** `apps/extension/src/popup/` deleted; manifest
   no longer has `default_popup`. Service worker handles
   `chrome.action.onClicked` and opens
   `signmypdf.io/sign?from=extension` directly. `stashPdfForHandoff`
   un-exported; the URL-fetch path (`stashPdfFromUrl`) is the only
   public entry. Analytics events reshaped — `extension_popup_*`
   events gone, `extension_icon_clicked` and
   `extension_context_menu_failed` added.

2. **Minimal mode on `/sign?from=extension`.** Slim sticky topbar
   with the SignMyPDF logo (links back to `/sign` full mode) and a
   `No signup` chip on the right. Below: H1 "Sign your PDF in
   seconds", subtitle "No registration. Upload, sign, download.
   Done.", a 720 × 480 dropzone. NavHeader / SiteFooter /
   ExtensionBanner / ToolDescription / FAQ / More Tools / FileHistory
   all suppressed. State flag set in `useEffect` (not `useState`
   initializer) to avoid SSR hydration mismatch on first paint.

3. **`/chrome` single-purpose redesign.** Hero with H1 + subtitle
   "Free · No signup · In seconds" + 720 × 480 dropzone + "or"
   divider + install pitch line "Sign any PDF in one click. Right-
   click any PDF link and sign instantly." + big
   `Install Free Chrome Extension` card. Three-step *How the
   extension works* with 400×300 screenshot placeholders. Compact
   four-point *Why use the extension*. Final CTA mirroring the
   hero. Removed: FAQ section, `FAQPage` JSON-LD, pricing tile,
   hero trust row, long features grid.

4. **Banner moved from top to body.** Sticky variant of
   `<ExtensionBanner />` retired. New `variant="card"` is a 150 px
   full-bleed card (white Chrome-icon tile, title + sub + install
   button), rendered below the dropzone and above the More Tools
   grid on `/sign` upload step. No dismiss button — user has
   already engaged with the tool.

Plus housekeeping:

- Dropzone size unified to **720 × 480** on `/sign`,
  `/sign?from=extension`, `/chrome`, `/fill`, `/protect`, `/merge`,
  `/split`, `/compress`. Base `.dropzone` class became the single
  source.
- Em-dashes purged from every CTA, heading, page title, JSON-LD
  name field, NavHeader+SiteFooter tagline, ToolDescription title,
  watermark-toast title. Body prose (privacy bullets, marketing
  paragraphs) keeps its typographic em-dashes — Viktor's rule
  scoped the change to *buttons and headings*.
- Title duplication fix: `apps/web/app/layout.tsx` already appends
  `| SignMyPDF`; `/chrome` and `/extension/privacy` had it baked
  into `metadata.title` too. Both now suffix-free.
- Lucide v1.14 has no `Chrome` icon — extracted a shared
  `<ChromeIcon />` in `apps/web/app/components/ChromeIcon.tsx`
  (inline four-segment SVG with the brand colours) and replaced
  every Puzzle icon with it.

## Architecture, in one paragraph

The extension is a **thin bridge**, not an app. It owns no signing
logic, no PDF parsing, no editor UI. Two entry points (toolbar
click + right-click on a PDF link) both end with a new tab opened
at `signmypdf.io/sign?from=extension`. The page's `<NavHeader />` /
`<SiteFooter />` are suppressed and a slim topbar replaces them so
the experience reads as one application. When the user came from
the context menu, the service worker fetches the PDF into
`chrome.storage.local`; the page's content-script bridge reads it
out via origin-locked `postMessage` on first paint and primes the
existing `/sign` editor. Same code path as a regular drag-and-drop
upload; no second editor exists. This is the cheapest possible
extension that adds value — Chrome Web Store reviewers see a clean
permission scope, and we ship every UI improvement to one surface
(`/sign`) instead of maintaining two.

## File map (canonical entry points)

| Path | Role |
|---|---|
| [apps/extension/src/manifest.ts](../apps/extension/src/manifest.ts) | MV3 manifest, typed |
| [apps/extension/src/background/service-worker.ts](../apps/extension/src/background/service-worker.ts) | `chrome.action.onClicked` + context menu + tab open |
| [apps/extension/src/content/bridge.ts](../apps/extension/src/content/bridge.ts) | Site-side reader of `chrome.storage.local` (postMessage to `/sign`) |
| [apps/extension/src/lib/constants.ts](../apps/extension/src/lib/constants.ts) | URLs, storage keys, 7 MB ceiling |
| [apps/extension/src/lib/fileTransfer.ts](../apps/extension/src/lib/fileTransfer.ts) | File → base64, validation, `chrome.storage.local` writes |
| [apps/extension/src/lib/analytics.ts](../apps/extension/src/lib/analytics.ts) | GA4 Measurement Protocol client |
| [apps/extension/README.md](../apps/extension/README.md) | Build + load-unpacked + smoke-test matrix |
| [apps/extension/STORE_LISTING.md](../apps/extension/STORE_LISTING.md) | Copy for Chrome Web Store + assets checklist |
| [apps/web/app/sign/page.tsx](../apps/web/app/sign/page.tsx) | `/sign` (full + minimal modes), wires `useExtensionFile()` + `<ExtensionBanner variant="card" />` |
| [apps/web/app/sign/useExtensionFile.ts](../apps/web/app/sign/useExtensionFile.ts) | The handshake hook |
| [apps/web/app/chrome/page.tsx](../apps/web/app/chrome/page.tsx) | `/chrome` server shell — metadata, JSON-LD |
| [apps/web/app/chrome/ChromeLandingClient.tsx](../apps/web/app/chrome/ChromeLandingClient.tsx) | Hero dropzone, install cards, how-it-works, why list |
| [apps/web/app/chrome/chrome.css](../apps/web/app/chrome/chrome.css) | Scoped landing styles |
| [apps/web/app/extension/privacy/page.tsx](../apps/web/app/extension/privacy/page.tsx) | Chrome Web Store privacy policy |
| [apps/web/app/components/ExtensionBanner.tsx](../apps/web/app/components/ExtensionBanner.tsx) | `card` + `post-success` install nudges |
| [apps/web/app/components/ChromeIcon.tsx](../apps/web/app/components/ChromeIcon.tsx) | Inline brand-mark SVG |

## What's left before Chrome Web Store submission

- **Production icons** at 16 / 32 / 48 / 128 px. Replace
  `apps/extension/public/icons/icon-*.png`. Current files are
  placeholder solid-blue circles with a white "S" produced by
  `/tmp/gen_icons.py` (Pillow). Pixel dimensions match what the
  manifest expects.
- **5 screenshots, 1280 × 800** for the listing. Suggested shots
  are listed in [STORE_LISTING.md → Assets needed before submission](../apps/extension/STORE_LISTING.md).
- **Promo tile 440 × 280**. Extension logo + the title in store
  copy.
- **Real screenshots inside `<ChromeLandingClient />`** to replace
  the four 400 × 300 placeholders in the *How the extension works*
  section. The CSS keeps the same dimensions, so the swap is
  drop-in.
- **Final smoke-test** of the production ZIP (`pnpm
  --filter @signmypdf/extension package`) from a fresh browser
  profile.
- **Submit for review** at <https://chrome.google.com/webstore/devconsole>.
  Moderation window is typically 2–5 days. Listing copy is ready
  in [STORE_LISTING.md](../apps/extension/STORE_LISTING.md).

## Production state at close-out

- Web production deploy:
  `https://www.signmypdf.io/{chrome,sign,sign?from=extension,extension/privacy}`
  — all live, all HTTP 200, all four new selectors verified in the
  prod CSS bundle.
- Extension test build: hosted as an asset on the
  [`ext-test-1` GitHub Release](https://github.com/viktorkkkk/signmypdf/releases/tag/ext-test-1)
  (75 KB ZIP). Refreshed any time a Stage 5 PR lands in `main`.
- `test/extension-unpacked` branch — committed `apps/extension/dist-test/`
  for non-terminal install. Repointed at every refresh.
- Source: `main` at `093f368` (this commit's parent).

## Future work (not part of Stage 5)

Pre-PR-12 carry-over still on the board, surfaced here only so a
future session can grep for it from this file:

- `/sign-nda` Phase 1 done, Phase 2/3 (migrate `/sign` and `/fill`
  onto `<FillSignEditor />`) — deferred until after the extension
  ships per the post-Stage-4 roadmap.
- Bing/GSC indexation push — open SEO bottleneck; see
  `apps/web/CLAUDE.md`.
- `/split` polish — three small carry-over bugs documented in
  the pre-Stage-5 memory notes.
