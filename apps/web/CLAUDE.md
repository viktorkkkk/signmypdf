@AGENTS.md

---

# SignMyPDF — Project Status & Context

## Overview
**signmypdf.io** — free online PDF signing tool. No registration, no backend, 100% client-side (pdf-lib in browser). Built with Next.js 16.2.2 App Router + React 19 + TypeScript. Deployed on Vercel.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.2 (App Router) |
| UI | React 19, TypeScript |
| PDF processing | pdf-lib (100% client-side, no server) |
| Styling | CSS Modules + globals.css |
| Fonts | Google Fonts (Dancing Script) |
| Deployment | Vercel (CLI deploy) |
| Analytics | Google Analytics (G-SP5ZZJ3D17) |
| Email | ImprovMX → viktor.kolektionok@gmail.com |
| Company | PIXELTIDE LLC, 833 Saint Vincent, Irvine, CA 92618, USA |

---

## How to Deploy

```bash
# Deploy to production
VERCEL_ORG_ID=team_KV06sgJAaYS4OqFZHaskKPj2 \
VERCEL_PROJECT_ID=prj_vINyT8bno6KjwutaPoX05rZaXQNI \
npx --yes vercel@latest deploy --prod \
  --token "$VERCEL_TOKEN"

# Push to GitHub
git push https://$GITHUB_TOKEN@github.com/viktorkkkk/signmypdf.git main
```

> ⚠️ Tokens are stored in `.claude/tokens.local` (gitignored) — never commit them.

---

## Monetization Model (current)

### Free Plan
- First **2 PDFs per day** — signed **without watermark**
- From **3rd PDF onwards** (same day) — signed **with watermark** `SignMyPDF.io`
  - Font: Helvetica 8pt, grey, opacity 40%, bottom-center of every page
- Counter stored in `localStorage` key `signmypdf_count_YYYY-MM-DD`, resets daily
- After watermark added → **toast notification** shown (8 seconds)

### Pro / Paid Plan
- **No watermark** ever
- Unlimited PDFs per day
- Save & reuse signatures
- Download history
- Prices: $9/month or $7.50/month (billed $90/year)
- Subscription flag stored in `localStorage` key `signmypdf_subscribed = 'true'`
- Dev mode: add `?dev=1` to URL to activate Pro locally

### Toast Notification (watermark warning)
- Shown **only** when watermark is added (3rd+ PDF, free plan)
- Desktop (bottom-right): dark `#1a1a1a` bg, green ✅, "PDF signed — contains SignMyPDF watermark", "Remove with Pro →" link, × close, blue progress bar
- Mobile (<768px): full width, 10px side margins, shorter text "PDF signed — contains watermark"
- Auto-dismiss: **8 seconds**
- Clicking "Remove with Pro →" opens pricing modal

---

## What Has Been Done

### Core App
- [x] PDF upload (drag & drop + file picker, works on mobile)
- [x] Draw signature (canvas, color picker, stroke width)
- [x] Type signature (4 font styles, Unicode/Cyrillic support via canvas render)
- [x] Multi-page signing — select pages, drag placement per page
- [x] Save & reuse signatures (localStorage, Pro only)
- [x] Download history (localStorage, Pro only)
- [x] iOS share sheet support (`navigator.share` API for "Save to Files")
- [x] 100% client-side — no server, no file upload, fully private

### Watermark & Monetization
- [x] Watermark: `SignMyPDF.io`, Helvetica 8pt, grey, opacity 40%, bottom-center
- [x] Free plan: first 2 PDFs/day without watermark, 3rd+ with watermark
- [x] Toast notification after watermark PDF download (8 sec, with progress bar)
- [x] Pricing modal (3 plans: Free / Monthly / Annual)
- [x] Free plan pricing updated: "2 PDFs/day without watermark", "✗ Watermark after 2 PDFs/day"

### SEO & Blog
- [x] Blog with 40 articles (1500+ words each)
- [x] Each article: comparison table, US user reviews (blockquotes), CTA block, FAQ, internal links
- [x] BlogPostContent.tsx: tables, `[CTA]`, `[CALLOUT]`, step cards, bold/links in lists, QuickSummary
- [x] Blog footer matches main site (light style, PIXELTIDE LLC copyright)
- [x] Layout width unified to `max-width: 1200px` everywhere
- [x] Structured data (JSON-LD) on main page
- [x] Google Search Console verified (`T8qgvPjWrXpKbKE-O6pwBD3xir2SKHBGo1vxdikCEyo`)
- [x] sitemap.xml at `/sitemap.xml` (dynamic, auto-updates on deploy)
- [x] Blog CTAs match article topic: Sign articles → `/` CTA, Fill articles → `/fill` CTA
- [x] Tri-state tool routing in BlogPostContent.tsx — `getArticleTool(slug)` returns `'sign' | 'fill' | 'protect'` based on FILL_SLUGS + PROTECT_SLUGS sets + filename heuristics. Drives CTA href, button text, hero subtitle, sticky CTA, and BlogPdfUploader target route.
- [x] getPublishedPosts() filters by date ≤ build date — future-dated articles invisible until deploy
- [x] Daily trigger (02:00 UTC) auto-publishes 2 articles (1 SIGN + 1 FILL), deploys, submits to Bing + Google
- [x] All 45 URLs submitted to Google Indexing API + Bing IndexNow (Apr 22 2026)

### Bugs Fixed
- [x] Footer email: `support@signmypdf.io` (was `support@signmypdf.app`)
- [x] Footer URL: `https://signmypdf.io` (was `signmypdf.vercel.app`)
- [x] JSON-LD URLs fixed to `signmypdf.io`
- [x] Blog FAQ pricing corrected to `$9/month`
- [x] Bold text `**text**` rendering in list items (renderInline applied)
- [x] Blog copyright updated to `© PIXELTIDE LLC`
- [x] Pricing modal compact on mobile (all 3 plans visible without excessive scroll)
- [x] Signature bugs fixed on web and mobile (canvas drawing, placement, download)

### Fill PDF Tool (`/fill`) — built from scratch
- [x] `app/fill/page.tsx` — full fill tool: upload → edit → preview → done flow
- [x] `app/components/PDFTextEditor.tsx` — editor with drag, resize, multi-page, zoom
- [x] `app/utils/fillPdf.ts` — pdf-lib based PDF text injection
- [x] WYSIWYG: text size in editor = text size in saved PDF (pageScale × zoom)
- [x] Mobile: `maximum-scale=1` viewport lock prevents iOS zoom on input focus
- [x] Mobile: `autoFocus={!isTouchDevice}` prevents keyboard scroll shifting field position
- [x] Mobile top bar: filename + Change file (opens picker directly) + plan badge
- [x] Two-column layout on desktop (editor + sticky sidebar), single column on mobile
- [x] Steps progress bar: Edit → Preview → Done
- [x] Preview step: renders filled PDF as images with page tabs (no download needed first)
- [x] Y-position formula: `height - (y/100)*height - fontSize*0.97` (matches CSS baseline)
- [x] Zoom: −/+ buttons, ZOOM_STEPS=[1,1.5,2,3], pan enabled when zoomed
- [x] Draft save (Pro): 💾 Save draft button; free users see PRO badge + paywall on click
- [x] Draft restore: banner on upload page for Pro users with saved draft

### NDA Magnet (`/sign-nda`) — shipped through 2026-05-05
- [x] `app/sign-nda/page.tsx` — server component with metadata + JSON-LD (WebPage + FAQPage), 5-step "How it works" workflow, "About NDAs" tool description, FAQ.
- [x] `app/sign-nda/NdaHeroCard.tsx` — client component owning the hero card + always-visible "Drop your own NDA" dropzone (react-dropzone, PDF only, 50 MB cap) + restore-prompt + Success state. Switches between landing / editor / success surfaces via `editorFile` + `downloaded` state.
- [x] `app/components/FillSignEditor.tsx` — the editor used by `/sign-nda` (and reused-with-different-flags by `/fill`). Full feature set:
  - Text / Date / Signature placement.
  - **Drag-bug suppression** — `justDraggedRef` set on every drag/resize mouseup, checked in `onPageClick` to swallow the synthetic click that fires post-drag and would otherwise spawn a phantom new element when the cursor outpaces the dragged box by a few px.
  - Multi-line text via `<textarea>` with autoResize (height: auto → scrollHeight). Enter saves, Shift+Enter newline, Esc cancels. Renders with `white-space: pre-wrap`. PDF embed (`renderTextToPng`) splits on `\n` and stacks lines at 1.35× fontSize.
  - Font-size selector S/M/L (9/11/14 pt) inline at the bottom of the popup. Default 11 pt.
  - Action cluster on placed elements: **Edit / Duplicate / Delete** (Copy-to-clipboard removed in 2026-05-05 — was confusing UX vs Duplicate). Delete is red-by-default both in the on-element overlay and in the sidebar.
  - Compact 52-px sidebar cards: type-icon + value + 3 buttons. First-line + 25-char truncate via `previewLine()`.
  - Signature flow matches `/sign`'s: Draw / Type tabs, 5 colors × 3 widths × SIGN HERE baseline × Undo / Clear, all in the shared `SignatureCanvas`. Auto-place on Save & place (no click-to-place indirection). Apply-to-all checkbox in the modal places the same sig on every page in one go.
  - Edit (✏️) on a placed signature opens the same modal with the existing dataUrl pre-loaded into the canvas (via the `initialDataUrl` prop on `SignatureCanvas`, drawn centred at 80% canvas size, snapshot pushed into the strokes-undo buffer).
  - **Persistent saved signature** in `localStorage` key `signmypdf-saved-signature` (rehydrated on mount, written on every successful create / Use-saved). When set, picking the Signature tool opens a "Use your saved signature?" chooser → Use saved auto-places, Create new opens the create modal.
  - Page ticks in the thumbnail strip are derived from `elements.filter(e => e.type === 'signature')` — pure visual indicator, no user-toggle interaction.
  - Drafts: `draftKey` prop persists `{elements, timestamp}` to localStorage on every change (throttled 500 ms). `/sign-nda` uses `sign-nda-draft`; offers Restore / Start fresh on next visit.
- [x] **Auto-place after Sign & Download = Success state** (replaces editor surface). Big green check + "Done! Your signed PDF is ready." + filename pill + 3 share buttons (Email `mailto:` / WhatsApp `wa.me/?text=…` / Telegram `t.me/share/url?url=…&text=…`) with prefilled `SHARE_TEXT_BASE`. Hint clarifies that the file needs to be attached from Downloads. "Sign another document" returns to landing.
- [x] **5-step "How it works"** between hero card and About NDAs (`/sign-nda` only, not on other tool pages). FileText (blue) → TextCursorInput (green) → Signature (violet) → Download (amber) → Send (cyan). Each step in its own 8% tint plate, with a thin grey arrow between desktop steps. Mobile: vertical stack with icon-left / label-right.
- [x] Mobile resize handles enlarged 12 → 24 px on touch viewports with `-12 px` corner offsets so each handle is ≥24 × 24 — comfortable touch target.

### Sticky Sign Button
- [x] `position:sticky` button at bottom of sign step — always visible on scroll
- [x] Gray when not ready, blue gradient + pulse animation when ready (`canSign`)
- [x] Shows hint text: "Select at least one page" or "Create your signature"
- [x] Desktop: centered, margin 32px top/bottom
- [x] Mobile: no background/border/shadow — floats in air

### Protect PDF Tool (`/protect`) — shipped Apr 23 2026
- [x] `app/protect/page.tsx` — upload → configure → done flow (password + permissions)
- [x] `app/utils/protectPdf.ts` — client-side encryption (pdf-lib + qpdf.js or equivalent)
- [x] Password strength scoring + strong password generator
- [x] Permissions: printing, copying, annotation, form-filling toggles
- [x] Eye/eye-slash icons for password show/hide (Heroicons-style inline SVG)
- [x] First-page thumbnail preview (pdfjs-dist) in configure step
- [x] Mobile layout fixes: shrunk preview, sticky CTA, 52px touch targets, 16px font to block iOS focus-zoom
- [x] Sticky Protect CTA — floats above content on mobile (no white backdrop, no border, button carries dual-layer shadow)
- [x] Launch blog article: `password-protect-pdf-online-free` (Apr 23)

### Infrastructure
- [x] Domain: `signmypdf.io` → Vercel
- [x] Email: `support@signmypdf.io` via ImprovMX → gmail (active ✅)
- [x] GitHub repo: `github.com/viktorkkkk/signmypdf`
- [x] Vercel deploy token: stored in `.claude/tokens.local` (gitignored)
- [x] GitHub token: stored in `.claude/tokens.local` (expires May 2026)
- [x] Daily trigger ID: `trig_01Mw8wt1nCK3jpDA7ymfp4g2` (runs 02:00 UTC daily)
- [x] Google service account: `signmypdf-seo-reporter@signmypdf-seo.iam.gserviceaccount.com`
- [x] Google credentials file: `signmypdf-seo-97022bc5390f.json` (gitignored, embedded in trigger)
- [x] Bing Webmaster Tools: site added, sitemap submitted, Request indexing sent for main pages
- [x] `scripts/index-pages.mjs` — dynamic Google Indexing API (reads slugs from posts.ts, accepts CLI args)
- [x] `scripts/submit-indexnow.mjs` — Bing IndexNow bulk submit (all 40 slugs)

---

## ✅ FIXED (was KNOWN BROKEN May 6-7 2026): mobile-hero handoff

**Status: RESOLVED.** Verified working on a fresh browser by an outside tester. The user's local repro had been a stale browser-cache pinning the pre-fix bundle — the May 7 fix (`008695f`, `txStore` resolves on `t.oncomplete` instead of `req.onsuccess`) actually did close the bug. The repro disappeared as soon as the cached bundle expired. Mobile hero with Sign/Fill/Protect tabs → file pick → editor loaded works end-to-end on every browser checked.

The history below is preserved as a record of how the bug was diagnosed across three failed-looking commits. Don't undo `008695f`'s `t.oncomplete` resolve — it IS the fix, even though it was misattributed at the time.

### Original notes (kept for archaeology)

**Status: NOT FIXED** despite 3 commits. User-confirmed broken on prod across **all browsers** (not Safari-only as earlier hypothesis assumed). Reproduces every time: tap a tab on `/`, pick a PDF, land on `/sign | /fill | /protect` — and see the **dropzone twice** instead of the editor with the filename loaded.

**Business impact**: this is the primary mobile conversion path and it is currently 0% conversion to `pdf_signed` event on mobile. Every iPhone user who taps the hero CTA and picks a file gets an empty dropzone on arrival, has to find their file again, gets confused, bounces. **This is the single highest-priority bug on the project right now.** Until it's fixed, no other SEO/marketing/feature work moves the needle on mobile revenue.

### Three failed attempts so far

1. **`f80dbd1` (May 6)** — added `pendingUpload` IDB-backed handoff on `/`. Hub writes file to IDB before `router.push('/sign')`. Tool screens were not updated to read it. **Result**: dropzone on arrival because nothing consumed the pending file.

2. **`96bf4d9` (May 6)** — added consumer hooks on `/fill` and `/protect` (and confirmed `/sign` already had one). Each tool reads `pendingUpload` on mount and primes its file state. Verified in Chrome desktop preview. **Result**: still dropzone-on-arrival on prod — but Chrome-dev preview kept showing it as working.

3. **`2e17004` + `008695f` (May 7)** — instrumented the full hub→tool handoff with `console.log`s, found that `txStore` was resolving on `req.onsuccess` instead of `t.oncomplete` (request-applied vs. transaction-committed), patched `txStore` in [`app/utils/db.ts`](app/utils/db.ts) to resolve on `t.oncomplete`. Fix is genuinely correct in isolation — `req.onsuccess` and `t.oncomplete` are not equivalent and the IDB spec says cross-connection reads need the latter. **Result on prod**: STILL dropzone-on-arrival, on every browser. The IDB-race hypothesis was either wrong, or only one of multiple co-occurring failures.

### Verification gap: preview ≠ prod

All three commits were "verified" via the local Claude Preview tool (Chrome desktop, 390×844 viewport simulating mobile). Each "verification" came back clean and was cited as proof the fix worked. Each one then failed on prod. **Lesson: preview-tool DOM checks are not a substitute for actually testing the deployed prod URL on a real iOS Safari and a real Android Chrome.** The preview tool runs Chrome on macOS and inherits Chrome's IDB timing, font rendering, viewport assumptions, and PWA install state — none of which match a real iPhone visiting `https://www.signmypdf.io`. Future verification of mobile-affecting code MUST include either a real-device check or BrowserStack/Sauce equivalent before claiming "fixed."

### Candidate next approach: drop IndexedDB, use sessionStorage + base64

User-suggested architectural change. Rationale:

