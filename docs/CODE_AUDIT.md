# Code Audit — Stage 3

**Goal:** map what in `apps/web/` is reusable for the planned `apps/extension/` (Chrome MV3 extension that does **only** "sign a PDF") and propose a Stage-4 extraction plan into `packages/`.

**Method:** read-only inspection of `apps/web/` against the assumption the extension is a free MVP — no paywall, no auth, no daily counter, no Pro features, no SEO/blog/marketing surface, no NDA. Just: drop a PDF → draw or type a signature → place on selected pages → download a signed PDF.

All file paths are relative to repo root. Line ranges are inclusive and reflect the state of `chore/monorepo-restructure` after Stage 2.

---

## 0. Dependency snapshot

From [apps/web/package.json](../apps/web/package.json):

| Package | Version | Used in | Verdict for extension |
|---|---|---|---|
| `pdf-lib` | `^1.17.1` | `signPdf.ts`, `mergePdf.ts`, `watermark.ts`, `compressPdf.ts`, `fillPdf.ts`, `splitPdf.ts`, `fillSignPdf.ts`, `api/sign/route.ts` | **Required** — primary PDF engine |
| `pdfjs-dist` | `^5.6.205` (resolved 5.7.284 by pnpm) | `PDFViewer.tsx`, `PDFTextEditor.tsx`, `FillSignEditor.tsx`, `PDFPreview.tsx`, plus 6 tool pages directly setting `GlobalWorkerOptions.workerSrc` | **Required** — preview rendering. Worker file copied via `apps/web/scripts/copy-pdf-worker.mjs` postinstall (per [Stage 2 fix](../apps/web/CLAUDE.md)) |
| `react-dropzone` | `^15.0.0` | All tool pages incl. `apps/web/app/sign/page.tsx:276-285` | **Required** — drag-and-drop ergonomics. Works fine in CRX popup/sidepanel |
| `lucide-react` | `^1.11.0` | Everywhere (chrome, components, page bodies) | **Required** — icons, plain SVG, no DOM/Next ties |
| `react` / `react-dom` | `19.2.4` | All client components | **Required** — extension will also be React |
| `@cantoo/pdf-lib` | `^2.6.5` | `apps/web/app/utils/protectPdf.ts:15` only | **Drop** — `/protect` only, MVP doesn't need encryption |
| `jszip` | `^3.10.1` | `apps/web/app/utils/splitPdf.ts:296` only | **Drop** — `/split` only |
| `signature_pad` | `^5.1.3` | **Nowhere** — verified by `grep -rn signature_pad apps/web/app` returning zero hits. `SignatureCanvas` re-implements its own canvas+stroke logic. | **Drop on next cleanup pass** — dead dep in current codebase too. Out of scope for Stage 4 |
| `@neondatabase/serverless` | `^1.1.0` | `apps/web/app/lib/db.ts` (Postgres for Pro subscriptions) | **Drop** — server-only, web-only |
| `next` | `16.2.2` | Framework | **Drop** — extension uses Vite or webpack (no SSR / file-system routing) |
| `eslint-config-next` | `16.2.2` | dev | **Drop** — replace with eslint-config for the extension toolchain |

Two transitive ones worth flagging since they ship in the bundle:
- `pdf-lib` ~280 KB gzipped — fine for an extension popup
- `pdfjs-dist` lib (~370 KB gzipped) + worker (~290 KB gzipped, lazy-loaded). **Worker resolution differs in CRX** — `'/pdf.worker.min.mjs'` (current code) won't work; needs `chrome.runtime.getURL('pdf.worker.min.mjs')`. See §1 caveat.

---

## 1. PDF-logic for signing

### 1.1 Primary engine: [apps/web/app/utils/signPdf.ts](../apps/web/app/utils/signPdf.ts) (193 LoC)

