'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import {
  DAILY_LIMIT,
  PADDLE_PRICE_MONTHLY,
  PADDLE_PRICE_ANNUAL,
  PAYWALL_PRICES,
  PAYWALL_DEFAULT_TARIFF,
} from '../constants';

type Tool = 'sign' | 'fill' | 'protect' | 'merge';
type Tariff = 'monthly' | 'annual';

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  // Kept for telemetry segmentation — the visual content is the same
  // across tools now, but we still want to know which surface opened it.
  tool: Tool;
  todayCount?: number;
  onProActivated?: () => void;
}

const HERO_TITLE = 'Unlock SignMyPDF Premium';
const HERO_SUBTITLE =
  'Unlimited PDFs across all tools · No watermarks · Save your work · All future tools included';

// Universal perks — grouped by user value (not tool features) so the same
// list works for Sign, Fill, Protect, and any tool we add next.
const PERKS: Array<{ title: string; desc: string }> = [
  { title: 'Unlimited PDFs', desc: 'no daily limits on any tool' },
  { title: 'No watermarks, ever', desc: 'clean, professional documents' },
  { title: 'Save your work', desc: 'signatures, form data, drafts across all tools' },
  { title: 'Cloud history', desc: 'access your files for 1 year from any device' },
  { title: 'All current & future tools', desc: 'Sign, Fill, Protect + everything we launch' },
  { title: 'Priority support', desc: 'email response within 24h' },
];

// Brand-blue crown icon — not an emoji, reads as a premium badge.
function CrownIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      <path
        d="M4 17L2.5 6l5.5 4L12 3l4 7 5.5-4L20 17H4z"
        fill="#2563eb"
      />
      <path
        d="M4 19.5C4 19.224 4.224 19 4.5 19h15c.276 0 .5.224.5.5v.5c0 .276-.224.5-.5.5h-15c-.276 0-.5-.224-.5-.5v-.5z"
        fill="#1d4ed8"
      />
    </svg>
  );
}

function track(event: string, params: Record<string, string | number | boolean> = {}) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).gtag?.('event', event, params);
  } catch {
    // no-op
  }
}

