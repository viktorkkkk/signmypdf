import Link from 'next/link';
import Image from 'next/image';
import logoExt from '../../public/chrome-extension/logo-extension.png';

/**
 * Minimal header used only on /sign-pdf-chrome-extension. Logo only,
 * no nav — the single intended action on this page is the hero CTA
 * below, and cross-pollination to the other tools lives in the
 * dedicated section near the footer. Stripping the right-side exit
 * keeps the visual register as quiet as possible above the H1.
 *
 * Logo is the simplified "Sign / PDF" sub-brand (same asset that
 * lives in the extension's editor top-bar) — NOT the full SignMyPDF
 * mark from `<Logo />` on the rest of the site. The landing pitches
 * the extension specifically, so the sub-brand reads as a tighter
 * promise of what the user is about to install.
 */
const ASPECT_RATIO = 1465 / 1441;

export default function LandingHeader() {
  const height = 80;
  const width = Math.round(height * ASPECT_RATIO);
  return (
    <header className="spce-header">
      <div className="spce-header-inner">
        <Link href="/" className="spce-header-brand" aria-label="Sign PDF home">
          <Image
            src={logoExt}
            alt="Sign PDF"
            width={width}
            height={height}
            priority
            style={{ display: 'block' }}
          />
        </Link>
        {/* Quiet right-side trust line — mirrors the editor top-bar in
           the extension. Plain text, no hover, hidden on narrow
           viewports where the 80 px logo already fills the row. */}
        <span className="spce-header-tagline">Free · No signup · Files stay private</span>
      </div>
    </header>
  );
}
