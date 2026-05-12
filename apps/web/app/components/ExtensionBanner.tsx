'use client';

import { useCallback, useEffect, useState } from 'react';
import ChromeIcon from './ChromeIcon';

/**
 * Two-mode install nudge for the Chrome extension.
 *
 *  - `variant="card"` — main install pitch on /sign full mode,
 *    rendered below the upload dropzone and above the More Tools
 *    grid. Full-bleed card, ~200 px tall, no dismiss.
 *  - `variant="post-success"` — small inline nudge under the
 *    download CTA on the done step.
 *
 * Hidden on mobile (the extension is desktop-only) and for
 * `?from=extension` visitors (they already installed it).
 */

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
  /**
   * Which slot the banner is rendered in.
   *   `card` — main install nudge below the upload dropzone on
   *     /sign (full mode). Big 200 px card, no dismiss.
   *   `post-success` — small inline nudge after the download CTA
   *     on the done step.
   * (The pre-PR-4 `sticky` variant was removed: too noisy at the
   * top of the page, and dismissals leaked across all surfaces.)
   */
  variant?: 'card' | 'post-success';
}

export default function ExtensionBanner({ variant = 'card' }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Single useEffect so SSR ships empty markup and we don't flash
    // the banner on first paint. ?from=extension visitors and mobile
    // visitors never see it; the `card` variant ignores the legacy
    // dismiss cookie (it's a section, not a popover).
    if (fromExtension()) return;
    if (isMobile()) return;
    setVisible(true);
  }, [variant]);

  const handleInstallClick = useCallback(() => {
    track('extension_banner_clicked', { variant });
  }, [variant]);

  if (!visible) return null;

  if (variant === 'card') {
    return (
      <div className="container">
        <section className="ext-card" role="region" aria-label="Install Chrome extension">
          <span className="ext-card-icon" aria-hidden="true"><ChromeIcon size={40} /></span>
          <div className="ext-card-text">
            <h3 className="ext-card-title">Sign PDFs faster with Chrome extension</h3>
            <p className="ext-card-sub">
              Sign any PDF in one click. Right-click any PDF link and sign instantly.
            </p>
          </div>
          <a
            href={CHROME_LANDING}
            onClick={handleInstallClick}
            className="ext-card-btn"
          >
            <ChromeIcon size={20} /> Install Free Chrome Extension
          </a>
        </section>
      </div>
    );
  }

  // post-success variant — small inline nudge after the download CTA.
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
