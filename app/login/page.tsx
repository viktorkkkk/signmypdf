'use client';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Logo from '../components/Logo';

function LoginContent() {
  const searchParams = useSearchParams();
  const redirected = searchParams.get('redirected');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle'|'loading'|'sent'|'notfound'|'error'>('idle');

  const handleSend = async () => {
    if (!email.trim()) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.status === 404) setStatus('notfound');
      else if (!res.ok) setStatus('error');
      else setStatus('sent');
    } catch { setStatus('error'); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', height: 60, padding: '0 24px', display: 'flex', alignItems: 'center' }}>
        <Link href="/"><Logo /></Link>
      </header>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg,#2563eb,#4f46e5)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 16px' }}>✍️</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Sign in to your account</h1>
            <p style={{ fontSize: 15, color: '#64748b', margin: 0 }}>
              {redirected ? "You need to sign in to access your dashboard." : "Enter your email to receive a secure login link."}
            </p>
          </div>
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            {status === 'sent' ? (
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📬</div>
                <p style={{ fontWeight: 700, color: '#0f172a', margin: '0 0 8px', fontSize: 16 }}>Check your inbox</p>
                <p style={{ fontSize: 14, color: '#64748b', margin: 0, lineHeight: 1.6 }}>
                  We sent a login link to <strong>{email}</strong>.<br />Valid for 30 days.
                </p>
              </div>
            ) : (
              <>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Email address</label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  style={{ width: '100%', padding: '11px 14px', border: '1px solid #cbd5e1', borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: 12, fontFamily: 'inherit' }}
                />
                <button
                  onClick={handleSend}
                  disabled={status === 'loading'}
                  style={{ width: '100%', padding: 13, background: '#2563eb', color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {status === 'loading' ? 'Sending…' : 'Send login link →'}
                </button>
                {status === 'notfound' && <p style={{ marginTop: 10, fontSize: 13, color: '#dc2626', textAlign: 'center' }}>No active subscription found for this email.</p>}
                {status === 'error' && <p style={{ marginTop: 10, fontSize: 13, color: '#dc2626', textAlign: 'center' }}>Something went wrong. Try again.</p>}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#f8fafc' }} />}>
      <LoginContent />
    </Suspense>
  );
}
