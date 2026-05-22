# /sign-pdf-chrome-extension — Operational Context

Read this before touching anything inside `apps/web/app/sign-pdf-chrome-extension/`.
Captures the design rules, copy, and don't-touch zones for the landing.

## 1. Project Overview

- Public landing for the **Sign PDF Free Chrome Extension**.
- URL: `/sign-pdf-chrome-extension` (canonical, www host).
- Job-to-be-done: SEO-rank for "sign pdf chrome extension" / "sign pdf
  in chrome" and convert visitors into Chrome Web Store installs.
- **Template** for future per-extension landings — when the team ships
  `/merge-pdf-chrome-extension`, `/split-pdf-chrome-extension`, etc.,
  start from this page and swap copy + screenshots.

## 2. Page structure (current)

1. **HERO** — split-screen. Text left (H1 + subtitle + Add-to-Chrome
   CTA + trust line). Hero screenshot right.
2. **See how it works** — zig-zag product showcase, 3 real screenshots
   alternating text-left / shot-right / text-left. Steps:
   1. Drop your PDF
   2. Add your signature
   3. Download in seconds
3. **Everything you need** — 6 features in a 3×2 grid (Draw / Type /
   Upload / Right-click / Text+Date / Local files). Sits before
   comparison so the user sees what the product does before being
   pitched against competitors.
4. **Why this extension is different** — comparison table, red column
   (other tools) vs blue column (us).
5. **How to install** — 3 numbered cards explaining the Chrome Web
   Store install flow (Click Add to Chrome → Confirm → Pin to toolbar).
   Sits between Comparison and FAQ so a convinced user has the
   step-by-step right when they're ready to act.
6. **Post-install CTA** — "Ready to sign your first PDF?" — the
   page's single install pitch below the hero. White background,
   base H2 (38 px), standard 80 px padding. Carries a small muted
   "Got questions? See our support page" link to `/extension/support`
   — the only place on the page where support gets a direct mention.
   **The old Final CTA section that used to sit after FAQ was
   retired 2026-05-22** — hero + one mid-page CTA proved enough;
   the duplicate at the bottom was just noise.
7. **FAQ** — 5 questions in a controlled accordion (one open at a time).
8. **Cross-pollination** — subtle paragraph linking to `/sign`,
   `/fill`, `/protect`, `/merge`, `/compress`, `/split`.

## 3. Approved copy (verbatim)

- **H1** (two lines):
  ```
  Sign PDF Free
  Chrome Extension
  ```
- **Subtitle:**
  > Sign and fill any PDF in your browser for free. No signup, no
  > upload — your files stay private.
- **CTA label:** `Add to Chrome` with the colour Chrome logo on its
  left.
- **Trust line:** `Free · No signup · No watermark`
- **"See how it works" subtitle:** `Sign your PDF in 30 seconds.`
- **Comparison — Other PDF signers (red):**
  - Upload files to their servers
  - Require account signup
  - Watermark on the free version
  - Daily limits or paywalls
  - Heavy desktop installation
- **Comparison — Sign PDF Extension (blue):**
  - 100% in your browser
  - No signup, no email
  - No watermark, ever
  - Unlimited, free forever
  - One-click Chrome install
- **Final-CTA H2:** `Sign your first PDF in 30 seconds`

## 4. Design rules

- **Header:** simplified "Sign PDF" sub-brand logo on the left, right
  side empty. No nav, no buttons. The landing header does NOT use the
  shared `<Logo />` component — it imports
  `public/chrome-extension/logo-extension.png` directly via `<Image>`.
  This keeps the main-site "Sign My PDF" mark untouched everywhere
  else (NavHeader, SiteFooter, blog header, tool surfaces).