export default function PaywallModal({ open, onClose, tool, todayCount = 0, onProActivated }: PaywallModalProps) {
  const [tariff, setTariff] = useState<Tariff>(PAYWALL_DEFAULT_TARIFF);
  const [showRestore, setShowRestore] = useState(false);
  const [restoreEmail, setRestoreEmail] = useState('');
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'loading' | 'success' | 'notfound' | 'error'>('idle');
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [dragY, setDragY] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const dragStartY = useRef<number | null>(null);
  const didFireView = useRef(false);

  // Track view_paywall once per open
  useEffect(() => {
    if (open && !didFireView.current) {
      didFireView.current = true;
      track('view_paywall', { tool });
    }
    if (!open) didFireView.current = false;
  }, [open, tool]);

  // Esc closes (desktop)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose('esc');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const handleClose = (source: string) => {
    track('close_paywall', { tool, source });
    setShowRestore(false);
    setRestoreStatus('idle');
    setRestoreEmail('');
    setDragY(0);
    onClose();
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    setHeaderScrolled(scrollRef.current.scrollTop > 4);
  };

  const handleTariffChange = (t: Tariff) => {
    if (t === tariff) return;
    setTariff(t);
    track('select_tariff', { tool, tariff: t });
  };

  const handleCta = () => {
    track('click_cta', { tool, tariff });
    const priceId = tariff === 'annual' ? PADDLE_PRICE_ANNUAL : PADDLE_PRICE_MONTHLY;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Paddle = (window as any).Paddle;
    if (!Paddle?.Checkout?.open) {
      alert('Payment system is still loading. Please try again in a moment.');
      return;
    }
    Paddle.Checkout.open({ items: [{ priceId, quantity: 1 }] });
  };

  const handleRestore = async () => {
    const email = restoreEmail.trim();
    if (!email) return;
    setRestoreStatus('loading');
    track('restore_pro', { tool, stage: 'submit' });
    try {
      const res = await fetch(`/api/check-subscription?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.active) {
        localStorage.setItem('signmypdf_subscribed', 'true');
        localStorage.setItem('signmypdf_user_email', email);
        setRestoreStatus('success');
        track('restore_pro', { tool, stage: 'success' });
        // Best-effort: request an auto-login token
        fetch('/api/auth/auto-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        }).catch(() => {});
        onProActivated?.();
      } else {
        setRestoreStatus('notfound');
        track('restore_pro', { tool, stage: 'notfound' });
      }
    } catch {
      setRestoreStatus('error');
      track('restore_pro', { tool, stage: 'error' });
    }
  };

  // ── Swipe-to-close on mobile (only when content is scrolled to top) ──
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (scrollRef.current && scrollRef.current.scrollTop > 0) return;
    dragStartY.current = e.clientY;
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartY.current == null) return;
    const delta = e.clientY - dragStartY.current;
    if (delta > 0) setDragY(Math.min(delta, 400));
  };
  const onPointerUp = () => {
    if (dragStartY.current == null) return;
    if (dragY > 120) {
      handleClose('swipe');
    } else {
      setDragY(0);
    }
    dragStartY.current = null;
  };

  if (!open) return null;

  const priceInfo = PAYWALL_PRICES[tariff];

  return (
    <div
      className="pw-overlay"
      onClick={() => handleClose('backdrop')}
      role="dialog"
      aria-modal="true"
      aria-label="Upgrade to Premium"
    >
      <div
        className="pw-sheet"
        onClick={(e) => e.stopPropagation()}
        style={dragY > 0 ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined}
      >
        {/* Sticky header */}
        <div
          className={`pw-header${headerScrolled ? ' pw-header-scrolled' : ''}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="pw-drag-handle" aria-hidden="true" />
          <div className="pw-header-row">
            <span className="pw-header-icon" aria-hidden="true"><CrownIcon /></span>
            <span className="pw-header-title">Premium</span>
            <button
              className="pw-close"
              onClick={() => handleClose('x')}
              aria-label="Close"
              type="button"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable middle */}
        <div className="pw-scroll" ref={scrollRef} onScroll={handleScroll}>
          <div className="pw-hero">
            <h2 className="pw-title">{HERO_TITLE}</h2>
            <p className="pw-subtitle">{HERO_SUBTITLE}</p>
          </div>

          <div className="pw-plan-strip">
            You&apos;re on Free · {todayCount}/{DAILY_LIMIT} PDFs today
          </div>

          <div className="pw-perks">
            <div className="pw-perks-title">Premium unlocks:</div>
            <ul>
              {PERKS.map((p, i) => (
                <li key={i}>
                  <span className="pw-perk-check" aria-hidden="true">✓</span>
                  <span>
                    <strong className="pw-perk-title">{p.title}</strong>
                    <span className="pw-perk-dash"> — </span>
                    <span className="pw-perk-desc">{p.desc}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pw-tariffs" role="radiogroup" aria-label="Choose a plan">
            {/* Annual */}
            <label className={`pw-tariff${tariff === 'annual' ? ' pw-tariff-selected' : ''}`}>
              <input
                type="radio"
                name="pw-tariff"
                value="annual"
                checked={tariff === 'annual'}
                onChange={() => handleTariffChange('annual')}
              />
              <span className="pw-radio" aria-hidden="true" />
              <div className="pw-tariff-body">
                <div className="pw-tariff-badge">{PAYWALL_PRICES.annual.badge}</div>
                <div className="pw-tariff-name">{PAYWALL_PRICES.annual.label}</div>
                <div className="pw-tariff-price">
                  {PAYWALL_PRICES.annual.displayPrice}
                  <span>{PAYWALL_PRICES.annual.displayUnit}</span>
                </div>
                <div className="pw-tariff-sub">{PAYWALL_PRICES.annual.subtitle}</div>
              </div>
            </label>

            {/* Monthly */}
            <label className={`pw-tariff${tariff === 'monthly' ? ' pw-tariff-selected' : ''}`}>
              <input
                type="radio"
                name="pw-tariff"
                value="monthly"
                checked={tariff === 'monthly'}
                onChange={() => handleTariffChange('monthly')}
              />
              <span className="pw-radio" aria-hidden="true" />
              <div className="pw-tariff-body">
                <div className="pw-tariff-name">{PAYWALL_PRICES.monthly.label}</div>
                <div className="pw-tariff-price">
                  {PAYWALL_PRICES.monthly.displayPrice}
                  <span>{PAYWALL_PRICES.monthly.displayUnit}</span>
                </div>
                <div className="pw-tariff-sub">{PAYWALL_PRICES.monthly.subtitle}</div>
              </div>
            </label>
          </div>

        </div>

        {/* Sticky CTA */}
        <div className="pw-cta">
          <div className="pw-trust">Cancel anytime · Secure payment · No hidden fees</div>
          <button
            className="pw-cta-btn"
            onClick={handleCta}
            type="button"
          >
            {priceInfo.ctaText}
          </button>
          {/* Restore — under the CTA, muted. Ticket: must not compete
              with the CTA for attention. */}
          {!showRestore ? (
            <button
              className="pw-restore-link"
              onClick={() => { setShowRestore(true); setRestoreStatus('idle'); }}
              type="button"
            >
              Already have Premium? Restore →
            </button>
          ) : (
            <div className="pw-restore-box">
              <p className="pw-restore-title">Enter your email to restore</p>
              <div className="pw-restore-row">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={restoreEmail}
                  onChange={e => setRestoreEmail(e.target.value)}
                  onKeyDown={async e => { if (e.key === 'Enter') await handleRestore(); }}
                />
                <button
                  onClick={handleRestore}
                  disabled={restoreStatus === 'loading'}
                  type="button"
                >
                  {restoreStatus === 'loading' ? '…' : 'Check'}
                </button>
              </div>
              {restoreStatus === 'success' && (
                <p className="pw-restore-msg pw-restore-ok" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={14} color="#16a34a" /> Pro restored!{' '}
                  <a href="/dashboard">Go to dashboard →</a>
                </p>
              )}
              {restoreStatus === 'notfound' && (
                <p className="pw-restore-msg pw-restore-err">No active subscription found.</p>
              )}
              {restoreStatus === 'error' && (
                <p className="pw-restore-msg pw-restore-err">Something went wrong. Try again.</p>
              )}
              <button
                onClick={() => setShowRestore(false)}
                className="pw-restore-cancel"
                type="button"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
