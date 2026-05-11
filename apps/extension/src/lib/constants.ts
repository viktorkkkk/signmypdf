/**
 * Single source of truth for URLs, storage keys, and limits used
 * across popup / service worker / content script.
 */

/** Origin of the production web app the popup hands files off to. */
export const SITE_ORIGIN = 'https://signmypdf.io';

/** Full URL of the sign surface, with `?from=extension` query param. */
export const SIGN_URL = `${SITE_ORIGIN}/sign?from=extension`;

/** Marketing landing page for the extension itself. */
export const CHROME_LANDING_URL = `${SITE_ORIGIN}/chrome`;

/** `chrome.storage.local` key the popup writes to and the bridge reads. */
export const PENDING_PDF_KEY = 'pendingPdf';

/**
 * Max PDF size the extension accepts. `chrome.storage.local` allows
 * up to 10 MB per extension, base64 inflates by ~1.33x, so 7 MB
 * source ≈ 9.3 MB encoded — leaves headroom. Anything bigger,
 * we punt to the website directly.
 */
export const MAX_PDF_BYTES = 7 * 1024 * 1024;

/** Files older than this are ignored by the bridge — stale handoff. */
export const PENDING_TTL_MS = 60_000;

/** GA4 — same property as apps/web. Measurement ID is public. */
export const GA_MEASUREMENT_ID = 'G-SP5ZZJ3D17';
