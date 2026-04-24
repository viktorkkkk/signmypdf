'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import NavHeader from './components/NavHeader';
import SiteFooter from './components/SiteFooter';
import PaywallModal from './components/PaywallModal';
import { storePendingFile } from './utils/pendingUpload';
import { isProActive } from './utils/subscription';
import { PADDLE_CLIENT_TOKEN } from './constants';

/**
 * Hub homepage.
 *
 * Architecture:
 * - / is a marketing hub covering all three tools (Sign / Fill / Protect).
 * - The main dropzone routes to /sign by default (sign is the most common
 *   entry point). Tool cards below route to the other tools.
 * - File hand-off uses the pendingUpload IndexedDB utility so a blob
 *   survives navigation without URL-encoding or sessionStorage size limits.
 * - PaywallModal is wired here too so the premium banner CTA works without
 *   bouncing the user to a tool page first.
 */

type Tool = 'sign' | 'fill' | 'protect';

declare global {
  interface Window {
    Paddle?: {
      Initialize: (opts: { token: string; eventCallback?: (e: { name: string }) => void }) => void;
      Checkout: { open: (opts: { items: { priceId: string; quantity: number }[] }) => void };
    };
  }
}

const TOOL_ROUTE: Record<Tool, string> = {
  sign: '/sign',
  fill: '/fill',
  protect: '/protect',
};

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: 'Is SignMyPDF really free?',
    a: 'Yes. You can sign, fill, and protect up to 2 PDFs per day for free, with no registration and no credit card. A Premium plan is available for unlimited use, but nothing is paywalled before you finish your document.',
  },
  {
    q: 'Do I need to create an account?',
    a: 'No. The free plan works without any signup — just open the site and drop your PDF. An account is only needed if you upgrade to Premium and want to restore access on a new device.',
  },
  {
    q: 'Are my files stored on your servers?',
    a: 'No. Every tool runs 100% in your browser via WebAssembly and JavaScript. Your PDF never leaves your device. We literally cannot see what you upload.',
  },
  {
    q: 'How do I sign a PDF online?',
    a: 'Drop your PDF on the homepage, draw or type your signature, pick the pages, drag the signature into place, and download. The whole flow takes under a minute.',
  },
  {
    q: 'Can I use it on mobile and desktop?',
    a: 'Both. The site is responsive and the tools work in any modern browser on iOS, Android, Windows, macOS, or Linux — no app install.',
  },
  {
    q: 'How many PDFs can I process for free?',
    a: 'Two PDFs per tool per day. Beyond that, free files are signed with a small "SignMyPDF.io" watermark at the bottom of each page. Premium removes the watermark and the limit.',
  },
  {
    q: 'Is it safe to upload sensitive documents?',
    a: 'Yes — because nothing is actually uploaded. All processing happens locally in your browser. Your contracts, tax documents, and legal files never touch a server.',
  },
  {
    q: 'Does it work without installing anything?',
    a: 'Correct. No software, no plugin, no browser extension. Open the site, do your work, close the tab.',
  },
];

function track(event: string, params: Record<string, string | number | boolean> = {}) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).gtag?.('event', event, params);
  } catch { /* no-op */ }
}

