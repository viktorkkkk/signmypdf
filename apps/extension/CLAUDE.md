# Sign PDF Extension — Operational Context

Read this file before touching anything inside `apps/extension/`. It captures the
non-obvious constraints and decisions baked into the current build so a new
session can resume without re-discovering them.

## 1. Project Overview

- **Sign PDF Extension v2.6.3** — standalone Chrome MV3 extension.
- All PDF work runs locally in the browser; **no runtime network calls** to
  `signmypdf.io` or any other origin.
- Lives inside the `signmypdf.io` monorepo at `apps/extension/`. The Next.js
  site is `apps/web/`; the extension is a sibling.
- Production target: **Chrome Web Store**. Awaiting final icons, screenshots,
  and Trader-verification approval before submission.

## 2. Architecture

- **Stack:** Vite + React 19 + TypeScript, bundled with `@crxjs/vite-plugin`.
- **PDF rendering:** `pdfjs-dist` 5.7.284 — bundled locally, never CDN. Worker
  copied into `public/pdf.worker.min.mjs` by `scripts/copy-assets.mjs` at
  install time.
- **PDF manipulation:** `pdf-lib` — embed images, write signed output.
- **Shared monorepo packages:**
  - `@signmypdf/pdf-core` — `setupPdfjs(workerSrc)`, shared types.
  - `@signmypdf/ui` — `SignatureCanvas`, `signature.css`, `fse.css`.
- **Storage:** `IndexedDB` (`sign-pdf-handoff` DB) carries the PDF blob from
  the icon-click / context-menu entry into the editor tab. 1-hour TTL sweep on
  mount; explicit delete on `beforeunload`; background's `tabs.onRemoved`
  backstops both.
- **Permissions:** exactly `["contextMenus", "downloads", "storage"]`. No
  `<all_urls>`, no `tabs`, no `activeTab`, no host permissions.
- **Background:** MV3 service worker handles `chrome.action.onClicked` (opens
  editor in a new tab) and `chrome.contextMenus` (right-click on a PDF link →
  fetch + IDB stash + open editor).

## 3. Critical Rules (NEVER violate)

1. **No runtime network requests** to `signmypdf.io` or any other origin.
   The only `signmypdf.io` reference in the bundle is the footer `<a href>`.
2. **No external CDNs** for fonts, libraries, anything. Dancing Script
   ships bundled (~24 KB Latin subset) via `@fontsource/dancing-script`.
3. **No `localStorage` / `chrome.storage.local`.** Only `chrome.storage.session`
   (tabId → handoff-id map) and IndexedDB (transient PDF blob) are allowed,
   and both clear automatically.
4. **No accounts, daily limits, watermarks** in the extension. `addWatermark`
   in `fillSignPdf.ts` is dead code never invoked from FillSignEditor.
5. **No new permissions** without explicit user sign-off. The Web Store
   reviewer should not find any permission the extension declares but
   doesn't use.
6. **No analytics, tracking, telemetry** of any kind.
7. **No imports** from `apps/web/`'s auth or billing modules: `paddle`,
   `stripe`, `neon`, `supabase`, `brevo`, `magic-link`, `next-auth`, etc.
   Treat any such match in the dist bundle as a leak.

## 4. Key Components

| Path | Role |
|---|---|
| [apps/extension/src/manifest.ts](src/manifest.ts) | MV3 manifest, single source of truth |
| [apps/extension/src/background.ts](src/background.ts) | Service worker — toolbar-icon click, context-menu, tab cleanup |
| [apps/extension/src/lib/idbHandoff.ts](src/lib/idbHandoff.ts) | `putPdf` / `getPdf` / `deletePdf` / `cleanupOldEntries` |
| [apps/extension/src/editor/editor.tsx](src/editor/editor.tsx) | Editor tab entry — host chrome, top-bar, dropzone, toast, Change-PDF modal |
| [apps/extension/src/editor/FillSignEditor.tsx](src/editor/FillSignEditor.tsx) | The signing editor. Cleaned copy of `apps/web/app/components/FillSignEditor.tsx`, stripped of auth / billing / limits / drafts / analytics |
| [apps/extension/src/editor/fillSignPdf.ts](src/editor/fillSignPdf.ts) | Clean copy of `apps/web/app/utils/fillSignPdf.ts`. Called with no `addWatermark` flag from the extension |
| [apps/extension/src/editor/editor.css](src/editor/editor.css) | Host shell styles + 3-column layout + unified-editor + signature-resize overrides |
| [packages/ui/src/styles/fse.css](../../packages/ui/src/styles/fse.css) | Shared FillSignEditor styles between `apps/web` and the extension. Pure move from `apps/web/app/globals.css` — never mutate selectors here without considering the web side |