- IDB is the wrong primitive for a sub-second cross-route handoff. It's designed for **persistent client-side storage**, with a deliberately complex transaction model precisely so writes survive crashes — and that complexity is exactly what's biting us. Even with `t.oncomplete`, there are reports in the wild of Safari delaying transaction commit further when the page is unloading (which is exactly when `router.push` fires in our flow).
- `sessionStorage` is **synchronous, single-tab, no transaction model, no async commits**. `sessionStorage.setItem(key, value)` returns when the value is durably written and visible to every subsequent same-tab `getItem`. There is no race possible by construction.
- Tradeoff: `sessionStorage` is string-only, so the file has to be base64-encoded. Cost: ~33% size inflation + ~50ms encode/decode for a 1MB PDF. Mobile users typically upload 1-5MB PDFs, so worst case ~250ms of CPU on a mid-range Android. Acceptable for the conversion gain.
- Storage limit: ~5MB on Safari (the canonical floor). PDFs over ~3.7MB raw (= ~5MB base64) won't fit. Fallback: keep IDB as the >3.7MB path, use sessionStorage for everything below. Or: cap the hub upload at 3.7MB and require users with bigger files to upload directly on the tool screen (which currently works fine).
- Downside: `sessionStorage` is per-tab, doesn't survive a closed tab. That's actually fine for handoff — if the user closes the tab between hub and tool, we WANT to forget the file.

**Decision pending**: implement sessionStorage+base64 path as primary, leave IDB as >3.7MB fallback. **Do NOT start without explicit user go-ahead** — the next session should first reproduce the bug on a real device and confirm the diagnosis before touching code.

### What is genuinely fixed (don't undo)

- **`txStore` durable-commit contract** in [`app/utils/db.ts`](app/utils/db.ts). The fix from `008695f` is correct in isolation regardless of whether it solved the user-visible bug. Resolving on `t.oncomplete` is the IDB-spec-correct semantics for a "commit and read elsewhere" workflow, and `historyBlobs` (Pro download history) implicitly relies on it. Keep this. See `## What NOT to touch` → `txStore` entry.
- **Per-tool consumer wiring** on `/sign`, `/fill`, `/protect`. Each route reads `pendingUpload` on mount and primes its file state. Even when we switch to sessionStorage, the consumer pattern stays — only the underlying storage changes.

Files touched in the failed batch:
- `app/utils/db.ts` — `txStore` rewrite (kept).
- `app/page.tsx` (hub), `app/sign/page.tsx`, `app/fill/page.tsx`, `app/protect/page.tsx` — diagnostic logs added in `2e17004` and removed in `008695f`. Net delta vs. pre-batch state: zero (logs are gone, consumer wiring from `96bf4d9` is still there).

---

## Recently Shipped (2026-05-22): extension launch + landing polish + IndexNow fix

Headline: the Chrome extension is **live in the Chrome Web Store** and the
landing now leans hard into the **Free Forever** angle. Two-week sprint of
positioning + plumbing work that bundles a dozen smaller commits.

### Chrome extension — published 2026-05-21

