import { GA_MEASUREMENT_ID } from './constants';

/**
 * GA4 events from Chrome contexts.
 *
 * `gtag.js` can't run inside a Manifest V3 service worker (no DOM,
 * blocked by CSP), so we POST directly to the GA4 Measurement
 * Protocol. The API secret is intentionally NOT shipped in the
 * extension — without it, the events are accepted by Google with
 * reduced trust, which is fine for our use case (no purchases,
 * no PII). PR 3 will wire a server-side proxy if we want higher
 * confidence ingestion.
 *
 * `client_id` is a per-install UUID stored in `chrome.storage.local`
 * so events from the same browser are stitched into one user.
 */

const CLIENT_ID_KEY = 'ga_client_id';
const ENDPOINT = `https://www.google-analytics.com/g/collect?v=2&tid=${GA_MEASUREMENT_ID}`;

async function getClientId(): Promise<string> {
  const stored = await chrome.storage.local.get(CLIENT_ID_KEY);
  if (typeof stored[CLIENT_ID_KEY] === 'string') return stored[CLIENT_ID_KEY];
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}.${Math.random().toString(36).slice(2)}`;
  await chrome.storage.local.set({ [CLIENT_ID_KEY]: id });
  return id;
}

export type ExtensionEventName =
  | 'extension_installed'
  | 'extension_popup_opened'
  | 'extension_pdf_dropped'
  | 'extension_pdf_too_large'
  | 'extension_context_menu_used'
  | 'extension_pdf_transferred_to_site';

/**
 * Best-effort GA4 event. Swallows errors — we never want analytics
 * to crash the extension. Returns nothing.
 */
export async function track(
  event: ExtensionEventName,
  params: Record<string, string | number | boolean> = {},
): Promise<void> {
  try {
    const clientId = await getClientId();
    const body = new URLSearchParams({
      cid: clientId,
      en: event,
      // GA4 expects ep.<name> for custom params on the collect endpoint.
      ...Object.fromEntries(
        Object.entries(params).map(([k, v]) => [`ep.${k}`, String(v)]),
      ),
    }).toString();
    await fetch(ENDPOINT, {
      method: 'POST',
      body,
      keepalive: true,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  } catch {
    // intentionally silent
  }
}
