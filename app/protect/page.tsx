'use client';

import { useState, useCallback, useRef, useEffect, type ChangeEvent } from 'react';
import { useDropzone } from 'react-dropzone';
import NavHeader from '../components/NavHeader';
import SiteFooter from '../components/SiteFooter';
import FileHistory, { saveToHistory } from '../components/FileHistory';
import PaywallModal from '../components/PaywallModal';
import {
  DAILY_LIMIT,
  PADDLE_CLIENT_TOKEN,
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

// Heroicons-style eye / eye-slash icons.
// Color inherits via currentColor so the parent button controls tone.
function EyeIcon({ closed }: { closed?: boolean }) {
  if (closed) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 11 7 11 7a13.16 13.16 0 0 1-1.67 2.68" />
        <path d="M6.61 6.61A13.526 13.526 0 0 0 1 12s4 7 11 7a9.74 9.74 0 0 0 5.39-1.61" />
        <line x1="2" y1="2" x2="22" y2="22" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ProtectPage() {
  const [step, setStep] = useState<Step>('upload');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [protectedPdfUrl, setProtectedPdfUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  // Pro-only batch protection: additional files protected with the same
  // password + permissions in one click. Each file downloads separately.
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [protectedBatch, setProtectedBatch] = useState<Array<{ name: string; url: string; blob: Blob }>>([]);
  const addFileInputRef = useRef<HTMLInputElement | null>(null);

  // Render first-page thumbnail whenever a PDF is loaded
  useEffect(() => {
    if (!pdfFile) { setThumbnail(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        const buf = await pdfFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
        if (cancelled) return;
        const page = await pdf.getPage(1);
        const baseVp = page.getViewport({ scale: 1 });
        const targetW = 420;
        const scale = Math.min(targetW / baseVp.width, 2);
        const vp = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = vp.width;
        canvas.height = vp.height;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await page.render({ canvas: canvas as any, viewport: vp }).promise;
        if (!cancelled) setThumbnail(canvas.toDataURL('image/jpeg', 0.85));
      } catch (e) {
        console.error('Thumbnail error', e);
      }
    })();
    return () => { cancelled = true; };
  }, [pdfFile]);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [copied, setCopied] = useState(false);

  // Permissions start unchecked — this is a Pro-only feature. Pro users
  // opt in by ticking boxes manually; free users see a paywall on click.
  const [preventEditing, setPreventEditing] = useState(false);
  const [preventCopying, setPreventCopying] = useState(false);
  const [preventPrinting, setPreventPrinting] = useState(false);

  const [hasSubscription, setHasSubscription] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const [showPricing, setShowPricing] = useState(false);
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
    setPreventEditing(false);
    setPreventCopying(false);
    setPreventPrinting(false);
    setFileError('');
    setShowLimitBlock(false);
    setAdditionalFiles([]);
    setProtectedBatch([]);
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

    // Batch: primary file + any Pro-added extras, protected with same settings.
    const queue: File[] = hasSubscription ? [pdfFile, ...additionalFiles] : [pdfFile];
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    setIsProcessing(true);
    setProtectedBatch([]);
    try {
      const batch: Array<{ name: string; url: string; blob: Blob }> = [];
      const { blobToDataUrl } = await import('../utils/watermark');

      for (let i = 0; i < queue.length; i++) {
        const f = queue[i];
        const blob = await protectPdfInBrowser({
          pdfFile: f,
          userPassword: password,
          preventEditing,
          preventCopying,
          preventPrinting,
        });
        const url = URL.createObjectURL(blob);
        batch.push({ name: f.name, url, blob });

        // Sequential auto-download on desktop (iOS uses the save button on done screen).
        if (!isIOS) {
          const a = document.createElement('a');
          a.href = url;
          a.download = `protected-${f.name}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          // Small delay so the browser doesn't collapse rapid downloads.
          if (i < queue.length - 1) await new Promise(r => setTimeout(r, 250));
        }

        const dataUrl = await blobToDataUrl(blob);
        saveToHistory(f.name, blob.size, dataUrl, 'protect', false);
      }

      // Keep the first for the single-file done screen, and the full batch for the multi-file list.
      setProtectedPdfUrl(batch[0].url);
      setProtectedBatch(batch);
      window.dispatchEvent(new Event('signmypdf:saved'));

      // Free plan counter: only counts once, since batch is Pro-only.
      incrementTodayProtectCount();
      setTodayCount(getTodayProtectCount());

      try {
        (window as any).gtag?.('event', 'pdf_protected', {
          plan: hasSubscription ? 'pro' : 'free',
          batch_size: queue.length,
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

  const handleAddFileClick = () => {
    if (!hasSubscription) {
      setShowPricing(true);
      return;
    }
    addFileInputRef.current?.click();
  };

  const handleAddFileSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []).filter(f => f.type === 'application/pdf' && f.size <= MAX_FILE_SIZE);
    if (picked.length) setAdditionalFiles(prev => [...prev, ...picked]);
    e.target.value = '';
  };

  const removeAdditionalFile = (index: number) => {
    setAdditionalFiles(prev => prev.filter((_, i) => i !== index));
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
          <div>
            <div className="step-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, maxWidth: 880, margin: '0 auto 20px' }}>
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

            <div className="protect-layout">

              {/* ── Left column: file preview ── */}
              <div className="protect-preview-col">
                <div className="protect-preview-thumb">
                  {thumbnail ? (
                    <img src={thumbnail} alt={`Preview of ${pdfFile?.name || 'PDF'}`} />
                  ) : (
                    <span className="spinner" />
                  )}
                </div>
                <div className="protect-preview-meta">
                  <div className="fname">{pdfFile?.name}</div>
                  <div className="fsize">{pdfFile ? formatFileSize(pdfFile.size) : ''}</div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button onClick={reset}>🔄 Change file</button>
                    <button
                      onClick={handleAddFileClick}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      ➕ Add file
                      {!hasSubscription && (
                        <span style={{ fontSize: 10, background: '#e0e7ff', color: '#4f46e5', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>PRO</span>
                      )}
                    </button>
                  </div>
                  <input
                    ref={addFileInputRef}
                    type="file"
                    accept="application/pdf"
                    multiple
                    onChange={handleAddFileSelected}
                    style={{ display: 'none' }}
                  />
                  {additionalFiles.length > 0 && (
                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left' }}>
                      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>
                        + {additionalFiles.length} more file{additionalFiles.length > 1 ? 's' : ''}
                      </div>
                      {additionalFiles.map((f, i) => (
                        <div key={`${f.name}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}>
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#334155' }}>{f.name}</span>
                          <span style={{ color: '#94a3b8', fontSize: 11 }}>{formatFileSize(f.size)}</span>
                          <button
                            onClick={() => removeAdditionalFile(i)}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2, fontSize: 14, lineHeight: 1 }}
                            aria-label={`Remove ${f.name}`}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Right column: configuration ── */}
              <div>
                {/* Block 1: Set password */}
                <div className="card" style={{ marginBottom: 16 }}>
                  <div className="card-title">1. Set password to open</div>

                  {/* Password input */}
                  <label style={{ fontSize: 13, color: '#475569', fontWeight: 500, marginBottom: 6, display: 'block' }}>Password</label>
                  <div style={{ position: 'relative' }}>
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
                      className="pw-eye-btn"
                    >
                      <EyeIcon closed={showPw} />
                    </button>
                  </div>

                  {/* Strength meter — shown only while typing */}
                  {password && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{
                        width: '100%',
                        height: 4,
                        background: '#f1f5f9',
                        borderRadius: 2,
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${((pwScore.score + 1) / 5) * 100}%`,
                          height: '100%',
                          background: pwScore.color,
                          borderRadius: 2,
                          transition: 'all 0.3s ease',
                        }} />
                      </div>
                      <div style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: pwScore.color,
                        marginTop: 4,
                      }}>
                        {pwScore.label}
                      </div>
                    </div>
                  )}

                  {/* Confirm input — 12px gap from password block */}
                  <label style={{ fontSize: 13, color: '#475569', fontWeight: 500, margin: '12px 0 6px', display: 'block' }}>Confirm password</label>
                  <div style={{ position: 'relative', marginBottom: confirmPassword && !passwordsMatch ? 4 : 12 }}>
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
                      className="pw-eye-btn"
                    >
                      <EyeIcon closed={showConfirmPw} />
                    </button>
                  </div>
                  {confirmPassword && !passwordsMatch && (
                    <p style={{ fontSize: 12, color: '#dc2626', margin: '0 0 12px' }}>
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

                {/* Block 2: Restrict permissions — PRO feature.
                    Free users see checkboxes but clicking opens the pricing modal.
                    Pro users can tick boxes normally. */}
                <div className="card" style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div className="card-title" style={{ marginBottom: 0 }}>2. Restrict permissions</div>
                    {!hasSubscription && (
                      <span style={{ fontSize: 10, background: '#e0e7ff', color: '#4f46e5', borderRadius: 4, padding: '2px 6px', fontWeight: 700, letterSpacing: 0.3 }}>PRO</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {([
                      ['preventEditing', preventEditing, setPreventEditing, 'Prevent editing'],
                      ['preventCopying', preventCopying, setPreventCopying, 'Prevent copying'],
                      ['preventPrinting', preventPrinting, setPreventPrinting, 'Prevent printing'],
                    ] as [string, boolean, (v: boolean) => void, string][]).map(([key, val, setVal, label]) => (
                      <label
                        key={key}
                        onClick={(e) => {
                          if (!hasSubscription) {
                            e.preventDefault();
                            setShowPricing(true);
                          }
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '6px 0' }}
                      >
                        <input
                          type="checkbox"
                          checked={hasSubscription ? val : false}
                          onChange={e => { if (hasSubscription) setVal(e.target.checked); }}
                          readOnly={!hasSubscription}
                          style={{ width: 18, height: 18, accentColor: '#2563eb', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: 14, color: hasSubscription ? '#1e293b' : '#64748b', fontWeight: 500 }}>{label}</span>
                      </label>
                    ))}
                  </div>
                  <p style={{ fontSize: 12, color: '#64748b', marginTop: 12, marginBottom: 0, lineHeight: 1.5 }}>
                    {hasSubscription
                      ? 'Recipients can open the file but cannot modify, copy or print it.'
                      : 'Upgrade to Pro to restrict editing, copying and printing.'}
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

                {/* Protect button — solid blue, no gradient.
                    Wrapper becomes position:sticky at the bottom on mobile
                    (see .protect-cta-wrap in globals.css). */}
                <div className="protect-cta-wrap">
                  <button
                    onClick={handleProtect}
                    disabled={!canProtect || isProcessing}
                    className="btn-primary-solid"
                    style={{
                      width: '100%',
                      padding: '16px',
                      height: 56,
                      fontSize: 16,
                      borderRadius: 14,
                    }}
                  >
                    {isProcessing ? <><span className="spinner" /> Encrypting…</> : '🔐 Protect PDF'}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {step === 'done' && (
          <div className="done-wrap">
            <div className="done-icon">🔒</div>
            <h2 className="done-title">
              {protectedBatch.length > 1 ? `${protectedBatch.length} PDFs protected!` : 'PDF protected!'}
            </h2>
            <p className="done-sub">
              {protectedBatch.length > 1
                ? 'All files encrypted with the same password.'
                : 'Your PDF is encrypted. Save it to your device.'}
            </p>

            {protectedBatch.length > 1 ? (
              <div className="done-btns">
                <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {protectedBatch.map((b, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12 }}>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14, color: '#334155' }}>{b.name}</span>
                      <button
                        className="btn-ghost"
                        style={{ padding: '8px 14px', fontSize: 13 }}
                        onClick={() => downloadOrShare(b.url, `protected-${b.name}`)}
                      >
                        ⬇️ Save
                      </button>
                    </div>
                  ))}
                </div>
                <button className="btn-ghost" style={{ width: '100%', maxWidth: 480, padding: '13px', fontSize: 15 }} onClick={reset}>
                  🔒 Protect more documents
                </button>
              </div>
            ) : (
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
            )}
          </div>
        )}

      </div>

      {/* File History — only after download (done step) */}
      {step === 'done' && (
        <div className="container" style={{ paddingTop: 0, paddingBottom: 0 }}>
          <FileHistory
            hasSubscription={hasSubscription}
            onShowPricing={() => setShowPricing(true)}
          />
        </div>
      )}

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
          <p style={{
            textAlign: 'center',
            fontSize: 13,
            color: '#94a3b8',
            marginTop: 20,
            marginBottom: 0,
          }}>
            Want to remove a password from a PDF? Unlock PDF — coming soon.
          </p>
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

      {/* Unified Paywall — radio-select + sticky CTA */}
      <PaywallModal
        open={showPricing}
        onClose={() => setShowPricing(false)}
        tool="protect"
        todayCount={todayCount}
        onProActivated={() => setHasSubscription(true)}
      />

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
