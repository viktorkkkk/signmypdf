'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import NavHeader from '../components/NavHeader';
import SiteFooter from '../components/SiteFooter';
import FileHistory, { saveToHistory } from '../components/FileHistory';
import {
  DAILY_LIMIT,
  PADDLE_CLIENT_TOKEN,
  PADDLE_PRICE_MONTHLY,
  PADDLE_PRICE_ANNUAL,
} from '../constants';
import {
  getTodayProtectCount,
  incrementTodayProtectCount,
  isProActive,
  activateSubscription,
} from '../utils/subscription';
import {
  protectPdfInBrowser,
  generateStrongPassword,
  scorePassword,
} from '../utils/protectPdf';

type Step = 'upload' | 'configure' | 'done';

const STEPS = [
  { id: 'upload',    label: 'Upload PDF' },
  { id: 'configure', label: 'Set Password' },
  { id: 'done',      label: 'Download' },
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export default function ProtectPage() {
  const [step, setStep] = useState<Step>('upload');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [protectedPdfUrl, setProtectedPdfUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [copied, setCopied] = useState(false);

  const [preventEditing, setPreventEditing] = useState(true);
  const [preventCopying, setPreventCopying] = useState(true);
  const [preventPrinting, setPreventPrinting] = useState(true);

  const [hasSubscription, setHasSubscription] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const [showPricing, setShowPricing] = useState(false);
  const [showRestore, setShowRestore] = useState(false);
  const [restoreEmail, setRestoreEmail] = useState('');
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'loading' | 'success' | 'notfound' | 'error'>('idle');
  const [activatingPro, setActivatingPro] = useState(false);
  const [activatingEmail, setActivatingEmail] = useState('');
  const [showLimitBlock, setShowLimitBlock] = useState(false);
  const [fileError, setFileError] = useState('');

  // Mount: check pro + counter + load Paddle
  useEffect(() => {
    setHasSubscription(isProActive());
    setTodayCount(getTodayProtectCount());

    if (!document.getElementById('paddle-js')) {
      const script = document.createElement('script');
      script.id = 'paddle-js';
      script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
      script.onload = () => {
        window.Paddle?.Initialize({
          token: PADDLE_CLIENT_TOKEN,
          eventCallback(e) {
            if (e.name === 'checkout.completed') {
              activateSubscription();
              setHasSubscription(true);
              setShowPricing(false);
              const email = (e as any).data?.customer?.email;
              if (email) {
                setActivatingEmail(email);
                setActivatingPro(true);
                localStorage.setItem('signmypdf_user_email', email);
                let attempts = 0;
                const poll = setInterval(async () => {
                  attempts++;
                  try {
                    const r = await fetch('/api/auth/auto-token', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email }),
                    });
                    const d = await r.json();
                    if (d.token) {
                      clearInterval(poll);
                      localStorage.setItem('signmypdf_dashboard_token', d.token);
                      window.location.href = '/dashboard';
                    }
                  } catch {}
                  if (attempts >= 15) {
                    clearInterval(poll);
                    setActivatingPro(false);
                  }
                }, 2000);
              }
            }
          },
        });
      };
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [step]);

  // ─── File upload ───────────────────────────────────────────────
  const onDrop = useCallback((files: File[]) => {
    const f = files[0];
    if (!f) return;
    setFileError('');
    if (f.type !== 'application/pdf') {
      setFileError('Only PDF files are supported.');
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setFileError(`File too large. Max size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
      return;
    }
    setPdfFile(f);
    setStep('configure');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, maxFiles: 1, noClick: true,
  });

  const reset = () => {
    setStep('upload');
    setPdfFile(null);
    setProtectedPdfUrl(null);
    setPassword('');
    setConfirmPassword('');
    setShowPw(false);
    setShowConfirmPw(false);
    setCopied(false);
    setPreventEditing(true);
    setPreventCopying(true);
    setPreventPrinting(true);
    setFileError('');
    setShowLimitBlock(false);
  };

  // ─── Password generation + copy ────────────────────────────────
  const handleGenerate = async () => {
    const pw = generateStrongPassword(16);
    setPassword(pw);
    setConfirmPassword(pw);
    setShowPw(true);
    setShowConfirmPw(true);
    try {
      await navigator.clipboard.writeText(pw);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard may fail in non-secure contexts — just skip the toast
    }
  };

  // ─── Protect action ────────────────────────────────────────────
  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const canProtect = !!pdfFile && passwordsMatch && password.length >= 4;

  const willHitLimit = !hasSubscription && todayCount >= DAILY_LIMIT;

  const handleProtect = async () => {
    if (!pdfFile || !canProtect || isProcessing) return;

    if (willHitLimit) {
      setShowLimitBlock(true);
      return;
    }

    setIsProcessing(true);
    try {
      const blob = await protectPdfInBrowser({
        pdfFile,
        userPassword: password,
        preventEditing,
        preventCopying,
        preventPrinting,
      });

      const url = URL.createObjectURL(blob);
      setProtectedPdfUrl(url);

      // Auto-download on desktop
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (!isIOS) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `protected-${pdfFile.name}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      // Save to history (clean PDF — still encrypted, but no watermark concept here)
      const { blobToDataUrl } = await import('../utils/watermark');
      const dataUrl = await blobToDataUrl(blob);
      saveToHistory(pdfFile.name, blob.size, dataUrl, 'protect', false);
      window.dispatchEvent(new Event('signmypdf:saved'));

      incrementTodayProtectCount();
      setTodayCount(getTodayProtectCount());

      try {
        (window as any).gtag?.('event', 'pdf_protected', {
          plan: hasSubscription ? 'pro' : 'free',
        });
      } catch {}

      setTimeout(() => setStep('done'), 300);
    } catch (err: any) {
      console.error('handleProtect error:', err);
      alert('Error protecting PDF: ' + (err?.message || 'unknown'));
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadOrShare = async (url: string, filename: string) => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isIOS && navigator.share) {
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const file = new File([blob], filename, { type: 'application/pdf' });
        await navigator.share({ files: [file], title: filename });
        return;
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
      }
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleRestorePro = async () => {
    if (!restoreEmail.trim()) return;
    setRestoreStatus('loading');
    try {
      const res = await fetch(`/api/check-subscription?email=${encodeURIComponent(restoreEmail.trim())}`);
      const data = await res.json();
      if (data.active) {
        activateSubscription();
        setHasSubscription(true);
        setRestoreStatus('success');
        localStorage.setItem('signmypdf_user_email', restoreEmail.trim());
        fetch('/api/auth/auto-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: restoreEmail.trim() }),
        }).then(r => r.json()).then(d => {
          if (d.token) localStorage.setItem('signmypdf_dashboard_token', d.token);
        }).catch(() => {});
        setTimeout(() => setShowPricing(false), 1500);
      } else {
        setRestoreStatus('notfound');
      }
    } catch {
      setRestoreStatus('error');
    }
  };

  const stepIndex = STEPS.findIndex(s => s.id === step);
  const pwScore = scorePassword(password);

  // JSON-LD for SEO
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'SignMyPDF — Password Protect PDF',
    description: 'Free online PDF password protection tool. No registration required.',
    url: 'https://signmypdf.io/protect',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <NavHeader activeTool="protect" />

      {step !== 'upload' && (
        <div className="progress-wrap">
          <div className="progress-steps">
            {STEPS.map((s, i) => {
              const state = i < stepIndex ? 'done' : i === stepIndex ? 'active' : 'idle';
              return (
                <div className="progress-step" key={s.id}>
                  <div className={`step-circle ${state}`}>{state === 'done' ? '✓' : i + 1}</div>
                  <span className={`step-label ${state}`}>{s.label}</span>
                  {i < STEPS.length - 1 && <div className={`step-line ${state === 'done' ? 'done' : ''}`} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="container" style={{ paddingTop: 48, paddingBottom: step === 'upload' ? 0 : 64 }}>

        {/* ── UPLOAD ── */}
        {step === 'upload' && (
          <div>
            <h1 className="hero-title">Password Protect PDF Online Free</h1>
            <p className="hero-sub">Add a password to any PDF instantly. Free, secure, no registration required.</p>

            <div {...getRootProps()} className={`dropzone${isDragActive ? ' active' : ''}`}>
              <input {...getInputProps()} />
              <div className="dz-icon">🔒</div>
              <p className="dz-title">{isDragActive ? 'Drop it here!' : 'Drop your PDF here'}</p>
              <p className="dz-sub">or click to select a file from your computer</p>
              <label className="btn-primary" style={{ cursor: 'pointer' }}>
                Choose PDF file
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) onDrop([file]);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
            <p style={{ textAlign: 'center', fontSize: 13, color: '#64748b', marginTop: 8 }}>
              Max file size: 100MB
            </p>
            {fileError && (
              <p style={{ textAlign: 'center', fontSize: 13, color: '#dc2626', marginTop: 4 }}>
                {fileError}
              </p>
            )}

            {/* Compact trust row */}
            <p className="trust-row">
              <span>🔒 Processed locally</span>
              <span className="trust-dot">·</span>
              <span>✓ No registration</span>
              <span className="trust-dot">·</span>
              <span>⚡ 30 seconds</span>
            </p>
          </div>
        )}

        {/* ── CONFIGURE ── */}
        {step === 'configure' && (
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <div className="step-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <h2 className="step-title">Set protection</h2>
              {!hasSubscription && (
                <div style={{ fontSize: 13, color: todayCount >= DAILY_LIMIT ? '#d97706' : '#64748b', background: todayCount >= DAILY_LIMIT ? '#fffbeb' : '#f8fafc', padding: '6px 12px', borderRadius: 8, border: `1px solid ${todayCount >= DAILY_LIMIT ? '#fcd34d' : '#e2e8f0'}` }}>
                  {todayCount >= DAILY_LIMIT
                    ? `⚠️ Daily limit reached`
                    : `🔒 ${todayCount}/${DAILY_LIMIT} free today`
                  }
                </div>
              )}
              {hasSubscription && (
                <div style={{ fontSize: 13, color: '#16a34a', background: '#f0fdf4', padding: '6px 12px', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                  ⭐ Premium active
                </div>
              )}
            </div>

            {/* File bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 14, padding: '10px 14px', marginBottom: 16 }}>
              <span style={{ fontSize: 20 }}>✓</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', lineHeight: 1.2 }}>File ready to protect</div>
                <div style={{ fontSize: 12, color: '#166534', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.8 }}>{pdfFile?.name}</div>
              </div>
              <button onClick={reset} style={{ fontSize: 12, fontWeight: 600, color: '#2563eb', background: 'white', border: '1px solid #bfdbfe', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>🔄 Change</button>
            </div>

            {/* Block 1: Set password */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title">1. Set password to open</div>

              {/* Password input */}
              <label style={{ fontSize: 13, color: '#475569', fontWeight: 500, marginBottom: 6, display: 'block' }}>Password</label>
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter a strong password"
                  autoComplete="new-password"
                  style={{
                    width: '100%',
                    padding: '12px 44px 12px 14px',
                    height: 48,
                    borderRadius: 10,
                    border: '1.5px solid #e2e8f0',
                    fontSize: 15,
                    outline: 'none',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#2563eb')}
                  onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    fontSize: 18,
                    cursor: 'pointer',
                    padding: 6,
                  }}
                >
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>

              {/* Strength meter */}
              <div style={{ marginBottom: 14 }}>
                <div style={{
                  width: '100%',
                  height: 6,
                  background: '#f1f5f9',
                  borderRadius: 3,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: password ? `${((pwScore.score + 1) / 5) * 100}%` : '0%',
                    height: '100%',
                    background: pwScore.color,
                    borderRadius: 3,
                    transition: 'all 0.3s ease',
                  }} />
                </div>
                {password && (
                  <div style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: pwScore.color,
                    marginTop: 4,
                  }}>
                    {pwScore.label}
                  </div>
                )}
              </div>

              {/* Confirm input */}
              <label style={{ fontSize: 13, color: '#475569', fontWeight: 500, marginBottom: 6, display: 'block' }}>Confirm password</label>
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  style={{
                    width: '100%',
                    padding: '12px 44px 12px 14px',
                    height: 48,
                    borderRadius: 10,
                    border: `1.5px solid ${confirmPassword && !passwordsMatch ? '#fca5a5' : '#e2e8f0'}`,
                    fontSize: 15,
                    outline: 'none',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  }}
                  onFocus={e => {
                    if (!(confirmPassword && !passwordsMatch)) e.target.style.borderColor = '#2563eb';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = confirmPassword && !passwordsMatch ? '#fca5a5' : '#e2e8f0';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(s => !s)}
                  aria-label={showConfirmPw ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    fontSize: 18,
                    cursor: 'pointer',
                    padding: 6,
                  }}
                >
                  {showConfirmPw ? '🙈' : '👁️'}
                </button>
              </div>
              {confirmPassword && !passwordsMatch && (
                <p style={{ fontSize: 12, color: '#dc2626', marginTop: -8, marginBottom: 12 }}>
                  Passwords do not match
                </p>
              )}

              {/* Generate button */}
              <button
                type="button"
                onClick={handleGenerate}
                style={{
                  width: '100%',
                  padding: '12px',
                  height: 48,
                  borderRadius: 10,
                  border: '1.5px solid #bfdbfe',
                  background: '#eff6ff',
                  color: '#2563eb',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                ✨ Generate strong password
              </button>
              {copied && (
                <p style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, margin: '0 0 10px', textAlign: 'center' }}>
                  ✔ Password copied to clipboard
                </p>
              )}

              {/* Warning */}
              <div style={{
                background: '#fef3c7',
                border: '1.5px solid #fde68a',
                borderRadius: 10,
                padding: '10px 12px',
                marginTop: 4,
              }}>
                <p style={{ fontSize: 13, color: '#78350f', fontWeight: 700, margin: 0, lineHeight: 1.5 }}>
                  We cannot recover your password if lost. Save it somewhere safe before downloading.
                </p>
              </div>
            </div>

            {/* Block 2: Restrict permissions */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title">2. Restrict permissions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {([
                  ['preventEditing', preventEditing, setPreventEditing, 'Prevent editing'],
                  ['preventCopying', preventCopying, setPreventCopying, 'Prevent copying'],
                  ['preventPrinting', preventPrinting, setPreventPrinting, 'Prevent printing'],
                ] as [string, boolean, (v: boolean) => void, string][]).map(([key, val, setVal, label]) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '6px 0' }}>
                    <input
                      type="checkbox"
                      checked={val}
                      onChange={e => setVal(e.target.checked)}
                      style={{ width: 18, height: 18, accentColor: '#2563eb', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 14, color: '#1e293b', fontWeight: 500 }}>{label}</span>
                  </label>
                ))}
              </div>
              <p style={{ fontSize: 12, color: '#64748b', marginTop: 12, marginBottom: 0, lineHeight: 1.5 }}>
                Recipients can open the file but cannot modify, copy or print it.
              </p>
            </div>

            {/* Badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              fontSize: 13,
              color: '#16a34a',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 10,
              padding: '8px 14px',
              marginBottom: 12,
              fontWeight: 500,
            }}>
              🔒 Processed locally. No account required.
            </div>

            {/* Protect button */}
            <button
              onClick={handleProtect}
              disabled={!canProtect || isProcessing}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '16px',
                height: 56,
                fontSize: 16,
                borderRadius: 14,
                opacity: canProtect && !isProcessing ? 1 : 0.5,
                cursor: canProtect && !isProcessing ? 'pointer' : 'not-allowed',
              }}
            >
              {isProcessing ? <><span className="spinner" /> Encrypting…</> : '🔐 Protect PDF'}
            </button>
          </div>
        )}

        {/* ── DONE ── */}
        {step === 'done' && (
          <div className="done-wrap">
            <div className="done-icon">🔒</div>
            <h2 className="done-title">PDF protected!</h2>
            <p className="done-sub">Your PDF is encrypted. Save it to your device.</p>

            <div className="done-btns">
              <button
                className="btn-primary"
                style={{ width: '100%', maxWidth: 480, padding: '16px', fontSize: 16, borderRadius: 14 }}
                onClick={async () => {
                  await downloadOrShare(protectedPdfUrl!, `protected-${pdfFile?.name || 'document.pdf'}`);
                }}
              >
                ⬇️  Save Protected PDF
              </button>
              <button className="btn-ghost" style={{ width: '100%', maxWidth: 480, padding: '13px', fontSize: 15 }} onClick={reset}>
                🔒 Protect another document
              </button>
            </div>
          </div>
        )}

      </div>

      {/* File History */}
      <div className="container" style={{ paddingTop: 0, paddingBottom: 0 }}>
        <FileHistory
          hasSubscription={hasSubscription}
          onShowPricing={() => setShowPricing(true)}
        />
      </div>

      {/* More PDF Tools — only on upload step */}
      {step === 'upload' && (
        <div className="container" style={{ paddingTop: 48, paddingBottom: 48 }}>
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 32 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#64748b', textAlign: 'center', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              More PDF Tools
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, maxWidth: 680, margin: '0 auto' }}>
              <a href="/" style={{ background: 'white', borderRadius: 16, padding: '20px', border: '1.5px solid #e2e8f0', textDecoration: 'none', display: 'block', transition: 'all 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2563eb'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(37,99,235,0.1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
              >
                <div style={{ fontSize: 26, marginBottom: 8 }}>✍️</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Sign PDF</div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>Draw or type your signature</div>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#2563eb' }}>Try it →</span>
              </a>
              <a href="/fill" style={{ background: 'white', borderRadius: 16, padding: '20px', border: '1.5px solid #e2e8f0', textDecoration: 'none', display: 'block', transition: 'all 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2563eb'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(37,99,235,0.1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
              >
                <div style={{ fontSize: 26, marginBottom: 8 }}>📝</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Fill PDF Form</div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>Click to type in any field</div>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#2563eb' }}>Try it →</span>
              </a>
              <div style={{ background: 'white', borderRadius: 16, padding: '20px', border: '2px solid #2563eb', boxShadow: '0 4px 16px rgba(37,99,235,0.1)' }}>
                <div style={{ fontSize: 26, marginBottom: 8 }}>🔒</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Protect PDF</div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>Add password &amp; permissions</div>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: 20 }}>Current tool</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compact FAQ — only on upload step */}
      {step === 'upload' && (
        <div className="container" style={{ paddingBottom: 40 }}>
          <div className="compact-faq">
            <h2>FAQ</h2>
            <details>
              <summary>Is it free?</summary>
              <p className="faq-answer">Yes. First 2 PDFs per day, no account needed.</p>
            </details>
            <details>
              <summary>What if I forget the password?</summary>
              <p className="faq-answer">We cannot recover it. Save it before downloading.</p>
            </details>
            <details>
              <summary>Is my file secure?</summary>
              <p className="faq-answer">Processed locally in your browser. Never uploaded to our servers.</p>
            </details>
          </div>
        </div>
      )}

      {/* Limit reached block */}
      {showLimitBlock && (
        <div className="modal-overlay" onClick={() => setShowLimitBlock(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <button className="modal-close" onClick={() => setShowLimitBlock(false)}>✕</button>
            <div style={{ textAlign: 'center', padding: '8px 4px 0' }}>
              <div style={{ fontSize: 38, marginBottom: 10 }}>🔒</div>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 10px' }}>You&apos;ve reached your free limit</h3>
              <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, margin: '0 0 20px' }}>
                Upgrade to:
                <br />– Protect unlimited files
                <br />– Access your files anytime
                <br />– No limits across all tools
              </p>
              <button
                onClick={() => { setShowLimitBlock(false); setShowPricing(true); }}
                className="btn-primary"
                style={{ width: '100%', padding: '14px', fontSize: 15, borderRadius: 12, marginBottom: 8 }}
              >
                Upgrade to Pro →
              </button>
              <button
                onClick={() => setShowLimitBlock(false)}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#64748b',
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                }}
              >
                Try again tomorrow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pricing modal */}
      {showPricing && (
        <div className="modal-overlay" onClick={() => setShowPricing(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowPricing(false)}>✕</button>
            <div className="pricing-header">
              <div style={{ fontSize: 28, marginBottom: 6 }}>🚀</div>
              <h3 className="pricing-title">Unlock Unlimited Protection</h3>
              <p className="pricing-sub">
                Unlimited PDF protecting across all tools, saved file history, no daily limits.
              </p>
            </div>

            <div className="pricing-grid">
              <div className="plan-card">
                <div className="plan-name">Free</div>
                <div className="plan-price">$0<span>/mo</span></div>
                <div className="plan-desc">2 PDFs/day across tools</div>
                <ul className="plan-perks">
                  <li>✓ 2 PDFs/day per tool</li>
                  <li>✓ Sign, Fill, Protect</li>
                  <li>✓ No registration needed</li>
                  <li>✓ File history (24 hours)</li>
                  <li style={{ color: '#cbd5e1' }}>✗ Daily limit resets at midnight</li>
                  <li style={{ color: '#cbd5e1' }}>✗ No saved signatures or drafts</li>
                </ul>
                <button className="plan-btn" onClick={() => setShowPricing(false)}>Current plan</button>
              </div>

              <div className="plan-card">
                <div className="plan-name">Monthly</div>
                <div className="plan-price">$9<span>/mo</span></div>
                <div className="plan-desc">Billed monthly</div>
                <ul className="plan-perks">
                  <li>✓ Unlimited across all tools</li>
                  <li>✓ Save &amp; reuse signatures</li>
                  <li>✓ No watermark ever</li>
                  <li>✓ Save form drafts</li>
                  <li>✓ Permanent file history (1 year)</li>
                  <li>✓ Sign + Fill + Protect in one flow</li>
                </ul>
                <button
                  className="plan-btn"
                  onClick={() => {
                    window.Paddle?.Checkout.open({
                      items: [{ priceId: PADDLE_PRICE_MONTHLY, quantity: 1 }],
                    });
                  }}
                >
                  Get Monthly
                </button>
              </div>

              <div className="plan-card plan-featured" style={{ transform: 'scale(1.04)', zIndex: 1 }}>
                <div className="plan-badge">Best Value — Save 17%</div>
                <div className="plan-name">Annual</div>
                <div className="plan-price">$7.50<span>/mo</span></div>
                <div className="plan-desc">Billed $90/year</div>
                <ul className="plan-perks">
                  <li>✓ Unlimited across all tools</li>
                  <li>✓ Save &amp; reuse signatures</li>
                  <li>✓ No watermark ever</li>
                  <li>✓ Save form drafts</li>
                  <li>✓ Permanent file history (1 year)</li>
                  <li>✓ Sign + Fill + Protect in one flow</li>
                </ul>
                <button
                  className="plan-btn plan-btn-featured"
                  onClick={() => {
                    window.Paddle?.Checkout.open({
                      items: [{ priceId: PADDLE_PRICE_ANNUAL, quantity: 1 }],
                    });
                  }}
                >
                  Get Annual Plan
                </button>
              </div>
            </div>

            <p className="pricing-fine">Cancel anytime · Secure payment · No hidden fees</p>

            {!showRestore ? (
              <div style={{
                marginTop: 16, padding: '14px 20px',
                background: '#f8fafc', borderRadius: 12,
                border: '1px solid #e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>Already have Pro?</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>Restore access on this device</div>
                </div>
                <button
                  onClick={() => { setShowRestore(true); setRestoreStatus('idle'); }}
                  style={{
                    background: '#fff', border: '1px solid #e2e8f0',
                    color: '#2563eb', cursor: 'pointer', fontSize: 13,
                    fontWeight: 700, padding: '8px 16px', borderRadius: 8,
                    whiteSpace: 'nowrap', flexShrink: 0
                  }}
                >
                  Restore Pro →
                </button>
              </div>
            ) : (
              <div style={{ marginTop: 16, padding: '16px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 10 }}>Enter your email to restore Pro access</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={restoreEmail}
                    onChange={e => setRestoreEmail(e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none' }}
                    onKeyDown={async e => { if (e.key === 'Enter') await handleRestorePro(); }}
                  />
                  <button
                    onClick={handleRestorePro}
                    disabled={restoreStatus === 'loading'}
                    style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    {restoreStatus === 'loading' ? '...' : 'Check'}
                  </button>
                </div>
                {restoreStatus === 'success' && (
                  <p style={{ marginTop: 8, fontSize: 13, color: '#16a34a', fontWeight: 600 }}>
                    ✅ Pro restored!{' '}
                    <a href="/dashboard" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 700 }}>Go to dashboard →</a>
                  </p>
                )}
                {restoreStatus === 'notfound' && (
                  <p style={{ marginTop: 8, fontSize: 13, color: '#dc2626' }}>No active subscription found for this email.</p>
                )}
                {restoreStatus === 'error' && (
                  <p style={{ marginTop: 8, fontSize: 13, color: '#dc2626' }}>Something went wrong. Try again.</p>
                )}
                <button onClick={() => setShowRestore(false)} style={{ marginTop: 8, background: 'none', border: 'none', fontSize: 12, color: '#94a3b8', cursor: 'pointer', padding: 0 }}>Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pro activation overlay */}
      {activatingPro && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: '48px 40px', maxWidth: 400, width: '100%', textAlign: 'center', boxShadow: '0 40px 80px rgba(0,0,0,0.3)' }}>
            <div style={{ width: 56, height: 56, border: '4px solid #e0e7ff', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 24px' }} />
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>Activating your Pro plan…</h2>
            <p style={{ fontSize: 15, color: '#64748b', margin: '0 0 8px', lineHeight: 1.6 }}>
              Payment confirmed! Setting up your account.
            </p>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>{activatingEmail}</p>
          </div>
        </div>
      )}

      <SiteFooter />
    </>
  );
}
