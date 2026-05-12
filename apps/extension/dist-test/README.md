# SignMyPDF Chrome Extension — pre-built bundle

This folder is the **production build** of the SignMyPDF Chrome
extension, ready to load into Chrome via "Load unpacked". No build
step, no tooling — just point Chrome at this folder.

## Quick install (no terminal needed)

1. Download `signmypdf-extension.zip` from the GitHub Release
   (`ext-test-1`), or download this folder.
2. Extract it on your Desktop so the path looks like
   `~/Desktop/signmypdf-extension/manifest.json`.
3. Open Chrome → `chrome://extensions` in the address bar.
4. Top-right corner — toggle **Developer mode** ON.
5. Click **Load unpacked** and pick the extracted folder.
6. The Sign PDF Free icon (blue circle, white "S") appears in the
   toolbar.

## What to try (Stage 5 PR 4 — no popup)

The toolbar action no longer opens a popup. Instead:

- **Click the toolbar icon** → a new tab opens at
  `https://signmypdf.io/sign?from=extension`. The page is in
  minimal mode (slim top bar with the logo + "No signup" chip, no
  marketing chrome, big dropzone).
- **Right-click any PDF link in another tab** → context menu
  *Sign with SignMyPDF*. The extension fetches the file, stashes
  it in `chrome.storage.local`, opens the same `/sign` URL, and
  the page picks the file up via a postMessage bridge.

## Edge cases

- File > 7 MB: context menu still opens the page; the dropzone is
  the safety net.
- Link is auth-gated / 404: extension logs the failure to GA
  (`extension_context_menu_failed`) and falls through to the empty
  dropzone.

## What's inside

```
manifest.json                 ← Chrome MV3 manifest (no default_popup)
service-worker-loader.js      ← background script loader
icons/                        ← placeholder icons (replace before publish)
assets/                       ← bundled service worker, content script bridge,
                                analytics, constants
```

## Notes

- Placeholder icons (blue circle, white "S") — replace with the
  real brand mark before the Chrome Web Store submission.
- The file lives briefly in `chrome.storage.local` for the handoff
  and is removed within 60 s by the content-script bridge.
- Full source: <https://github.com/viktorkkkk/signmypdf/tree/main/apps/extension>
- Privacy policy: <https://www.signmypdf.io/extension/privacy>
- Landing page: <https://www.signmypdf.io/chrome>