| Symbol | Lines | Role |
|---|---|---|
| `renderTextToDataUrl(text, w, h)` | 4-35 | Canvas-based text→PNG renderer. Auto-fits font-size to container, italic Brush Script font-stack, navy fill `#1e3a8a`. Used for `signMode === 'type'`. Browser-only (uses `document.createElement('canvas')`). |
| `SignaturePlacement` interface | 37-43 | `{ page, x, y, w, h }` — `x/y` percent-from-top-left, `w/h` percent of page. Single-source-of-truth for all placement math. |
| `SignOptions` interface | 45-52 | Public input contract. **Reusable as-is** for the extension. |
| `fitImageToContainer(...)` | 54-82 | Pure aspect-ratio math (no DOM). |
| `signPdfInBrowser(opts)` | 84-193 | The whole pipeline: load PDF → for each placement, embed PNG → draw at correct PDF coords → optional watermark → return `Blob`. **Pure browser API + `pdf-lib`. Zero Next.js coupling.** |

**Coordinate translation** ([signPdf.ts:118-123](../apps/web/app/utils/signPdf.ts#L118)) is the non-trivial part: CSS top-Y → PDF bottom-left Y. Documented inline.

**Watermark code path** ([signPdf.ts:170-188](../apps/web/app/utils/signPdf.ts#L170)) — gated on `addWatermark` flag. Helvetica 8pt, grey, opacity 0.4, bottom-center on every page. The extension MVP never sets this flag, so the entire branch becomes inert at runtime — but it's still 18 LoC + an `embedFont` call shipped in the bundle. **For pdf-core, keep the option but default to `false`** (as it already does).

A second copy of essentially the same watermark routine lives at [apps/web/app/utils/watermark.ts](../apps/web/app/utils/watermark.ts) (`addWatermarkToBlob`, 27 LoC). It re-loads the saved PDF after `signPdfInBrowser` returns, only because the web app needs the **clean version** for history storage and the **watermarked version** for download — see [apps/web/app/sign/page.tsx:312-326](../apps/web/app/sign/page.tsx#L312). This is a web-app concern, not part of the core engine.

### 1.2 Preview engine: pdfjs

`pdfjs-dist` is loaded **dynamically** by every tool page that needs it:

```ts
const pdfjsLib = await import('pdfjs-dist');
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
```

References ([apps/web/app/components/PDFViewer.tsx:51-52](../apps/web/app/components/PDFViewer.tsx#L51) and 7 other call sites). The worker URL is hardcoded in **8 places**.

**⚠️ Extension caveat:** `'/pdf.worker.min.mjs'` resolves against the current page origin in the web app. In a Chrome extension popup or sidepanel, the page is `chrome-extension://<id>/popup.html`, and the worker must be loaded as `chrome.runtime.getURL('pdf.worker.min.mjs')` from `web_accessible_resources` in `manifest.json`. The string literal cannot be left as-is. This is a 1-line change per call site, but it has to be configurable — proposal in §5.

### 1.3 Other PDF utils (NOT for sign-MVP)

| File | Lines | Used by | Verdict |
|---|---|---|---|
| `apps/web/app/utils/fillPdf.ts` | 132 | `/fill` | Drop — not in MVP |
| `apps/web/app/utils/fillSignPdf.ts` | 176 | `/sign-nda`, `/fill` (parts) | Drop |
| `apps/web/app/utils/protectPdf.ts` | 153 | `/protect` | Drop |
| `apps/web/app/utils/mergePdf.ts` | — | `/merge` | Drop |
| `apps/web/app/utils/compressPdf.ts` | — | `/compress` | Drop |
| `apps/web/app/utils/splitPdf.ts` | — | `/split` | Drop |

These are not blockers — `pdf-core` for the extension only needs `signPdf.ts` (and ideally `watermark.ts` for parity if we ever want a "signed by SignMyPDF Extension" footer, but the spec says no watermark for MVP).

### 1.4 Storage / handoff utils

[apps/web/app/utils/db.ts](../apps/web/app/utils/db.ts) (82 LoC) and [apps/web/app/utils/pendingUpload.ts](../apps/web/app/utils/pendingUpload.ts) (79 LoC) implement the IndexedDB hub→tool handoff. The extension has no hub; the popup is the entry point. **Drop both.**

[apps/web/app/utils/historyBlobs.ts](../apps/web/app/utils/historyBlobs.ts) (78 LoC) and [apps/web/app/utils/drafts.ts](../apps/web/app/utils/drafts.ts) (55 LoC) — Pro features, **drop**.

[apps/web/app/utils/subscription.ts](../apps/web/app/utils/subscription.ts) (59 LoC) — daily counter, Pro flag, dev-mode override. **Drop** — the MVP has no limits.

### 1.5 Next.js-specific code on the sign path

| File | Why it's Next-coupled |
|---|---|
| `apps/web/app/sign/page.tsx` | `'use client'`, but otherwise plain React — could in principle be lifted. **However:** it imports `next/font` *transitively* via the root layout, plus `<NavHeader>` and `<SiteFooter>` which use `next/link` and Google Fonts. The orchestrator itself is portable; the chrome around it is not. |
| `apps/web/app/sign/layout.tsx` | Pure Next metadata — drop entirely for the extension |
| `apps/web/app/layout.tsx` | `next/font/google` (`Inter`), Google Analytics inline script, JSON-LD metadata. **All web-only.** |
| `apps/web/app/api/sign/route.ts` (87 LoC) | Server-side PDF signing endpoint. **Currently unused by the client** — both `/sign` and `/sign-nda` go through `signPdfInBrowser` (browser-only). This is dead-weight in the web app too. Note for the future, drop for extension. |
| `apps/web/app/sitemap.ts` | Next sitemap. Web-only. |

---

## 2. UI components for signing

### 2.1 [apps/web/app/components/SignatureCanvas.tsx](../apps/web/app/components/SignatureCanvas.tsx) (366 LoC)

**Role:** create a new signature by drawing.

**Props:** `{ onSave(dataUrl, width, height), initialDataUrl?: string }`

**Internals:**
- Plain canvas + `getImageData`/`putImageData` for stroke buffer ([SignatureCanvas.tsx:243-298](../apps/web/app/components/SignatureCanvas.tsx#L243))
- DPR-aware scaling, mobile-aware height (240px on `<= 680px`, 380px desktop) ([SignatureCanvas.tsx:60-72](../apps/web/app/components/SignatureCanvas.tsx#L60))
- iOS Safari visualViewport offset compensation ([SignatureCanvas.tsx:160-170](../apps/web/app/components/SignatureCanvas.tsx#L160))
- Touch + mouse handling ([SignatureCanvas.tsx:172-241](../apps/web/app/components/SignatureCanvas.tsx#L172))
- Auto-cropped output via alpha-channel scan ([SignatureCanvas.tsx:250-275](../apps/web/app/components/SignatureCanvas.tsx#L250))
- Optional `initialDataUrl` pre-loads a saved signature into the canvas ([SignatureCanvas.tsx:115-148](../apps/web/app/components/SignatureCanvas.tsx#L115)) — used by `/sign-nda` Edit-existing flow only.

**Dependencies:**
- `react` (hooks) ✅
- `lucide-react` (`PenLine` icon, line 4) ✅
- `app/globals.css` classes: `.sig-toolbar`, `.sig-tool-group`, `.sig-divider`, `.color-dot`, `.width-btn`, `.sig-container`, `.sig-canvas`, `.sig-baseline`, `.sig-baseline-label`, `.sig-placeholder`, `.sig-placeholder-icon`, `.sig-placeholder-text`, `.sig-footer`, `.sig-hint`, `.clear-btn` — **23 unique class hits**, defined at globals.css:2458-2864.

**Next.js coupling:** **None.** No `next/router`, `next/link`, `next/image`, `next/font`. No server components. Pure `'use client'` (which is just a Next directive — at runtime in CRX it becomes a regular React component).

**Verdict:** **portable as-is**, with two changes:
1. Strip `'use client'` directive (no-op in non-Next environments anyway, but a static-analysis nit)
2. Bundle the 23 CSS classes alongside (see §3)

**Pre-existing ESLint debt** ([apps/web/CLAUDE.md → ## Pending decisions](../apps/web/CLAUDE.md)): 3 errors (`react-hooks/immutability` forward-references on touch handlers) + 2 warnings. Worth fixing as part of the extraction, since the extension's stricter ESLint config will fail on these.

### 2.2 [apps/web/app/components/PDFViewer.tsx](../apps/web/app/components/PDFViewer.tsx) (476 LoC)

**Role:** preview PDF + thumbnail strip + drag-to-place signature overlay. **Single component** that does three jobs:

1. **Thumbnail strip with checkboxes** ([PDFViewer.tsx:211-302](../apps/web/app/components/PDFViewer.tsx#L211)) — generated via `pdfjsLib.getPage(i).render()` at scale 0.3 into a hidden canvas, then `toDataURL`. Renders horizontal scroll list of thumbnails.
2. **Page navigation + canvas renderer** ([PDFViewer.tsx:91-115](../apps/web/app/components/PDFViewer.tsx#L91), 320-356) — single canvas that re-renders whenever `curPage` changes.
3. **Signature drag overlay with resize handle** ([PDFViewer.tsx:140-204](../apps/web/app/components/PDFViewer.tsx#L140)) — mouse + touch, % coordinates, container-relative.

**Props:**
```ts
{
  file: File;
  signatureDataUrl: string;
  placements: SignaturePlacement[];
  selectedPages: number[];
  onPlacementsChange: (placements: SignaturePlacement[]) => void;
  onSelectedPagesChange: (pages: number[]) => void;
}
```

**Dependencies:**
- `pdfjs-dist` (dynamic) — **with hardcoded `'/pdf.worker.min.mjs'`** ([PDFViewer.tsx:52](../apps/web/app/components/PDFViewer.tsx#L52))
- `lucide-react` (`FileText`, `PenLine`, `CheckSquare`)
- `react`
- **All styles inlined** as `style={{...}}` — zero global CSS classes. This is good for portability.

**Next.js coupling:** None.

**Verdict:** **mostly portable** but with two issues:

1. **Worker URL hardcoded** — needs configurable. Options:
   - Add a `workerSrc?: string` prop to PDFViewer (and any other pdfjs caller); web passes `'/pdf.worker.min.mjs'`, extension passes `chrome.runtime.getURL(...)`.
   - Or extract a helper `setupPdfjs(source: string | URL)` in `packages/pdf-core` that the host configures once on app boot.

2. **Single 476-line file with 3 responsibilities** — for extension reuse, the thumbnail strip, page renderer, and drag overlay are conceptually independent. The MVP could ship with the monolith as-is (extension's "sign" surface is a near-clone of `/sign`), but if we plan further extension features it's worth splitting into `<PdfThumbnailStrip>` + `<PdfPageCanvas>` + `<DraggablePlacementOverlay>` so each is independently testable. **For Stage 4 — keep monolith, ship as-is**, split later if needed.

### 2.3 Drag-drop dropzone

The dropzone is **inlined** in `apps/web/app/sign/page.tsx:276-285` via `useDropzone` — there is no shared `<Dropzone>` component. The CSS classes (`.dropzone`, `.dz-icon`, `.dz-title`, `.dz-sub` at globals.css:297-324) ARE shared with `/fill`, `/protect`, etc.

**Verdict:** trivial to duplicate in the extension (10 lines). Or extract a tiny `<PdfDropzone onFileAccepted={...} />` wrapper. Either approach is fine; not blocking.

### 2.4 Components NOT used in /sign or web-only

| Component | Lines | Role | Verdict |
|---|---|---|---|
| `SavedSignatures.tsx` | 128 | Pro-only signature gallery + paywall hook | **Drop** for MVP |
| `FileHistory.tsx` | 465 | Pro-only re-download history backed by IDB | **Drop** |
| `PaywallModal.tsx` | 370 | Paddle-integrated subscription modal | **Drop** |
| `NavHeader.tsx` | 131 | Site chrome with tools dropdown | **Drop** |
| `SiteFooter.tsx` | 132 | Site chrome with FB link, copyright, links | **Drop** |
| `Logo.tsx` | 32 | Inline SVG brand mark | Optional — extension may want a smaller mark for popup top bar |
| `ToolDescription.tsx` | 17 | SEO body wrapper card | **Drop** — extension has no SEO body |
| `BlogPdfUploader.tsx` | 123 | Inline blog-CTA PDF uploader | **Drop** |
| `FillSignEditor.tsx` | 1566 | `/fill` + `/sign-nda` editor (text/date/signature placement) | **Drop** for sign-only MVP |
| `PDFTextEditor.tsx` | 683 | older `/fill` editor | **Drop** |
| `PDFPreview.tsx` | 177 | preview-rendering helper | **Drop** — not used by /sign |
| `PlacementPicker.tsx` | 192 | mobile-only placement helper | **Drop** — not used by /sign |

---

## 3. Styling

### 3.1 What's in use

- **No Tailwind, no CSS Modules.** The whole app is a single 5405-line [apps/web/app/globals.css](../apps/web/app/globals.css). 719 unique class selectors.
- **Inline styles** for one-off layout (e.g. SiteFooter, PDFViewer) — frequent.
- **CSS custom properties** in `:root` ([globals.css:7-66](../apps/web/app/globals.css#L7)) — palette, type scale, spacing, container widths, tool accent colors. **Used by `.hub-*` namespace only**, per the inline comment at line 5. The rest of the site (incl. `/sign`) uses hard-coded values.
- **Mobile breakpoint:** `@media (max-width: 768px)` overrides tokens at `:root` scope (globals.css:68-81).

### 3.2 Fonts

| Font | Source | Where |
|---|---|---|
| **Inter** | `next/font/google` ([apps/web/app/layout.tsx:5](../apps/web/app/layout.tsx#L5)) | Body text everywhere |
| **Dancing Script** | Plain `<link>` to `fonts.googleapis.com/css2?family=Dancing+Script` ([apps/web/app/layout.tsx:69](../apps/web/app/layout.tsx#L69)) | Type-mode signature fallback in `signPdf.ts:11` (`"Brush Script MT", "Dancing Script", "Pacifico", cursive`) |
| System fonts | `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto` ([globals.css:84](../apps/web/app/globals.css#L84)) | Body fallback |

**Extension caveat:**
- `next/font/google` is a Next-only build-time mechanism. The extension has to either (a) self-host Inter as a font file in `public/`, or (b) use the system font stack directly.
- The Google Fonts `<link>` at `apps/web/app/layout.tsx:69` would also fail in CRX without `connect-src https://fonts.googleapis.com https://fonts.gstatic.com` in the manifest's `content_security_policy`. The cleanest path is **bundle Dancing Script as a `.woff2` in the extension** and load it via `@font-face` in the extension's CSS.

### 3.3 Brand colors

Hard-coded `#2563eb` (brand blue) appears in **dozens** of inline `style={{...}}` blocks across components, not derived from the `--color-primary` token (which exists but is namespaced to `.hub-*`). Same for `#16a34a` (success green), `#94a3b8` (slate-400 muted text), `#e2e8f0` (border), etc.

**Implication:** lifting the components into `packages/ui/` will drag those literal hex values along. For the extension MVP that's fine — it can ship with the same blue. If branding ever diverges between web and extension, we'll need to thread a theme prop or migrate the components onto the existing CSS-variable tokens (one-time refactor; not blocking Stage 4).

### 3.4 Signature-specific CSS surface (the only chunk needed for `/sign`)

The `/sign` flow needs roughly these globals.css blocks:

| Block | Lines | Selectors |
|---|---|---|
| `:root` design tokens | 7-66 | (variables only — keep wholesale, cheap) |
| `body` baseline | 83-94 | font-family stack, flex column |
| `.step-*` progress bar | 240-269 | `.step-circle`, `.step-label`, `.step-line` (×3 states each) |
| `.dropzone` + `.dz-*` | 297-330 | dropzone container, icon, title, sub |
| `.sig-*` + `.color-dot` + `.width-btn` + `.clear-btn` | 2458-2523, 2834-2864 | full signature canvas surface |
| `.step-header` | 2384+ | step title + count |

Roughly **300-400 lines** out of 5405 are the `/sign` surface. The rest is `/`, `/fill`, `/protect`, `/merge`, `/compress`, `/split`, `/sign-nda`, `/blog`, `.fse-*` editor, `.hub-*` homepage, paywall, footer, etc.

**Extraction strategy for Stage 4:** carve out the signature-relevant blocks into `packages/ui/src/styles/signature.css` (one file, ~300 LoC). The web app keeps its own `globals.css` and `@import`s that file at the top; the extension imports it directly. No coupling other than the shared file.

---

## 4. What we definitively do NOT reuse

Beyond what's already implied above, this is the explicit "NOT reusing" list:

### 4.1 SEO / blog / sitemap infrastructure

- `apps/web/app/sitemap.ts`
- `apps/web/app/lastmod.generated.json`
- `apps/web/app/blog/` (entire dir — 50+ articles)
- `apps/web/app/opengraph-image.tsx` and `apps/web/app/twitter-image.tsx`
- `apps/web/app/sign/layout.tsx` (Next metadata)
- All `metadata`/`alternates`/`openGraph` exports across tool pages
- `scripts/seo-health-check.mjs`, `scripts/seo-gsc-check.mjs`, `scripts/index-pages.mjs`, `scripts/submit-indexnow.mjs`, `scripts/generate-lastmod.mjs`

These are inert in any non-Next runtime. Not "drop"-able from `apps/web/` — they stay. They just aren't pulled into `packages/`.

### 4.2 Server-side surface

- All of `apps/web/app/api/*` (87 + 32 + 22 + 116 + smaller) — Next route handlers, magic-link auth, Paddle webhook, subscription check
- `apps/web/app/lib/db.ts` (Postgres / Neon)
- `apps/web/app/lib/email.ts` (Brevo SMTP)
- `apps/web/app/lib/jwt.ts` (custom HS256 implementation)
- `apps/web/app/api/sign/route.ts` (server-side `pdf-lib` wrapper — **dead code, never called from the client**, but still in repo)

### 4.3 Auth / subscription / paywall

- `PaywallModal.tsx`, all Paddle constants in `apps/web/app/constants/index.ts:6-31`
- `SavedSignatures.tsx` (Pro feature; saving a signature in the extension would just use plain `localStorage` without any Pro gate)
- `FileHistory.tsx` (Pro 24h/1y TTL distinction)
- `subscription.ts` (`isProActive`, `getTodayCount`, daily limit logic)
- `apps/web/app/dashboard/`, `apps/web/app/login/`

### 4.4 Analytics

- Inline GA snippet in `apps/web/app/layout.tsx:77-88`
- `gtag('event', ...)` calls scattered through tool pages (e.g. [apps/web/app/sign/page.tsx:332-337](../apps/web/app/sign/page.tsx#L332))
- `trackEvent` helper in same file at line 292-302

The extension may have its own telemetry stack later (Mixpanel, PostHog, or a self-hosted endpoint), but importing GA into a CRX context is not portable.

### 4.5 Watermark logic for MVP

`addWatermarkToBlob` and the `addWatermark` branch inside `signPdfInBrowser`. Per spec, the extension MVP ships **without** watermarking. Keep the parameter so we can re-enable later, but never pass `addWatermark: true` from the extension code path.

### 4.6 Hub→tool handoff (`pendingUpload` + IndexedDB)

The extension popup IS the entry point — there's no hub. `apps/web/app/utils/pendingUpload.ts` and the underlying `apps/web/app/utils/db.ts` are not needed in `pdf-core`. (And the [hub-handoff bug](../apps/web/CLAUDE.md) the user reproduces on the web is irrelevant in the extension context — sessionStorage / IDB never even gets touched.)

### 4.7 NDA template flow

`apps/web/app/sign-nda/`, `apps/web/public/templates/nda-template.{pdf,docx}`, `apps/web/app/components/FillSignEditor.tsx`, `scripts/generate-nda-{,docx-}stub.mjs`. Web-only marketing surface.

---

## 5. Recommendations for Stage-4 extraction

Three packages, three priorities. The split mirrors the empty placeholders that Stage 2 already created (`packages/pdf-core`, `packages/ui`, `packages/auth`).

### 5.1 `packages/pdf-core/` — ship in Stage 4

**Goal:** browser-side PDF signing engine, framework-agnostic.

**Move into it:**

| From | To | Notes |
|---|---|---|
| `apps/web/app/utils/signPdf.ts` | `packages/pdf-core/src/signPdf.ts` | As-is |
| `apps/web/app/utils/watermark.ts` | `packages/pdf-core/src/watermark.ts` | As-is — keep optional even if extension MVP doesn't call it |
| `SignaturePlacement` interface | exported from `packages/pdf-core/src/types.ts` | Currently lives in both `signPdf.ts` and `PDFViewer.tsx`; consolidate to one source |

**Add a worker-init helper:**

```ts
// packages/pdf-core/src/pdfjs.ts
export async function setupPdfjs(workerSrc: string) {
  const lib = await import('pdfjs-dist');
  lib.GlobalWorkerOptions.workerSrc = workerSrc;
  return lib;
}
```

Then `apps/web/` calls `setupPdfjs('/pdf.worker.min.mjs')` once on boot, the extension calls `setupPdfjs(chrome.runtime.getURL('pdf.worker.min.mjs'))`. Kills the 8 hardcoded URL literals and the worker becomes a per-host concern, which is what it actually is.

**`apps/web/` after extraction:** every import of `app/utils/signPdf.ts` becomes `from '@signmypdf/pdf-core'`. Same for `app/utils/watermark.ts`. Mechanical change in 4 places: `apps/web/app/sign/page.tsx`, `apps/web/app/components/FileHistory.tsx`, `apps/web/app/sign-nda/NdaHeroCard.tsx`, plus the dynamic `import('../utils/watermark')` at `apps/web/app/sign/page.tsx:324`.

**Effort:** ~2 hours. **Files moved:** 2. **LoC moved:** ~220. **Blocking deps:** none. **Risk:** very low — the signing logic doesn't change, only the import path.

### 5.2 `packages/ui/` — ship in Stage 4

**Goal:** React components that render PDF sign UI in any host (Next, Vite/CRX, plain webpack).

**Move into it:**

| From | To | Notes |
|---|---|---|
| `apps/web/app/components/SignatureCanvas.tsx` | `packages/ui/src/SignatureCanvas.tsx` | Strip `'use client'` directive, fix the 5 ESLint debt items in the same commit |
| `apps/web/app/components/PDFViewer.tsx` | `packages/ui/src/PdfSignViewer.tsx` (renamed for clarity) | Add `workerSrc` prop, plumb to `setupPdfjs()` |
| Sig-specific CSS slice | `packages/ui/src/styles/signature.css` | Lines 240-269, 297-330, 2384+, 2458-2523, 2834-2864 of globals.css. ~300 LoC |

**Don't move yet:**
- `Logo.tsx` — extension may want a smaller variant; defer to extension build
- `NavHeader.tsx`, `SiteFooter.tsx` — site chrome only
- `PaywallModal.tsx`, `SavedSignatures.tsx`, `FileHistory.tsx` — web-Pro-only
- `FillSignEditor.tsx`, `PDFTextEditor.tsx`, `PDFPreview.tsx`, `PlacementPicker.tsx`, `BlogPdfUploader.tsx`, `ToolDescription.tsx` — not on the sign-only path

**`apps/web/` after extraction:**
- `apps/web/app/sign/page.tsx` swaps `from '../components/SignatureCanvas'` → `from '@signmypdf/ui'`
- Same for `PDFViewer`
- `apps/web/app/globals.css` keeps the rest of the rules but `@import '@signmypdf/ui/styles/signature.css'` at the top so the existing class names still resolve

**Effort:** ~3-4 hours (the rename + ESLint debt + CSS carve are the bulk). **Files moved:** 2 + 1 CSS slice. **LoC moved:** ~840 + ~300 CSS = ~1140. **Blocking deps:** the ESLint debt in SignatureCanvas needs fixing or the extension's stricter config will fail. **Risk:** low — components are leaf nodes with stable APIs.

### 5.3 `packages/auth/` — DEFER

**Stage 4 status:** placeholder stays empty.

**Why:** the extension MVP is free, no accounts. The web app's auth is server-side (Postgres, magic links, Paddle webhooks) and not relevant to a CRX bundle. If the extension ever grows a "sign in for cloud sync" feature, we'd extract a thin client-side helper at that point — but writing it today on speculation violates "don't add features beyond what the task requires."

### 5.4 What stays in `apps/web/` (NOT moved)

- All API routes, `lib/`, server-side anything
- All Pro/paywall components and util modules (`subscription.ts`, `historyBlobs.ts`, `drafts.ts`, `pendingUpload.ts`, `db.ts`, `SavedSignatures.tsx`, `FileHistory.tsx`, `PaywallModal.tsx`)
- All non-sign tools (`fill`, `protect`, `merge`, `compress`, `split`, `sign-nda`) and their utils
- Site chrome (`NavHeader`, `SiteFooter`, `Logo`)
- SEO surface (sitemap, blog, layouts, OG images)
- Analytics
- Watermark code path (the *option* lives in `pdf-core`, but the *call site* that flips the flag based on daily count + Pro state stays in `apps/web/`)

### 5.5 Stage-4 → Stage-5 dependency

`apps/extension/` (Stage 5) depends on `@signmypdf/pdf-core` and `@signmypdf/ui` being shipped at the workspace level — the extension's `package.json` will list them via `"workspace:*"`. If Stage 4 ships clean, Stage 5 starts from a known-good base: signing engine + UI components both already validated by the web app.

**Stage-4 acceptance criteria** (proposing here for the next conversation):
1. `packages/pdf-core/src/index.ts` re-exports `signPdfInBrowser`, `addWatermarkToBlob`, `setupPdfjs`, plus types
2. `packages/ui/src/index.ts` re-exports `SignatureCanvas`, `PdfSignViewer`, plus prop types
3. `packages/ui/src/styles/signature.css` carved out of `apps/web/app/globals.css`
4. `apps/web/app/globals.css` `@import`s the new CSS slice; nothing else in apps/web changes visually
5. `apps/web/` switches `signPdf.ts`, `watermark.ts`, `SignatureCanvas.tsx`, `PDFViewer.tsx` imports to `@signmypdf/*` package paths
6. `pnpm build` clean; preview deploy clean; smoke-test of `/sign` shows zero behavioral change
7. SEO health check stays green (no metadata changes touched)
8. ESLint debt in SignatureCanvas resolved during the move (single commit, not bundled with feature work)

---

## 6. Caveats & open questions

1. **Worker URL config (§1.2 + §5.1).** Either the `setupPdfjs(workerSrc)` helper or a per-component `workerSrc` prop. Both work; the helper is less prop-drilling for a value that's typically set once per app. Recommend the helper.
2. **CSS-tokens migration.** The `--color-primary` etc. tokens exist but are unused outside `.hub-*`. `/sign` styles use hard-coded hex. Migrating signature CSS onto tokens would let the extension theme differently if needed. **Optional, not blocking** — the MVP uses the same `#2563eb`.
3. **Inter font in extension.** Recommend self-hosting `Inter-Regular.woff2` + `Inter-SemiBold.woff2` in extension `public/` rather than relying on system fonts. Adds ~80 KB to the extension bundle but matches the web rendering exactly.
4. **`signature_pad` dead dep (§0).** Not part of Stage 4, but worth a one-line PR to remove from `apps/web/package.json` while we're touching dependencies. Saves ~30 KB.
5. **`api/sign/route.ts` dead code.** Never called from the client per `grep`. Worth flagging for a separate cleanup, not part of Stage 4.
