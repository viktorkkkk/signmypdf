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
- [x] FILL_SLUGS set in BlogPostContent.tsx — isFillArticle(slug) detects fill articles
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

## Next Priorities

### 1. Google Indexing ✅ Done
- Sitemap submitted, all 45 URLs sent to Google Indexing API
- Monitor GSC for indexing progress (data lags 2-4 days)
- Bing: "Discovered but not crawled" — waiting first crawl (3-5 days)

### 2. Payment Integration (Paddle)
- PIXELTIDE LLC is the legal entity for Paddle
- Application ready to submit
- After Paddle approval: replace demo `alert('Premium activated')` with real Paddle checkout
- Replace `localStorage.setItem(SUBSCRIPTION_KEY, 'true')` with server-verified subscription

### 3. Email (Brevo DKIM/DMARC)
- Brevo DKIM/DMARC records added to Namecheap DNS
- Waiting propagation (up to 48h)
- After verification: set up Gmail to send from `support@signmypdf.io` via Brevo SMTP

### 4. New PDF Tools (planned)
- Compress PDF
- Merge PDFs
- PDF → Word / Word → PDF
- Add each as separate route + blog article for SEO

### 5. A/B Testing & Conversion
- Test toast CTA copy
- Test pricing modal trigger (show after 1st PDF vs after 2nd)
- Add email capture on free plan for upsell

---

## Blog Publication Plan (60 articles)

**Rule**: Strictly 2 articles per day — exactly 1 SIGN + 1 FILL. Never more than 2 per day. Never 2 articles of the same type on the same day.
**Before publishing**: always check existing dates in posts.ts to confirm the target date has 0 articles. Only then publish.

### ⚠️ Balance Rules — NEVER violate these

1. **Never rewrite or retype existing published articles** to change their tool type (Sign → Fill or vice versa). Google has already indexed them — changing content on indexed pages is an SEO risk with no benefit.

2. **Balance is maintained only through new publications.** The early Sign-heavy articles (written before the Fill tool existed) are intentional history. The 1 SIGN + 1 FILL daily rule corrects the ratio over time naturally.

3. **Current baseline** (do not "fix" by editing old articles):
   - Legacy Sign-only articles: ~10 (pre-Fill era, indexed by Google, untouchable)
   - Queue articles: strictly 1:1 Sign/Fill pairs

4. **For every new PDF tool added to the site** (e.g. Compress PDF, Merge PDF, PDF→Word): follow the same rule — publish articles for each tool at an equal rate (1 per tool per publication day). Never bulk-publish articles for one tool to "catch up".

5. **Signs that something is wrong**: if you see an imbalance > 5 articles between any two tools, the fix is to schedule more articles for the underrepresented tool going forward — NOT to rewrite existing ones.
**Format**: QuickSummary → Intro → Steps → Callout → Comparison table → User reviews → CTA → FAQ → Related links. 1500+ words each.
**After each pair**: deploy + send URLs to Google indexing via GSC API (scripts/gsc-credentials.json).

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
| 11 | sign-insurance-documents-online | hr-teams-collect-signatures | ✅ done |
| 12 | esign-act-explained | fill-job-application-pdf-online | ✅ done |
| 13 | sign-pdf-no-editing-allowed | smallpdf-vs-signmypdf | ⚠️ SIGN done (dated Apr 24), FILL pending |

**⚠️ Next trigger run** (Apr 24 02:00 UTC): publish `smallpdf-vs-signmypdf` (FILL, pair 13) + `sign-construction-contract-online` (SIGN, pair 14). After that, pair 14 will have SIGN done + FILL (`remote-teams-sign-documents`) pending — same 1-article offset pattern continues until pairs re-align.

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