export default function HomePage() {
  const router = useRouter();
  const [showPricing, setShowPricing] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    setHasSubscription(isProActive());

    // Paddle init — mirrors the per-tool setup so the premium CTA works
    // without bouncing to a tool page. Shares the same success callback
    // (activate + optional auto-login token).
    if (!window.Paddle && PADDLE_CLIENT_TOKEN) {
      const script = document.createElement('script');
      script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
      script.async = true;
      script.onload = () => {
        window.Paddle?.Initialize({
          token: PADDLE_CLIENT_TOKEN,
          eventCallback: (e: { name: string }) => {
            if (e.name === 'checkout.completed') {
              localStorage.setItem('signmypdf_subscribed', 'true');
              setHasSubscription(true);
              setShowPricing(false);
              // Let the dashboard handle auto-login; just redirect.
              setTimeout(() => { window.location.href = '/dashboard'; }, 400);
            }
          },
        });
      };
      document.head.appendChild(script);
    }
  }, []);

  // Dropzone: store file in IndexedDB, then route to /sign which picks it up.
  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    track('hub_upload', { size: file.size, type: file.type || 'unknown' });
    await storePendingFile(file);
    router.push('/sign');
  }, [router]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    multiple: false,
  });

  const goToTool = (tool: Tool) => {
    track('hub_tool_card_click', { tool });
    router.push(TOOL_ROUTE[tool]);
  };

  // JSON-LD: SoftwareApplication covering all tools + FAQPage for the
  // block below. Two separate scripts so each has its own @type/root.
  const softwareJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'SignMyPDF',
    url: 'https://signmypdf.io',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: [
      { '@type': 'Offer', price: '0', priceCurrency: 'USD', name: 'Free' },
      { '@type': 'Offer', price: '9', priceCurrency: 'USD', name: 'Monthly' },
      { '@type': 'Offer', price: '90', priceCurrency: 'USD', name: 'Annual' },
    ],
    description: 'Free online tools to sign, fill, and password-protect PDFs. No registration, no installs, 100% client-side.',
    featureList: [
      'Sign PDF online',
      'Fill PDF forms',
      'Password protect PDF',
      'Works in any browser',
      'No registration required',
      'Mobile and desktop support',
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '1240',
    },
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <NavHeader />

      {/* ─── HERO: title + tool cards ─── */}
      <section className="hub-hero">
        <div className="container hub-hero-inner">
          <h1 className="hub-h1">Sign, Fill &amp; Protect PDFs Online — Free, No Registration</h1>
          <p className="hub-sub">
            Pick a tool and finish your PDF in seconds. Works in any browser — no installs, no sign-ups.
          </p>

          <div className="hub-tool-grid">
            <button
              type="button"
              className="hub-tool-card hub-tool-card--primary"
              onClick={() => goToTool('sign')}
            >
              <div className="hub-tool-icon" aria-hidden="true">✍️</div>
              <div className="hub-tool-name">Sign PDF</div>
              <p className="hub-tool-desc">Add your signature and download instantly.</p>
              <span className="hub-tool-arrow">Open tool →</span>
            </button>

            <button type="button" className="hub-tool-card" onClick={() => goToTool('fill')}>
              <div className="hub-tool-icon" aria-hidden="true">📝</div>
              <div className="hub-tool-name">Fill PDF</div>
              <p className="hub-tool-desc">Type into forms and complete documents fast.</p>
              <span className="hub-tool-arrow">Open tool →</span>
            </button>

            <button type="button" className="hub-tool-card" onClick={() => goToTool('protect')}>
              <div className="hub-tool-icon" aria-hidden="true">🔒</div>
              <div className="hub-tool-name">Protect PDF</div>
              <p className="hub-tool-desc">Add a password and lock your file.</p>
              <span className="hub-tool-arrow">Open tool →</span>
            </button>
          </div>

          {/* Quick-sign dropzone — the fast path for the most common task.
              Clearly labelled as a Sign shortcut so users don't mistake it
              for a generic upload that routes to the wrong tool. */}
          <div className="hub-quicksign">
            <div className="hub-quicksign-label">
              <span className="hub-quicksign-icon" aria-hidden="true">⚡</span>
              Or drop a PDF below to sign it right now
            </div>
            <div
              {...getRootProps()}
              className={`hub-dropzone${isDragActive ? ' hub-dropzone-active' : ''}`}
              role="button"
              tabIndex={0}
              aria-label="Drop your PDF here to sign it"
            >
              <input {...getInputProps()} />
              <div className="hub-dropzone-title">
                {isDragActive ? 'Drop your PDF here' : 'Drop your PDF here'}
              </div>
              <div className="hub-dropzone-sub">or</div>
              <button type="button" className="hub-dropzone-btn">Choose PDF file</button>
              <div className="hub-dropzone-hint">Goes straight to the Sign tool · Instant · No registration</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TRUST STRIP ─── */}
      <section className="hub-trust">
        <div className="container hub-trust-inner">
          <span>🔒 Processed locally</span>
          <span>·</span>
          <span>✓ No registration</span>
          <span>·</span>
          <span>💳 No credit card</span>
          <span>·</span>
          <span>⚡ Works in 30 seconds</span>
        </div>
      </section>

      {/* ─── WHY SIGNMYPDF ─── */}
      <section className="hub-why">
        <div className="container">
          <h2 className="hub-section-title">Why SignMyPDF</h2>
          <div className="hub-why-grid">
            <div className="hub-why-item">
              <span className="hub-why-icon" aria-hidden="true">🚫</span>
              <div className="hub-why-text">
                <strong>No &ldquo;paywall at the last step&rdquo;</strong>
                <span>Finish your file first, decide later.</span>
              </div>
            </div>
            <div className="hub-why-item">
              <span className="hub-why-icon" aria-hidden="true">🧼</span>
              <div className="hub-why-text">
                <strong>No watermarks on important files</strong>
                <span>Premium removes the small badge for good.</span>
              </div>
            </div>
            <div className="hub-why-item">
              <span className="hub-why-icon" aria-hidden="true">🔐</span>
              <div className="hub-why-text">
                <strong>Your files are not stored</strong>
                <span>Processing is local. Nothing uploaded, nothing kept.</span>
              </div>
            </div>
            <div className="hub-why-item">
              <span className="hub-why-icon" aria-hidden="true">📱</span>
              <div className="hub-why-text">
                <strong>Works on phone and desktop</strong>
                <span>Same flow everywhere. No app install.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="hub-how">
        <div className="container">
          <h2 className="hub-section-title">How it works</h2>
          <div className="hub-how-grid">
            <div className="hub-how-step">
              <div className="hub-how-num">1</div>
              <div className="hub-how-title">Upload your PDF</div>
              <div className="hub-how-text">Drag and drop or pick a file — nothing leaves your device.</div>
            </div>
            <div className="hub-how-step">
              <div className="hub-how-num">2</div>
              <div className="hub-how-title">Sign, fill or protect it</div>
              <div className="hub-how-text">Use the tool you need — all three live on this site.</div>
            </div>
            <div className="hub-how-step">
              <div className="hub-how-num">3</div>
              <div className="hub-how-title">Download instantly</div>
              <div className="hub-how-text">Your finished PDF saves straight to your device.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SOCIAL PROOF ─── */}
      <section className="hub-social">
        <div className="container">
          <h2 className="hub-section-title">Trusted by thousands</h2>
          <div className="hub-social-numbers">
            <div>
              <span className="hub-social-num">⭐ 4.8 / 5</span>
              <span className="hub-social-label">Average rating</span>
            </div>
            <div>
              <span className="hub-social-num">1,200+</span>
              <span className="hub-social-label">PDFs processed this week</span>
            </div>
            <div>
              <span className="hub-social-num">30s</span>
              <span className="hub-social-label">Median time to finish</span>
            </div>
          </div>
          <div className="hub-social-reviews">
            <blockquote className="hub-review">
              <p>&ldquo;Finally a PDF tool that doesn&rsquo;t force me to sign up to download my own document.&rdquo;</p>
              <cite>— Marcus R., freelancer</cite>
            </blockquote>
            <blockquote className="hub-review">
              <p>&ldquo;Fast and simple. I signed a lease on my phone in under a minute.&rdquo;</p>
              <cite>— Elena T., renter</cite>
            </blockquote>
            <blockquote className="hub-review">
              <p>&ldquo;Love that I can fill and then sign without switching tools or uploading twice.&rdquo;</p>
              <cite>— David K., contractor</cite>
            </blockquote>
          </div>
        </div>
      </section>

      {/* ─── PREMIUM BANNER ─── */}
      {!hasSubscription && (
        <section className="hub-premium">
          <div className="container hub-premium-inner">
            <div className="hub-premium-text">
              <h2>Remove limits &amp; finish your work without interruptions</h2>
              <ul className="hub-premium-bullets">
                <li>Unlimited PDFs — no daily limits</li>
                <li>No watermarks — clean documents</li>
                <li>Access your files anytime</li>
                <li>Continue where you left off</li>
              </ul>
            </div>
            <div className="hub-premium-cta">
              <button
                type="button"
                className="hub-premium-btn"
                onClick={() => { track('hub_premium_click'); setShowPricing(true); }}
              >
                Go Premium — from $7.50/mo
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ─── SEO BLOCK ─── */}
      <section className="hub-seo">
        <div className="container">
          <h2 className="hub-section-title">What you can do with PDF tools online</h2>
          <div className="hub-seo-prose">
            <p>
              A modern PDF workflow rarely fits a single verb. You might need to <strong>sign a PDF online</strong> for a contract, then <strong>fill a PDF form</strong> for a tax document, then <strong>protect a PDF</strong> with a password before emailing it to a client. SignMyPDF brings all three into one browser-based workspace so you can finish a document end-to-end without jumping between apps.
            </p>
            <p>
              Most &ldquo;free&rdquo; PDF editors you find through Google aren&rsquo;t actually free — they let you upload, make your edits, and then gate the download behind a $15/month subscription. Others demand credit-card details for a &ldquo;free trial&rdquo; that auto-renews in seven days. SignMyPDF takes a different approach: the free plan works on day one without any account, covers two PDFs per tool per day, and adds a small watermark only if you need more volume than that. The workflow never traps you after you&rsquo;ve already invested time editing.
            </p>
            <p>
              Installing desktop software for a one-off signature is overkill. A 500 MB Adobe install, a Mac preview quirk, or a scanner that won&rsquo;t cooperate can burn half an hour on what should be a two-minute task. Browser-based tools solve that: the entire editor runs on your machine via JavaScript and WebAssembly, so there&rsquo;s nothing to download and no server sees your document. The PDF literally never leaves your laptop.
            </p>
            <p>
              Typical use cases: <strong>work</strong> — signing employment offers, NDAs, contractor agreements, or approvals; <strong>legal and real estate</strong> — lease agreements, purchase contracts, disclosures; <strong>forms</strong> — tax forms (W-9, 1099), visa applications, insurance claims, rental applications; <strong>personal</strong> — medical release forms, school paperwork, event registrations. Each of these has one thing in common: the user wants to finish in the browser and move on with their day. That&rsquo;s exactly the shape of flow these three tools were built to support.
            </p>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="hub-faq">
        <div className="container">
          <h2 className="hub-section-title">Frequently asked questions</h2>
          <div className="hub-faq-list">
            {FAQ.map((item, i) => (
              <div key={i} className={`hub-faq-item${openFaq === i ? ' hub-faq-open' : ''}`}>
                <button
                  type="button"
                  className="hub-faq-q"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  <span>{item.q}</span>
                  <span className="hub-faq-caret" aria-hidden="true">{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && <p className="hub-faq-a">{item.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />

      <PaywallModal
        open={showPricing}
        onClose={() => setShowPricing(false)}
        tool="sign"
        onProActivated={() => setHasSubscription(true)}
      />
    </>
  );
}
