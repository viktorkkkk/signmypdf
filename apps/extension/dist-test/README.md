# SignMyPDF Chrome Extension — pre-built bundle

This folder is the **production build** of the SignMyPDF Chrome
extension, ready to load into Chrome via "Load unpacked". No build
step, no tooling — just point Chrome at this folder.

## Quick install (no terminal needed)

1. Download this folder (or the ZIP from the GitHub Release listed in
   the parent PR).
2. Extract it on your Desktop so the path looks like
   `~/Desktop/signmypdf-extension/manifest.json`.
3. Open Chrome → `chrome://extensions` in the address bar.
4. Top-right corner — toggle **Developer mode** ON.
5. Click **Load unpacked** and pick the extracted folder.
6. The Sign PDF Free icon (blue circle, white "S") appears in the
   toolbar.

## What to try

- **Click the toolbar icon** → popup with the drop zone. Drag a PDF in
  (or click to pick). A new tab opens at
  `https://signmypdf.io/sign?from=extension` with the PDF pre-loaded.
- **Right-click any PDF link in another tab** → context menu shows
  *Sign with SignMyPDF*. Clicking it does the same handoff.
- **File > 7 MB** — popup shows a friendly error with a link to
  signmypdf.io/sign.
- **Drop a non-PDF** — popup refuses it.

## What's inside

```
manifest.json                 ← Chrome MV3 manifest
service-worker-loader.js      ← background script loader
icons/                        ← placeholder icons (will be replaced before publish)
assets/                       ← bundled popup, content script, GA4 client
src/popup/popup.html          ← popup entry HTML
```

## Notes

- Placeholder icons (blue circle, white "S") — will be replaced with
  the real brand mark before the Chrome Web Store submission.
- Files are stored briefly in `chrome.storage.local` for the handoff
  and removed within 60 s.
- Full source: <https://github.com/viktorkkkk/signmypdf/tree/main/apps/extension>
- Privacy policy: <https://www.signmypdf.io/extension/privacy>
