'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '../components/Logo';

const TOKEN_KEY = 'signmypdf_dashboard_token';

interface SubData {
  email: string;
  plan: string;
  status: string;
  valid_until: string | null;
  paddle_subscription_id: string | null;
  created_at: string;
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlToken = searchParams.get('token');

  const [subData, setSubData] = useState<SubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [todayCount, setTodayCount] = useState(0);

  // Modals
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelStatus, setCancelStatus] = useState<'idle'|'loading'|'done'|'error'>('idle');

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const raw = localStorage.getItem(`signmypdf_count_${today}`);
    setTodayCount(raw ? parseInt(raw, 10) : 0);
  }, []);

  useEffect(() => {
    const run = async () => {
      let token = urlToken || localStorage.getItem(TOKEN_KEY);

      // If no token but have saved email, try auto-token
      if (!token) {
        const savedEmail = localStorage.getItem('signmypdf_user_email');
        if (savedEmail) {
          try {
            const r = await fetch('/api/auth/auto-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: savedEmail }),
            });
            const d = await r.json();
            if (d.token) { token = d.token; localStorage.setItem(TOKEN_KEY, token!); }
          } catch {}
        }
      }

      if (!token) {
        router.replace('/login?redirected=1');
        return;
      }

      try {
        const r = await fetch(`/api/dashboard-data?token=${encodeURIComponent(token)}`);
        const data = await r.json();
        if (data.error) {
          localStorage.removeItem(TOKEN_KEY);
          router.replace('/login?redirected=1');
        } else {
          localStorage.setItem(TOKEN_KEY, token!);
          setSubData(data);
        }
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        router.replace('/login?redirected=1');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [urlToken]);

  const handleSignOut = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('signmypdf_user_email');
    router.push('/');
  };

  const handleCancel = async () => {
    const token = urlToken || localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    setCancelStatus('loading');
    try {
      const res = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        setCancelStatus('done');
        // Refresh data
        const r = await fetch(`/api/dashboard-data?token=${encodeURIComponent(token)}`);
        const data = await r.json();
        if (!data.error) setSubData(data);
      } else {
        setCancelStatus('error');
      }
    } catch {
      setCancelStatus('error');
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ margin: 0, fontSize: 15 }}>Loading…</p>
        </div>
      </div>
    );
  }

  if (!subData) return null;

  const planLabel = subData.plan === 'annual' ? 'Annual' : 'Monthly';
  const isActive = subData.status === 'active';
  const nextBilling = subData.valid_until
    ? new Date(subData.valid_until).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—';

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', height: 60, padding: '0 24px', display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 720, width: '100%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/"><Logo /></Link>
          <Link href="/" style={{ fontSize: 14, fontWeight: 600, color: '#2563eb', textDecoration: 'none', padding: '7px 16px', background: '#eff6ff', borderRadius: 9, border: '1px solid #bfdbfe' }}>
            ✍️ Sign PDF
          </Link>
        </div>
      </header>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: '0 0 32px', letterSpacing: -0.5 }}>My Account</h1>

        {/* Subscription block */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}>
            <h2 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Subscription</h2>
          </div>

          <div style={{ padding: '20px 24px' }}>
            {/* Plan row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Plan</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>{planLabel} Pro</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>{subData.plan === 'annual' ? '$7.50/mo · billed annually' : '$9/month'}</div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: isActive ? '#16a34a' : '#dc2626', background: isActive ? '#f0fdf4' : '#fef2f2', padding: '4px 12px', borderRadius: 20, border: `1px solid ${isActive ? '#bbf7d0' : '#fecaca'}` }}>
                {isActive ? '● Active' : '● Cancelled'}
              </span>
            </div>

            {/* Next billing */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>
                  {isActive ? 'Next billing' : 'Access until'}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{nextBilling}</div>
              </div>
            </div>

            {/* Action buttons */}
            {isActive && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  onClick={() => setShowCancelModal(true)}
                  style={{ padding: '10px 20px', background: '#fff', border: '1px solid #fee2e2', color: '#dc2626', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel subscription
                </button>
              </div>
            )}
            {!isActive && (
              <Link href="/" style={{ display: 'inline-block', padding: '10px 20px', background: '#2563eb', color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                Resubscribe →
              </Link>
            )}
          </div>
        </div>

        {/* Usage block */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}>
            <h2 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Usage today</h2>
          </div>
          <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>PDFs signed today</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a' }}>{todayCount}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Daily limit</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#16a34a' }}>Unlimited</div>
            </div>
          </div>
        </div>

        {/* Account block */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}>
            <h2 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Account</h2>
          </div>
          <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Email</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{subData.email}</div>
              </div>
              <button
                onClick={handleSignOut}
                style={{ padding: '9px 18px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel modal */}
      {showCancelModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => cancelStatus === 'idle' && setShowCancelModal(false)}
        >
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
            {cancelStatus === 'done' ? (
              <>
                <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 16 }}>✅</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 8px', textAlign: 'center' }}>Subscription cancelled</h3>
                <p style={{ fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24, lineHeight: 1.6 }}>You keep Pro access until {nextBilling}.</p>
                <button onClick={() => setShowCancelModal(false)} style={{ width: '100%', padding: 13, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Close</button>
              </>
            ) : (
              <>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>Cancel subscription?</h3>
                <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24, lineHeight: 1.6 }}>
                  You'll keep Pro access until <strong>{nextBilling}</strong>. After that, your account returns to the free plan.
                </p>
                {cancelStatus === 'error' && <p style={{ fontSize: 13, color: '#dc2626', marginBottom: 12 }}>Something went wrong. Please try again.</p>}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowCancelModal(false)} style={{ flex: 1, padding: 13, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#374151', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    Keep Pro
                  </button>
                  <button onClick={handleCancel} disabled={cancelStatus === 'loading'} style={{ flex: 1, padding: 13, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    {cancelStatus === 'loading' ? 'Cancelling…' : 'Yes, cancel'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#f8fafc' }} />}>
      <DashboardContent />
    </Suspense>
  );
}