- **Store listing:** [chromewebstore.google.com/detail/aiaokhplbmbiijmegjbnghmaacnkkfbj](https://chromewebstore.google.com/detail/aiaokhplbmbiijmegjbnghmaacnkkfbj).
- **Shipped version:** v2.6.3 (see `apps/extension/CLAUDE.md → Change Log` —
  toolbar icons + lockup polish; the editor itself stayed at v2.6.0 feature
  parity).
- **Trader status:** **Non-trader** (publisher field shows *PIXELTIDE LLC*).
  Google approved the submission without trader verification because Sign PDF
  is free with no in-extension transactions — the LLC carries the responsibility
  for the published product, not the transaction-flow paperwork.
- Pre-built test ZIP at the [`ext-test-1` GitHub Release](https://github.com/viktorkkkk/signmypdf/releases/tag/ext-test-1) stays available for reviewer-style sideloads.

### Landing `/sign-pdf-chrome-extension` — repositioned around "Free Forever"

Series of polish commits between 2026-05-21 and 2026-05-22; see
`apps/web/app/sign-pdf-chrome-extension/CLAUDE.md → Change Log` for v1.5
through v2.2.

- `a1e8d51` — `CHROME_STORE_URL` swapped from `/detail/PLACEHOLDER` to
  `/detail/aiaokhplbmbiijmegjbnghmaacnkkfbj`. Single constant resolves
  both Add-to-Chrome CTAs **and** the SoftwareApplication JSON-LD
  `installUrl`. Removed the "swap the placeholder" item from §8 Open
  backlog.
- `acb4902` — **Free Forever positioning** applied everywhere a visitor
  reads on this page: Hero H1 (now "Sign PDF Free Forever / Chrome
  Extension"), subtitle, trust strip, FAQ "Is it really free?" answer,
  page title, meta description, OG / Twitter title + description, and
  JSON-LD `WebPage.name` + `description`. Hero H1 font dropped
  60 → 52 px on desktop and 38 → 30 px on mobile to keep the longer
  string in two lines.
- `dfbaa1b` — Real `og-image.png` (1200×630 promo banner: "Sign PDF /
  Free Forever / No Signup" + signed-signature card). Wired in
  `layout.tsx` `og:image` + `twitter:image` since v1, so Facebook /
  LinkedIn / Twitter previews flip to the branded card automatically.
- Install screenshots block: 3 abstract lucide icons (Pointer / Shield /
  Pin) replaced with 3 real captures (`install-1-add-to-chrome.png`,
  `install-2-confirm.png`, `install-3-pin.png`) — Add-to-Chrome button,
  Chrome's confirm dialog, the toolbar pin menu. Each ships with a red
  arrow pointing at the specific control.
- **Section order finalised**: Hero → See how it works → Features → Why
  this extension is different (comparison) → How to install →
  Post-install CTA (`Ready to sign your first PDF?` + Add-to-Chrome
  button + small "Got questions? → /extension/support" link) → FAQ →
  Cross-pollination paragraph. **Final CTA at the bottom was retired
  2026-05-22** — the post-install CTA + hero proved enough; the
  duplicate at the bottom was just visual noise.

### `<ChromeExtensionBanner />` — single source of truth across the site

- Created in `apps/web/app/components/ChromeExtensionBanner.tsx` — server
  component, no props. Two-column card (60/40), hero screenshot on the
  right, "Add to Chrome" pill on the left. Whole card is one
  `<Link href="/sign-pdf-chrome-extension">` (deliberately NOT the
  Web Store — the landing acts as a filter + warmer pitch before the
  final install click).
- **Surfaces:** end of every Sign / Fill blog article (gate is
  `tool !== 'protect'` in `BlogPostContent.tsx`), and below the upload
  dropzone on `/sign` in full mode (existing `step === 'upload' &&
  !isMinimalMode` guard keeps the banner off the done-step and away
  from `?from=extension` visitors who already installed).
- **Hover behaviour:** card itself has no hover effects (`cursor: default`,
  no transform / shadow / border change). Only the inner "Add to Chrome"
  pill telegraphs interactivity (pointer cursor + darker bg + soft
  shadow lift). Clicks anywhere on the card still navigate — safety net
  intact.
- **Single visual style** as of v2.2 of the landing change log
  (`b0a5599`): pure white card, neutral grey `1 px solid #e5e7eb` border,
  soft `0 4px 14px rgba(15,23,42,0.05)` shadow. No `variant` prop, no
  conditional styling. Mobile collapses to single column at 768 px with
  screenshot above the text (visual hook → context).
- Replaces the older `<ExtensionBanner variant="card" />` on `/sign`.
  The `<ExtensionBanner variant="post-success" />` inline nudge on the
  done step is untouched — different surface, simpler markup.

### Sitemap + IndexNow

- `9c9e74f` — Added `/extension/support` to `apps/web/app/sitemap.ts`
  (it had been live since 2026-05-19 but was missing from the sitemap →
  GSC URL Inspection reported "URL is unknown to Google"). All three
  extension URLs (`/sign-pdf-chrome-extension`, `/extension/privacy`,
  `/extension/support`) submitted via both Google Indexing API and
  IndexNow on the same day.
- `b37dcf5` — **Fix:** `scripts/submit-indexnow.mjs` was carrying a
  hand-maintained `BLOG_SLUGS` array of 96 entries that fell behind
  every time the daily trigger added a new slug. As of today 7 published
  slugs were missing from the Bing submission set (`password-protect-pdf-online-free`
  — the launch article for `/protect`! — `sign-construction-contract-online`,
  `fill-government-forms-online-free`, `signature-disappears-pdf-fix`,
  `pandadoc-free-alternative`, `smallpdf-vs-signmypdf`,
  `sign-divorce-papers-online`). Script now reads slugs **live** from
  `apps/web/app/blog/posts.ts` on every run (mirrors `index-pages.mjs`
  for Google). The workflow's `Submit to IndexNow` step needs no change
  — calling the script with no args now submits the full current set.
  Backfill was run manually on 2026-05-22; Bing + IndexNow API both
  returned 200 for 117 URLs. See "### Bing Webmaster / IndexNow" below
  for the operational detail.

### SEO + analytics — 2026-05-22 snapshot

Numbers below are from GSC + GA Data API, pulled today. Use these as the
post-launch benchmark; rerun `scripts/seo-gsc-check.mjs` to compare in two
weeks.

- **GSC (28 days, `sc-domain:signmypdf.io`):**
  - Impressions: **538** (vs 212 on 2026-05-07 → **+154 %**)
  - Avg position: **29** (vs 61.5 on 2026-05-07 → climb of ~32 places)
  - Clicks: still trending up but small absolute numbers; report the
    full count in the next snapshot once it's meaningful.
- **GA4 (30 days, real users — excluding the Thailand dev-test traffic):**
  - **73 unique users**
  - **102 PDFs processed** end-to-end (sign + fill + protect combined) —
    first month with a non-trivial real-user conversion volume.
- **Bing Webmaster Tools** still surfaces two recommendations:
  1. "Not all recent blog pages submitted via IndexNow" — **fixed today**
     (`b37dcf5`). Backfill submitted on the same day; the warning should
     clear within Bing's 1-4 h processing window plus a recrawl cycle.
  2. "0 inbound backlinks from authoritative domains" — **the real
     remaining bottleneck**. Bing won't allocate crawl budget or surface
     us in non-trivial SERPs without external trust signals. Tracked
     under `### 3b. Backlink campaign` below.

### Backlink campaign — restarted 2026-05-22

See `### 3b. Backlink campaign` below for the updated status table.
Headline change today: **AlternativeTo profile submitted** with Twitter
`@signmypdf` + the new Facebook business page "Sign My PDF in seconds";
listing competes against 51 alternatives (Adobe Sign, DocuSign, Smallpdf,
iLovePDF, etc.). Awaiting AlternativeTo moderation (24-48 h SLA). Next
catalogues queued: G2, Capterra, GetApp.

### Decisions taken 2026-05-22

- **Monetisation pricing — revised**. Pro tier will be **$4.99 / month
  or $39.99 / year** (down from $9 / $7.50). Trigger to flip is **30 k
  weekly active users on the extension** — until then the funnel volume
  is too low to A/B-test pricing meaningfully. Free Forever stays the
  positioning for sign + fill; Pro features (saved signatures /
  download history / batch flows) are the only paid surface.
- **No Google Ads — ever**. Conflicts with the privacy-first positioning
  the product is built on. Replaces the earlier "defer AdSense" decision
  with a hard "no". Revenue path is purely Pro subscriptions + maybe
  one-off team licenses later. **Do not revisit this.**
- **Blog cadence — drop from 2 / day to 1 / day** (3-5 articles per
  week). Reasons: at 2 / day we're now seeing internal-cannibalisation
  smell in GSC (multiple slugs ranking for the same keyword without one
  taking off), and natural article length has been creeping up past the
  600-1200 hard bounds. Trigger prompt update is a separate task — the
  current v3.2 trigger is unchanged; this paragraph is the source of
  truth for the new cadence until the trigger is updated to match.

### Metrics to track going forward

| Source | Metric | Where to read |
|---|---|---|
| Chrome Web Store | Installs, weekly users | [Developer Dashboard](https://chrome.google.com/webstore/devconsole/) |
| GSC | Impressions, clicks, avg position, indexed pages | `scripts/seo-gsc-check.mjs` + GSC UI |
| GA4 | `pdf_signed` funnel, banner CTR to `/sign-pdf-chrome-extension` | GA Data API (property 532300049) |

The two newest GA4 events to watch are `extension_banner_clicked` (fires
from the deprecated `<ExtensionBanner />` post-success variant — still
active on `/sign` done step) and any future events we wire on the new
`<ChromeExtensionBanner />` card (currently no analytics by design — the
card is a `<Link>`, not an `onClick` handler).

---

## Recently Shipped (May 7-8 2026): Stage 4 monorepo extraction

**Stage 4 closed.** Two PRs landed back-to-back over 24h that promote `packages/pdf-core` and `packages/ui` from placeholders to working workspace packages. `packages/auth` stays placeholder (extension MVP is free, deferred per audit §5.3).

**[PR #9](https://github.com/viktorkkkk/signmypdf/pull/9) — pdf-core extraction (May 7):**
- Moved `app/utils/signPdf.ts` (193 LoC) and `app/utils/watermark.ts` (27 LoC) into `packages/pdf-core/src/` via `git mv` (rename history preserved).
- New `packages/pdf-core/src/types.ts` exposes `SignaturePlacement` + `SignOptions` as the single source of truth (was duplicated in signPdf.ts AND PDFViewer.tsx, per audit §1.1).
- New `packages/pdf-core/src/pdfjs.ts` — `setupPdfjs(workerSrc)` helper. Per-host worker URL config: web passes `'/pdf.worker.min.mjs'`, future CRX passes `chrome.runtime.getURL('pdf.worker.min.mjs')`.
- Public API: `signPdfInBrowser`, `addWatermarkToBlob`, `blobToDataUrl`, `setupPdfjs`, types.
- 5 import sites in apps/web rewritten to `from '@signmypdf/pdf-core'`. Next.js `transpilePackages` registered.

**[PR #10](https://github.com/viktorkkkk/signmypdf/pull/10) — ui extraction (May 8):**
- Moved `app/components/SignatureCanvas.tsx` (366 LoC) → `packages/ui/src/SignatureCanvas.tsx`.
- Moved `app/components/PDFViewer.tsx` (476 LoC) → `packages/ui/src/PdfSignViewer.tsx` (renamed for clarity).
- New `packages/ui/src/styles/signature.css` — ~135 LoC carved verbatim from globals.css. Owns `.sig-*`, `.color-dot`, `.width-btn`, `.clear-btn`, `.sig-toolbar` selectors. Hosts `@import '@signmypdf/ui/styles/signature.css'` once.
- `PdfSignViewer` gains a required `workerSrc: string` prop, replaces inline `await import('pdfjs-dist'); GlobalWorkerOptions.workerSrc = ...` with `await setupPdfjs(workerSrc)`.
- **9 inline `pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'`** literals across apps/web migrated to `setupPdfjs()` (kills the hardcoded URL completely outside packages/ui).
- **SignatureCanvas ESLint debt cleared in the same commit (audit §5.2 acceptance criterion):** all event handlers hoisted above the canvas-init useEffect and wrapped in useCallback (no more forward references); `onSaveRef` pattern keeps handler identity stable across parent re-renders; `initCanvas` reads color/width from refs (correct empty-deps array); extracted `advanceStroke()` to dedupe the mouse + touch curve-drawing routine. 5 problems → 0.
- `packages/ui/package.json` declares `@types/react` + `@types/react-dom` + `typescript` as devDeps (Vercel's per-package TS-check fails without them; pnpm doesn't extend types from non-declaring packages — local `pnpm dev` skips the strict check, prod build runs it. Caught by Vercel preview build, fixed in commit `78aaf73`).

**Final monorepo structure (frozen as of 2026-05-08):**
```
apps/web/                     ← Next.js 16 prod app
packages/
  pdf-core/src/               ← signPdf, watermark, pdfjs(setupPdfjs), types, index
  ui/src/                     ← SignatureCanvas, PdfSignViewer, styles/signature.css, index
  auth/src/                   ← placeholder (deferred — extension MVP free)
```

`apps/web/next.config.ts` lists all three packages in `transpilePackages` so Next compiles raw TypeScript from workspace deps.

**What's queued next** (in priority order, see §`Pending decisions` below for detail):
1. **Layout fix `/sign`** — 2-column grid with sticky right sidebar 320–360px, PDF column max-width 800px. Per audit §6.4. **This is the LAST task before `apps/extension/`** — lifting the layout fix into `packages/ui` first means the Chrome extension popup (max 800×600) inherits the right size from day one rather than needing a CRX-only override.
2. **Stage 5: `apps/extension/`** — Chrome MV3 popup. Imports `@signmypdf/pdf-core` and `@signmypdf/ui` directly. Calls `setupPdfjs(chrome.runtime.getURL('pdf.worker.min.mjs'))` once on boot. System font stack only (no Inter `.woff2` bundle, per audit §7).

---

## Recently Shipped (May 5 2026)

Day-long iteration on `/sign-nda` and the shared `FillSignEditor`. Eight code commits, all on prod. Headline outcomes:

- **/sign-nda is now a self-contained signing surface.** Lander shows the NDA template card, an "OR" divider, and an always-on dropzone for uploading your own PDF (50 MB, PDF only). 5-step "How it works" instruction sits between hero and "About NDAs". Sign flow ends in a Success state with three share-out CTAs (Email / WhatsApp / Telegram) and a "Sign another document" reset.
- **`FillSignEditor` overhauled end-to-end.** Drag of any element no longer spawns a phantom duplicate (via the `justDraggedRef` post-mouseup click-suppression), text supports multi-line via auto-resize textarea, on-element actions are **Edit / Duplicate / Delete** (clipboard-copy removed; Delete now red-by-default), sidebar cards are compact 52 px one-row chips, default font is 11 pt with an inline S/M/L selector.
- **Signature flow matches `/sign` and persists.** Modal carries the same Draw / Type tabs, colour palette, line widths, undo / clear, plus an Apply-to-all checkbox. Save & place auto-drops the signature at the page bottom-third — no click-to-place step. The dataUrl is mirrored to `localStorage.signmypdf-saved-signature`, so the next visit (same or different document) opens a "Use your saved signature?" chooser. Edit (✏️) on a placed signature now opens the same modal with the existing sig pre-loaded into the canvas — earlier the button silently no-op'd because the modal JSX was gated on `creatingSig` which was never set on the edit path.
- **PDF signature is finally transparent.** `applyFillSign` no longer multiplies the embedded PNG by `opacity: 0.95` — the PNG already carries its own alpha — and the on-screen `.fse-element-image` plate dropped its `rgba(255,255,255,.85)` background. Only the stroke shows over the underlying PDF, both in the editor and in the rendered output.
- **Mobile parity.** Resize handles on signatures are 24 × 24 px on touch viewports (was 12 × 12, below the touch-target floor). Modal cards use `max-width: 100%` + 12 px side margins. Success state share buttons stack one-per-row on `<= 640 px`. The 5-step "How it works" collapses to a single-column with icon-left / title-right rows.

Files involved across the eight commits:
- `app/components/FillSignEditor.tsx` — heavy refactor (drag suppress, multi-line popup, compact sidebar, sig flow, font selector).
- `app/components/SignatureCanvas.tsx` — added optional `initialDataUrl` prop with run-once image preload + undo-buffer snapshot.
- `app/sign-nda/page.tsx` — added 5-step "How it works", swapped pencil-twin icons for `TextCursorInput` + `Signature`.
- `app/sign-nda/NdaHeroCard.tsx` — added always-visible upload dropzone + Success state with share buttons.
- `app/utils/fillSignPdf.ts` — removed `opacity: 0.95` on signature `drawImage`.
- `app/globals.css` — extensive rule additions and a few removals (`.fse-pending-bar*`, `.nda-done-toast*`, `.fse-list-page*`).

Known carry-over: `app/components/SignatureCanvas.tsx` has 5 pre-existing ESLint problems (3 errors, 2 warnings — `react-hooks/immutability` forward-references on touch handlers + `react-hooks/exhaustive-deps` on the canvas-init effect). The errors predate this work; build still passes (Next config's lint stage doesn't fail the build on these specific rules). Not fixed in this batch.

---

## Recently Shipped (May 1 2026)

- **Daily blog pipeline split: trigger v3.2 + `.github/workflows/deploy-on-blog-push.yml`.** Three consecutive trigger runs (Apr 29, Apr 30, May 1) committed and pushed articles but never reached the deploy step — Vercel API confirmed zero deployments between Apr 29 10:52 UTC and May 1 10:22 UTC despite the trigger running daily at 02:00 UTC. Root cause: trigger's runtime budget exhausted before Step 10 (`vercel deploy --prod`). Fix: split into Stage A (trigger v3.2: write → build → commit → push) and Stage B (GitHub Actions `deploy-on-blog-push.yml`: deploy → IndexNow → Google Indexing → log). Stage B is path-filtered on `app/blog/posts.ts` so unrelated commits don't trigger redundant deploys. Also patched `scripts/index-pages.mjs` to read `GSC_CREDENTIALS` from env (same pattern as `seo-gsc-check.mjs`) so the workflow can use the existing repo secret without writing a temp credentials file. `VERCEL_TOKEN`, `INDEXNOW_KEY`, and the inline base64 GCREDS block are now removed from the trigger prompt — only `GITHUB_TOKEN` (for `git push`) remains in plaintext. Backup of v3.2: `~/.config/signmypdf/blog-trigger-prompt-backup-2026-05-02-v3.2.md`.
- **Blog template stripped of 5 templated AI-spam blocks.** `BlogPostContent.tsx` rendered every article with hard-coded promotional wrappers indistinguishable across 50+ articles. Removed: (1) `DefaultQuickSummary` plate (TIME / COST / WORKS ON / REGISTRATION) + the inline `[QuickSummary]` parser — the marker is now skipped at render time so the 51 frozen articles also lose the block visually without editing `posts.ts`. (2) Templated 4-question `FAQSection` with stale `$9/month` pricing — AI articles already write their own contextual FAQ inside `content`. (3) `FinalCTA` "Ready to … / Join thousands of users who trust SignMyPDF" — fake social proof; AI articles include their own CTA inside `content`. (4) `SEOVariations` "More Ways to Sign PDFs" with 3 hard-coded SIGN-only links — critical content mismatch on FILL/PROTECT articles. (5) Hashtag chips under the H1. Side cleanup: removed unused lucide imports (`Clock`, `DollarSign`, `Smartphone`, `Check`), removed `finalTitle`/`finalSub` from `TOOL_META`, removed `FAQItem` (only used by `FAQSection`). File shrank 932 → 693 lines (−239). Verified on prod for both new SEO-landing (`electronic-signature-business-contracts`) and old frozen (`eidas-regulation-eu-signatures`) pages: zero hits in visible HTML for any of the 5 removed elements; header / breadcrumbs / title / hero / AI body / Related Articles / footer all present. SEO health check PASS (68/68 healthy excluding 5 known-baseline allowlisted).
- **Anchor v3.1 confirmed working in the wild.** Both `cec7385 Blog: PROTECT for 2026-05-01 (cycle_day 1)` (trigger Apr 30 02:00 UTC) and `1a267f1 Blog: fill+protect for 2026-05-02 (cycle_day 2)` (trigger May 1 02:00 UTC) selected the correct cycle_day pair against the new anchor `1776988800`. Selection logic green; only the (now-deferred) deploy step was failing.

## Recently Shipped (Apr 29 2026)

- **Trigger anchor bug fixed** — `EPOCH_ANCHOR` in the daily-blog trigger prompt was `1745452800` (= 2025-04-24), not the documented 2026-04-24. The off-by-365-days shifted every cycle_day by `+2 mod 3`. Apr 29 was the first day where the wrong cycle_day produced the wrong pair: trigger published `Sign + Protect` instead of `Fill + Protect`. Patched to `1776988800` and verified with `date -u -d '2026-04-24 00:00 UTC' +%s`. Also removed the now-shipped `freelancers-protect-client-contracts` PROTECT priority override. Live trigger is v3.1.
- **Apr 29 rotation re-balanced** — moved `electronic-signature-business-contracts` (SIGN, accidentally published on Apr 29) forward to May 1 (next `cycle_day == 1` slot). Wrote and added `property-managers-tenant-signatures` (FILL) to fill the Apr 29 slot. Final Apr 29 pair: `freelancers-protect-client-contracts` + `property-managers-tenant-signatures` = correct Fill+Protect for `cycle_day == 2`. URLs unchanged → SEO-safe.
- **Vercel auto-deploy by trigger known to fail** — investigated why no deployment was created in Vercel API after the Apr 29 02:21 UTC trigger commit. Most likely the trigger run hit its runtime limit before reaching Step 10 (`vercel deploy --prod`); the commit + push (Step 9) succeeded but the deploy step never executed. Recovery is currently a manual `vercel deploy --prod` after each trigger commit. See `## What NOT to touch` for the anchor verification command.

## Recently Shipped (Apr 23 2026)

- **`/protect` tool live** — password + permissions PDF protection, fully client-side, deployed to production.
- **Mobile `/protect` polish** — shrunk preview, larger touch targets (52px inputs, 48px buttons, 16px font), sticky CTA now floats above content (no white backdrop, no top border — button carries its own shadow). Matches `.sticky-sign-wrap` pattern on `/`.
- **Blog trigger logic fixed** — forward-walk algorithm: starts from today, steps forward day-by-day until it finds a date with `<2` articles. No more overflow onto a single day.
- **Tri-state CTA routing working** — `getArticleTool(slug)` returns `sign | fill | protect` and drives every in-body CTA, sticky CTA, BlogPdfUploader target, hero subtitle, and button copy. `FILL_SLUGS` + `PROTECT_SLUGS` sets in `BlogPostContent.tsx` override the filename heuristic when needed.
- **7 hard blog rules codified** — documented in CLAUDE.md AND embedded in the daily trigger prompt (`trig_01Mw8wt1nCK3jpDA7ymfp4g2`). Rules cover: no editing published articles, CTA/tool alignment, forward-walk date selection, metaTitle dedup, no tool-type rewrites, equal-rate publishing for new tools, failure mode detection.
- **QuickSummary parser fixed** — `BlogPostContent.tsx` now parses inline `[QuickSummary]...[/QuickSummary]` blocks instead of leaking raw-text bracket markup onto the page.
- **SEO bloat removed from tool pages** — stripped heavy SEO content blocks from `/`, `/fill`, `/protect`; replaced with compact FAQ so conversion-critical pages stay focused on the upload CTA while preserving answer-box FAQ schema for SERP.

---

## Homepage Status (last redesign 2026-04-29)

**Live:** https://www.signmypdf.io/  
**Source:** `app/page.tsx` (~470 lines), `app/globals.css` (`hub-*` namespace).

**Structure — 5 blocks (DO NOT add or remove):**
1. **Hero** — H1 (two lines, no em-dash) + sub + 3 tool cards + dropzone + trust strip (folded into hero)
2. **Why us** — 3 accent cards (red Unlock / emerald ShieldCheck / amber Zap)
3. **SEO comparison** — two-column "What other tools do" / "What SignMyPDF does" + 1-line summary
4. **FAQ** — 5 Q&As + JSON-LD `FAQPage`
5. **Footer** — `<SiteFooter />` (shared component)

**Removed sections (DO NOT bring back):**
- **"How it works"** (3 numbered steps) — dropzone is self-explanatory
- **"Trusted by thousands"** with fake reviews (Marcus R. / Elena T. / David K.) — AI-spam, dishonest
- **Premium banner** ("Remove limits & finish your work") — premature pitch before user has hit any limit
- **Long 4-paragraph SEO prose** — replaced by the 2-column compare grid
- **`aggregateRating`** in JSON-LD (fabricated 4.8 / 1240) — pulled to match the no-fake-data principle

**Design system — CSS variables in `:root` of `app/globals.css`:**
- Palette: `--color-primary`, `--color-success`, `--color-warning`, `--color-danger`, `--color-text`, `--color-muted`, `--color-border`, `--color-bg`, `--color-surface`
- Type scale: `--font-h1` (48/32px), `--font-h2`, `--font-h3`, `--font-lead`, `--font-body`, `--font-sm`
- Spacing: `--space-section` (80/48), `--space-section-tight` (56/32 — contextually-linked blocks like Hero→Why), `--space-stack`, `--space-card`, `--space-page`
- Container: `--container-max` 1200px, `--content-grid` 1080px (card grids), `--content-prose` 760px (text)
- Tool accents: `--tool-sign-fg/bg`, `--tool-fill-fg/bg`, `--tool-protect-fg/bg`
- Mobile `@media (max-width: 768px)` overrides tokens at `:root` scope so child rules pick up new values automatically

**Tool palette (cool family, no rainbow, no clash with Why-card triplet):**
- **Sign:** Blue `#2563EB` (brand primary)
- **Fill:** Teal `#0D9488`
- **Protect:** Violet `#7C3AED`

Applied via `.tool-accent-sign | .tool-accent-fill | .tool-accent-protect` modifier classes on `.hub-tool-card`.

**Why-card accent colors (`.accent-danger | .accent-success | .accent-warning`):**
- **Red** (Unlock) — "No paywall at the last step"
- **Emerald** (ShieldCheck) — "Your files never leave your browser"
- **Amber** (Zap) — "No email, no account, no friction"

**Dropzone Sign-affinity (visual binding to the Sign tool):**
- Mini-heading "Sign a PDF — drop it below" above the dropzone (h2, `--font-h3`)
- Border: dashed `--tool-sign-fg` (Sign blue) — same blue as the Sign card icon-wrap
- Icon: `FileSignature` (lucide), in `--tool-sign-fg`
- Hint copy: "Goes straight to **Sign** · Instant · No registration" — `<strong>Sign</strong>` styled in `--tool-sign-fg`
- Drops always route to `/sign` (`router.push('/sign')` in `onDrop`) — never to the `/` hub itself

---

## Blog Status (2026-04-29)

**Daily trigger:** `trig_01Mw8wt1nCK3jpDA7ymfp4g2` (cron `0 2 * * *` UTC). **v3.1 prompt is live** (anchor bug-fix patch landed 2026-04-29).

**Backups (rollback targets, newest first):**
- v3.1 (anchor fix, override removed): `~/.config/signmypdf/blog-trigger-prompt-backup-2026-04-29-v3.1.md`
- v3 (SEO-landing + 55-char title cap, but with broken anchor): `~/.config/signmypdf/blog-trigger-prompt-backup-2026-04-28-v2.md`
- v2 (SEO-landing, pre-v3 refinements): `~/.config/signmypdf/blog-trigger-prompt-backup-2026-04-28-v2.md`
- v1 (pre-SEO-landing, original 1500w long-form prompt): `~/.config/signmypdf/blog-trigger-prompt-backup-2026-04-28.md`

**Article format (v3 SEO-landing):**
- Length: **700-900w ideal**, 600-1200w hard bounds
- Title cap: **55 characters** (Google SERP truncates longer)
- Main keyword: 2-3× in first 100 words (no stuffing)
- 2-3 in-body internal links + 3 in "Related tools" at end
- 1-2 `[IMAGE: ...]` placeholders (render layer skips gracefully — image substitution is TODO)
- USP positioning: "Free, no registration, no paywall at download" at least once per article
- Article types: (a) **use-case**, (b) **comparison**, (c) **troubleshooting**. Explainers must be reframed; listicles forbidden.
- Schema markup: render-layer concern (NEVER in `content` field) — auto-emission in `BlogPostContent.tsx` is TODO

**Audience mix (sliding 7-day window):**
- **Segment 1** (casual one-time users): **60%** of articles, 60-70% of expected traffic — broad consumer intent
- **Segment 2** (freelancers / remote workers): **30%**, 20-25% of traffic — recurring client work
- **Segment 3** (SMB / regulated professionals): **10%**, 5-10% of traffic — daily team workflows

**Articles published in new SEO-landing format (7 so far):**
- `protected-pdf-wont-open-some-devices` (2026-04-28, S1 troubleshooting)
- `pdf-signing-no-email-required` (2026-04-28, S1 comparison)
- `freelancers-protect-client-contracts` (2026-04-29, S2 use-case — published by Apr 29 trigger)
- `property-managers-tenant-signatures` (2026-04-29, S3 use-case — added manually 2026-04-29 to fix anchor-bug rotation gap)
- `electronic-signature-business-contracts` (2026-05-01, S2 use-case — re-dated from Apr 29 to May 1 to fix anchor-bug rotation; future-dated)
- `hellosign-alternatives-free` (2026-04-30, S1 comparison, future-dated)
- `esign-act-explained` (2026-04-30, S1 explainer reframed as use-case, future-dated)

The other **51 articles dated ≤ 2026-04-27** remain in the OLD long format and are FROZEN under Hard Rule 1.

**Render-layer emoji replacement:** `app/blog/[slug]/BlogPostContent.tsx` intercepts emoji embedded in frozen `content` strings (🔒, ✅, ❌, ⚠️, 📋, 📝, 🌍, 🔧, 🛡️, 🔐, 🏥, 📁, 💼) and emits a `lucide-react` SVG in its place. **The source `app/blog/posts.ts` is never modified** — this preserves Hard Rule 1 unconditionally. Mapping lives in `EMOJI_TO_ICON` table + `EMOJI_REGEX` + helper `renderEmojiInText()`. Dingbat-class symbols (`✓ ✕ ✔ ✗`) are intentionally excluded.

**Content plan (next 7 days):** see `## Blog Publication Plan` further down — Apr 29 through May 5 mapped to cycle_day rotation with specific slugs per tool.

---

## What NOT to touch

- **Published blog articles** (`app/blog/posts.ts`, date ≤ today UTC). Hard Rule 1 — freeze. Edit triggers a Google re-evaluation risk and can cost weeks of organic traffic. The render-layer emoji-→-SVG swap exists *specifically* to avoid editing posts.ts source.
- **`scripts/seo-health-check.mjs` + `.github/workflows/seo-health.yml`**. Daily 03:00 UTC sentinel against canonical / og:url / title-uniqueness / description-length regression. Do not weaken invariants to silence a failing run; fix the source instead.
- **GSC credentials**. Live at `~/.config/signmypdf/gsc-credentials.json` (and the in-repo fallback `signmypdf-seo-97022bc5390f.json` which is gitignored). Never commit creds; never move them back into the repo.
- **Tool palette tokens** (`--tool-sign-*`, `--tool-fill-*`, `--tool-protect-*`). Picked deliberately to avoid clashing with the Why-card accent triplet (red/emerald/amber). Don't reshuffle without re-balancing both groups together.
- **`hub-*` CSS namespace.** Homepage-only. No other route uses these classes; do not introduce them on `/sign`, `/fill`, `/protect`, `/blog`, `/login`, `/dashboard`. Conversely, the tool screens use their own classes (`dz-*`, `card`, `step-*`, etc.) — do not migrate them to `hub-*` either.
- **`TOOL_META.sign.href` in `BlogPostContent.tsx`** is already `/sign`. All blog SIGN-tool CTAs flow through this single source of truth. Do not hardcode `/` (the hub) anywhere in blog routing.
- **Trigger prompt SIGN-CTA target.** Hard Rule 2 of the v3 trigger prompt says `/sign`, not `/`. The trigger prompt and `TOOL_META.sign.href` must match — if you change one, change both.
- **Trigger cycle_day anchor.** `EPOCH_ANCHOR=1776988800` in the trigger prompt corresponds to **2026-04-24 00:00 UTC**. Formula: `cycle_day = ((DATE_EPOCH − EPOCH_ANCHOR) / 86400) mod 3`. Pair mapping: `0 → Sign+Fill`, `1 → Sign+Protect`, `2 → Fill+Protect`. **To verify the anchor is correct, run:** `date -u -d '2026-04-24 00:00 UTC' +%s` — it should output `1776988800`. The anchor was wrong (`1745452800` = 2025-04-24, off by 365 days = +2 cycle_day shift) up to 2026-04-29; bug found after the Apr 29 trigger run published Sign+Protect instead of Fill+Protect. Never trust just the comment — re-verify the integer with the date command if you suspect a recurrence of the same class of bug.
- **Deploy + indexing pipeline (`.github/workflows/deploy-on-blog-push.yml`)**. Stage B of the daily blog publishing pipeline. Fires on `push` to `main` filtered to `app/blog/posts.ts` changes (plus `workflow_dispatch` for manual / test runs). Owns: Vercel `--prod` deploy → IndexNow full submit → Google Indexing API submit (newly-added slugs only by default; `submit_all_to_google` workflow_dispatch input allows full re-submit) → write `logs/deploy/YYYY-MM-DD.json` → commit log. Created 2026-05-01 to fix the trigger runtime-timeout failure mode (Apr 29/30 + May 1 had committed-but-never-deployed articles). **Do NOT add deploy steps back to the trigger prompt** — the whole point of v3.2 is that deploy is decoupled. **Do NOT remove `workflow_dispatch`** — it's the only path for recovery / manual re-runs without faking a `posts.ts` change.
- **Repo secrets the deploy workflow depends on**: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `GSC_CREDENTIALS` (base64-encoded service-account JSON, same one as `seo-health.yml` uses). All four were verified present 2026-05-01. If any get rotated or lost, the deploy step or Google submit step in the workflow will fail loudly — fix the secret before re-running, do not paper over by hardcoding in the workflow file.
- **`FillSignEditor` `justDraggedRef` pattern.** Every drag/resize handler (`onDragMouseDown`, `onDragTouchStart`, `onResizeMouseDown`, the click-or-drag paths in `onTextBodyMouseDown` / `onTextBodyTouchStart`) calls `markJustDragged()` on mouseup if `hasDragged` is true. `onPageClick` checks `justDraggedRef.current` at the top and returns early. Without this guard, the synthetic click that fires immediately after `mouseup` propagates to `.fse-page` and (in text/date tool mode) spawns a phantom new element on top of the just-dragged one — exactly the bug fixed in commit `6e5163c`. The flag resets via `setTimeout(0)` so legitimate clicks aren't suppressed. **Do not remove or replace this pattern** without an end-to-end verification that drag + release into empty area still leaves the element count unchanged.
- **`FillSignEditor` 5-px drag threshold.** All four drag/resize handlers gate `dragRef.current` setup on `Math.hypot(dx, dy) > DRAG_THRESHOLD_PX`. Sub-pixel jitter on press-then-release no longer flags as a drag, sub-pixel jitter on a click-without-move still opens the editor for text/date. Don't lower the threshold below 5 px — touch devices in particular send tiny phantom moves between touchstart and touchend that would re-introduce the original false-drag bug.
- **`FillSignEditor` localStorage keys.** `signmypdf-saved-signature` (the persistent saved-sig dataUrl + w + h) and `sign-nda-draft` (auto-saved `{elements, timestamp}` per the `draftKey` prop). Hard-coded as `SIG_LS_KEY` constant inside `FillSignEditor.tsx` and `DRAFT_KEY` inside `NdaHeroCard.tsx` respectively. **Do not rename them silently** — existing users have data under these keys and a rename loses it.
- **`/sign-nda` signature flow modal-state machine.** The create-signature modal's JSX is gated on `sigModal === 'create' && creatingSig` (both required). For Edit-existing flow (the ✏️ button), `openEditFor` MUST also call `setCreatingSig(initCreatingSig({ drawData: el.dataUrl }))` — without it, the modal silently fails to render. This was the bug fixed in commit `88b16ca`. Same applies to any future "Edit signature" entry points.
- **`/sign-nda` Success state share targets.** Email uses `mailto:?subject=…&body=…`, WhatsApp uses `https://wa.me/?text=…`, Telegram uses `https://t.me/share/url?url=…&text=…`. **Do not add a "Copy link to download" option** — it requires server-side hosting of the signed PDF, which we don't have on this surface. The user spec explicitly says "НЕ ДЕЛАТЬ" for this option.
- **`FillSignEditor` action-cluster ordering.** Visual order from element-edge outward on placed text/date is `✏️ Edit (-26 px) → ⎘ Duplicate (-52 px) → ✕ Delete (-78 px)`. Delete is **red-by-default** (`background: var(--color-danger)` for the overlay button, `color: var(--color-danger)` for the sidebar list-remove). Don't shuffle this order without re-checking the "first action is Edit, last action is Delete" affordance — putting destructive Delete in the middle reads ambiguous.
- **`txStore` durable-commit contract in [`app/utils/db.ts`](app/utils/db.ts).** The helper resolves on `transaction.oncomplete`, NOT on `request.onsuccess`. The two events are not equivalent — `req.onsuccess` fires when the operation has been applied inside the transaction (in-memory only), while `t.oncomplete` fires only after the transaction has been durably committed and is visible to other IDB connections. Every `await txStore('readwrite', ...)` caller (currently `pendingUpload` for the hub→tool handoff and `historyBlobs` for the Pro download history) implicitly assumes "after the await, a fresh connection's read sees my write." **Important caveat**: this fix (commit `008695f`, May 7 2026) is correct in isolation per the IDB spec, but it did **NOT** solve the user-visible mobile-hero handoff bug — that bug is still live on prod. See `## ⚠️ KNOWN BROKEN (May 6-7 2026)` for the full story. The IDB race was either not the only problem, or not a problem at all in the way the diagnostic suggested. Either way, **the durable-commit contract is the right semantics** for `historyBlobs` and any future cross-connection IDB read, so the fix is kept regardless. Do not "simplify" `txStore` back to resolving on `req.onsuccess` — if you need a non-durable read-cached helper, write a separate function with a different name. (And if the team eventually migrates the hub→tool handoff off IDB onto `sessionStorage` + base64 per the candidate-next-approach in `## ⚠️ KNOWN BROKEN`, `txStore` and `pendingUpload` may both be removed entirely. That's fine — but in the meantime do not weaken the contract.)

---

## Pending decisions

- **Premium pricing — REVISED 2026-05-22.** New target: **$4.99 / month** or **$39.99 / year**. Down from the previously documented $9 / mo + $7.50 / mo annual. The implementation in `app/components/PaywallModal.tsx` + the `Monetization Model (current)` section above still describes the OLD pricing because it's what's literally in code — the new numbers only flip live once **30 k weekly active users on the extension** has been hit, which is the agreed trigger. Until then the old prices stay rendered; do not silently change strings ahead of that milestone. When the flip happens, also update `## Monetization Model (current)` here and the blog FAQ default in `BlogPostContent.tsx`. "Free Forever" stays the positioning for sign + fill — paid surface is only Pro features (saved signatures / history / batch flows).
- **Trial-with-credit-card / hybrid Free+Trial flow** — explicitly rejected. Straight free-then-subscription only. The reasoning ("we don't want auto-renew traps") is part of the v3 prompt's USP.
- **New tools (PDF↔Word, PDF→JPG)** — queued as the next major build-out, but gated on GSC traffic data showing the Sign/Fill/Protect/Merge/Compress/Split base is establishing. Don't start before GSC confirms organic traffic to existing tools is ramping. Note: Merge / Compress / Split are LIVE in prod (sitemap entries since 2026-05-02) — only conversion tools (PDF↔Word, PDF→JPG) remain in the planned queue.
- **Google Ads / AdSense — RULED OUT 2026-05-22.** Permanently off the table; replaces the earlier "defer AdSense" stance with a hard "no". Reason: directly conflicts with the privacy-first positioning the whole product is built on (no upload, files stay on your device, no tracking). Revenue path is purely Pro subscriptions + maybe one-off team licenses later. **Do not revisit this** without an explicit decision reversal from the user — don't re-add an "AdSense backlog" entry in any future session.
- **Blog cadence — REVISED 2026-05-22 (2 / day → 1 / day, 3-5 per week).** Reason: at 2 / day GSC is starting to show internal cannibalisation (multiple slugs ranking for the same keyword without one taking off) and average article length has been creeping past the 600-1200 hard bounds. The cadence change is decided but the **daily trigger prompt is not yet updated** to match — that's a separate ticket. Until the trigger ships the new version, manually skip one of the two slots on cycle days where both queues are still populated (forward-walk algorithm in trigger v3.2 handles this safely already). Also queued for the same trigger-prompt update: keyword-cannibalisation pre-check before publishing, and tighter length guardrails.
- **`[IMAGE: ...]` placeholders in blog content** — the parser-skip path is in `BlogPostContent.tsx` already (placeholders silently disappear today). Actual image generation / substitution not implemented. TODO when there's content-team bandwidth.
- **Schema-markup auto-emission in `BlogPostContent.tsx`** — TODO. Article + FAQPage for troubleshooting articles, HowTo for use-case, Article + Review for comparison. Currently only the homepage emits SoftwareApplication + FAQPage; per-article schema is not in HTML yet.
- ~~**`SignatureCanvas.tsx` ESLint debt**~~ — **CLEARED in PR #10 (May 8 2026)**. The 5 problems (3 forward-reference errors + 2 missing-deps warnings) are gone. The component now uses useCallback ordering, refs for color/width inside initCanvas, and an `onSaveRef` pattern for stable handler identity across parent re-renders. File lives at `packages/ui/src/SignatureCanvas.tsx`.
- **Phase 2 — migrate `/sign` to `FillSignEditor`.** `/sign` currently uses `SignatureCanvas` + `PdfSignViewer` directly (the post-Stage-4 path that we just shipped). `/sign-nda` uses `FillSignEditor` (the unified text+date+signature editor). The plan was to consolidate `/sign` onto `FillSignEditor` after Stage 5 ships so both surfaces share one editor. **Do this AFTER the extension is live**, otherwise we're refactoring a third surface (sig + fill + extension) simultaneously. When it happens: extract `FillSignEditor` to `packages/ui/src/FillSignEditor.tsx`, lift the `signmypdf-saved-signature` localStorage key from `/sign-nda`-only to shared.
- **Phase 3 — migrate `/fill` to `FillSignEditor`.** Same idea as Phase 2 but for `/fill`, which currently uses the older `PDFTextEditor` (683 LoC, text-only). After Phase 2 lands, `/fill` is the last route still on the legacy text-only editor. Phase 3 retires `PDFTextEditor` entirely.
- **`/split` UX bugs (carry-over).** Three small annoyances reported but not fixed:
  - Number input: typing replaces the `0` placeholder cleanly on most fields, but on at least one of the page-range / parts inputs the `0` doesn't clear on first keystroke (typing "5" produces "05" briefly).
  - Buttons jump position when state transitions between modes (the Pro-locked tabs collapsing/expanding causes layout shift in the action row).
  - Two rare modes — **Split every N pages** and **Split by bookmarks** — are Pro-only stubs that do little for free users and add visual clutter. Decision: remove both modes from the UI entirely; `extract` and `parts` cover 95% of use cases. Leaves `splitPdf.ts` `parsePageRanges` + parts mode intact.
- **Hub→tool handoff transport: ~~IDB vs sessionStorage+base64~~ — CLOSED (May 8).** The bug is fixed. `008695f`'s `t.oncomplete` resolve in `txStore` was the actual fix; the 24h of "still broken" reports were a stale browser-cache, confirmed by independent fresh-browser testing. IndexedDB stays. The sessionStorage+base64 swap that was queued is no longer needed. Don't undo `008695f`.

---

## Next session checklist

0. **🎯 Layout fix `/sign` (highest priority, gates Stage 5).** Per audit §6.4: 2-column grid on viewports ≥1024 px — left column max-width 800 px PDF preview (vertical scroll for multi-page), right column sticky sidebar 320–360 px with signature creator + thumbnail strip + sticky "Sign PDF" button. Mobile (<1024 px) keeps the current vertical stack. **Implement inside `packages/ui`** (likely a new `<PdfSignSurface>` orchestrator that composes `SignatureCanvas` + `PdfSignViewer`) so the Chrome extension popup inherits the corrected layout from day one. Acceptance: on 1280×800, both columns fully visible without scroll; total document height ≤1.5 viewports for a 4-page PDF (currently 4.3); mobile rendering unchanged; sticky sign button still works. ~1 day of work.

1. **Stage 5: `apps/extension/`.** Chrome MV3 popup. Imports `@signmypdf/pdf-core` + `@signmypdf/ui` directly. Calls `setupPdfjs(chrome.runtime.getURL('pdf.worker.min.mjs'))` once on boot; manifest `web_accessible_resources` lists the worker file. System font stack only (no Inter `.woff2` bundle, per audit §7). Distribution: Chrome Web Store. Free MVP — no auth, paywall, or watermark. Blocks on item 0 above.

### Operational follow-ups (any time, not blocking Stage 5)

2. **Morning May 2 — first end-to-end sanity-check of trigger v3.2 + the deploy GH Action.** May 2 has `cycle_day == 2` (Fill+Protect) but both slots are already taken by `1a267f1`'s articles (`fill-visa-application-form-pdf` + `password-protect-pdf-on-mac`), so the trigger should forward-walk to **May 3** (`cycle_day == 0`, Sign+Fill) and write **2 articles** (next-unused SIGN: `sign-construction-contract-online`; next-unused FILL: `remote-teams-sign-documents`). Then v3.2 ends at `git push`. The deploy workflow fires `on: push` filtered to `app/blog/posts.ts`.
   - **Verify deploy fired**: check https://github.com/viktorkkkk/signmypdf/actions → look for a recent "Deploy on Blog Push" run.
   - **Verify Vercel got the deploy**: `curl -sH "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v6/deployments?projectId=prj_vINyT8bno6KjwutaPoX05rZaXQNI&teamId=team_KV06sgJAaYS4OqFZHaskKPj2&limit=1"` and confirm a `READY` deployment created within 5 min after the trigger commit. (Apr 29-May 1 the gap was 15-72h because deploy never fired.)
   - **Verify articles live on prod**: both new slugs return HTTP 200 from `https://www.signmypdf.io/blog/<slug>`.
   - **Verify deploy log committed**: a new file `logs/deploy/2026-05-02.json` should appear in the repo with `deployOutcome: success` and `googleOutcome: success`.
   - **If the GH Action fired but failed**: read the workflow run's step logs. Common causes — `VERCEL_TOKEN` rotated, `GSC_CREDENTIALS` rotated, network blip on `vercel deploy`. The step is independent so partial recovery is fine: re-run via "Run workflow" → workflow_dispatch.
   - **If the GH Action did NOT fire**: check that the trigger's commit changed `app/blog/posts.ts` (the path filter). If trigger committed something else (only `submit-indexnow.mjs`?), the path filter rejected it. Manual recovery: trigger workflow_dispatch.
2. **Open Google Search Console.** Use the Domain property `sc-domain:signmypdf.io`. Watch the "Pages → Indexed" curve from Apr 28 onwards. The 3 Apr 28 SEO-landing articles + the 2 Apr 30 future-dated ones should start showing impressions in 7-14 days. If GSC still reports `Indexed: 0` past May 5, dig into "Page indexing" reasons (likely: alt-page with canonical, soft 404, duplicate without canonical).
3. **Read GSC per-article traffic data** once 14 days of data exist. Decide on a per-article basis:
   - **Top performers** (clicks + impressions) in the OLD long format → cautiously optimize. Edit intro / FAQ at most. Never full-rewrite an indexed article in place.
   - **Zero-traffic articles** in the OLD long format → safe to rewrite into the new SEO-landing format. Use the future-date or new-slug escape hatch — never in-place.
   - **Mid performers** → leave alone unless a competitor moves on the keyword.
4. **Decide convert-tools vs. content optimization.** If GSC traffic is ramping, double down on content (more articles per day, optimize top performers). If GSC is flat past 4 weeks, ship Compress PDF / Merge PDFs / PDF→Word as new revenue surfaces.

---

## SEO Indexing Status

**Last updated: 2026-05-22.** If you change anything indexing-related, update this section so the next session has accurate ground truth. Latest GSC snapshot: see `### GSC snapshot 2026-05-22 (extension launch + Free Forever positioning)` below; the 2026-05-07 baseline snapshot is kept underneath for trend tracking.

### Google Search Console

- **Verified properties (both Owner)**:
  - **`sc-domain:signmypdf.io`** — Domain property added 2026-04-27. Covers BOTH apex and www under one DNS-TXT verification. This is the canonical property going forward.
  - `https://signmypdf.io/` — legacy URL-prefix property from before Domain property was added. Kept for historical Search Analytics continuity; no action needed.
- **Service account**: `signmypdf-seo-reporter@signmypdf-seo.iam.gserviceaccount.com` is Owner on both. Credentials in `signmypdf-seo-97022bc5390f.json` (gitignored, embedded in the daily RemoteTrigger prompt).
- **DNS verification**: TXT record `google-site-verification=T8qgvPjWrXpKbKE-O6pwBD3xir2SKHBGo1vxdikCEyo` on `signmypdf.io` apex (Namecheap → Advanced DNS). Do NOT delete — it's how the Domain property stays verified.
- **Sitemaps submitted**:
  - `https://www.signmypdf.io/sitemap.xml` → Domain property (canonical)
  - `https://signmypdf.io/sitemap.xml` → URL-prefix property (legacy, redirects to www)
- **`scripts/index-pages.mjs` `BASE_URL`**: now `https://www.signmypdf.io` (www, canonical). The previous apex-only constraint was lifted by the Domain property — submissions go directly to the canonical host with no redirect.
- **Quota**: Indexing API allows 200 URL submissions per day per project. Daily RemoteTrigger uses ~2/day; manual re-submits cost 60 (full sitemap).

### Bing Webmaster / IndexNow

- **Property is a Bing Domain property** covering both apex AND www in one (Bing detected the canonical/redirect setup and merged them automatically). NO need to add a separate www-property — the previous CLAUDE.md guidance to "Add www.signmypdf.io as a separate Bing property" was wrong and is now obsolete (2026-05-05).
- Sitemap submitted: `https://www.signmypdf.io/sitemap.xml` (80 URLs discovered as of 2026-05-05).
- Apex sitemap entry `https://signmypdf.io/sitemap.xml` (76 URLs) **cannot be deleted** through the Bing UI (only "Re-submit" is offered). It is harmless: apex redirects 307 → www, so Bing crawls the same content. Bing will deprioritize it naturally over time. Do not chase a deletion path.
- `scripts/submit-indexnow.mjs` uses `HOST=www.signmypdf.io` — IndexNow does not require ownership verification, so www is fine.
- "Discovered but not crawled" on Bing Index tab + "URL can be indexed by Bing / No SEO/GEO issues found" on Live URL tab is a **normal pattern for a young domain with 0 backlinks** — it is NOT a real technical error. The "some issues which are preventing indexation" wording is generic Bing template for "we don't have enough trust signals to spend crawl budget yet". The fix is backlinks, not page-level changes (Live URL tab confirms no SEO/GEO issues).

### Canonical host policy

`www.signmypdf.io` is canonical EVERYWHERE: `app/sitemap.ts`, `public/robots.txt`, `app/blog/[slug]/page.tsx` JSON-LD, `app/sign/page.tsx` + `app/page.tsx` SoftwareApplication JSON-LD, `app/lib/email.ts`, `app/api/auth/magic-link/route.ts`, `app/privacy/page.tsx`, `submit-indexnow.mjs`, `scripts/index-pages.mjs`, all openGraph URLs. The previous apex exception in `index-pages.mjs` was removed Apr 27 once the Domain property went live.

### Per-page metadata (added Apr 25)

Every public page emits its own canonical + og:url + page-specific title/description. Inheritance from `app/layout.tsx` only applies to the homepage `/` (whose layout-level defaults match it). Source of truth:

- `/` → root metadata in `app/layout.tsx` (homepage defaults).
- `/sign` → `app/sign/layout.tsx` (own canonical, og:url, title, description).
- `/fill` → `app/fill/layout.tsx` (same pattern).
- `/protect` → `app/protect/layout.tsx`.
- `/blog` → metadata block in `app/blog/page.tsx`.
- `/blog/[slug]` → `generateMetadata` in `app/blog/[slug]/page.tsx`.
- `/privacy` → metadata block in `app/privacy/page.tsx`.
- `/terms` → metadata block in `app/terms/page.tsx`.
- `/dashboard` → `app/dashboard/layout.tsx` with `robots: { index: false }` (Pro-only private surface, must NOT be indexed).
- `/login` → `app/login/layout.tsx` with `robots: { index: false }` (auth surface).

When adding a new public page, **always pair the route with a `layout.tsx` (for `'use client'` pages) or in-file metadata block (for server components)** that sets `alternates.canonical` + full `openGraph` block including `url`. Otherwise the page silently inherits the root `og:url` and Google sees it as a homepage duplicate.

### What was broken & fixed Apr 25 (commits `e8cc93f` + `e52bf1c` + a third later in the day)

For ~3 weeks Google was silently failing to index new blog articles. Four compounding bugs found and fixed:

1. **Wrong canonical on every page.** `app/layout.tsx` had `alternates.canonical: 'https://signmypdf.io'` at the root — Next.js applies root metadata to every page that doesn't override it, so 50+ blog articles, tool pages, and legal pages all emitted `<link rel="canonical" href="https://signmypdf.io">`. Google de-duplicates by canonical → the entire blog collapsed into the homepage entry. **Fix**: removed the global root canonical, set `metadataBase: new URL('https://www.signmypdf.io')`, `app/blog/[slug]/page.tsx` now sets a slug-relative canonical per article.
2. **`scripts/index-pages.mjs` had broken syntax.** A previous GitHub Action had pasted slugs into the `URLS = [...]` literal without closing the bracket. Every cron run since crashed before submitting anything. **Fix**: restored array literal, added `/sign` to STATIC_URLS.
3. **Domain inconsistency apex vs www.** Sitemap, robots, IndexNow, JSON-LD were on apex while Vercel resolves apex with a 307 to www → every Google/Bing fetch followed a redirect. **Fix**: standardised to www across all the files listed in "Canonical host policy" above.
4. **`/sign`, `/fill`, `/blog`, `/privacy`, `/terms`, `/dashboard`, `/login` all emitted `og:url=https://www.signmypdf.io` and the homepage title.** After bug #1 was fixed Google stopped seeing canonical-collisions, but social platforms (and Google's secondary signals) were still being told these pages WERE the homepage via `og:url`. **Fix (this commit)**: created per-page `layout.tsx` for each `'use client'` route with own canonical + openGraph, added in-file metadata to the server-rendered ones, set noindex on `/dashboard` and `/login`. After deploy every public URL emits its own canonical and og:url.

After step 3 the Indexing API began returning `403` because GSC ownership is on apex (see commit `e52bf1c`). The chosen workaround is the `index-pages.mjs` apex exception above. Do NOT "fix" this by switching the script back to www — it will break.

### Current state

- Apr 25 morning: 60 URLs re-submitted to Google Indexing API under correct per-page canonicals.
- Apr 25 evening: per-page metadata fix shipped (this commit); URLs re-submitted again so Google picks up the new metadata. Daily RemoteTrigger (`trig_01Mw8wt1nCK3jpDA7ymfp4g2`, 02:00 UTC) continues to submit each new article on publish.
- Bing: IndexNow ping fires on each new article + bulk submit available via `submit-indexnow.mjs`.
- Monitoring window: GSC indexing data lags 2-4 days, so first proof of recovery expected Apr 27-29.

### GSC snapshot 2026-05-22 (extension launch + Free Forever positioning)

Two weeks after the 2026-05-07 baseline. The Chrome extension shipped on
2026-05-21 and the landing was rebranded around "Free Forever" on
2026-05-21/22 — this snapshot is the first post-launch reading.

**Page Indexing (`sc-domain:signmypdf.io`):**
- Continues to look healthy. "Discovered — not indexed" still 0 (the
  signal that Google isn't sitting on a backlog), "Page with redirect"
  bucket continues to shrink as apex history fades. Indexed-count is in
  the expected mid-teens band predicted by the 2026-05-07 snapshot.

**Search Performance (28d):**
- **Impressions: 538** (vs 212 on 2026-05-07 → **+154 %** in 15 days)
- **Avg position: 29** (vs 61.5 on 2026-05-07 → climbed ~32 places)
- Clicks: still small in absolute terms but trending up; report the
  exact number in the next snapshot once it stabilises.
- The position-29 average means we've moved off page 6-7 into roughly
  page 3 territory. Page 1 (positions 1-10) is the next jump that
  unlocks meaningful CTR. Best individual page positions to watch:
  `/blog/signmypdf-vs-docusign-freelancers` (was 7.2 on the apex
  variant in May, now on www-canonical via the canonical-fix
  consolidation), `/blog/ilovepdf-vs-signmypdf` (was 9.3), and the
  brand-new `/sign-pdf-chrome-extension` landing which Google has
  indexed since 2026-05-17 (URL-Inspection PASS).

**GA4 (30d, real users — Thailand dev-test excluded):**
- **73 unique users** (vs ~96 on the 2026-05-07 snapshot, which had a
  larger window). The interesting number is end-to-end conversion:
- **102 PDFs processed** total across sign + fill + protect — first
  month with a real-user volume that's worth A/B-testing against.

**Sitemap state:**
- `https://www.signmypdf.io/sitemap.xml` carries **108 URLs** (was 82 on
  the 2026-05-07 snapshot). Growth = new blog articles + 3 extension
  URLs (`/sign-pdf-chrome-extension`, `/extension/privacy`,
  `/extension/support`). All three extension URLs submitted via Google
  Indexing API + IndexNow on 2026-05-21/22.

**Bing Webmaster Tools:**
- Two recommendations are visible today:
  1. ~~"Not all recent blog pages submitted via IndexNow"~~ — **fixed
     2026-05-22** in `b37dcf5`. `scripts/submit-indexnow.mjs` now reads
     slugs live from `posts.ts`; backfill of the 7 missed slugs has
     been submitted; the warning should clear within 1-4 h + a recrawl
     cycle. Bing's UI lag means the badge may stick for ~1 week before
     it visibly clears.
  2. **"0 inbound backlinks from authoritative domains"** — still the
     real remaining bottleneck. Tracked under `### 3b. Backlink campaign`
     below, where the 2026-05-22 status table now shows AlternativeTo
     submitted and G2 / Capterra / GetApp queued.

**What to do next:**
- Re-check this snapshot in 2 weeks (~2026-06-05). Expected:
  impressions 800-1200, avg position 20-25 if backlinks land, indexed
  count 18-22 as the extension URLs and the recent blog articles all
  settle in.
- If avg position is flat or worse at the next check, the bottleneck
  is backlinks, not on-page SEO. Push harder on the campaign queue and
  don't touch published content.

### GSC snapshot 2026-05-07 (12 days post canonical-fix)

First clean snapshot of GSC after the canonical-fix re-evaluation cycle started to settle. Use as the **post-fix benchmark** for next sessions — rerun `scripts/seo-gsc-check.mjs` and compare against these numbers.

**Page Indexing report (`sc-domain:signmypdf.io`):**
- **8 pages "Indexed"** (down from a peak of 11 around 23.04.2026 — explained below, this is canonical-consolidation, not regression)
- **5 pages "Not indexed"** with 2 reasons:
  - **4 × "Page with redirect"** — apex (`signmypdf.io/...`) URLs that Google had in its index from before the canonical fix. Each apex URL now follows a 307 → www redirect; Google correctly logs the apex variant as "redirected" and consolidates indexing under the www-canonical version. **This is the intended outcome of the canonical fix, not a problem.** Each "redirect"-classified page is matched by an "indexed" www-canonical page.
  - **1 × "Crawled — currently not indexed"** — single page in normal Google "thinking about it" backlog. Statistical noise at this volume.
  - **0 × "Discovered — not indexed"** — trend dropped from >0 to 0 in the past two weeks. **Strong positive signal**: Google has crawled everything it knows about and isn't sitting on a backlog of unprocessed URLs. Young domains often have hundreds of URLs stuck in this state for months; we have zero.
- **Why 11 → 8 is not regression**: before Apr 25 Google indexed apex AND www variants of the same page as separate "indexed" entries (because canonicals were broken). After Apr 25 it consolidates them — apex variant → "Page with redirect" bucket, www variant → "Indexed" bucket. The total `indexed + redirect` is roughly the same; only the "indexed" sub-count appears to drop because dedup is doing its job. Expect indexed-count to grow back past 11 over next 2-4 weeks as more www-canonical URLs get crawled (sitemap currently has 82 URLs, GSC tracks 13).

**Search Performance (28d, GSC Search Analytics API):**
- **212 impressions** total (vs ~0 in March before canonical fix — real recovery)
- **0 clicks** still
- **avg position 61.5** (page 6 of SERP)
- **23 unique URLs** received at least 1 impression each
- **Best positions** (close to clickable territory):
  - `/blog/signmypdf-vs-docusign-freelancers` — position **7.2** (bottom of page 1) on apex variant, 6 impressions
  - `/blog/ilovepdf-vs-signmypdf` — position **9.3** (page 1) on apex variant, 12 impressions
  - `/terms` — position **3.0** on 3 impressions (likely brand query "signmypdf terms")
  - `/blog` index — position **3.8** on 4 apex / **5.2** on 6 www impressions
  - `/blog/fill-w9-form-online-free` — **43 impressions** on www at position 75.8 (broad-keyword volume but page 8 — needs internal-link boost or content tightening to climb)
  - `/blog/sign-nda-online-without-printing` — 19 impressions, position 77.6
- **Apex+www split is still partially live in Search Analytics** — Google reports impressions for both `signmypdf.io/blog/X` AND `www.signmypdf.io/blog/X` for the same canonical page. This is the consolidation in progress; expect apex-impressions to fade to zero over the next 2-4 weeks as Google re-crawls and confirms the redirects.

**Sitemap state:**
- `https://www.signmypdf.io/sitemap.xml` — 82 URLs submitted, 0 errors, 0 warnings
- `sitemapWebIndexed: 0` per the API — note this is GSC's separate sitemap-coverage metric and is **always lagging behind the page-indexing metric**; it's not contradicting the "8 indexed" count above. Don't optimize for this number specifically.

**What to do with this baseline:**
- **Do nothing for 2-4 weeks.** Canonical consolidation is in progress; pre-emptive re-submits via Indexing API only delay it further by forcing Google to restart its evaluation.
- **Recheck in 2 weeks (~2026-05-21).** Expected: indexed-count climbs to 12-15, "Page with redirect" stays around 4-6 as Google finishes consolidating apex history, impressions grow to 400-600 if no other changes, position improves on the page-1 candidates above.
- **Convert to clicks**: position 7.2 on `signmypdf-vs-docusign-freelancers` and position 9.3 on `ilovepdf-vs-signmypdf` are the most actionable wins. Title/description optimization on those two articles could plausibly produce the first organic clicks within a week. **But** they're frozen under Hard Rule 1 (dates already passed). The escape hatch is to write a follow-up SEO-landing article on the same intent and let it climb to share traffic.

### Google Analytics Data API (added Apr 25)

- Property: `signmypdf.io` (measurement ID `G-SP5ZZJ3D17`, GA4 property ID `532300049`).
- Service account `signmypdf-seo-reporter@signmypdf-seo.iam.gserviceaccount.com` is now **Viewer** in GA Property Access Management.
- Cloud APIs enabled in project `signmypdf-seo` (number `702087743733`): `analyticsadmin.googleapis.com` + `analyticsdata.googleapis.com`.
- Auth flow: same JWT-RS256 pattern as `scripts/index-pages.mjs`, scope `https://www.googleapis.com/auth/analytics.readonly`. To pull a report, run a one-shot script that hits `analyticsdata.googleapis.com/v1beta/properties/532300049:runReport` (see `scripts/index-pages.mjs` for the auth helper functions to copy).

### Real conversion baseline (Apr 9-25 2026, GA Data API)

Use these as the "before" benchmark when evaluating whether new SEO/marketing work moves the needle. Numbers are from GA, not extrapolated.

- 248 sessions, 115 users, 961 pageviews, 49.6% engagement rate (totals across 30 days).
- **0 sessions** from `Organic Search` channel — Google was sending no traffic before the canonical fix.
- Channel split: Direct 167 (67%), Organic Social (Facebook) 67 (27%), Unassigned 16, Organic Search 0.
- Geography is dominated by Thailand (60%, 150 sessions) which is the developer's own test traffic. **Excluding Thailand** the real picture is 98 sessions / 96 users / 18s avg session / 18.4% engagement rate over 30 days.
- US users (real Facebook organic): 46 sessions, 84.8% bounce rate, **5.2s avg session** — they bounce immediately. Not a high-intent audience.
- Real conversion events outside Thailand over 30 days: **1 `pdf_signed` (1 user)**, 0 `pdf_filled`, 0 `pdf_protected`, 0 `view_paywall`. The product is technically working (events fire correctly in dev tests) but real users are not yet making it to the "done" state.

### Next steps

- ✅ ~~Add www.signmypdf.io to GSC~~ — done Apr 27 via Domain property `sc-domain:signmypdf.io` (covers apex + www in one).
- ✅ ~~Flip `BASE_URL` in `index-pages.mjs` to www~~ — done Apr 27.
- ✅ ~~Add `https://www.signmypdf.io/` as a Bing Webmaster property~~ — turned out to be unnecessary (2026-05-05). The existing Bing property is already a Domain property and covers both apex + www. See `### Bing Webmaster / IndexNow` for details.
- **Watch GSC "Pages → Indexed"** in the Domain property over Apr 28-May 4 for the recovery curve. If it doesn't move, dig into "Page indexing" reasons in GSC (most likely culprits: alt-page with canonical, soft 404, duplicate without canonical).
- **Bing**: pages ARE getting indexed (e.g. `/sign-nda` indexed 2026-05-03, `/blog/how-to-add-signature-to-pdf` ranks position 2.00 on `how to add signature to pdf for free reddit`). Bottleneck is impressions, not indexation — and impressions are gated on backlinks. See `### Bing baseline (2026-05-05)` below + `## Next Priorities` → backlink campaign for the workplan.
- **Enable Search Console API** in Cloud project `signmypdf-seo` (https://console.developers.google.com/apis/api/searchconsole.googleapis.com/overview?project=702087743733) so URL Inspection API works programmatically. Currently only the legacy `webmasters/v3` endpoint is reachable, which doesn't expose per-URL indexing state.
- **Conversion**: investigate why US Facebook traffic bounces in 5s. Likely culprits — homepage hero doesn't match social-share expectation, or the "drop a PDF" CTA isn't visible without scroll on mobile. A/B test homepage hero copy.

### Bing baseline (2026-05-05)

First full audit of Bing Webmaster Tools. Numbers below are the "before" benchmark for Bing — measure backlink-campaign progress against these.

- **156 URLs discovered** total across 2 sitemap entries (80 on www-property + 76 on apex-property — same content, see `### Bing Webmaster / IndexNow`).
- **Indexation IS working**. `/sign-nda` indexed successfully (Discover ✅ 2026-05-02, Crawl ✅ 2026-05-03 03:45, Index ✅, "URL can appear on Bing"). Live URL tab on `/` confirms "URL can be indexed by Bing / No SEO/GEO issues found / 2 Markup types found" (SoftwareApplication + FAQPage JSON-LD).
- **Search Performance is sparse but real**: 1 impression total, on `https://www.signmypdf.io/blog/how-to-add-signature-to-pdf` for query `how to add signature to pdf for free reddit`, **average position 2.00**, 0 clicks (user clicked Reddit-thread above us, not us). The "reddit" modifier in the query is a strong signal of trust-seeking intent — actionable insight: a Reddit thread mentioning signmypdf.io would directly reinforce this exact ranking.
- **0 backlinks in Bing index**. `link:signmypdf.io` query in Bing returns "не удалось найти ни одного результата". This is the real bottleneck for impressions growth — Bing won't allocate crawl budget or surface us in non-trivial SERPs without external trust signals.
- **No technical blockers found**: robots.txt allows Bingbot; sitemap returns 200; all sitemap URLs (`/`, `/sign`, `/fill`, `/protect`, `/merge`, `/compress`, `/split`, `/sign-nda`, all 50+ blog posts) return 200 to Bingbot UA; per-page metadata (canonical / og:url / title / description) all clean per `seo-health-check.mjs`.

---

## SEO Infrastructure

**Status: live as of 2026-04-25, exit 0 against prod.** A daily regression detector guarantees the per-page metadata invariants from `## SEO Indexing Status` stay green. If you're about to change anything in this section's surface area, read it first — don't rediscover it.

### What runs

- **Script: `scripts/seo-health-check.mjs`** (no dependencies, plain Node 20+ stdlib + global `fetch`). Walks `https://www.signmypdf.io/sitemap.xml`, fetches every URL, asserts five invariants:
  - HTTP 200 OK
  - `<title>` exists and is unique across the sitemap
  - `<link rel="canonical">` exists and equals self URL (trailing-slash insensitive)
  - `<meta property="og:url">` exists and equals self URL
  - `<meta name="description">` exists and is 50-160 chars
- **Workflow: `.github/workflows/seo-health.yml`** runs the script on `cron: '0 3 * * *'` (03:00 UTC daily — one hour after the blog publisher RemoteTrigger at 02:00 UTC so it sees the freshest deploy). Also exposes `workflow_dispatch` for manual runs.
- **Outputs**:
  - Full JSON report committed to `logs/seo-health/YYYY-MM-DD.json` on every run.
  - On regression: GitHub Issue with label `seo-health` (label color `#ff6b35`, lazily created on first failure). Title: `SEO health check failed: YYYY-MM-DD` (or `… crashed: YYYY-MM-DD` if the script aborted before writing a log). GitHub auto-emails repo watchers, so no SMTP setup is needed.
  - Exit codes: `0` = clean, `1` = regression, `2` = script-level crash (e.g. sitemap unreachable).

### Where credentials live

**GSC service-account credentials live at `~/.config/signmypdf/gsc-credentials.json` — NOT in the repo.** Permissions on the file are `0644` user-only. Both local scripts that need it (`scripts/index-pages.mjs`, `scripts/setup-github-secrets.mjs`) check this path first. They fall back to an in-repo path (`./signmypdf-seo-97022bc5390f.json` for `index-pages.mjs`, `./scripts/gsc-credentials.json` for `setup-github-secrets.mjs`) so the daily RemoteTrigger — which writes a temporary copy to the repo at runtime — keeps working untouched. The repo paths are gitignored. Do NOT commit any `*.json` containing the `client_email` `signmypdf-seo-reporter@signmypdf-seo.iam.gserviceaccount.com`.

In CI the same credentials live in the GitHub repo secret `GSC_CREDENTIALS` (base64-encoded JSON). `scripts/seo-gsc-check.mjs` reads it from the env var of the same name; it never touches a file.

### What NOT to touch

- **Do not delete or move `scripts/seo-health-check.mjs` or `.github/workflows/seo-health.yml`** without first replacing them with an equivalent guarded by the same invariants. They are the only safety net catching the canonical/og:url class of regression that previously cost ~3 weeks of organic traffic.
- **Do not weaken the invariants** (e.g. relax canonical-mismatch, drop the title-uniqueness check, expand the 50-160 description range) to silence a failing run. Fix the source of the regression instead. 50-160 is Google's visible SERP slot — wider just hides the problem.
- **Do not add entries to `ALLOWLIST` except for genuinely-frozen content** (article published per Blog Publication Plan rule #1, intentional redirect, etc.). The allowlist is for things that *cannot* be fixed at the source. If a fixable bug is added, the health check loses its meaning.
- **Do not separate this section from `## SEO Indexing Status`, and do not move it above it.** The two are paired: Indexing Status documents what was broken and fixed; this section documents what prevents re-breakage. They only make sense read together, in that order. If you reorganise CLAUDE.md, keep them adjacent.
- **Do not move credentials back into the repo.** If you need them on a new machine, copy `~/.config/signmypdf/gsc-credentials.json` over SSH/scp — never commit. The repo-local fallback path is for the RemoteTrigger only, and the trigger deletes the file after each run.

### Current `ALLOWLIST` (5 entries, all kind `description-length`)

Blog articles whose `metaDescription` in `app/blog/posts.ts` is 162-172 chars and is frozen because the `date` has already passed:

- `/blog/password-protect-pdf-online-free` (date 2026-04-23)
- `/blog/pdf-form-fields-not-working-fix` (date 2026-04-23)
- `/blog/signmypdf-vs-docusign-freelancers` (date 2026-04-13)
- `/blog/fill-pdf-form-online-free` (date 2026-04-05)
- `/blog/sent-confidential-contract-unprotected` (date 2026-04-25)

When writing new articles, keep `metaDescription` at 50-160 chars **before the `date` passes** — once an article is publicly indexed, the only way to "fix" length is to allowlist it, which adds permanent technical debt to the health check.

### Workflow for adding a new public page

To prevent the canonical/og:url regression from coming back, every new public route ships its own metadata block in the same commit as the route file:

1. **`'use client'` page** → add a sibling `app/<route>/layout.tsx`. Pattern lives in `app/sign/layout.tsx`, `app/fill/layout.tsx`, `app/protect/layout.tsx`. The layout MUST set:
   - `alternates: { canonical: '/<route>' }` (relative path; `metadataBase` resolves to www)
   - `openGraph: { url: '/<route>', title, description, siteName, type, locale }`
   - `twitter: { card, title, description }`
   - **Unique** `title` — collisions with another page or with a blog article are the #1 trigger of `title-duplicate` failures. The root layout template appends ` | SignMyPDF` automatically; do not include it in the per-page title.
   - `description` 50-160 chars
2. **Server-rendered page** → put the same fields in an in-file `export const metadata: Metadata = { … }`. See `app/blog/page.tsx`, `app/privacy/page.tsx`, `app/terms/page.tsx`.
3. **Private/auth surface** (must not be indexed) → set `robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } }`. See `app/dashboard/layout.tsx`, `app/login/layout.tsx`. These pages are also excluded from `app/sitemap.ts` so the health check never sees them.
4. **Add the route to `app/sitemap.ts`** if and only if it should be indexed. The health check derives its URL list from the live sitemap — anything not in `app/sitemap.ts` is invisible to it.

### Freeze rule reminder

Articles in `app/blog/posts.ts` whose `date` has passed are frozen per `## Blog Publication Plan` Hard Rule #1. If a published article's `metaDescription` is over 160 chars, the path is to **allowlist it** (with an inline reason in `ALLOWLIST`), NOT to edit the post. Future-dated articles are NOT frozen and must be brought into compliance before their date hits.

### Render-layer emoji replacement (added 2026-04-28)

`app/blog/[slug]/BlogPostContent.tsx` intercepts pictographic emoji embedded in `content` strings (🔒 in `[CALLOUT]` blocks, ✅ / ❌ / ⚠️ in comparison-table cells, 📋 / 📝 / 🌍 / 🔧 / 🛡️ / 🔐 / 🏥 / 📁 / 💼 elsewhere) and renders each one as a `lucide-react` SVG icon. **The source `app/blog/posts.ts` is never modified for this** — that is what makes the swap safe under Hard Rule 1.

The mapping lives in:
- `EMOJI_TO_ICON` table (codepoint → `{ Icon, color, size, fill }`)
- `EMOJI_REGEX` (alternation over the supported codepoints, optional `\uFE0F` variant selector)
- Helper `renderEmojiInText(text)` that walks a string and emits `<Icon>` JSX in place of each match.

`renderInline()`, the `[CALLOUT]` parser, the table-cell renderer (which already calls `renderInline()`), and the paragraph fallback (via a leaf-walker) all pass plain-text segments through that helper, so the swap propagates everywhere a `content` string ends up on screen.

Dingbat-class symbols (`✓` U+2713, `✗` U+2717, `✔` U+2714, `✕` U+2715) are intentionally **excluded** from the regex. They render as text-mode glyphs identically across OS and are used inline as quick-status text (`"✓ Yes"`, `"❌ Adobe required"` — the latter still gets the `❌` swapped because U+274C IS pictographic; the comparison-table convention always uses pictographic ✅/❌, never the Dingbat ✔/✗).

If new pictographic emoji ever appears in blog content (which should not happen — the daily trigger forbids `[QuickSummary]` / `[CALLOUT]` blocks in the new SEO-landing format, and old articles are frozen): **add the codepoint to `EMOJI_TO_ICON` and `EMOJI_REGEX` in `BlogPostContent.tsx`. Do NOT edit `posts.ts` to remove the emoji**, even if the offending article is future-dated. The render layer is the single source of truth for icon rendering across all 50+ blog articles, and keeping `posts.ts` source-stable preserves the freeze rule unconditionally.

### When the health check fires

A new Issue tagged `seo-health` lands via GitHub-watch email:

1. Open the linked workflow run, scroll to the "Run SEO health check" step output. Each issue line is self-describing: `URL: kind — context`.
2. Open `logs/seo-health/YYYY-MM-DD.json` (committed to repo) for full per-URL detail.
3. Common causes by `kind`:
   - **`title-duplicate`** — two pages share `<title>`. Usually a tool surface and a blog article. Rename the **non-frozen** side.
   - **`canonical-mismatch` / `og-url-mismatch`** — a new page lacks per-page metadata and is inheriting from `app/layout.tsx`. Ship its `layout.tsx` as in step 1 of "adding a new public page".
   - **`description-length`** — `metaDescription` outside 50-160. Trim/expand if not frozen; allowlist only if frozen.
   - **`http-non-200`** — page returns 4xx/5xx. Check the latest Vercel deploy.
   - **`fetch-error`** — DNS / TLS / network. Check Vercel domain status.
4. Push the fix; the next 03:00 UTC run closes the regression. To verify earlier, hit "Run workflow" manually in the Actions tab — it triggers the same job on demand.

---

## UI Icon Standards (added 2026-04-28)

All UI iconography on signmypdf.io is **`lucide-react` SVG**. Pictographic emoji is forbidden as a UI element because it renders inconsistently across OS and browser (Apple Color Emoji ≠ Segoe UI Emoji ≠ Noto Color Emoji ≠ Twemoji), looks amateur, and shifts baseline on every platform.

### Default sizes and colors

- **Inline in body text or button labels**: 16-18px, `color = currentColor`, baseline-aligned (`vertical-align: -3px` or wrap in `display: inline-flex; align-items: center; gap: 6-8px`).
- **Hero / feature card icons**: 26-32px, brand blue `#2563EB`, `strokeWidth: 1.6-1.8`.
- **Badges / counters / chips**: 14-16px, slate `#64748B`.
- **Premium badge (`Star`)**: 14-16px, amber `#F59E0B`, **filled** (`fill="#F59E0B"` AND `color="#F59E0B"`).
- **Status indicators**: success → green `#16A34A` (`CheckCircle`); error → red `#DC2626` (`XCircle`); warning → amber `#F59E0B` (`AlertTriangle`).

### Where this applies

- All public pages (`/`, `/sign`, `/fill`, `/protect`, `/login`, `/dashboard`, `/blog/*`).
- All UI components (`PDFViewer`, `PDFTextEditor`, `PDFPreview`, `SignatureCanvas`, `SavedSignatures`, `PaywallModal`, `PlacementPicker`, `BlogPostContent`).
- Every new component ships without emoji from day one.

### Two carved-out exceptions

1. **Email templates** (`app/lib/email.ts`) — keep emoji. SVG renders unreliably in Outlook (several Outlook versions strip inline SVG entirely), and emoji is the industry standard in transactional email; it renders correctly in every major mail client. Do not migrate `app/lib/email.ts` to lucide.
2. **Frozen blog content** (`app/blog/posts.ts`, articles dated ≤ 2026-04-27) — emoji stays in the source string under Hard Rule 1. The render layer (`BlogPostContent.tsx`, see "### Render-layer emoji replacement" in `## SEO Infrastructure`) intercepts each codepoint and emits a lucide SVG, so the user-facing HTML matches the rest of the site without touching `posts.ts`.

### Dingbat / text-symbol allowlist

ASCII Dingbats render as text-mode glyphs cross-OS and are explicitly allowed inline:

| Symbol | Codepoint | Where used | Why kept |
|---|---|---|---|
| ✓ | U+2713 | Inline checks (`"✓ No registration"`) | Mono-rendering across OS |
| ✕ | U+2715 | Close buttons (toast / banner) | Indistinguishable from `<X>` lucide at 14-16px, lighter DOM |
| ✔ | U+2714 | "✔ Password copied" toast text | Same reasoning |
| ✗ | U+2717 | Inline negatives in tables | Same reasoning |
| · | U+00B7 | Bullet separators in trust strips | Universal middot |
| ⠿ | U+283F | Drag handle for fill-form fields | Braille pattern, text-mode |

When a concept needs an icon and `lucide-react` does not have it, prefer a Dingbat from the table above over reaching for emoji.

### Adding a new icon

- Pick from `lucide-react` first. Existing imports across the codebase: `PenLine`, `FileText`, `Lock`, `Zap`, `CheckCircle`, `XCircle`, `AlertTriangle`, `Star`, `Pencil`, `Keyboard`, `Download`, `FileSignature`, `FormInput`, `Sparkles`, `RefreshCw`, `Plus`, `Mail`, `Save`, `Eye`, `X`, `FolderOpen`, `MousePointerClick`, `Loader2`, `Clock`, `DollarSign`, `Smartphone`, `Check`, `MapPin`, `Link2`, `Upload`, `ClipboardList`, `CheckSquare`, `Folder`, `Briefcase`, `Globe`, `Hospital`, `Wrench`, `Shield`, `KeyRound`. Reuse before introducing a new one.
- For frozen blog content with a yet-uncovered emoji codepoint: extend `EMOJI_TO_ICON` + `EMOJI_REGEX` in `BlogPostContent.tsx` (see "### Render-layer emoji replacement").

---

## Next Priorities

### 0. 🎯 Layout fix `/sign` — **#1 priority, gates Stage 5**
- Per audit §6.4: 2-column grid on viewports ≥1024 px. Left column max-width 800 px PDF preview (vertical scroll for multi-page); right column sticky sidebar 320–360 px with signature creator + thumbnail strip + sticky "Sign PDF" button. Mobile (<1024 px) keeps current vertical stack.
- **Implement inside `packages/ui`** (likely a new `<PdfSignSurface>` orchestrator that composes `SignatureCanvas` + `PdfSignViewer`) so the Chrome extension popup inherits the corrected layout from day one.
- Acceptance: 1280×800 fits both columns above the fold; total document height ≤1.5 viewports for a 4-page PDF (currently 4.3); mobile rendering unchanged.

### 0a. ~~Mobile-hero handoff~~ — ✅ FIXED (May 7-8)
- The original `008695f` `t.oncomplete` fix in `txStore` was the actual fix; reports of "still broken" were a stale browser-cache. Confirmed working on a fresh browser by an outside tester. See `## ✅ FIXED (was KNOWN BROKEN May 6-7 2026)`.

### 1. Sticky CTA float polish — ✅ done Apr 23
- `/protect` mobile CTA now floats (no backdrop/border, button shadow does the lifting).
- `/` already matched the pattern; `/fill` has no mobile sticky CTA (desktop-only sidebar), nothing to strip.

### 2. Product Hunt launch prep
- Gallery assets (hero image, GIF demo, screenshots of Sign/Fill/Protect flows)
- Tagline + description copy (emphasize: free forever, no account, 100% client-side, 3 tools in one)
- Maker comment draft
- Pick launch day (avoid Mon/Fri; aim mid-week 12:01 AM PT)
- Hunter outreach / self-post decision
- Pre-launch email to any existing users, Twitter/LinkedIn teaser

### 3. Google / Bing Indexing
See dedicated **SEO Indexing Status** section above for full state. Open follow-ups:
- ✅ ~~Add `www.signmypdf.io` as a separate GSC property~~ — done via Domain property `sc-domain:signmypdf.io` (Apr 27).
- ✅ ~~Add `www.signmypdf.io` as a separate Bing Webmaster property~~ — not needed; existing Bing property is Domain-type and covers both (verified 2026-05-05).
- Monitor GSC "Pages → Indexed" weekly to confirm the canonical fix is producing the expected indexation curve.
- Monitor Bing "Search Performance → Pages" weekly. Baseline 2026-05-05: 1 impression on `/blog/how-to-add-signature-to-pdf` at position 2.00. Track impression growth as backlink campaign progresses.

### 3b. Backlink campaign (started 2026-05-05, restarted 2026-05-22)
**Diagnosis**: Bing reports 0 backlinks (`link:signmypdf.io` → 0 results) — the real bottleneck for SERP visibility. Goal: get 5-10 quality dofollow backlinks to break out of the cold-domain bin.

**Status as of 2026-05-22:**

| Source | Status | Notes |
|---|---|---|
| LinkedIn company page | ✅ live | All 6 tool links + extension URL on www. LinkedIn = Microsoft property → strongest possible Bing trust signal. |
| Facebook business page "Sign My PDF in seconds" | ⚠️ live, weak | External links are nofollow; needs 2-3 content posts to feel alive. Linked from AlternativeTo profile. |
| Twitter `@signmypdf` | ✅ live | Linked from AlternativeTo profile and OG cards. |
| AlternativeTo.net | 🆕 submitted 2026-05-22 | Profile lists SignMyPDF as alternative to **51 competitors** (Adobe Sign, DocuSign, Smallpdf, iLovePDF, HelloSign, etc.). Awaiting moderation (24-48 h SLA). |
| G2 free company listing | ⏳ queued | Next after AlternativeTo lands. |
| Capterra free listing | ⏳ queued | Same. |
| GetApp listing | ⏳ queued | Capterra sibling — usually approved as a pair. |
| Reddit thread (r/freelance / r/smallbusiness / r/personalfinance) | ⏳ pending | High-priority: Bing already ranks `/blog/how-to-add-signature-to-pdf` at position 2 for `how to add signature to pdf for free reddit` — a Reddit thread would directly reinforce that exact intent match. |
| Quora answers | ⏳ pending | 2-3 questions on "free PDF signing tool" with natural mention. |
| Product Hunt full launch | ⏳ blocked | Needs gallery assets per `### 2. Product Hunt launch prep`. |
| SaaSHub + BetaList | ⏳ queued | Lower-priority listings. |

**Trigger for re-checking the link-graph:** run `link:signmypdf.io` in Bing weekly. Expectation: 1-3 results within 2 weeks of AlternativeTo going live, 5-10 within 4-6 weeks (now that the Chrome extension is publicly live, organic mentions on Chrome-extension review sites should also start landing without our submission effort).

### 4. Payment Integration (Paddle)
- PIXELTIDE LLC is the legal entity for Paddle
- Application ready to submit
- After Paddle approval: replace demo `alert('Premium activated')` with real Paddle checkout
- Replace `localStorage.setItem(SUBSCRIPTION_KEY, 'true')` with server-verified subscription

### 5. Email (Brevo DKIM/DMARC)
- Brevo DKIM/DMARC records added to Namecheap DNS
- Waiting propagation (up to 48h)
- After verification: set up Gmail to send from `support@signmypdf.io` via Brevo SMTP

### 6. New PDF Tools
- ✅ Merge PDFs (`/merge`) — live, in sitemap.
- ✅ Compress PDF (`/compress`) — live, in sitemap.
- ✅ Split PDF (`/split`) — live, in sitemap.
- ⏳ PDF → Word / Word → PDF — planned, gated on GSC traffic data per `## Pending decisions`.
- ⏳ PDF → JPG / JPG → PDF — planned, same gating.
- Each new tool ships with: own `app/<tool>/layout.tsx` (canonical + og:url + unique title/description), entry in `app/sitemap.ts`, and at least one blog article using the SEO-landing format.

### 7. A/B Testing & Conversion
- Test toast CTA copy
- Test pricing modal trigger (show after 1st PDF vs after 2nd)
- Add email capture on free plan for upsell

---

## Blog Publication Plan (60 articles)

**Rule**: Strictly 2 articles per day, **rotating pairs across all tools**. With 3 tools (Sign/Fill/Protect) the cycle is 3 days and each tool gets 2 publications per cycle = equal rate. Launch-day exception: the day a new tool ships may carry up to 3 (2 queue + 1 launch article).
**Before publishing**: always check existing dates in posts.ts to confirm the target date has <2 articles. If today is full, walk forward day-by-day until you find a slot. NEVER batch overflow onto one day.

### ⚠️ HARD RULES — any Claude session writing or editing blog articles MUST follow these

1. **NEVER modify or edit an already-published article.** Dates, content, titles, CTAs, metaTitle, internal links of articles already committed to `app/blog/posts.ts` are frozen once their `date` has passed (they are publicly live and Google-indexed). Only APPEND new entries. If content is wrong on a published article, leave it and schedule a new, better article instead. Future-dated articles (scheduled but not yet live) MAY be re-dated to accommodate rotation, provided the slug/URL never changes — Google indexes URLs, not `date` metadata.

2. **CTAs and internal links MUST match the article's tool category.** The `getArticleTool(slug)` function in `app/blog/[slug]/BlogPostContent.tsx` determines routing. When writing a new article, author all in-body CTAs, `[CTA]` blocks, and button text so they match:
   - **SIGN** article → links go to `/`, button copy is "Sign PDF Now — Free"
   - **FILL** article → links go to `/fill`, button copy is "Fill PDF Form Now — Free"
   - **PROTECT** article → links go to `/protect`, button copy is "Protect PDF Now — Free"
   If a new slug doesn't auto-classify correctly, add it to `FILL_SLUGS` or `PROTECT_SLUGS` in BlogPostContent.tsx (those sets override the filename heuristic).

3. **PUBLISH_DATE selection algorithm**: start from today, loop forward day by day, pick the first date where `grep -c "date: '$DATE'" app/blog/posts.ts` is `<2`. Do NOT stop at `today+1` — if tomorrow is also full, keep going. This prevents "4 articles on Apr 23" overflow situations from recurring.

4. **metaTitle must NOT include ` | SignMyPDF`** — the root layout template in `app/layout.tsx` appends it automatically. Writing it twice creates `Title | SignMyPDF | SignMyPDF` duplication.

5. **Never rewrite existing articles to change their tool type** (Sign → Fill, etc.). Fix imbalance by adding new articles going forward, not by editing history.

6. **Rotation pair for the day is derived from cycle day**. With 3 tools the cycle length is 3 days; anchor is Apr 24 2026 (cycle_day 0). Formula: `cycle_day = ((publishDate − anchor) / 86400) mod 3`.
   - `cycle_day == 0` → publish **Sign + Fill**
   - `cycle_day == 1` → publish **Sign + Protect**
   - `cycle_day == 2` → publish **Fill + Protect**
   When a 4th tool is added, extend the cycle (4 tools → 3-day cycle with unique pairs, 5 tools → 5-day cycle, etc.) so every tool still gets equal publication frequency. Base tempo stays at 2 articles per day until a tool-count >5 warrants bumping to 3/day.

7. **Signs of trouble**: if any calendar day holds ≥3 articles outside of a known launch day, OR any article's CTA points to the wrong tool, OR one tool is silently missing from rotation for >1 cycle, fix the automation first (the trigger prompt in `RemoteTrigger` + `BlogPostContent.tsx` routing), THEN redistribute or add corrective articles going forward.

8. **Article format diversity — no AI-spam patterns**. Out of every 10 articles per tool, at most 3 may be "How to…" format. Required minimum per 10: 2 pain/scenario, 2 comparisons, 1 explainer. Remainder fills from troubleshooting, use cases, or listicles. Applies to **all tools**. This keeps the blog readable by humans, defensible against Google Helpful Content Update, and signals topical authority across the intent spectrum (transactional + informational + navigational).

**Format**: SEO-landing page, NOT long-form blog post. Replaced 2026-04-28 — see "Format change history" below.

**Required structure (in this exact order):**
1. **Scenario hook** — 3-5 lines describing concrete user frustration. NO "in today's digital age", "has transformed how", definitions, or generic background.
2. **[CTA] block** — immediately after the hook (link auto-routes to tool per Hard Rule 2).
3. **Step-by-step** — 4-5 numbered steps, each under 10 words.
4. **"Why most tools are frustrating"** — 3-5 bullets (forced registration, paywall, watermark, daily limits, server uploads).
5. **"Why SignMyPDF is different"** — 3-5 bullets (no account, no paywall at download, browser-only, works on any device).
6. **2-3 FAQ blocks** — each answer 1-3 sentences max. Real questions only.
7. **Final [CTA] block**.
8. **"Related tools"** — 3 internal links.
Comparison table is OPTIONAL — include only for comparison-type articles when a side-by-side actually helps the reader.

**Article type** must be ONE of: (a) Use-case, (b) Comparison, (c) Troubleshooting. NOT generic listicles, trend pieces, or vague "everything you need to know" guides.

**Length**: 700-900 words ideal, 600-1200 hard bounds. NEVER exceed 1200.

**Style**: contractions (you'll, won't, it's, don't); mix short (5-word) and long (20-25-word) sentences; max 2-3 paragraphs in a row before a list, CTA, or heading.

**FORBIDDEN patterns**: invented statistics, "(2026 Guide)" / "(Updated 2026)" in titles, `[QuickSummary]` blocks with emoji (⏱️💰📱✍️), `[CALLOUT]` blocks, fake user reviews / blockquote testimonials, "has transformed how", "but it also", "in today's fast-paced world", "In conclusion", "To summarize", "Final thoughts", walls of text without breaks.

**EVIDENCE rule**: no invented stats. If a number is needed, link to a real source (Stanford SIEPR, Gartner, Owl Labs, Buffer State of Remote Work, government data). If no real source — remove the number, write qualitatively.

**After each pair**: deploy + send URLs to Google indexing via GSC API (scripts/gsc-credentials.json).

#### Format change history

- **2026-04-28 (morning)** — Replaced old format (1500+ words, `[QuickSummary]`/`[CALLOUT]` blocks, comparison table required, 3 blockquote user reviews) with the SEO-landing format above. Reason: old format produced AI-spam patterns (invented stats, fake testimonials, walls of text) that were hurting readability and risked Google Helpful Content penalties. The first article published under the new prompt is `protected-pdf-wont-open-some-devices` (2026-04-28). Backup of the original trigger prompt: `~/.config/signmypdf/blog-trigger-prompt-backup-2026-04-28.md`. The articles published before this date (date ≤ 2026-04-27) remain in the old format and are FROZEN under Hard Rule 1.
- **2026-04-28 (evening, v3)** — Refined the SEO-landing prompt with: 55-character title cap (Google SERP truncates longer); main-keyword 2-3× in first 100 words; 2-3 in-body internal links separate from "Related tools"; 1-2 `[IMAGE: ...]` placeholders per article; schema-markup rule (render-layer concern, NOT in `content`); hardened POSITIONING (USP) section forbidding hard-sell; competitor-pricing verification rule (web-check before citing dollar figures); article types narrowed to (a) use-case, (b) comparison, (c) troubleshooting (explainer/listicle no longer separate types — explainers must be reframed). Backup: `~/.config/signmypdf/blog-trigger-prompt-backup-2026-04-28-v2.md`. First article under v3: `pdf-signing-no-email-required` (2026-04-28, S1 comparison).

### Audience-driven topic selection (added 2026-04-28)

Articles must serve at least one of three audience segments. Each new article should be classifiable by its dominant segment, and the topic mix per week should approximate the target distribution.

**Segment 1 — Casual one-time users (target 60% of articles, 60-70% of expected traffic)**
- One-time PDF tasks (sign a lease, fill a form, protect tax docs).
- No technical knowledge assumed.
- Topic style: "How to sign a PDF without registering", "Fill out a PDF form on phone", "Sign PDF without email".
- Conversion: AdSense (when implemented).
- Examples already in queue: `why-pdf-not-downloading-after-sign`, `sign-school-permission-slip-online`, `pdf-signing-no-email-required`, `fix-typo-on-signed-pdf`, `fill-pdf-on-iphone-no-app`.

**Segment 2 — Freelancers / remote workers (target 30%, 20-25% of traffic)**
- Recurring PDF tasks for clients.
- Some technical knowledge.
- Topic style: "Sending signed contracts to clients", "PDF tools for freelance designers", "Free DocuSign alternative for solo consultants".
- Conversion: occasional Premium subscriptions.
- Examples already in queue: `freelancers-protect-client-contracts`, `consultants-proposals-digital-signature`, `photographers-digital-signatures`, `signmypdf-vs-docusign-freelancers`.

**Segment 3 — Small business / SMB (target 10%, 5-10% of traffic)**
- Daily PDF workflow needs across a team.
- Higher technical knowledge.
- Topic style: "Bulk signing for HR onboarding", "Protected PDF workflows for legal teams", "Accountant-grade PDF security".
- Conversion: main Premium subscriber base.
- Examples already in queue: `accountants-tax-documents-signature`, `law-firms-free-pdf-tools`, `medical-practices-hipaa-pdf-sharing`, `financial-advisors-protect-client-statements`, `hipaa-electronic-signatures`.

**Topic-mix targeting (weekly, sliding 7-day window)**: 60% Segment 1, 30% Segment 2, 10% Segment 3. If the trailing week skews more than ±10% off these ratios, add Segment-1-heavy slugs to the next selection cycle to rebalance. The daily trigger does NOT enforce this automatically; it picks first-unused-from-queue. The queues themselves were rebalanced 2026-04-28 to add Segment-1 slugs (5 broad-intent topics added to SIGN/FILL queues) so the natural picking order trends toward the target ratio. Periodic re-checks are needed as new slugs get added.

### Daily trigger (RemoteTrigger ID `trig_01Mw8wt1nCK3jpDA7ymfp4g2`)

Runs `0 2 * * *` UTC daily. Encoded with all 8 hard rules above **plus** the 3-tool rotation schedule (anchor = Apr 24 2026) **plus** the SEO-landing format rules from the "Format" section **plus** the v3 SEO refinements (title cap, keyword density, in-body links, image placeholders, schema TODO, USP positioning, competitor-pricing verification). The trigger prompt lives in the RemoteTrigger config, NOT in-repo — if you change the rules here, also update the trigger via `RemoteTrigger action=update`. Keep both in sync. Previous prompt versions are preserved at `~/.config/signmypdf/blog-trigger-prompt-backup-2026-04-28.md` (pre-SEO-landing) and `~/.config/signmypdf/blog-trigger-prompt-backup-2026-04-28-v2.md` (SEO-landing pre-v3).

**⚠️ Single source of truth.** This RemoteTrigger is the ONLY automated blog publisher. There used to be a second `Daily Blog Publisher` GitHub Actions workflow (`.github/workflows/daily-blog.yml`) running at 03:00 UTC under the old "next 2 from `blog-plan.json`" logic — it was unaware of cycle_day rotation and silently doubled publications. Removed Apr 25 2026 after it overflowed Apr 25 to 4 articles by adding a non-rotation Sign + Fill pair on top of the trigger's correct Protect publication. If you ever need a redundant backup publisher, port the cycle_day logic from this trigger into the GitHub Action — do NOT resurrect the old script as-is.

### Progress

| Day | Article 1 (SIGN) | Article 2 (FILL/other) | Status |
|-----|-----------------|------------------------|--------|
| 1 | how-to-sign-lease-agreement-online | signmypdf-vs-docusign-freelancers | ✅ done |
| 2 | real-estate-agents-sign-documents | fill-w9-form-online-free | ✅ done |
| 3 | electronic-signature-legal-rental | sign-nda-online-without-printing | ✅ done |
| 4 | pdf-wont-let-me-type-fix | ilovepdf-vs-signmypdf | ✅ done |
| 5 | fill-irs-form-online-free | freelancers-sign-contracts-free | ✅ done |
| 6 | electronic-signature-laws-by-state | sign-employment-offer-letter-online | ✅ done |
| 7 | cant-sign-pdf-iphone-fix | adobe-acrobat-vs-signmypdf | ✅ done |
| 8 | fill-rental-application-pdf-free | small-business-document-signing | ✅ done |
| 9 | eidas-regulation-eu-signatures | sign-medical-release-form-online | ✅ done |
| 10 | pdf-form-fields-not-working-fix | hellosign-alternatives-free | ✅ done |
| 11 | sign-insurance-documents-online | hr-teams-collect-signatures | ✅ done (Apr 22) |
| 12 | esign-act-explained | fill-job-application-pdf-online | ✅ done (split: SIGN→Apr 26, FILL→Apr 24) |
| 13 | sign-pdf-no-editing-allowed | smallpdf-vs-signmypdf | ✅ done (split: SIGN→Apr 24, FILL→Apr 26) |
| 14 | sign-construction-contract-online | remote-teams-sign-documents | ⚠️ SIGN done (dated Apr 25), FILL pending |

### Launch articles (separate from the SIGN+FILL queue)

| Date | Tool | Slug |
|------|------|------|
| Apr 23 | protect | password-protect-pdf-online-free |

### Date redistribution (Apr 23)

Overflow fix: Apr 22 originally carried 4 articles, Apr 23 carried 5. On the /protect launch day we capped Apr 23 at 3 (2 queue + launch article) and pushed 4 articles forward 3-4 days to Apr 25 and Apr 26. URLs unchanged → Google/Bing indexing preserved.

### 3-tool rotation (activated Apr 25 2026)

Anchor = Apr 24 2026 (cycle_day 0). Rotation restores equal publication rate for Protect, which was stuck at a single launch article on Apr 23.

| Date | Cycle day | Pair |
|------|-----------|------|
| Apr 24 | 0 | Sign + Fill (already published pre-rotation) |
| Apr 25 | 1 | **Sign + Protect** (first Protect in rotation) |
| Apr 26 | 2 | Fill + Protect |
| Apr 27 | 0 | Sign + Fill |
| Apr 28 | 1 | Sign + Protect |
| Apr 29 | 2 | Fill + Protect |
| Apr 30 | 0 | Sign + Fill |
| … | … | … |

**Apr 25-26 rebalance.** To make room for the first two Protect articles in the new rotation, the two future-dated articles that previously occupied those slots were re-dated forward:
- `hellosign-alternatives-free` (FILL): Apr 25 → Apr 30
- `esign-act-explained` (SIGN): Apr 26 → Apr 30

Both are future-dated (scheduled, not yet live), so the move is SEO-safe — URLs unchanged, `date` metadata updated, Google indexes URLs only. Apr 30 is the next `cycle_day == 0` after Apr 27 (where the Apr 24 trigger run already placed `remote-teams-sign-documents` + `digital-signatures-admissible-court`).

### Protect article backlog (30+ topics, format-diverse)

Use these in order when the rotation calls for a PROTECT article. Format diversity (Rule 8) enforced: max 3 "How to…" out of every 10.

**How-to (max 6 total):**
1. `password-protect-pdf-without-adobe` — How to Password Protect a PDF Without Adobe Acrobat
2. `password-protect-pdf-on-mac` — How to Password Protect a PDF on Mac
3. `password-protect-pdf-on-windows-11` — How to Password Protect a PDF on Windows 11
4. `password-protect-pdf-on-iphone` — How to Password Protect a PDF on iPhone
5. `remove-password-from-pdf-you-own` — How to Remove a Password from a PDF You Own
6. `password-protect-pdf-free-online-no-software` — How to Password Protect a PDF for Free (Online, No Software)

**Pain / scenario:**
7. `sent-confidential-contract-unprotected` — I Sent a Confidential Contract Unprotected — Here's What I Do Now
8. `why-lawyer-asks-password-protect-pdf` — Why Your Lawyer Keeps Asking You to Password Protect PDFs
9. `accountant-wont-accept-unprotected-tax-documents` — The Real Reason Your Accountant Won't Accept Unprotected Tax Documents
10. `what-happens-if-protected-pdf-leaks` — What Happens If a Password-Protected PDF Gets Leaked?
11. `is-password-protected-pdf-actually-secure` — Is Your Password-Protected PDF Actually Secure? The Honest Answer
12. `biggest-mistake-protecting-pdfs` — The Mistake Most People Make When Protecting PDFs (And How to Avoid It)
13. `just-email-it-isnt-enough-for-sensitive-documents` — Why "Just Email It" Isn't Enough for Sensitive Documents
14. `hr-pdf-resume-protection` — What HR Departments Wish You Knew About Sending Resumes as PDFs

**Comparisons:**
15. `adobe-vs-free-pdf-protection` — Adobe Acrobat vs Free PDF Protection: Do You Really Need to Pay?
16. `password-pdf-vs-encrypted-email` — Password Protecting PDFs vs Encrypted Email: Which Actually Protects You?
17. `zip-password-vs-pdf-password` — ZIP Password vs PDF Password: Which Is Harder to Crack?
18. `smallpdf-vs-ilovepdf-vs-signmypdf-protection` — SmallPDF vs iLovePDF vs SignMyPDF for PDF Protection
19. `dropbox-password-links-vs-protected-pdfs` — Dropbox Password Links vs Protected PDFs: What's the Difference?

**Explainer / educational:**
20. `pdf-encryption-explained-plain-english` — PDF Encryption Explained in Plain English
21. `aes-128-vs-aes-256-pdf` — AES-128 vs AES-256: Which Does Your PDF Actually Use?
22. `owner-password-vs-user-password` — Owner Password vs User Password: What Nobody Tells You
23. `can-protected-pdf-be-hacked` — Can a Password-Protected PDF Be Hacked? What the Research Says

**Troubleshooting:**
24. `forgot-my-pdf-password-options` — "Forgot My PDF Password" — What Are Your Real Options?
25. `protected-pdf-wont-open-some-devices` — Why Your Password-Protected PDF Won't Open on Some Devices
26. `protected-pdf-keeps-asking-password` — Protected PDF Keeps Asking for Password — Here's Why

**Use cases / niche:**
27. `freelancers-protect-client-contracts` — How Freelancers Should Protect Client Contracts in PDF Format
28. `real-estate-agents-protect-property-documents` — Real Estate Agents: Protecting Property Documents Before Emailing
29. `medical-practices-hipaa-pdf-sharing` — Medical Practices: HIPAA Considerations for PDF Sharing
30. `financial-advisors-protect-client-statements` — Financial Advisors: Protecting Client Statements in PDF

**Listicles:**
31. `7-document-types-always-password-protect` — 7 Types of Documents You Should Always Password Protect
32. `password-strength-checklist-pdfs-2026` — Password Strength Checklist for PDFs: What's Actually Safe in 2026

### Blog index date filter + revalidate

Blog index (`app/blog/page.tsx`) uses `getPublishedPosts()` which filters by `post.date <= today (UTC)`. Articles with future dates (e.g. tomorrow) are hidden from the index but accessible by direct URL.

To surface future-dated articles automatically when UTC midnight rolls over, `export const revalidate = 3600` is set on the blog index page. Combined with the daily trigger's redeploy at 02:00 UTC, this provides double redundancy: even if the trigger fails, the stale-while-revalidate logic refreshes the index within an hour after the date changes.
| 14 | sign-construction-contract-online | remote-teams-sign-documents | ⬜ |
| 15 | digital-signatures-admissible-court | fill-government-forms-online-free | ⬜ |
| 16 | signature-disappears-pdf-fix | pandadoc-free-alternative | ⬜ |
| 17 | sign-divorce-papers-online | property-managers-tenant-signatures | ⬜ |
| 18 | electronic-signature-business-contracts | fill-visa-application-form-pdf | ⬜ |
| 19 | pdf-read-only-add-text-fix | docusign-free-plan-vs-signmypdf | ⬜ |
| 20 | sign-contractor-agreement-online | accountants-tax-documents-signature | ⬜ |
| 21 | hipaa-electronic-signatures | fill-bank-form-pdf-online | ⬜ |
| 22 | sign-multiple-pdf-pages | zoho-sign-vs-signmypdf | ⬜ |
| 23 | sign-car-purchase-agreement-online | law-firms-free-pdf-tools | ⬜ |
| 24 | electronic-signature-real-estate-legal | fill-college-application-pdf | ⬜ |
| 25 | signed-pdf-looks-different-fix | signnow-free-alternative | ⬜ |
| 26 | sign-service-agreement-online | consultants-proposals-digital-signature | ⬜ |
| 27 | electronic-signature-international-contracts | fill-insurance-claim-form-pdf | ⬜ |
| 28 | add-multiple-signatures-one-pdf | adobe-fill-sign-vs-signmypdf | ⬜ |
| 29 | sign-non-compete-agreement-online | photographers-digital-signatures | ⬜ |
| 30 | electronic-signature-security | fill-medical-history-form-pdf | ⬜ |

### Format Migration Strategy (added 2026-04-28)

The blog now spans two formats by design, and will continue to do so until data justifies a move:

- **3 articles in the new SEO-landing format** (700-900w, scenario hook → tool [CTA] → steps → "why frustrating" → "why us" → FAQ → final [CTA] → related). Currently:
  - `protected-pdf-wont-open-some-devices` (2026-04-28)
  - `hellosign-alternatives-free` (2026-04-30, future-dated)
  - `esign-act-explained` (2026-04-30, future-dated)
- **51 articles in the old long format** (1500w, `[QuickSummary]` / `[CALLOUT]`, comparison table, blockquote testimonials). All dated ≤ 2026-04-27 — **frozen under Hard Rule 1**.

**Do not mass-rewrite old articles into the new format.** Google interprets large-scale content updates across a domain as a "site-wide change" and can re-evaluate every page on the site — that is exactly the failure mode that hurt signmypdf.io for ~3 weeks during the canonical bug in April. The migration plan from 2026-04-28 onwards is therefore data-driven and slow:

1. **Wait 2-3 weeks** after 2026-04-28 to gather Google Search Console data on the new SEO-landing format vs the old long format. Compare CTR, average position, impressions, and engaged sessions per format cohort.
2. **Decide by data, not aesthetic preference**:
   - **Top performers** in old format → cautiously optimize (improve, do not full-rewrite — leaders should be touched delicately, ideally by editing intro/FAQ rather than swapping the whole article).
   - **Zero-traffic articles** in old format → safe to rewrite into the new format. There is no organic SEO value to lose.
   - **Mid performers** → leave alone unless something specific (low CTR with good rank, a competitor dethroning us) justifies the work.
3. **Selective, paced rewrites only** — no more than 1-2 articles per week, never as a single bulk commit. Each rewrite follows Hard Rule 1's "future-date or new slug" escape hatch: if the old article is currently indexed, push the date forward (or change the slug) and treat the rewrite as a re-publication, never an in-place edit.
4. **Until that data is in**: every NEW article is in the new SEO-landing format (the daily trigger enforces this). Every OLD article is read-only.

Signs that the strategy is working: the 3 new-format articles outperform comparable old-format articles in CTR / engagement / conversion within 4-6 weeks. Signs to abort and re-evaluate: new-format articles underperform across the board (in which case the prompt or format itself needs revisiting before any old-article rewrites).

---

## Key Files

> **NOTE (2026-05-08):** Stage 4 moved `signPdf.ts` + `watermark.ts` → `packages/pdf-core/src/`, and `SignatureCanvas.tsx` + `PDFViewer.tsx` (renamed `PdfSignViewer.tsx`) → `packages/ui/src/`. The `app/` paths below are kept for blame/archaeology of what used to live where; any new edit to those files happens at the new path. The Stage-4 `### Key Files` block at the top of the workspace `## Recently Shipped (May 7-8 2026)` section is the authoritative current map.

```
packages/pdf-core/src/                # Stage 4 PR #9 (May 7 2026)
  signPdf.ts                          # pdf-lib signing logic, watermark, text→PNG renderer
  watermark.ts                        # addWatermarkToBlob + blobToDataUrl
  pdfjs.ts                            # setupPdfjs(workerSrc) — per-host worker URL config
  types.ts                            # SignaturePlacement + SignOptions (single source of truth)
  index.ts                            # Public re-exports

packages/ui/src/                      # Stage 4 PR #10 (May 8 2026)
  SignatureCanvas.tsx                 # Draw + Type signature canvas. ESLint debt cleared
                                      #   in PR #10 (forward-ref → useCallback ordering;
                                      #   onSaveRef pattern; refs for color/width inside
                                      #   initCanvas; advanceStroke() dedupes touch+mouse).
  PdfSignViewer.tsx                   # was PDFViewer. Multi-page PDF preview + drag-to-place.
                                      #   New required prop workerSrc: string. Calls
                                      #   setupPdfjs() from @signmypdf/pdf-core.
  styles/signature.css                # CSS slice for SignatureCanvas only.
                                      #   PdfSignViewer is fully styled inline.
  index.ts                            # Public re-exports

app/                                  # apps/web/app/
  page.tsx                           # Hub landing (upload → sign → done), pricing modal, toast
  globals.css                        # All CSS, including mobile breakpoints + every fse-*, nda-*, hub-* rule
                                     # Top of file: @import '@signmypdf/ui/styles/signature.css'
  layout.tsx                         # Root layout, metadata, GA script
  utils/
    fillPdf.ts                       # /fill — text-only injection
    fillSignPdf.ts                   # /sign-nda + /fill — text/date/signature injection (PNG embed, opacity-1 alpha)
    protectPdf.ts                    # /protect — encrypt + permissions
    # signPdf.ts + watermark.ts MOVED to packages/pdf-core/src/ (PR #9)
  components/
    # PDFViewer.tsx + SignatureCanvas.tsx MOVED to packages/ui/src/ (PR #10)
    PDFTextEditor.tsx                # /fill — text-fill editor (older, separate from FillSignEditor)
    FillSignEditor.tsx               # /sign-nda + /fill — unified text/date/signature editor
                                     #   • text-body click-or-drag with 5-px threshold
                                     #   • justDraggedRef post-mouseup click-suppression
                                     #   • multi-line textarea with autoResize, S/M/L (9/11/14 pt) selector
                                     #   • Edit / Duplicate / Delete action cluster (Delete red-by-default)
                                     #   • compact 52-px sidebar cards w/ first-line + 25-char preview
                                     #   • signature flow: Draw / Type tabs, auto-place, Apply-to-all,
                                     #     LS persist on `signmypdf-saved-signature`, Edit-prefill via
                                     #     SignatureCanvas's initialDataUrl prop
                                     #   • selectedPages derived from elements (signature ticks)
                                     # Imports SignatureCanvas from @signmypdf/ui (was './SignatureCanvas').
    SavedSignatures.tsx              # /sign-only — saved-sigs panel (Pro feature)
    FileHistory.tsx                  # /sign-only — download history (Pro)
    NavHeader.tsx, SiteFooter.tsx    # Shared chrome
    Logo.tsx                         # Logo
    BlogPdfUploader.tsx              # Inline upload widget for blog CTAs (isFill / isProtect routes)
  sign/page.tsx                      # /sign tool (free + Pro flow)
  fill/page.tsx                      # /fill tool — uses FillSignEditor (no `unlimited`)
  protect/page.tsx                   # /protect tool
  merge/page.tsx                     # /merge tool (live since 2026-05-02)
  compress/page.tsx                  # /compress tool (live since 2026-05-02)
  split/page.tsx                     # /split tool (live since 2026-05-02)
  sign-pdf-chrome-extension/         # /sign-pdf-chrome-extension — Chrome extension landing
    page.tsx                         #   server, 7 sections + JSON-LD (WebPage + SoftwareApplication + FAQPage)
    layout.tsx                       #   SEO metadata (canonical, og:url, title, description)
    LandingHeader.tsx                #   minimal header (logo only — no nav)
    Faq.tsx                          #   client accordion (one-open-at-a-time)
    sign-pdf-chrome-extension.css    #   all .spce-* rules (imported from globals.css)
    CLAUDE.md                        #   operational context — read before editing this landing
  sign-nda/
    page.tsx                         # /sign-nda — server component, metadata, JSON-LD,
                                     #   5-step "How it works" flow, About NDAs, FAQ
    NdaHeroCard.tsx                  # Hero card + "OR" + always-visible upload dropzone +
                                     #   restore-prompt + Success state with share buttons
                                     #   (Email / WhatsApp / Telegram). Owns DRAFT_KEY,
                                     #   share-target URL templates.
  blog/
    page.tsx                         # Blog index (uses getPublishedPosts())
    posts.ts                         # All 50+ articles content + getPublishedPosts() filter
    [slug]/
      page.tsx                       # Blog post route
      BlogPostContent.tsx            # Renders article: tables, CTA, callouts, step cards
                                     # FILL_SLUGS / PROTECT_SLUGS sets + getArticleTool() routing
scripts/
  submit-indexnow.mjs                # Bing IndexNow bulk submit (all slugs)
  index-pages.mjs                    # Google Indexing API (dynamic from posts.ts, CLI args for new-only)
                                     # Usage:
                                     #   node scripts/index-pages.mjs              # submit all
                                     #   node scripts/index-pages.mjs slug1 slug2  # submit specific slugs
  seo-health-check.mjs               # Daily 03:00 UTC sentinel — see ## SEO Infrastructure
  setup-github-secrets.mjs           # One-shot helper to seed repo secrets from local creds
.github/workflows/
  seo-health.yml                     # Wraps seo-health-check.mjs on cron + workflow_dispatch
  deploy-on-blog-push.yml            # Stage B of the daily blog pipeline (Vercel deploy + IndexNow + Google index)
```
