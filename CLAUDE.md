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

## Recently Shipped (Apr 23 2026)

- **`/protect` tool live** — password + permissions PDF protection, fully client-side, deployed to production.
- **Mobile `/protect` polish** — shrunk preview, larger touch targets (52px inputs, 48px buttons, 16px font), sticky CTA now floats above content (no white backdrop, no top border — button carries its own shadow). Matches `.sticky-sign-wrap` pattern on `/`.
- **Blog trigger logic fixed** — forward-walk algorithm: starts from today, steps forward day-by-day until it finds a date with `<2` articles. No more overflow onto a single day.
- **Tri-state CTA routing working** — `getArticleTool(slug)` returns `sign | fill | protect` and drives every in-body CTA, sticky CTA, BlogPdfUploader target, hero subtitle, and button copy. `FILL_SLUGS` + `PROTECT_SLUGS` sets in `BlogPostContent.tsx` override the filename heuristic when needed.
- **7 hard blog rules codified** — documented in CLAUDE.md AND embedded in the daily trigger prompt (`trig_01Mw8wt1nCK3jpDA7ymfp4g2`). Rules cover: no editing published articles, CTA/tool alignment, forward-walk date selection, metaTitle dedup, no tool-type rewrites, equal-rate publishing for new tools, failure mode detection.
- **QuickSummary parser fixed** — `BlogPostContent.tsx` now parses inline `[QuickSummary]...[/QuickSummary]` blocks instead of leaking raw-text bracket markup onto the page.
- **SEO bloat removed from tool pages** — stripped heavy SEO content blocks from `/`, `/fill`, `/protect`; replaced with compact FAQ so conversion-critical pages stay focused on the upload CTA while preserving answer-box FAQ schema for SERP.

---

## SEO Indexing Status

**Last updated: 2026-04-25.** If you change anything indexing-related, update this section so the next session has accurate ground truth.

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

- Site added, sitemap (`https://www.signmypdf.io/sitemap.xml`) submitted.
- `scripts/submit-indexnow.mjs` uses `HOST=www.signmypdf.io` — IndexNow does not require ownership verification, so www is fine.
- Last status from Bing UI: "Discovered but not crawled" — waiting on first crawl, no action needed.

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
- **Watch GSC "Pages → Indexed"** in the Domain property over Apr 28-May 4 for the recovery curve. If it doesn't move, dig into "Page indexing" reasons in GSC (most likely culprits: alt-page with canonical, soft 404, duplicate without canonical).
- **Add `https://www.signmypdf.io/` as a Bing Webmaster property** (use "Import from Google Search Console" — fastest). The current Bing property is apex-only, same mismatch we just fixed for GSC.
- **Bing**: if "Discovered but not crawled" persists past May 1, manually trigger "Request Indexing" for top 5 pages from Webmaster UI.
- **Enable Search Console API** in Cloud project `signmypdf-seo` (https://console.developers.google.com/apis/api/searchconsole.googleapis.com/overview?project=702087743733) so URL Inspection API works programmatically. Currently only the legacy `webmasters/v3` endpoint is reachable, which doesn't expose per-URL indexing state.
- **Conversion**: investigate why US Facebook traffic bounces in 5s. Likely culprits — homepage hero doesn't match social-share expectation, or the "drop a PDF" CTA isn't visible without scroll on mobile. A/B test homepage hero copy.

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

### What NOT to touch

- **Do not delete or move `scripts/seo-health-check.mjs` or `.github/workflows/seo-health.yml`** without first replacing them with an equivalent guarded by the same invariants. They are the only safety net catching the canonical/og:url class of regression that previously cost ~3 weeks of organic traffic.
- **Do not weaken the invariants** (e.g. relax canonical-mismatch, drop the title-uniqueness check, expand the 50-160 description range) to silence a failing run. Fix the source of the regression instead. 50-160 is Google's visible SERP slot — wider just hides the problem.
- **Do not add entries to `ALLOWLIST` except for genuinely-frozen content** (article published per Blog Publication Plan rule #1, intentional redirect, etc.). The allowlist is for things that *cannot* be fixed at the source. If a fixable bug is added, the health check loses its meaning.
- **Do not separate this section from `## SEO Indexing Status`, and do not move it above it.** The two are paired: Indexing Status documents what was broken and fixed; this section documents what prevents re-breakage. They only make sense read together, in that order. If you reorganise CLAUDE.md, keep them adjacent.

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

## Next Priorities

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
- Add `www.signmypdf.io` as a separate GSC property + grant service account Owner so the indexing script can submit www directly.
- Monitor GSC "Pages → Indexed" Apr 27-29 to confirm the canonical fix worked.
- If Bing stays "Discovered but not crawled" past Apr 28, hit Request Indexing manually.

### 4. Payment Integration (Paddle)
- PIXELTIDE LLC is the legal entity for Paddle
- Application ready to submit
- After Paddle approval: replace demo `alert('Premium activated')` with real Paddle checkout
- Replace `localStorage.setItem(SUBSCRIPTION_KEY, 'true')` with server-verified subscription

### 5. Email (Brevo DKIM/DMARC)
- Brevo DKIM/DMARC records added to Namecheap DNS
- Waiting propagation (up to 48h)
- After verification: set up Gmail to send from `support@signmypdf.io` via Brevo SMTP

### 6. New PDF Tools (planned)
- Compress PDF
- Merge PDFs
- PDF → Word / Word → PDF
- Add each as separate route + blog article for SEO

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

**Format**: QuickSummary → Intro → Steps → Callout → Comparison table → User reviews → CTA → FAQ → Related links. 1500+ words each.
**After each pair**: deploy + send URLs to Google indexing via GSC API (scripts/gsc-credentials.json).

### Daily trigger (RemoteTrigger ID `trig_01Mw8wt1nCK3jpDA7ymfp4g2`)

Runs `0 2 * * *` UTC daily. Encoded with all 8 hard rules above **plus** the 3-tool rotation schedule (anchor = Apr 24 2026). The trigger prompt lives in the RemoteTrigger config, NOT in-repo — if you change the rules here, also update the trigger via `RemoteTrigger action=update`. Keep both in sync.

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

---

## Key Files

```
app/
  page.tsx              # Main app (upload → sign → done), pricing modal, toast
  globals.css           # All CSS, including mobile breakpoints
  layout.tsx            # Root layout, metadata, GA script
  utils/
    signPdf.ts          # pdf-lib signing logic, watermark, text→PNG renderer
  components/
    PDFViewer.tsx       # Multi-page PDF preview + drag signature placement
    SignatureCanvas.tsx # Draw signature canvas
    SavedSignatures.tsx # Save/reuse signatures (Pro)
    FileHistory.tsx     # Download history (Pro)
    Logo.tsx            # Logo component
  blog/
    page.tsx            # Blog index (uses getPublishedPosts())
    posts.ts            # All 40 articles content + getPublishedPosts() filter
    [slug]/
      page.tsx          # Blog post route
      BlogPostContent.tsx  # Renders article: tables, CTA, callouts, step cards
                           # FILL_SLUGS set + isFillArticle() for CTA routing
  components/
    BlogPdfUploader.tsx # isFill prop — redirects to /fill when true
scripts/
  submit-indexnow.mjs  # Bing IndexNow bulk submit (all slugs)
  index-pages.mjs      # Google Indexing API (dynamic from posts.ts, CLI args for new-only)
  index-pages.mjs usage:
    node scripts/index-pages.mjs              # submit all
    node scripts/index-pages.mjs slug1 slug2  # submit specific slugs only
```
