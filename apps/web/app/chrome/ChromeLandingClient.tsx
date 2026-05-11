'use client';

import { useEffect } from 'react';
import {
  Puzzle,
  Download,
  FileText,
  PenLine,
  Shield,
  Star,
} from 'lucide-react';

interface Props {
  chromeStoreUrl: string;
  howItWorks: { n: number; title: string; body: string }[];
  features: { title: string; body: string }[];
  faq: { q: string; a: string }[];
}

function track(name: string, params?: Record<string, string | number | boolean>) {
  try {
    (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag?.(
      'event',
      name,
      params || {},
    );
  } catch {
    // intentionally silent
  }
}

export default function ChromeLandingClient({ chromeStoreUrl, howItWorks, features, faq }: Props) {
  useEffect(() => {
    track('chrome_landing_view');
  }, []);

  const installClicked = () => track('chrome_install_clicked');

  return (
    <>
      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="container chrome-hero">
        <div className="chrome-hero-badge">
          <Puzzle size={14} aria-hidden="true" />
          Chrome extension · Free
        </div>
        <h1 className="chrome-h1">Sign PDFs in Chrome — Free, No Signup</h1>
        <p className="chrome-sub">
          Add your signature to any PDF in seconds. Works directly in your
          browser. <strong>2 free PDFs daily</strong>, no watermark, no account.
        </p>
        <div className="chrome-cta-row">
          <a
            href={chromeStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="chrome-cta-primary"
            onClick={installClicked}
          >
            <Puzzle size={18} aria-hidden="true" /> Add to Chrome — Free
          </a>
          <a href="/sign" className="chrome-cta-secondary">
            Try without installing →
          </a>
        </div>
        <p className="chrome-trust">
          <span><Shield size={13} /> Files stay in your browser (free plan)</span>
          <span aria-hidden="true">·</span>
          <span>✓ No registration</span>
          <span aria-hidden="true">·</span>
          <span><Star size={13} /> Trusted by 1,200+ users</span>
        </p>
      </section>

      {/* ── How it works ───────────────────────────────────── */}
      <section className="container chrome-section">
        <h2 className="chrome-h2">How it works</h2>
        <div className="chrome-steps">
          {howItWorks.map((s) => (
            <div key={s.n} className="chrome-step">
              <div className="chrome-step-num">{s.n}</div>
              <div className="chrome-step-icon" aria-hidden="true">
                {s.n === 1 && <Puzzle size={20} />}
                {s.n === 2 && <FileText size={20} />}
                {s.n === 3 && <PenLine size={20} />}
              </div>
              <h3 className="chrome-step-title">{s.title}</h3>
              <p className="chrome-step-body">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Screenshots placeholder ────────────────────────── */}
      <section className="container chrome-section">
        <h2 className="chrome-h2">See it in action</h2>
        <div className="chrome-screens">
          {['Drop your PDF', 'Sign in the editor', 'Place the signature', 'Download'].map((label) => (
            <div key={label} className="chrome-screen-placeholder" role="img" aria-label={`${label} — screenshot placeholder`}>
              <div className="chrome-screen-bar">
                <span /><span /><span />
              </div>
              <div className="chrome-screen-body">
                <Download size={28} aria-hidden="true" />
                <span>{label}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="chrome-screens-note">Screenshots arrive with the Chrome Web Store launch.</p>
      </section>

      {/* ── Features ───────────────────────────────────────── */}
      <section className="container chrome-section">
        <h2 className="chrome-h2">What you get</h2>
        <div className="chrome-features">
          {features.map((f) => (
            <div key={f.title} className="chrome-feature">
              <span className="chrome-feature-check" aria-hidden="true">✓</span>
              <div>
                <h3 className="chrome-feature-title">{f.title}</h3>
                <p className="chrome-feature-body">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing tile ───────────────────────────────────── */}
      <section className="container chrome-section">
        <h2 className="chrome-h2">Pricing</h2>
        <div className="chrome-pricing">
          <div className="chrome-plan">
            <div className="chrome-plan-name">Free</div>
            <div className="chrome-plan-price">$0</div>
            <div className="chrome-plan-sub">2 PDFs / day, no watermark, no signup</div>
          </div>
          <div className="chrome-plan chrome-plan-featured">
            <div className="chrome-plan-name">Pro · monthly</div>
            <div className="chrome-plan-price">$9<span>/mo</span></div>
            <div className="chrome-plan-sub">Unlimited PDFs, saved signatures, cross-device sync</div>
          </div>
          <div className="chrome-plan">
            <div className="chrome-plan-name">Pro · annual</div>
            <div className="chrome-plan-price">$7.50<span>/mo</span></div>
            <div className="chrome-plan-sub">Billed $90 / year — save 17%</div>
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────── */}
      <section className="container chrome-section">
        <h2 className="chrome-h2">FAQ</h2>
        <div className="chrome-faq">
          {faq.map((item) => (
            <details key={item.q} className="chrome-faq-item">
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────── */}
      <section className="container chrome-section chrome-final">
        <h2 className="chrome-h2">Ready to sign?</h2>
        <a
          href={chromeStoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="chrome-cta-primary"
          onClick={installClicked}
        >
          <Puzzle size={18} aria-hidden="true" /> Add to Chrome — Free
        </a>
        <p className="chrome-final-or">
          or <a href="/sign">try without installing →</a>
        </p>
      </section>
    </>
  );
}
