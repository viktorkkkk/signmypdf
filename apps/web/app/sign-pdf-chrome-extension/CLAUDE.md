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
2. **See how it works** — 3 step screenshots with captions
   (Drop / Sign / Download).
3. **Why this extension is different** — comparison table, red column
   (other tools) vs blue column (us).
4. **Everything you need** — 6 features in a 3×2 grid (Draw / Type /
   Upload / Right-click / Text+Date / Local files).
5. **FAQ** — 5 questions in a controlled accordion (one open at a time).
6. **Final CTA** — repeats the Add-to-Chrome button on a light-blue
   background.
7. **Cross-pollination** — subtle paragraph linking to `/sign`,
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

- **Header:** SignMyPDF logo left only, right side empty. No nav, no
  buttons.
- **Logo height:** 80 px in the landing header (the shared `<Logo />`
  component keeps its default 40 px everywhere else on the site).
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
    ├── logo.png                            # new SignMyPDF logo (1465×1441)
    └── chrome-extension/
        ├── hero-screenshot.png             # 966×800
        ├── editor-with-signature.png       # 1200×750 (PLACEHOLDER)
        ├── context-menu.png                # 1200×750 (PLACEHOLDER)
        ├── signature-modal.png             # 1200×750 (PLACEHOLDER)
        └── og-image.png                    # 1200×630 (PLACEHOLDER)
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

- Replace the three placeholder screenshots in
  `public/chrome-extension/` (editor-with-signature, context-menu,
  signature-modal) with real captures.
- Publish the extension to the Chrome Web Store.
- Once approved, swap the placeholder
  `CHROME_STORE_URL = 'https://chromewebstore.google.com/detail/PLACEHOLDER'`
  in `page.tsx` for the real listing URL (one line, one spot).
- Generate proper OG image — currently a grey placeholder.
- Chrome Web Store assets (1280×800 listing screenshots × 5, promo
  tile 440×280, marquee 1400×560) — tracked under
  `apps/extension/CLAUDE.md → Open backlog`.

## 9. Change log

| Version | Change |
|---|---|
| v1 | Initial build, 7 sections, all placeholder screenshots |
| v1.1 | New SignMyPDF logo PNG, `/chrome` → new URL redirect |
| v1.2 | Split-screen HERO, new H1 `Sign PDF Free / Chrome Extension` |
| v1.3 | Logo bumped to 80 px in landing header, removed "Free web tools" link, stronger hero-shot border + shadow |
| v1.4 | Header padding 18 px → total header ≈ 117 px |
| _next_ | Merge "How it works" + "See it in action" into a single 3-screenshot block |
