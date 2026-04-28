'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import {
  PenLine,
  FileText,
  FileSignature,
  Lock,
  ShieldCheck,
  CheckCircle,
  XCircle,
  CreditCard,
  Zap,
  Unlock,
  Plus,
  Minus,
} from 'lucide-react';
import NavHeader from './components/NavHeader';
import SiteFooter from './components/SiteFooter';
import PaywallModal from './components/PaywallModal';
import { storePendingFile } from './utils/pendingUpload';
import { isProActive } from './utils/subscription';
import { PADDLE_CLIENT_TOKEN } from './constants';

/**
 * Hub homepage.
 *
 * Visual language:
 * - Single brand blue (#2563eb) for accents, primary CTAs, and icons
 *   inside tool cards. Everything else is on a neutral slate palette.
 * - All pictograms are lucide-react SVGs — no emoji, so rendering is
 *   consistent across OS and at any zoom level.
 *
 * IA:
 * - H1 → subtitle → three equal tool cards → dominant Sign dropzone
 *   → trust strip. Tool choice is always the first decision surface.
 *
 * File hand-off (hub dropzone → /sign):
 * - pendingUpload IndexedDB utility. 100MB quota, 5-minute TTL,
 *   read-and-consume so a refresh on /sign doesn't re-trigger.
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
    a: 'Yes — 2 PDFs per day per tool, no signup, no credit card. Premium ($7.50/mo billed annually) removes the limit if you sign or fill PDFs daily for work.',
  },
  {
    q: 'Do my files get uploaded to your servers?',
    a: 'No. Everything happens in your browser via JavaScript and WebAssembly. Your PDF never leaves your device — we literally cannot see what you sign or fill.',
  },
  {
    q: 'Can I use it on iPhone or Android?',
    a: 'Yes. Works in any modern mobile browser — Safari on iOS, Chrome on Android. No app to install, no Play Store or App Store roundtrip.',
  },
  {
    q: 'Are signed PDFs legally binding?',
    a: 'Yes — under the ESIGN Act (US) and eIDAS (EU). Drawn or typed signatures on PDFs meet legal requirements as long as both parties agree to electronic signing.',
  },
  {
    q: 'What happens after my 2 free PDFs?',
    a: 'Wait until tomorrow — the limit resets daily — or upgrade to Premium for unlimited use. Files you have already downloaded stay yours forever.',
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
              setTimeout(() => { window.location.href = '/dashboard'; }, 400);
            }
          },
        });
      };
      document.head.appendChild(script);
    }
  }, []);

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

  const softwareJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'SignMyPDF',
    url: 'https://www.signmypdf.io',
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

      {/* ─── BLOCK 1 — Hero: H1 + sub + tool cards + dropzone + trust strip ─── */}
      <section className="hub-hero">
        <div className="hub-container hub-hero-inner">
          <h1 className="hub-h1">
            <span className="hub-h1-line-1">Sign, Fill &amp; Protect PDFs Online</span>
            <span className="hub-h1-line-2">Free, No Registration</span>
          </h1>
          <p className="hub-sub">
            Pick a tool below — finish in seconds, right in your browser.
          </p>

          <div className="hub-tool-grid">
            <button type="button" className="hub-tool-card tool-accent-sign" onClick={() => goToTool('sign')}>
              <div className="hub-tool-icon-wrap">
                <PenLine size={28} strokeWidth={2} />
              </div>
              <h3 className="hub-tool-name">Sign PDF</h3>
              <p className="hub-tool-desc">Add your signature and download instantly.</p>
              <span className="hub-tool-btn">Open tool →</span>
            </button>

            <button type="button" className="hub-tool-card tool-accent-fill" onClick={() => goToTool('fill')}>
              <div className="hub-tool-icon-wrap">
                <FileText size={28} strokeWidth={2} />
              </div>
              <h3 className="hub-tool-name">Fill PDF</h3>
              <p className="hub-tool-desc">Type into forms and complete documents fast.</p>
              <span className="hub-tool-btn">Open tool →</span>
            </button>

            <button type="button" className="hub-tool-card tool-accent-protect" onClick={() => goToTool('protect')}>
              <div className="hub-tool-icon-wrap">
                <Lock size={28} strokeWidth={2} />
              </div>
              <h3 className="hub-tool-name">Protect PDF</h3>
              <p className="hub-tool-desc">Add a password and lock your file.</p>
              <span className="hub-tool-btn">Open tool →</span>
            </button>
          </div>

          {/* Dropzone is wired to Sign — drops land on the editor at /sign.
              The mini-heading, blue dashed border, FileSignature icon and
              bolded "Sign" in the hint visually anchor it to the Sign tool. */}
          <h2 className="hub-dropzone-heading">Sign a PDF — drop it below</h2>
          <div
            {...getRootProps()}
            className={`hub-dropzone${isDragActive ? ' hub-dropzone-active' : ''}`}
            role="button"
            tabIndex={0}
            aria-label="Drop your PDF here to sign it"
          >
            <input {...getInputProps()} />
            <div className="hub-dropzone-icon" aria-hidden="true">
              <FileSignature size={52} strokeWidth={1.6} />
            </div>
            <div className="hub-dropzone-title">
              {isDragActive ? 'Release to upload' : 'Drop your PDF here or click to browse'}
            </div>
            <div className="hub-dropzone-sub">or</div>
            <button type="button" className="hub-dropzone-btn">Choose PDF file</button>
            <div className="hub-dropzone-hint">Goes straight to <strong>Sign</strong> · Instant · No registration</div>
          </div>

          {/* Trust strip — folded into hero, sits directly under the dropzone. */}
          <div className="hub-trust">
            <div className="hub-trust-inner">
              <span className="hub-trust-item"><Lock size={16} strokeWidth={2} /> Processed locally</span>
              <span className="hub-trust-dot" aria-hidden="true">·</span>
              <span className="hub-trust-item"><CheckCircle size={16} strokeWidth={2} /> No registration</span>
              <span className="hub-trust-dot" aria-hidden="true">·</span>
              <span className="hub-trust-item"><CreditCard size={16} strokeWidth={2} /> No credit card</span>
              <span className="hub-trust-dot" aria-hidden="true">·</span>
              <span className="hub-trust-item"><Zap size={16} strokeWidth={2} /> Works in 30 seconds</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── BLOCK 2 — Why SignMyPDF: 3 accent cards (UTP through pain) ─── */}
      <section className="hub-why">
        <div className="hub-container">
          <h2 className="hub-section-title">What makes SignMyPDF different</h2>
          <div className="hub-why-grid">
            <div className="hub-why-item accent-danger">
              <span className="hub-why-icon" aria-hidden="true"><Unlock size={22} strokeWidth={2} /></span>
              <div className="hub-why-text">
                <strong>No paywall at the last step</strong>
                <span>Finish your file, then decide. No surprise paywall at the end.</span>
              </div>
            </div>
            <div className="hub-why-item accent-success">
              <span className="hub-why-icon" aria-hidden="true"><ShieldCheck size={22} strokeWidth={2} /></span>
              <div className="hub-why-text">
                <strong>Your files never leave your browser</strong>
                <span>Browser-only processing. We literally can&rsquo;t see your files.</span>
              </div>
            </div>
            <div className="hub-why-item accent-warning">
              <span className="hub-why-icon" aria-hidden="true"><Zap size={22} strokeWidth={2} /></span>
              <div className="hub-why-text">
                <strong>No email, no account, no friction</strong>
                <span>No signup, no email, no &ldquo;verify your inbox&rdquo;. Just sign.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── BLOCK 3 — Two-column comparison (replaces old SEO paragraph) ─── */}
      <section className="hub-seo">
        <div className="hub-container">
          <h2 className="hub-section-title">The honest free alternative to Smallpdf and iLovePDF</h2>

          <div className="hub-compare-grid">
            <div className="hub-compare-col compare-bad">
              <div className="hub-compare-col-header">
                <XCircle size={26} strokeWidth={2} aria-hidden="true" />
                <span>What other tools do</span>
              </div>
              <ul className="hub-compare-list">
                <li>Block download until you create an account</li>
                <li>Auto-renew &ldquo;free trials&rdquo; after 7 days</li>
                <li>Upload your contracts to their servers</li>
              </ul>
            </div>

            <div className="hub-compare-col compare-good">
              <div className="hub-compare-col-header">
                <CheckCircle size={26} strokeWidth={2} aria-hidden="true" />
                <span>What SignMyPDF does</span>
              </div>
              <ul className="hub-compare-list">
                <li>Free first 2 PDFs every day, no signup</li>
                <li>Files processed in your browser, never uploaded</li>
                <li>Premium ($7.50/mo) only if you sign daily</li>
              </ul>
            </div>
          </div>

          <p className="hub-compare-summary">
            Most &ldquo;free&rdquo; tools monetize your inbox. We monetize the daily power user — at <strong>$7.50/mo</strong>, with no surprise paywalls in between.
          </p>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="hub-faq">
        <div className="hub-container">
          <h2 className="hub-section-title">Frequently asked questions</h2>
          <div className="hub-faq-list">
            {FAQ.map((item, i) => {
              const open = openFaq === i;
              return (
                <div key={i} className={`hub-faq-item${open ? ' hub-faq-open' : ''}`}>
                  <button
                    type="button"
                    className="hub-faq-q"
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                  >
                    <span>{item.q}</span>
                    <span className="hub-faq-caret" aria-hidden="true">
                      {open ? <Minus size={18} strokeWidth={2.2} /> : <Plus size={18} strokeWidth={2.2} />}
                    </span>
                  </button>
                  {open && <p className="hub-faq-a">{item.a}</p>}
                </div>
              );
            })}
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

      {/* Silence unused-import warning — kept available for future polish. */}
      {false && <ShieldCheck />}
    </>
  );
}
