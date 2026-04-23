'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import SignatureCanvas from './components/SignatureCanvas';
import PDFViewer, { SignaturePlacement } from './components/PDFViewer';
import SavedSignatures, { saveSig, SavedSig } from './components/SavedSignatures';
import Logo from './components/Logo';
import NavHeader from './components/NavHeader';
import SiteFooter from './components/SiteFooter';
import FileHistory, { saveToHistory } from './components/FileHistory';
import { signPdfInBrowser } from './utils/signPdf';
import {
  SUBSCRIPTION_KEY,
  DAILY_LIMIT,
  PADDLE_CLIENT_TOKEN,
  PADDLE_PRICE_MONTHLY,
  PADDLE_PRICE_ANNUAL,
} from './constants';
import {
  getTodayCount,
  incrementTodayCount,
  isProActive,
  activateSubscription,
} from './utils/subscription';

type Step = 'upload' | 'sign' | 'done';

const STEPS = [
  { id: 'upload', label: 'Upload PDF' },
  { id: 'sign',   label: 'Add Signature' },
  { id: 'done',   label: 'Download' },
];

declare global {
  interface Window {
    Paddle?: {
      Initialize: (opts: { token: string; eventCallback?: (e: { name: string }) => void }) => void;
      Checkout: { open: (opts: { items: { priceId: string; quantity: number }[] }) => void };
    };
  }
}

