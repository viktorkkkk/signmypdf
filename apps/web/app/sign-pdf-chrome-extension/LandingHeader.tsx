import Link from 'next/link';
import Logo from '../components/Logo';

/**
 * Minimal header used only on /sign-pdf-chrome-extension. Logo only,
 * no nav — the single intended action on this page is the hero CTA
 * below, and cross-pollination to the other tools lives in the
 * dedicated section near the footer. Stripping the right-side exit
 * keeps the visual register as quiet as possible above the H1.
 */
export default function LandingHeader() {
  return (
    <header className="spce-header">
      <div className="spce-header-inner">
        <Link href="/" className="spce-header-brand" aria-label="SignMyPDF home">
          {/* Big logo on the landing — height 80 puts the brand
             mark at the same visual weight as the hero H1 line.
             Other surfaces (NavHeader, SiteFooter) keep their
             default 40 px and are unaffected. */}
          <Logo height={80} />
        </Link>
      </div>
    </header>
  );
}