## 5. Current Feature State (v2.6.3)

- **3 placement tools:** Signature (default), Text, Date. Sidebar actions:
  Copy, Delete.
- **Signature modes:** Draw, Type (single Dancing Script font), Upload (PNG /
  JPG, ≤10 MB).
- **Text / Date:** 3 font families (Sans / Serif / Mono), font-size dropdown
  with stock sizes [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48] plus
  −2 / +2 step buttons, clamped 6–72 pt. Default 14 pt.
- **Date:** auto-fills today on placement, no auto-popup, MM/DD/YYYY mask in
  the edit input (red highlight on invalid date, save not blocked).
- **Unified editor** for text / date — one panel above the element with font
  controls + value input + Cancel / Done. Replaces the previous two-panel
  layout (separate floating font bar + edit popup).
- **3-column layout:** PAGES (left, 140 px, thumbnails) / DOCUMENT (centre,
  flex) / PLACED ELEMENTS (right, 280 px). Right column collapsible to 40 px;
  default-collapsed under 1024 px viewport. Mobile (< 768 px) falls back to a
  vertical stack.
- **Auto-rescale PDF** to the centre column width via `ResizeObserver` with a
  150 ms debounce on continuous resizes. Collapse / expand toggle triggers an
  immediate `requestAnimationFrame` recompute (no debounce). Skips during
  active drag.
- **Render-task cancellation:** the canvas render effect holds the active
  pdf.js `RenderTask` in a ref; before starting a new render it `.cancel()`s
  the previous task and swallows `RenderingCancelledException`. Required to
  prevent a flipped-/-mirrored race when two render passes overlap (fixed in
  v2.4.1).
- **First-rAF rescale skip:** the toggle-driven rescale effect no-ops on its
  very first run (`isInitialRescaleRef`) so it doesn't race with the initial
  render task on mount.
- **Top-bar:** logo doubles as a Change-PDF entry point when a file is loaded
  (opens the discard-confirmation modal). Tagline `Free · No signup · Files
  stay private`.
- **Download Signed PDF:** always visible; disabled with neutral-grey style
  when no elements are placed.
- **Toast:** success / error variants. Success after download with a
  "Sign another PDF" CTA; error for wrong file types.
- **Empty-state hint:** white plate with shadow over the document while there
  are zero placed elements. Copy varies with the active tool:
  - signature → "Click anywhere to place your signature"
  - text → "Click anywhere to add text"
  - date → "Click anywhere to add today's date"
  Fades out 200 ms after the first element is placed; stays gone for the
  session. Resets on Change PDF.
- **Signature resize:** dashed 2 px primary-blue border on hover / selection
  / drag; a single bottom-right square handle (14 × 14, 4 px radius, primary
  blue). Floor 40 px short side, ceiling 80 % of page width.
- **Sidebar collapse tooltip** reads "Show panel" / "Hide panel".

## 6. UX Model — Click Behaviour

| Action | Result |
|---|---|
| Single click on placed text / date | Select element (no editor opens) |
| Double click on placed text / date | Open unified editor |
| Click pencil on element | Open unified editor (same path) |
| Drag (> 5 px) | Move element |
| `Esc` | Close editor (if open, Cancel-revert), otherwise deselect |
| Click empty PDF area + tool active | Place a new element with that tool |
| **Tool = Text** + click on PDF | Create + auto-open unified editor (Cancel removes empty new element) |
| **Tool = Date** + click on PDF | Create with today's date (no auto-open) |
| **Tool = Signature** + click on PDF | Open the signature modal (same gesture as the toolbar button) |
| Pencil on signature / double-click signature | Open the signature modal in edit mode (replaces `dataUrl`, preserves x / y / w / h) |

## 7. Tools-bar Order

`[Signature]` `[Text]` `[Date]` `│` *(flex spacer)* `│` `[Change PDF]`

- Signature is the default and the leftmost button.
- `Change PDF` is pinned to the right edge via an explicit `flex: 1` spacer
  inside `.fse-toolbar` (a margin-left: auto alone wasn't enough — the
  toolbar was content-sized inside its parent).

## 8. Coordinate System

