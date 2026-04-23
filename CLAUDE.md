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

### 3. Google Indexing ✅ Done
- Sitemap submitted, all 45 URLs sent to Google Indexing API
- Monitor GSC for indexing progress (data lags 2-4 days)
- Bing: "Discovered but not crawled" — waiting first crawl (3-5 days)

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

**Rule**: Strictly 2 articles per day — exactly 1 SIGN + 1 FILL. Never more than 2 per day. Never 2 articles of the same type on the same day. Launch-day exception: the day a new tool ships may carry up to 3 (2 queue + 1 launch article).
**Before publishing**: always check existing dates in posts.ts to confirm the target date has <2 articles. If today is full, walk forward day-by-day until you find a slot. NEVER batch overflow onto one day.

### ⚠️ HARD RULES — any Claude session writing or editing blog articles MUST follow these

1. **NEVER modify or edit an already-published article.** Dates, content, titles, CTAs, metaTitle, internal links of articles already committed to `app/blog/posts.ts` are frozen. Google indexes them — every edit is an SEO regression risk. Only APPEND new entries. If content is wrong on an existing article, leave it and schedule a new, better article instead.

2. **CTAs and internal links MUST match the article's tool category.** The `getArticleTool(slug)` function in `app/blog/[slug]/BlogPostContent.tsx` determines routing. When writing a new article, author all in-body CTAs, `[CTA]` blocks, and button text so they match:
   - **SIGN** article → links go to `/`, button copy is "Sign PDF Now — Free"
   - **FILL** article → links go to `/fill`, button copy is "Fill PDF Form Now — Free"
   - **PROTECT** article → links go to `/protect`, button copy is "Protect PDF Now — Free"
   If a new slug doesn't auto-classify correctly, add it to `FILL_SLUGS` or `PROTECT_SLUGS` in BlogPostContent.tsx (those sets override the filename heuristic).

3. **PUBLISH_DATE selection algorithm**: start from today, loop forward day by day, pick the first date where `grep -c "date: '$DATE'" app/blog/posts.ts` is `<2`. Do NOT stop at `today+1` — if tomorrow is also full, keep going. This prevents "4 articles on Apr 23" overflow situations from recurring.

4. **metaTitle must NOT include ` | SignMyPDF`** — the root layout template in `app/layout.tsx` appends it automatically. Writing it twice creates `Title | SignMyPDF | SignMyPDF` duplication.

5. **Never rewrite existing articles to change their tool type** (Sign → Fill, etc.). Fix imbalance by adding new articles going forward, not by editing history.

6. **For every new PDF tool added to the site** (e.g. Compress PDF, Merge PDF, PDF→Word): follow the same rule — publish articles for each tool at an equal rate going forward. Never bulk-publish articles for one tool to "catch up".

7. **Signs of trouble**: if any calendar day holds ≥3 articles outside of a known launch day, OR any article's CTA points to the wrong tool, fix the automation first (the trigger prompt in `RemoteTrigger` + `BlogPostContent.tsx` routing), THEN redistribute or add corrective articles going forward.

**Format**: QuickSummary → Intro → Steps → Callout → Comparison table → User reviews → CTA → FAQ → Related links. 1500+ words each.
**After each pair**: deploy + send URLs to Google indexing via GSC API (scripts/gsc-credentials.json).

### Daily trigger (RemoteTrigger ID `trig_01Mw8wt1nCK3jpDA7ymfp4g2`)

Runs `0 2 * * *` UTC daily. Encoded with all 7 hard rules above. The trigger prompt lives in the RemoteTrigger config, NOT in-repo — if you change the rules here, also update the trigger via `RemoteTrigger action=update`. Keep both in sync.

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

**⚠️ Next trigger run** (Apr 24 02:00 UTC): the new trigger logic walks forward day-by-day looking for `<2 articles`. Expected PUBLISH_DATE = Apr 27 (Apr 24-26 are full). Will publish `remote-teams-sign-documents` (FILL from pair 14) + `digital-signatures-admissible-court` (SIGN from pair 15).

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
