import Link from 'next/link';
import Image from 'next/image';
import ChromeIcon from './ChromeIcon';
import heroShot from '../../public/chrome-extension/hero-screenshot.png';

/**
 * Reusable CTA card that nudges users toward installing the
 * Sign PDF Chrome extension. Used:
 *  - At the end of Sign / Fill blog posts
 *    (apps/web/app/blog/[slug]/BlogPostContent.tsx)
 *  - Below the upload dropzone on /sign in full mode
 *    (apps/web/app/sign/page.tsx)
 *
 * The whole card is one `<Link>` to /sign-pdf-chrome-extension
 * (deliberately NOT to the Web Store — the landing acts as a filter
 * + warmer pitch before the final install click). The visible
 * "Add to Chrome" pill is a styled `<span>` to keep the link
 * nesting valid HTML.
 *
 * The card itself shows `cursor: default` and has no hover effects
 * — only the inner "Add to Chrome" pill telegraphs interactivity
 * (pointer cursor + darker bg). Clicks anywhere on the card still
 * navigate, but visually the card reads as an informational block
 * with one explicit call to action.
 *
 * Single visual style: pure white card, neutral grey border, soft
 * shadow. Renders the same on every host page regardless of the
 * surrounding page background (grey /sign chrome, white blog body,
 * whatever else). All paddings / colours / typography are baked
 * into the `.blog-ext-cta-*` namespace in globals.css.
 *
 * Server-rendered. No props — single source of truth for the
 * extension-install card across the whole site.
 */
export default function ChromeExtensionBanner() {
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
