import Link from 'next/link';
import Image from 'next/image';
import {
  CheckCircle2,
  Download,
  FileText,
  Keyboard,
  Lock,
  MousePointerClick,
  PenLine,
  Type as TypeIcon,
  Upload,
  XCircle,
} from 'lucide-react';
import SiteFooter from '../components/SiteFooter';
import ChromeIcon from '../components/ChromeIcon';
import LandingHeader from './LandingHeader';
import Faq from './Faq';
import heroShot from '../../public/chrome-extension/hero-screenshot.png';

/** Chrome Web Store URL — placeholder until the listing is approved.
 *  Swap with the real product detail URL once the store ID is known. */
const CHROME_STORE_URL =
  'https://chromewebstore.google.com/detail/PLACEHOLDER';

const HOW_IT_WORKS = [
  {
    Icon: Download,
    title: '1. Install in one click',
    body:
      "Free from the Chrome Web Store. No signup, no permissions beyond what's needed.",
  },
  {
    Icon: FileText,
    title: '2. Open any PDF',
    body:
      'In your browser, in Gmail, in Google Drive, or any website with a PDF link.',
  },
  {
    Icon: CheckCircle2,
    title: '3. Sign and download',
    body:
      'Draw, type, or upload your signature. Download the signed PDF instantly.',
  },
];

const FEATURES = [
  {
    Icon: PenLine,
    title: 'Draw your signature',
    body: 'Use your mouse or touchscreen to draw a natural signature.',
  },
  {
    Icon: Keyboard,
    title: 'Type in handwritten style',
    body: 'Choose handwritten style and type your name like a real signature.',
  },
  {
    Icon: Upload,
    title: 'Upload existing signature',
    body: 'Already have a signature image? Drop it in and use it on any PDF.',
  },
  {
    Icon: MousePointerClick,
    title: 'Right-click any PDF link',
    body: 'Sign PDFs from Gmail, Drive, or any website with a single right-click.',
  },
  {
    Icon: TypeIcon,
    title: 'Add text and dates',
    body: 'Fill in name fields, dates, and notes anywhere on the document.',
  },
  {
    Icon: Lock,
    title: 'Your files, your computer',
    body: 'No upload, no cloud storage, no third-party servers. Period.',
  },
];

const SCREENSHOTS = [
  {
    src: '/chrome-extension/editor-with-signature.png',
    alt: 'Sign PDF editor with a placed signature on a contract',
    caption: 'Drop any PDF and sign in seconds',
  },
  {
    src: '/chrome-extension/context-menu.png',
    alt: 'Right-click context menu on a PDF link in Gmail',
    caption: 'Right-click any PDF link to sign instantly',
  },
  {
    src: '/chrome-extension/signature-modal.png',
    alt: 'Signature creation modal with Draw, Type and Upload tabs',
    caption: 'Draw, type, or upload your signature',
  },
];

const FAQS = [
  {
    q: 'Is it really free?',
    a:
      'Yes — sign unlimited PDFs, no signup, no credit card, no paywall. The core signing functionality is free forever. We may add optional Pro features in the future, but never gate the basics.',
  },
  {
    q: 'Is it safe to use?',
    a:
      "Yes. Your PDFs are processed entirely in your browser using JavaScript — they never leave your device. The extension doesn't have access to your other tabs or any external servers. We can't see what you sign because we don't see anything at all.",
  },
  {
    q: 'Are signed PDFs legally valid?',
    a:
      'Yes. Electronic signatures are legally binding in the US (ESIGN Act), EU (eIDAS), UK, and 100+ countries for most everyday business documents like contracts, NDAs, and agreements.',
  },
  {
    q: 'Does it work on Mac, Windows, and Chromebook?',
    a:
      'Yes. The extension works in any Chromium-based browser on any operating system — Chrome, Edge, Brave, Opera, Arc, on Mac, Windows, Linux, and ChromeOS.',
  },
  {
    q: 'Will signed PDFs open in Adobe Reader?',
    a:
      'Yes. We use standard PDF specifications, so signed files open correctly in Adobe Reader, Mac Preview, and any other PDF viewer.',
  },
];