- `FsElement.x`, `y`, `w`, `h` are **% of page** (top-left CSS convention;
  `fillSignPdf.ts` converts to PDF's bottom-left origin when embedding).
- `fontSize` is stored in **PDF points** (scale-invariant). Overlay rendering
  multiplies by the current `pageInfo.scale` to get CSS px so the on-screen
  text tracks the page as it rescales.
- **Auto-rescale works for free** because every coordinate is scale-invariant.
- **DO NOT refactor to pixel coordinates** — that breaks the auto-rescale and
  every drag / click computation.

## 9. Audit Commands (must pass before any release)

```bash
# 1. Sensitive-dependency leak check.
grep -rE "paddle|stripe|neon|supabase|brevo|posthog|sentry|magic.?link|next-auth|hasSubscription" apps/extension/dist/
# Expected: empty. (`addWatermark` may match — it's a dead branch in
#  fillSignPdf.ts that the extension never invokes; safe.)

# 2. Permissions in the built manifest.
cat apps/extension/dist/manifest.json | grep -A 5 '"permissions"'
# Expected exactly: ["contextMenus", "downloads", "storage"]

# 3. No runtime network calls in the bundle.
grep -rE "fetch\(|XMLHttpRequest|sendBeacon" apps/extension/dist/assets/
# Expected: only the `fetch()` in background.ts for context-menu PDF
# download. No calls in editor or popup bundles.

# 4. signmypdf.io references are anchor hrefs only, never runtime targets.
grep -oE ".{30}signmypdf\\.io.{30}" apps/extension/dist/assets/*.js | head -5
# Expected: only `href:"https://signmypdf.io",target:"_blank"` in the footer.
```

## 10. Release Process

1. Implement and commit changes on the working branch.
2. `pnpm --filter sign-pdf-extension build` from the repo root.
3. Run every audit command in §9 — **all must pass**.
4. Bump `version` in [package.json](package.json). The manifest reads this
   value via `import pkg from '../package.json'` in
   [manifest.ts](src/manifest.ts), so it auto-syncs.
5. `pnpm --filter sign-pdf-extension package` → `sign-pdf-extension.zip`.
6. Commit, push, then create a GitHub release tagged `ext-v<VERSION>-test1`
   targeting the working branch (or `main` after merge). Upload the ZIP as
   the release asset. Hand the `browser_download_url` to the user.

## 11. Open Backlog (NOT done yet)

- **Chrome Web Store assets:** final 1280 × 800 screenshots (5×), promo tile
  440 × 280, large promo 920 × 680, marquee 1400 × 560.
- **Privacy policy URL** for the Web Store submission form
  ([PRIVACY.md](PRIVACY.md) already exists in the repo as the source text).
- **Store listing description** (English, < 132 chars short / no length cap
  long).

## Change Log

| Version | Date | Change |
|---|---|---|
| v2.6.3 | 2026-05-18 | Toolbar-icon refresh — same simplified red-square "Sign / PDF" mark, larger letterforms (fills more of the 16/32/48/128 px canvas). Detailed `public/logo.png` in the editor top-bar unchanged. Assets-only patch — same source pipeline (sips -z from Frame 58.png 1465×1441). |
| v2.6.2 | 2026-05-17 | Toolbar-icon set replaced with the simplified red-square "Sign / PDF" mark — the detailed v2.6.1 brand was unreadable at 16×16 in the Chrome toolbar. Editor top-bar `.ext-brand-logo` enlarged 32 → 44 px (the v2.6.1 32 px size looked lost in the header). The detailed `public/logo.png` stays — it is only the in-editor lockup, not the toolbar icon. Tagline `Free · No signup · Files stay private` unchanged. Assets + CSS only — no behaviour, audit, or permissions changes. |
| v2.6.1 | 2026-05-17 | Replaced placeholder pen-on-blue icons (16 / 32 / 48 / 128) with the final brand mark. New `public/logo.png` (512×512) wired into the editor top-bar via `<img>` + `chrome.runtime.getURL()`. Removed the obsolete `scripts/make-placeholder-icons.mjs` generator. Assets-only patch — no behaviour, audit, or permissions changes. |
| v2.6.0 | 2026-05-14 | Baseline feature set documented in §5 above. |

## 12. NEVER Do List

- Move to page / drag-and-drop elements across pages.
- Bold / italic / underline in the text editor.
- Auto-detect document font.
- Onboarding tour, first-time tutorials, walkthrough overlays.
- Multi-language i18n. English-only for at least 6 months.
- Accounts, signup, login, "sync your signatures" — any of it.
- Cross-session storage of signatures, drafts, recent-files history,
  preferences. Open → sign → close → forget.
- Watermark in any form (free, trial, anywhere).
- Reuse PDF coordinates as pixels. They stay as % of page.

## 13. Working with Viktor (the user)

- Not an engineer. Explain technical decisions in plain language.
- One task at a time. Wait for confirmation before chaining.
- Direct single recommendations preferred over a menu of options.
- Deploys / pushes / Web Store releases on assigned tasks are silent —
  commit, push, ship, don't ask.
- Avoid emoji unless explicitly requested.
