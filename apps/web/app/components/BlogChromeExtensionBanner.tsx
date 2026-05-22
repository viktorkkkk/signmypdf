import Link from 'next/link';
import Image from 'next/image';
import ChromeIcon from './ChromeIcon';
import heroShot from '../../public/chrome-extension/hero-screenshot.png';

/**
 * End-of-article CTA banner that nudges Sign/Fill blog readers
 * toward the Chrome extension landing.
 *
 * Renders only on Sign and Fill articles (see `BlogPostContent.tsx`
 * for the gate — Protect / Merge / Compress / Split articles never
 * see it). The whole card is one `<Link>` to /sign-pdf-chrome-extension
 * (deliberately NOT to the Web Store — the landing page acts as a
 * filter + warmer pitch before the final install click). The visible
 * "Add to Chrome" pill is a styled `<span>` to keep the link nesting
 * valid HTML.
 *
 * Server-rendered. No `use client`. No mobile-only hiding (unlike the
 * /sign `<ExtensionBanner />` which is hidden on mobile because the
 * extension is desktop-only — for blog we still want the mobile
 * reader to remember the extension when they sit down at a laptop).
 */
export default function BlogChromeExtensionBanner() {
  return (
    <Link
      href="/sign-pdf-chrome-extension"
      className="blog-ext-cta"
      aria-label="Get the free Sign PDF Chrome extension"
    >
      <div className="blog-ext-cta-text">
        <h3 className="blog-ext-cta-title">Sign PDFs faster in Chrome</h3>
        <p className="blog-ext-cta-sub">
          Right-click any PDF in Gmail, Drive, or any website.
          Free Forever, no signup.
        </p>
        <span className="blog-ext-cta-btn">
          <ChromeIcon size={20} />
          Add to Chrome
        </span>
        <p className="blog-ext-cta-trust">
          Free Forever · No signup · Files stay private
        </p>
      </div>
      <div className="blog-ext-cta-shot">
        <Image
          src={heroShot}
          alt="Sign PDF Chrome extension editor preview"
          sizes="(max-width: 768px) 100vw, 400px"
          className="blog-ext-cta-img"
          placeholder="blur"
        />
      </div>
    </Link>
  );
}