- **Logo height:** 80 px in the landing header (the same height the
  shared `<Logo />` defaulted to here before — preserved so the header
  geometry doesn't shift).
- **Header padding:** 18 px vertical → total header height ≈ 117 px
  (inside the 112–120 target band).
- **HERO layout:** `grid-template-columns: 1fr 1fr; gap: 64px` on
  desktop. Stacks to one column under 880 px.
- **Hero screenshot frame:** `border: 1px solid rgba(15, 23, 42, 0.08)`,
  `box-shadow: 0 20px 60px rgba(15, 23, 42, 0.15)`, `border-radius: 16px`,
  `max-width: 600px`.
- **Add-to-Chrome CTA:** background `#1a73e8` (Google blue), white text,
  `padding: 18px 40px`, `font-size: 21px`, `border-radius: 12px`,
  `box-shadow: 0 6px 20px rgba(26, 115, 232, 0.35)`. Colour Chrome icon
  rendered via the shared `apps/web/app/components/ChromeIcon.tsx`
  (single source of truth — never inline-duplicate the SVG here).
- **Colour palette:** uses the existing `var(--color-*)` tokens from
  `apps/web/app/globals.css`. Don't introduce new tokens.

## 5. NEVER do on this landing

- No dropzone (it competes with the Add-to-Chrome CTA).
- No blog / article cards.
- No "Tools ▾" dropdown in the header.
- No "Free web tools →" link in the header.
- No Google Drive / Dropbox / OneDrive integrations.
- No standalone mention of "Fill PDF" as a product — only as part of
  the generic "fill any PDF" phrase.
- No `Works in Chrome · Edge · Brave · Opera · Arc` strip — that point
  lives in the FAQ ("Does it work on Mac, Windows, and Chromebook?").
- No sticky CTA in the header (hero + final CTAs are enough).
- No em-dash `—` in headings; reserved for prose subtitles where it
  reads naturally.

## 6. Key files

```
apps/web/
├── app/
│   ├── sign-pdf-chrome-extension/
│   │   ├── page.tsx                       # server, 7 sections + JSON-LD
│   │   ├── layout.tsx                     # SEO metadata
│   │   ├── LandingHeader.tsx              # minimal header (logo only)
│   │   ├── Faq.tsx                        # client accordion
│   │   ├── sign-pdf-chrome-extension.css  # all `.spce-*` rules
│   │   └── CLAUDE.md                      # this file
│   └── globals.css                        # @imports the landing CSS
├── next.config.ts                          # /chrome → /sign-pdf-chrome-extension 308
└── public/
    ├── logo.png                            # main "Sign My PDF" mark (1465×1441) — used on every other surface
    └── chrome-extension/
        ├── hero-screenshot.png             # 876×622 (real — signature modal w/ Save & place CTA)
        ├── 1-drop-pdf.png                  # 1011×701 (real — drop-PDF page w/ green "+" badge)
        ├── 2-add-signature.png             # 966×764 (real — Draw signature modal)
        ├── 3-download.png                  # 882×516 (real — placed signature + Download CTA)
        ├── og-image.png                    # 1200×630 (real — promo banner with Sign PDF mark + "Free Forever / No Signup")
        └── logo-extension.png              # 1465×1441 (sub-brand mark — landing header only)
```

## 7. SEO

- **Title:** `Sign PDF in Chrome — Free Chrome Extension | SignMyPDF`
  (root layout appends `| SignMyPDF` — keep the per-page title bare).
- **Canonical:** `https://www.signmypdf.io/sign-pdf-chrome-extension`
- **Keywords:** sign pdf chrome extension · sign pdf in chrome ·
  pdf signature extension · esign chrome · free pdf signer ·
  chrome pdf signature · sign pdf in browser
- **JSON-LD graph:** `WebPage` + `SoftwareApplication` + `FAQPage`
  (rendered server-side from `page.tsx`).
- **Redirect:** `/chrome` → `/sign-pdf-chrome-extension` permanent
  (308) via `apps/web/next.config.ts → redirects()`.
- **Sitemap entry:** `apps/web/app/sitemap.ts` lists the new URL with
  priority 0.85.

## 8. Open backlog

- Chrome Web Store assets (1280×800 listing screenshots × 5, promo
  tile 440×280, marquee 1400×560) — tracked under
  `apps/extension/CLAUDE.md → Open backlog`.

## 8a. Chrome Web Store listing (live since 2026-05-21)

- **Store URL:** https://chromewebstore.google.com/detail/aiaokhplbmbiijmegjbnghmaacnkkfbj
- Wired as `CHROME_STORE_URL` in `page.tsx` — both "Add to Chrome"
  buttons (Hero + Final CTA) and the SoftwareApplication JSON-LD's
  `installUrl` resolve to the same constant. Change once, propagates
  everywhere. **Do not hardcode the URL in a second spot.**

## 9. Change log

| Version | Change |
|---|---|
| v1 | Initial build, 7 sections, all placeholder screenshots |
| v1.1 | New SignMyPDF logo PNG, `/chrome` → new URL redirect |
| v1.2 | Split-screen HERO, new H1 `Sign PDF Free / Chrome Extension` |
| v1.3 | Logo bumped to 80 px in landing header, removed "Free web tools" link, stronger hero-shot border + shadow |
| v1.4 | Header padding 18 px → total header ≈ 117 px |
| v1.5 | Replaced weak 3-icon "How it works" + 3-placeholder "See it in action" with a single zig-zag "See how it works" showcase: 3 real screenshots (`1-drop-pdf.png` / `2-add-signature.png` / `3-download.png`) in alternating text-left / shot-right layout. Mobile collapses to single column with screenshot above text. Section order tightened: Features moved above Comparison so the product is shown in action → features → competitor framing, instead of being compared before the user has seen what it does. |
| v1.6 | (1) Landing-header logo swapped from the full "Sign My PDF" mark (shared `<Logo />`) to a simplified "Sign / PDF" sub-brand (`logo-extension.png` rendered directly via `<Image>`). The main-site logo is unchanged on every other surface — only this landing reads as a tighter, product-specific promise above the H1. (2) New "How to install" section inserted between Comparison and FAQ — 3 numbered cards (Click → Confirm → Pin) with lucide icons in primary blue. Reuses the existing alt-grey background (`.spce-section-alt` = `#fafafa`) for visual consistency with the other secondary sections. Mobile collapses to a single column at < 880 px. |
| v1.7 | Refreshed 3 screenshots: HERO (`hero-screenshot.png` → 876×622, "Draw / Type / Upload" modal with cursor on a prominent "Save & place" CTA — visually anchors the install promise), showcase block 1 (`1-drop-pdf.png` → 1011×701, drop-zone page with a green "+" badge on the PDF icon to telegraph the "add a file" gesture), showcase block 3 (`3-download.png` → 882×516, editor with placed signature + cursor on the Download CTA). Block 2 (`2-add-signature.png`) intentionally untouched — it already shows the same modal as the HERO and would have duplicated content. |
| v1.8 | Replaced the grey-placeholder `og-image.png` with the real 1200×630 promo banner (Sign / PDF file mark on the left, "Sign PDF / Free Forever / No Signup" headline on the right, dashed arrow to a signed signature card). Wired in `layout.tsx` `og:image` + `twitter:image` since v1 — Facebook / LinkedIn / Twitter previews now render the branded card instead of the grey filler. |
| v1.9 | Chrome Web Store listing went live 2026-05-21. `CHROME_STORE_URL` in `page.tsx` swapped from `/detail/PLACEHOLDER` to `/detail/aiaokhplbmbiijmegjbnghmaacnkkfbj` (single constant — both "Add to Chrome" CTAs and the new SoftwareApplication JSON-LD `installUrl` resolve through it). Removed the "swap the placeholder" item from §8 Open backlog. |
| v2.0 | New mid-page CTA section inserted between How to install and FAQ — "Ready to sign your first PDF?" + Add-to-Chrome button + small "Got questions? See our support page" link to `/extension/support`. Background is plain white (`spce-section`, no `-alt`); H2 stays at the base 38 px (no `spce-final-h2` bump); padding stays at the standard 80 px (vs the Final CTA's 96 px) — softer register so it doesn't compete with section 8. FAQ flipped to `spce-section-alt` grey to preserve alternation (Install alt → mid-CTA white → FAQ alt → Final blue). |
| v2.1 | Three CTA-banner polish edits. **(1)** Retired the Final CTA section at the bottom of the page — was duplicating the Add-to-Chrome pitch from the new section 6 (Post-install CTA). FAQ is now the page's last content block before the cross-pollination paragraph. **(2)** Hover behavior on `ChromeExtensionBanner` flipped: card itself no longer lifts / shadows / changes border on hover, and its cursor is `default`. Only the inner `Add to Chrome` pill telegraphs interactivity (pointer cursor + darker bg + softer shadow lift). Clicks anywhere on the card still navigate to `/sign-pdf-chrome-extension` — safety net is unchanged. **(3)** New `variant="plain"` prop on `ChromeExtensionBanner` for the /sign usage — pure white card with neutral grey border + light shadow instead of the blue→violet gradient. Blog usage stays on the default `gradient` variant. |
| v2.2 | Unified `ChromeExtensionBanner` styling across every host page. Dropped the `variant` prop (and the `.blog-ext-cta--plain` modifier) — the card now always renders pure white card + neutral grey border + soft shadow on every surface (blog posts, /sign, anywhere else). The earlier gradient default was sinking into tinted page backgrounds; the unified style proved out on /sign and now ships everywhere. Single source of truth — no per-page conditional styling. |