export default function Home() {
  const [step, setStep] = useState<Step>('upload');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  const [signatureData, setSignatureData] = useState('');
  const sigSize = useRef({ w: 0, h: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [signMode, setSignMode] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState('');
  const [selectedFont, setSelectedFont] = useState('"Brush Script MT", "Dancing Script", cursive');
  
  const FONTS = [
    { name: 'Script', value: '"Brush Script MT", "Dancing Script", cursive' },
    { name: 'Handwritten', value: '"Comic Sans MS", "Chalkboard SE", cursive' },
    { name: 'Elegant', value: '"Times New Roman", Georgia, serif' },
    { name: 'Modern', value: '"Segoe UI", Roboto, sans-serif' },
  ];
  const [showPricing, setShowPricing] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [showRestore, setShowRestore] = useState(false);
  const [restoreEmail, setRestoreEmail] = useState('');
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'loading' | 'success' | 'notfound' | 'error'>('idle');
  const [todayCount, setTodayCount] = useState(0);
  const [selectedSigId, setSelectedSigId] = useState<string | null>(null);
  const [showWatermarkToast, setShowWatermarkToast] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activatingPro, setActivatingPro] = useState(false);
  const [activatingEmail, setActivatingEmail] = useState('');
  const [showFillBanner, setShowFillBanner] = useState(false);
  const [showDlHint, setShowDlHint] = useState(false);

  // Check subscription and count on mount
  useEffect(() => {
    setHasSubscription(isProActive());
    setTodayCount(getTodayCount());

    // Load Paddle.js
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
                // Start polling
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
                  if (attempts >= 15) { // 30 seconds max
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
    
    // Check for pending PDF from blog
    const pendingPdf = localStorage.getItem('blog_pending_pdf');
    const pendingPdfName = localStorage.getItem('blog_pending_pdf_name');
    if (pendingPdf && pendingPdfName) {
      fetch(pendingPdf)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], pendingPdfName, { type: 'application/pdf' });
          setPdfFile(file);
          setStep('sign');
          localStorage.removeItem('blog_pending_pdf');
          localStorage.removeItem('blog_pending_pdf_name');
        });
    }

    // Check for pending filled PDF from /fill page
    const fillPdf = sessionStorage.getItem('signmypdf_pending_fill_pdf');
    const fillName = sessionStorage.getItem('signmypdf_pending_fill_name');
    if (fillPdf && fillName) {
      sessionStorage.removeItem('signmypdf_pending_fill_pdf');
      sessionStorage.removeItem('signmypdf_pending_fill_name');
      fetch(fillPdf)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], fillName, { type: 'application/pdf' });
          setPdfFile(file);
          setSelectedPages([1]);
          setPlacements([{ page: 1, x: 5, y: 75, w: 30, h: 12 }]);
          setStep('sign');
          setShowFillBanner(true);
        });
    }
  }, []);
  
  // Multi-page signature state
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [placements, setPlacements] = useState<SignaturePlacement[]>([]);
  

  
  // Generate dataUrl for typed signature
  const [typedSigDataUrl, setTypedSigDataUrl] = useState('');
  useEffect(() => {
    if (!typedName.trim()) {
      setTypedSigDataUrl('');
      return;
    }
    const canvas = document.createElement('canvas');
    const maxW = 600;
    const H = 100;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    // Auto-scale font so text always fits
    let fontSize = 48;
    ctx.font = `italic ${fontSize}px ${selectedFont}`;
    let textW = ctx.measureText(typedName).width;
    const padding = 24;
    while (textW > maxW - padding && fontSize > 18) {
      fontSize -= 2;
      ctx.font = `italic ${fontSize}px ${selectedFont}`;
      textW = ctx.measureText(typedName).width;
    }

    // Canvas width = text width + padding (no clipping)
    canvas.width = Math.min(maxW, textW + padding);

    ctx.clearRect(0, 0, canvas.width, H);
    ctx.font = `italic ${fontSize}px ${selectedFont}`;
    ctx.fillStyle = '#1e3a8a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typedName, canvas.width / 2, H / 2);
    setTypedSigDataUrl(canvas.toDataURL('image/png'));
  }, [typedName, selectedFont]);

  const onDrop = useCallback((files: File[]) => {
    const f = files[0];
    if (f?.type === 'application/pdf') { 
      setPdfFile(f); 
      setStep('sign');
      // Auto-select first page for immediate preview
      setSelectedPages([1]);
      setPlacements([{ page: 1, x: 5, y: 75, w: 30, h: 12 }]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, maxFiles: 1, noClick: true,
  });

  const canSign = (signMode === 'draw' ? !!signatureData : !!typedName.trim()) && selectedPages.length > 0;
  // Watermark is added starting from the 3rd PDF in a day (free plan only)
  const willHaveWatermark = !hasSubscription && todayCount >= DAILY_LIMIT;

  // GA4 event helper — safe to call even before gtag is loaded
  const trackEvent = (name: string, params?: Record<string, string | boolean | number>) => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isMobile = isIOS || /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    try {
      (window as any).gtag?.('event', name, {
        device: isMobile ? 'mobile' : 'desktop',
        ...params,
      });
    } catch {}
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
        // Save email + auto-get dashboard token
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

  const handleSign = async () => {
    if (!pdfFile || !canSign) return;

    setIsProcessing(true);
    try {
      const activePlacements = placements.filter(p => selectedPages.includes(p.page));

      // Generate CLEAN PDF for history storage
      const cleanBlob = await signPdfInBrowser({
        pdfFile,
        signatureDataUrl: signatureData,
        typedName,
        signMode: signMode as 'draw' | 'type',
        placements: activePlacements,
        addWatermark: false,
      });

      // For download: add watermark if needed
      let blob = cleanBlob;
      if (willHaveWatermark) {
        const { addWatermarkToBlob } = await import('./utils/watermark');
        blob = await addWatermarkToBlob(cleanBlob);
      }

      const url = URL.createObjectURL(blob);
      setSignedPdfUrl(url);

      // Track signing event
      trackEvent('pdf_signed', {
        plan: hasSubscription ? 'pro' : 'free',
        mode: signMode,
        pages: activePlacements.length,
        watermark: willHaveWatermark,
      });

      // Auto-download on desktop; on iOS user taps the button on done screen
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (!isIOS) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `signed-${pdfFile.name}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Track desktop auto-download
        trackEvent('pdf_downloaded', { plan: hasSubscription ? 'pro' : 'free', watermark: willHaveWatermark, method: 'auto' });
        if (willHaveWatermark) setTimeout(() => showToast(), 400);
      }

      // Save CLEAN version to history
      const { blobToDataUrl } = await import('./utils/watermark');
      const cleanDataUrl = await blobToDataUrl(cleanBlob);
      saveToHistory(pdfFile!.name, cleanBlob.size, cleanDataUrl, 'sign', willHaveWatermark);
      window.dispatchEvent(new Event('signmypdf:saved'));

      // Increment daily count
      incrementTodayCount();
      setTodayCount(getTodayCount());

      // Show done screen
      setTimeout(() => setStep('done'), 300);
    } catch (err: any) {
      console.error('handleSign error:', err);
      alert('Error signing PDF: ' + (err?.message || 'unknown'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Universal download: uses Web Share API on iOS (opens native Share Sheet → Save to Files)
  // Falls back to <a download> on desktop
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
        // User cancelled share or share failed — fall through to link
        if (e?.name === 'AbortError') return;
      }
    }
    // Desktop / fallback
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const showToast = () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setShowWatermarkToast(true);
    toastTimerRef.current = setTimeout(() => setShowWatermarkToast(false), 8000);
  };

  const reset = () => {
    setPdfFile(null); 
    setSignedPdfUrl(null);
    setSignatureData(''); 
    setTypedName(''); 
    setStep('upload');
    setSelectedPages([]);
    setPlacements([]);
  };

  // Scroll to top whenever step changes (after render)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [step]);

  // Show download hint once when done screen appears (free users only)
  useEffect(() => {
    if (step === 'done' && !hasSubscription && !localStorage.getItem('signmypdf_dl_hint_shown')) {
      setShowDlHint(true);
      localStorage.setItem('signmypdf_dl_hint_shown', '1');
    }
  }, [step, hasSubscription]);

  const stepIndex = STEPS.findIndex(s => s.id === step);
  const previewSig = signMode === 'draw' ? signatureData : typedSigDataUrl;

  // JSON-LD structured data for SEO
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'SignMyPDF',
    description: 'Free online PDF signature tool. No registration required.',
    url: 'https://signmypdf.io',
    applicationCategory: 'ProductivityApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: [
      'Sign PDF documents online',
      'Draw or type signature',
      'No registration required',
      'Client-side processing',
      'Mobile friendly',
    ],
    screenshot: {
      '@type': 'ImageObject',
      url: 'https://signmypdf.io/screenshot.png',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '1250',
    },
  };

  return (
    <>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Header */}
      <NavHeader activeTool="sign" />

      {/* Progress */}
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
            <h1 className="hero-title">Sign your PDF in seconds</h1>
            <p className="hero-sub">No registration. No software. Upload, sign, download — done.</p>
            

            <div {...getRootProps()} className={`dropzone${isDragActive ? ' active' : ''}`}>
              <input {...getInputProps()} />
              <div className="dz-icon">📄</div>
              <p className="dz-title">{isDragActive ? 'Drop it here!' : 'Drop your PDF here'}</p>
              <p className="dz-sub">or click to select a file from your computer</p>
              {/* Native label+input for reliable mobile file picking */}
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

        {/* ── SIGN ── */}
        {step === 'sign' && (
          <div>
            {/* Banner: filled PDF loaded from /fill */}
            {showFillBanner && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 14, padding: '12px 16px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>✅</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#166534' }}>Your filled PDF is ready to sign</span>
                </div>
                <button onClick={() => setShowFillBanner(false)} style={{ background: 'none', border: 'none', fontSize: 16, color: '#86efac', cursor: 'pointer', padding: '2px 6px' }}>✕</button>
              </div>
            )}
            <div className="step-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <h2 className="step-title">Sign your document</h2>
              {!hasSubscription && (
                <div style={{ fontSize: 13, color: todayCount >= DAILY_LIMIT ? '#d97706' : '#64748b', background: todayCount >= DAILY_LIMIT ? '#fffbeb' : '#f8fafc', padding: '6px 12px', borderRadius: 8, border: `1px solid ${todayCount >= DAILY_LIMIT ? '#fcd34d' : '#e2e8f0'}` }}>
                  {todayCount >= DAILY_LIMIT
                    ? `⚠️ Watermark added from PDF #${DAILY_LIMIT + 1}`
                    : `📄 ${todayCount}/${DAILY_LIMIT} free (no watermark) today`
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: '10px 14px', marginBottom: 16 }}>
              <div className="doc-badge" style={{ width: 32, height: 32, fontSize: 9, flexShrink: 0 }}>PDF</div>
              <span style={{ fontSize: 13, color: '#334155', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pdfFile?.name}</span>
              <button onClick={reset} style={{ fontSize: 12, fontWeight: 600, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>🔄 Change file</button>
            </div>

            {/* 1. SIGNATURE AREA (top) */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title">1. Create your signature</div>
              <div className="tabs">
                <button className={`tab${signMode === 'draw' ? ' active' : ''}`} onClick={() => setSignMode('draw')}>✏️ Draw</button>
                <button className={`tab${signMode === 'type' ? ' active' : ''}`} onClick={() => setSignMode('type')}>⌨️ Type</button>
              </div>

              {signMode === 'draw' && <SignatureCanvas onSave={(url, w, h) => { setSignatureData(url); sigSize.current = { w, h }; }} />}

              {signMode === 'type' && (
                <div>
                  {/* Font selector */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                    {FONTS.map(f => (
                      <button
                        key={f.value}
                        onClick={() => setSelectedFont(f.value)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 20,
                          border: selectedFont === f.value ? '2px solid #2563eb' : '1px solid #e2e8f0',
                          background: selectedFont === f.value ? '#eff6ff' : 'white',
                          color: selectedFont === f.value ? '#2563eb' : '#64748b',
                          fontSize: 13,
                          fontWeight: selectedFont === f.value ? 600 : 400,
                          cursor: 'pointer',
                          fontFamily: f.value,
                        }}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                  <input type="text" className="type-input" placeholder="Your full name"
                    value={typedName} onChange={e => setTypedName(e.target.value)} 
                    style={{ fontFamily: selectedFont, fontSize: 24 }} />
                  {typedName && (
                    <div className="type-preview" style={{ minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={typedSigDataUrl} style={{ maxHeight: 60, maxWidth: '100%' }} alt="typed signature" />
                    </div>
                  )}
                </div>
              )}

              {/* Saved signatures */}
              <div style={{ marginTop: 14 }}>
                <SavedSignatures
                  currentSig={signMode === 'draw' ? signatureData : typedSigDataUrl}
                  currentType={signMode}
                  currentText={typedName}
                  currentFont={selectedFont}
                  selectedId={selectedSigId}
                  hasSubscription={hasSubscription}
                  onShowPricing={() => setShowPricing(true)}
                  onSelect={(sig: SavedSig) => { 
                    setSelectedSigId(sig.id);
                    if (sig.type === 'type' && sig.text) {
                      setTypedName(sig.text);
                      setSelectedFont(sig.font || FONTS[0].value);
                      setSignMode('type');
                    } else {
                      setSignatureData(sig.dataUrl);
                      setSignMode('draw');
                    }
                  }}
                  onSaveCurrent={() => { 
                    if (signMode === 'draw' && signatureData) {
                      const newSig = saveSig(signatureData, 'draw');
                      setSelectedSigId(newSig.id);
                      window.dispatchEvent(new Event('signmypdf:sigs'));
                    } else if (signMode === 'type' && typedName && typedSigDataUrl) {
                      const newSig = saveSig(typedSigDataUrl, 'type', typedName, selectedFont);
                      setSelectedSigId(newSig.id);
                      window.dispatchEvent(new Event('signmypdf:sigs'));
                    }
                  }}
                />
              </div>
            </div>

            {/* 2. DOCUMENT PREVIEW (below) */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title">2. Select pages & place signature</div>
              {pdfFile && (
                <PDFViewer
                  file={pdfFile}
                  signatureDataUrl={previewSig}
                  placements={placements}
                  selectedPages={selectedPages}
                  onPlacementsChange={setPlacements}
                  onSelectedPagesChange={setSelectedPages}
                />
              )}
            </div>

            {/* Sticky sign button */}
            <div className={`sticky-sign-wrap${canSign && !isProcessing ? ' ready' : ''}`}>
              <button
                className={`sticky-sign-btn${canSign && !isProcessing ? ' ready' : ''}`}
                onClick={handleSign}
                disabled={isProcessing || !canSign}
              >
                {isProcessing
                  ? <><span className="spinner" /> Signing…</>
                  : `✍️  Sign ${selectedPages.length > 0 ? selectedPages.length + ' page' + (selectedPages.length > 1 ? 's' : '') : ''} & Download`}
              </button>
              {!canSign && selectedPages.length === 0 && (
                <p className="sticky-sign-hint">Select at least one page above</p>
              )}
              {!canSign && selectedPages.length > 0 && (
                <p className="sticky-sign-hint">Create your signature above to continue</p>
              )}
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {step === 'done' && (
          <div className="done-wrap">
            <div className="done-icon">✅</div>
            <h2 className="done-title">Document signed!</h2>
            <p className="done-sub">Your PDF is ready. Save it to your device.</p>

            <div className="done-btns">
              <button
                className="btn-primary"
                style={{ width: '100%', maxWidth: 480, padding: '16px', fontSize: 16, borderRadius: 14 }}
                onClick={async () => {
                  await downloadOrShare(signedPdfUrl!, `signed-${pdfFile?.name || 'document.pdf'}`);
                  trackEvent('pdf_downloaded', { plan: hasSubscription ? 'pro' : 'free', watermark: willHaveWatermark, method: 'button' });
                  if (willHaveWatermark) setTimeout(() => showToast(), 400);
                }}
              >
                ⬇️  Save Signed PDF
              </button>

              <button className="btn-ghost" style={{ width: '100%', maxWidth: 480, padding: '13px', fontSize: 15 }} onClick={reset}>
                📄 Sign another document
              </button>
            </div>
          </div>
        )}

      </div>

      {/* File History — only after download (done step) */}
      {step === 'done' && (
        <div className="container" style={{ paddingTop: 0, paddingBottom: 0 }}>
          <FileHistory
            hasSubscription={hasSubscription}
            onShowPricing={() => setShowPricing(true)}
            showDlHint={showDlHint}
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
              <div style={{ background: 'white', borderRadius: 16, padding: '20px', border: '2px solid #2563eb', boxShadow: '0 4px 16px rgba(37,99,235,0.1)' }}>
                <div style={{ fontSize: 26, marginBottom: 8 }}>✍️</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Sign PDF</div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>Draw or type your signature</div>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: 20 }}>Current tool</span>
              </div>
              <a href="/fill" style={{ background: 'white', borderRadius: 16, padding: '20px', border: '1.5px solid #e2e8f0', textDecoration: 'none', display: 'block', transition: 'all 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2563eb'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(37,99,235,0.1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
              >
                <div style={{ fontSize: 26, marginBottom: 8 }}>📝</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Fill PDF Form</div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>Click to type in any field</div>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#2563eb' }}>Try it →</span>
              </a>
              <a href="/protect" style={{ background: 'white', borderRadius: 16, padding: '20px', border: '1.5px solid #e2e8f0', textDecoration: 'none', display: 'block', transition: 'all 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2563eb'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(37,99,235,0.1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
              >
                <div style={{ fontSize: 26, marginBottom: 8 }}>🔒</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Protect PDF</div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>Add password &amp; permissions</div>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#2563eb' }}>Try it →</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Compact FAQ — only on upload step */}
      {step === 'upload' && (
        <div className="container" style={{ paddingTop: 0, paddingBottom: 40 }}>
          <div className="compact-faq">
            <h2>FAQ</h2>
            <details>
              <summary>Is it free?</summary>
              <p className="faq-answer">Yes. First 2 PDFs per day, no account needed.</p>
            </details>
            <details>
              <summary>Is electronic signature legally binding?</summary>
              <p className="faq-answer">Yes. Valid under ESIGN Act, eIDAS and laws in 100+ countries.</p>
            </details>
            <details>
              <summary>Does my file get uploaded?</summary>
              <p className="faq-answer">Processed locally in your browser. Not stored on our servers.</p>
            </details>
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
              <h3 className="pricing-title">Unlock Unlimited Signing</h3>
              <p className="pricing-sub">
                {todayCount >= DAILY_LIMIT
                  ? `Free plan: watermark added after ${DAILY_LIMIT} PDFs/day. Upgrade to remove it.`
                  : 'Unlimited signing, no watermark, saved signatures and download history'
                }
              </p>
            </div>
            
            <div className="pricing-grid">

              {/* Free */}
              <div className="plan-card">
                <div className="plan-name">Free</div>
                <div className="plan-price">$0<span>/mo</span></div>
                <div className="plan-desc">2 PDFs/day without watermark</div>
                <ul className="plan-perks">
                  <li>✓ 2 PDF signings/day (no watermark)</li>
                  <li>✓ Draw or type signature</li>
                  <li>✓ No registration needed</li>
                  <li>✓ File history (24 hours)</li>
                  <li style={{ color: '#cbd5e1' }}>✗ Watermark after 2 PDFs/day</li>
                  <li style={{ color: '#cbd5e1' }}>✗ Save signatures & drafts</li>
                </ul>
                <button
                  className="plan-btn"
                  onClick={() => setShowPricing(false)}
                >
                  Current plan
                </button>
              </div>

              {/* Monthly */}
              <div className="plan-card">
                <div className="plan-name">Monthly</div>
                <div className="plan-price">$9<span>/mo</span></div>
                <div className="plan-desc">Billed monthly</div>
                <ul className="plan-perks">
                  <li>✓ Unlimited PDF signing</li>
                  <li>✓ Save & reuse signatures</li>
                  <li>✓ No watermark ever</li>
                  <li>✓ Save form drafts</li>
                  <li>✓ Permanent file history (1 year)</li>
                  <li>✓ Sign + Fill in one flow</li>
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

              {/* Annual - FEATURED */}
              <div className="plan-card plan-featured" style={{ transform: 'scale(1.04)', zIndex: 1 }}>
                <div className="plan-badge">Best Value — Save 17%</div>
                <div className="plan-name">Annual</div>
                <div className="plan-price">$7.50<span>/mo</span></div>
                <div className="plan-desc">Billed $90/year</div>
                <ul className="plan-perks">
                  <li>✓ Unlimited PDF signing</li>
                  <li>✓ Save & reuse signatures</li>
                  <li>✓ No watermark ever</li>
                  <li>✓ Save form drafts</li>
                  <li>✓ Permanent file history (1 year)</li>
                  <li>✓ Sign + Fill in one flow</li>
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

            {/* Restore Pro */}
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

      {/* Watermark Toast */}
      {showWatermarkToast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            left: 'auto',
            zIndex: 9999,
            background: '#1a1a1a',
            color: '#fff',
            borderRadius: 14,
            boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
            padding: '14px 16px 10px',
            minWidth: 300,
            maxWidth: 360,
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
          }}
          // Mobile override via inline media — handled below via window check
          className="watermark-toast"
        >
          {/* Top row: icon + text + close */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: 18, lineHeight: 1.3, flexShrink: 0 }}>✅</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.35, marginBottom: 3 }}>
                PDF signed — contains SignMyPDF watermark
              </div>
              <a
                href="#pricing"
                onClick={e => { e.preventDefault(); setShowWatermarkToast(false); setShowPricing(true); trackEvent('toast_upgrade_clicked'); }}
                style={{ fontSize: 13, color: '#60a5fa', textDecoration: 'none', fontWeight: 500 }}
              >
                Remove with Pro →
              </a>
            </div>
            <button
              onClick={() => setShowWatermarkToast(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#9ca3af',
                cursor: 'pointer',
                fontSize: 16,
                lineHeight: 1,
                padding: '2px 4px',
                flexShrink: 0,
                marginTop: -2,
              }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          {/* Progress bar */}
          <div style={{ marginTop: 10, height: 3, background: '#333', borderRadius: 2, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                background: '#2563eb',
                borderRadius: 2,
                animation: 'toastProgress 8s linear forwards',
              }}
            />
          </div>
        </div>
      )}

      {/* Toast CSS */}
      <style>{`
        @keyframes toastProgress {
          from { width: 100%; }
          to { width: 0%; }
        }
        @media (max-width: 767px) {
          .watermark-toast {
            left: 10px !important;
            right: 10px !important;
            bottom: 16px !important;
            min-width: 0 !important;
            max-width: none !important;
          }
        }
      `}</style>

      <SiteFooter />
    </>
  );
}