const PAGE_URL = 'https://www.signmypdf.io/sign-pdf-chrome-extension';
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${PAGE_URL}#webpage`,
      url: PAGE_URL,
      name: 'Sign PDF in Chrome — Free Chrome Extension',
      description:
        'Sign PDF files directly in Chrome. Free, no signup, files stay on your device.',
      inLanguage: 'en',
    },
    {
      '@type': 'SoftwareApplication',
      name: 'Sign PDF — Signature & eSign Tool',
      applicationCategory: 'BrowserApplication',
      operatingSystem: 'Chrome, Edge, Brave, Opera, Arc',
      url: PAGE_URL,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQS.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
  ],
};

/** Reusable Add-to-Chrome button — primary CTA used twice (Hero + Final).
 *  Colour-icon left, white text right, soft blue glow shadow. Lives at
 *  the "Install Chrome Extension" visual register Grammarly / Honey /
 *  LastPass use. The inline Chrome brand mark is the same component
 *  the rest of the site uses (apps/web/app/components/ChromeIcon.tsx) —
 *  single source of truth so the four-colour glyph can't drift here. */
function AddToChromeButton({ size = 'lg' }: { size?: 'lg' | 'md' }) {
  return (
    <a
      href={CHROME_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`spce-cta spce-cta-${size}`}
    >
      {/* Wrap the SVG in a flex span with line-height: 0 so the icon
         sits on its own geometric center (not the text's baseline).
         The shared <ChromeIcon> defaults to inline-block + vertical-
         align: middle, which on flex parents can still leave a 1-2 px
         baseline-induced drift at large font sizes. */}
      <span className="spce-cta-icon">
        <ChromeIcon size={size === 'lg' ? 30 : 18} />
      </span>
      <span>Add to Chrome</span>
    </a>
  );
}

/** Image with a same-aspect-ratio placeholder underneath. */
function ScreenshotFrame({
  src,
  alt,
  width,
  height,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
}) {
  return (
    <div className="spce-shot" style={{ aspectRatio: `${width} / ${height}` }}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="spce-shot-img"
        sizes="(max-width: 768px) 100vw, 1200px"
      />
    </div>
  );
}

export default function SignPdfChromeExtensionPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingHeader />

      <main className="spce-page">
        {/* ── 1. HERO — split-screen ──────────────────────────────── */}
        <section className="spce-hero">
          <div className="spce-container spce-hero-grid">
            <div className="spce-hero-text">
              <h1 className="spce-h1">
                Sign PDF Free
                <br />
                Chrome Extension
              </h1>
              <p className="spce-hero-sub">
                Sign and fill any PDF in your browser for free. No signup,
                no upload — your files stay private.
              </p>
              <div className="spce-hero-cta">
                <AddToChromeButton size="lg" />
              </div>
              <p className="spce-trust">Free · No signup · No watermark</p>
            </div>
            <div className="spce-hero-shot">
              <Image
                src={heroShot}
                alt="Sign PDF Chrome extension editor with the Edit signature modal open"
                priority
                sizes="(max-width: 880px) 100vw, 600px"
                className="spce-hero-shot-img"
                placeholder="blur"
              />
            </div>
          </div>
          {/* Browser compatibility text removed — same point is covered
             in the FAQ ("Does it work on Mac, Windows, and Chromebook?")
             without crowding the hero. */}
        </section>

        {/* ── 2. HOW IT WORKS ─────────────────────────────────────── */}
        <section className="spce-section spce-section-alt">
          <div className="spce-container">
            <h2 className="spce-h2">How it works</h2>
            <p className="spce-section-sub">Three steps. No learning curve.</p>
            <div className="spce-steps">
              {HOW_IT_WORKS.map(({ Icon, title, body }) => (
                <div key={title} className="spce-step">
                  <Icon size={48} strokeWidth={1.6} className="spce-step-icon" />
                  <h3 className="spce-step-title">{title}</h3>
                  <p className="spce-step-body">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3. COMPARISON ───────────────────────────────────────── */}
        <section className="spce-section">
          <div className="spce-container">
            <h2 className="spce-h2">Why this extension is different</h2>
            <p className="spce-section-sub">
              Most PDF tools want your data. We don&apos;t.
            </p>
            <div className="spce-compare">
              <div className="spce-compare-col spce-compare-bad">
                <h3 className="spce-compare-head">Other PDF signers</h3>
                <ul>
                  {[
                    'Upload files to their servers',
                    'Require account signup',
                    'Watermark on the free version',
                    'Daily limits or paywalls',
                    'Heavy desktop installation',
                  ].map((line) => (
                    <li key={line}>
                      <XCircle size={18} strokeWidth={2.2} aria-hidden="true" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="spce-compare-col spce-compare-good">
                <h3 className="spce-compare-head">Sign PDF Extension</h3>
                <ul>
                  {[
                    '100% in your browser',
                    'No signup, no email',
                    'No watermark, ever',
                    'Unlimited, free forever',
                    'One-click Chrome install',
                  ].map((line) => (
                    <li key={line}>
                      <CheckCircle2 size={18} strokeWidth={2.2} aria-hidden="true" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. FEATURES ─────────────────────────────────────────── */}
        <section className="spce-section spce-section-alt">
          <div className="spce-container">
            <h2 className="spce-h2">Everything you need to sign a PDF</h2>
            <div className="spce-features">
              {FEATURES.map(({ Icon, title, body }) => (
                <div key={title} className="spce-feature">
                  <Icon size={32} strokeWidth={1.8} className="spce-feature-icon" />
                  <h3 className="spce-feature-title">{title}</h3>
                  <p className="spce-feature-body">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 5. SCREENSHOT GALLERY ───────────────────────────────── */}
        <section className="spce-section">
          <div className="spce-container">
            <h2 className="spce-h2">See it in action</h2>
            <p className="spce-section-sub">
              Real screenshots from the extension.
            </p>
            <div className="spce-gallery">
              {SCREENSHOTS.map(({ src, alt, caption }) => (
                <figure key={src} className="spce-gallery-item">
                  <ScreenshotFrame src={src} alt={alt} width={1200} height={750} />
                  <figcaption className="spce-gallery-caption">
                    {caption}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* ── 6. FAQ ──────────────────────────────────────────────── */}
        <section className="spce-section spce-section-alt">
          <div className="spce-container spce-container-narrow">
            <h2 className="spce-h2">Frequently asked questions</h2>
            <Faq items={FAQS} />
          </div>
        </section>

        {/* ── 7. FINAL CTA ────────────────────────────────────────── */}
        <section className="spce-section spce-final">
          <div className="spce-container">
            <h2 className="spce-h2 spce-final-h2">
              Sign your first PDF in 30 seconds
            </h2>
            <p className="spce-section-sub">
              Free forever · No signup needed
            </p>
            <div className="spce-final-cta">
              <AddToChromeButton size="lg" />
            </div>
          </div>
        </section>

        {/* ── 8. CROSS-POLLINATION ────────────────────────────────── */}
        <section className="spce-cross">
          <div className="spce-container">
            <p>
              Part of the SignMyPDF family. We also offer free web tools for{' '}
              <Link href="/sign">Sign</Link>,{' '}
              <Link href="/fill">Fill</Link>,{' '}
              <Link href="/protect">Protect</Link>,{' '}
              <Link href="/merge">Merge</Link>,{' '}
              <Link href="/compress">Compress</Link>, and{' '}
              <Link href="/split">Split</Link>{' '}
              PDFs — no installation required.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
