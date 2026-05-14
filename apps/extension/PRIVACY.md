# Sign PDF Extension — Privacy Policy

This extension does not collect, store, or transmit any user data.

- PDFs are processed entirely in your browser using PDF.js and pdf-lib.
- No file content is sent to any server.
- No analytics, tracking, or telemetry of any kind.
- No user accounts or authentication.
- No advertising IDs, no third-party SDKs, no remote configuration.

## Local-only data

The extension uses a single short-lived data store inside your own
browser to move a PDF from the toolbar popup to the editor tab:

- **IndexedDB** (database name `sign-pdf-handoff`) — holds the PDF blob
  for the seconds between popup drop and editor mount. Each record is
  deleted on three triggers: the editor's `beforeunload`, the
  background service worker's `chrome.tabs.onRemoved`, and a 1-hour
  TTL sweep on every editor start. Nothing in this store leaves your
  device.
- **`chrome.storage.session`** — holds a tabId → handoff-id mapping
  used only for the cleanup above. Cleared when your browser closes.

The extension does not write to `localStorage`, `chrome.storage.local`,
or `chrome.storage.sync`. Nothing persists across browser restarts.

## Permissions

The extension requests only:

- `contextMenus` — to add a right-click "Sign with Sign PDF" entry on
  links to PDF files.
- `downloads` — to save the signed PDF to your computer.
- `storage` — to use `chrome.storage.session` as described above.

The extension does not request `<all_urls>`, host permissions to any
domain, `tabs`, `activeTab`, `cookies`, or any other broader permission.

## Contact

Questions, security reports, or take-down requests:
`support@signmypdf.io`
