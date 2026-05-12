# Chrome Web Store listing, Sign PDF Free

Copy-ready text for <https://chrome.google.com/webstore/devconsole>.

## Title (45 chars max)

`Sign PDF Free`

## Short description (132 chars max)

`Sign PDFs in your browser. Click the icon or right-click any PDF link. Free, no signup, no watermark.`

## Detailed description (16,000 chars max)

```
✍️ SIGN PDFS IN YOUR BROWSER, FREE, NO SIGNUP

Stop printing, scanning, and emailing PDFs back. Sign any PDF document
directly in Chrome — fast, free, and without creating an account.

🚀 HOW IT WORKS

1. Click the extension icon → the signing tool opens instantly in a
   new tab
2. Or right-click any PDF link → "Sign with SignMyPDF" → same tool,
   file pre-loaded
3. Drop your PDF in the page (or it's already there), add your
   signature, place it anywhere
4. Download the signed PDF

That's it. No registration. No watermark on the free plan. No
software to install beyond this extension.

✨ FEATURES

✓ Sign PDFs in your browser — no software needed
✓ No signup required to start
✓ No watermark on free plan
✓ Works with Gmail, Google Drive, Dropbox, any website
✓ Files never leave your browser (free plan)
✓ Save signatures for one-click reuse (Pro)
✓ Sync across devices (Pro)

📋 USE CASES

- Sign contracts and agreements
- E-sign NDAs (non-disclosure agreements)
- Fill and sign W-9, 1040, and other tax forms
- Sign real estate documents
- Sign HR forms (onboarding, leaves, approvals)
- Sign medical release forms
- Sign permission slips for schools

💰 PRICING

Free: 2 PDFs per day across all tools — no signup, no watermark
Pro: $9/month — unlimited PDFs, save your signatures, cross-device sync
Annual: $7.50/month (save 17%) — billed $90 per year

Cancel anytime. Secure payment via Paddle.

🔒 PRIVACY FIRST

Your files are private. On the free plan, PDF processing happens
entirely in your browser — files never touch our servers. On Pro,
files are encrypted in transit and at rest.

We don't read PDFs from websites you visit. We don't track your
browsing. We don't sell data.

🌐 ABOUT SIGNMYPDF

SignMyPDF is a complete PDF toolkit — sign, fill forms, protect,
merge, split, and compress PDFs — all in your browser.

Visit signmypdf.io for the full toolset.

📧 SUPPORT

Questions? Email support@signmypdf.io
Bug reports welcome. We respond within 24 hours.
```

## Category

`Productivity`

## Language

`English`

## Assets needed before submission

Web-side surfaces are ready; what's left is creative assets and the
Trader-verification approval.

### Still to produce

- **5 screenshots, 1280×800** for the listing:
  1. Toolbar icon clicked → minimal-mode `/sign?from=extension`
     with empty dropzone
  2. Right-click menu *Sign with SignMyPDF* on a Gmail attachment
     PDF link
  3. PDF loaded in the editor with the signature canvas open
  4. Signature placed on a page
  5. Downloaded signed PDF in OS Finder/Explorer
- **Promo tile 440×280** — extension logo + "Sign PDFs in Chrome, Free"
- **Final brand-mark icons** replacing the placeholder set in
  `public/icons/icon-{16,32,48,128}.png` (16/32/48/128 px PNG, square).
- **Real screenshots inside `apps/web/app/chrome/ChromeLandingClient.tsx`**
  — the *How the extension works* section currently has four
  400×300 placeholder tiles. Dimensions are fixed by the
  `.chrome-step-screenshot` CSS class so the swap is drop-in.
- **Trader verification** on `viktor.kolektionok@gmail.com` — Google
  reviews this independently, typical wait is a few days to a few weeks.

### Already live ✓

- Privacy policy: <https://signmypdf.io/extension/privacy>
- Landing page: <https://signmypdf.io/chrome>
- Pre-built test ZIP for non-technical reviewers:
  <https://github.com/viktorkkkk/signmypdf/releases/download/ext-test-1/signmypdf-extension.zip>
- Production ZIP build pipeline:
  `pnpm --filter @signmypdf/extension package` → 75 KB ZIP at
  `apps/extension/signmypdf-extension.zip`.

## Submission flow

1. Produce the creative assets above.
2. Run `pnpm --filter @signmypdf/extension package` from repo root.
3. Verify the resulting ZIP loads cleanly in a fresh Chrome profile
   via `chrome://extensions → Load unpacked` (extract the ZIP first).
4. Upload at <https://chrome.google.com/webstore/devconsole> using the
   `viktor.kolektionok@gmail.com` developer account.
5. Paste the title / short / detailed description from this file.
6. Upload screenshots + promo tile + icons.
7. Point the listing's privacy policy field at
   <https://signmypdf.io/extension/privacy>.
8. Submit. Moderation window is typically 2–5 days.
