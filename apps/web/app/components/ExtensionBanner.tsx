'use client';

import { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import ChromeIcon from './ChromeIcon';

/**
 * Two-mode install nudge for the Chrome extension.
 *
 *  - `variant="sticky"` — slim bar above the page content. Hides on
 *    Chrome Web Store install, hides when /sign was opened with
 *    `?from=extension` (the visitor already has the extension), and
 *    hides for 7 days after the user clicks the × dismiss button.
 *    Mobile users see nothing (the extension is desktop-only).
 *  - `variant="post-success"` — nestled under the post-download
 *    success toast. Same hide rules, no dismiss button (the toast
 *    itself auto-dismisses).
 *
 * Hide state persists in localStorage under `extension_banner_dismissed_until`
 * (ISO date string of the next time the sticky banner is allowed to
 * appear). The 7-day window is the user expressing "not interested for
 * now" without nuking the prompt forever.
 */

const DISMISS_KEY = 'extension_banner_dismissed_until';
const DISMISS_DAYS = 7;
const CHROME_LANDING = '/chrome';

function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}

function fromExtension(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('from') === 'extension';
}

function dismissedActive(): boolean {
  if (typeof window === 'undefined') return false;
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const until = Date.parse(raw);
  if (!Number.isFinite(until)) return false;
  return Date.now() < until;
}

function track(name: string, params?: Record<string, string | number | boolean>) {
  try {
    (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag?.(
      'event',
      name,
      params || {},
    );
  } catch {
    // best-effort
  }
}

interface Props {
  /** Which slot the banner is rendered in. */
  variant?: 'sticky' | 'post-success';
}

export default function ExtensionBanner({ variant = 'sticky' }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // All exclusions live in a single useEffect so SSR markup is
    // empty and we don't ship a flash-of-banner on first paint.
    if (fromExtension()) return;
    if (isMobile()) return;
    if (variant === 'sticky' && dismissedActive()) return;
    setVisible(true);
  }, [variant]);

  const handleInstallClick = useCallback(() => {
    track('extension_banner_clicked', { variant });
  }, [variant]);

  const handleDismiss = useCallback(() => {
    if (typeof window === 'undefined') return;
    const until = new Date(Date.now() + DISMISS_DAYS * 24 * 3600 * 1000).toISOString();
    try {
      localStorage.setItem(DISMISS_KEY, until);
    } catch {
      // ignore quota failures
    }
    track('extension_banner_dismissed', { variant });
    setVisible(false);
  }, [variant]);

  if (!visible) return null;

  if (variant === 'sticky') {
    return (
      <div className="ext-banner ext-banner-sticky" role="region" aria-label="Install Chrome extension">
        <span className="ext-banner-icon" aria-hidden="true"><ChromeIcon size={16} /></span>
        <span className="ext-banner-text">
          Sign PDFs faster with our Chrome extension
        </span>
        <a
          href={CHROME_LANDING}
          onClick={handleInstallClick}
          className="ext-banner-cta"
        >
          <ChromeIcon size={14} /> Install
        </a>
        <button
          type="button"
          className="ext-banner-dismiss"
          aria-label="Dismiss extension banner for 7 days"
          onClick={handleDismiss}
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  // post-success variant — no dismiss, parent toast handles fade-out.
  return (
    <div className="ext-banner ext-banner-success" role="status">
      <span className="ext-banner-icon" aria-hidden="true"><ChromeIcon size={16} /></span>
      <span className="ext-banner-text">
        Want to sign PDFs in one click?{' '}
        <a href={CHROME_LANDING} onClick={handleInstallClick} className="ext-banner-cta-inline">
          <ChromeIcon size={13} /> Install Chrome extension
        </a>
      </span>
    </div>
  );
}
