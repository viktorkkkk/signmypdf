'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import SignatureCanvas from './components/SignatureCanvas';
import PDFViewer, { SignaturePlacement } from './components/PDFViewer';
import SavedSignatures, { saveSig, SavedSig } from './components/SavedSignatures';
import Logo from './components/Logo';
import FileHistory, { saveToHistory, HistoryItem } from './components/FileHistory';
import { signPdfInBrowser } from './utils/signPdf';

type Step = 'upload' | 'sign' | 'done';

const STEPS = [
  { id: 'upload', label: 'Upload PDF' },
  { id: 'sign',   label: 'Add Signature' },
  { id: 'done',   label: 'Download' },
];

const DAILY_LIMIT = 2;
const SUBSCRIPTION_KEY = 'signmypdf_subscribed';

function getTodayCount(): number {
  const today = new Date().toISOString().split('T')[0];
  const key = `signmypdf_count_${today}`;
  const raw = localStorage.getItem(key);
  return raw ? parseInt(raw, 10) : 0;
}

function incrementTodayCount() {
  const today = new Date().toISOString().split('T')[0];
  const key = `signmypdf_count_${today}`;
  const count = getTodayCount();
  localStorage.setItem(key, String(count + 1));
}

function isSubscribed(): boolean {
  return localStorage.getItem(SUBSCRIPTION_KEY) === 'true';
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
  const [todayCount, setTodayCount] = useState(0);
  const [selectedSigId, setSelectedSigId] = useState<string | null>(null);
  const [pendingDownload, setPendingDownload] = useState<HistoryItem | null>(null);
  const [showWatermarkToast, setShowWatermarkToast] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check subscription and count on mount
  useEffect(() => {
    // Dev mode check via URL
    const isDevMode = typeof window !== 'undefined' && window.location.search.includes('dev=1');
    setHasSubscription(isSubscribed() || isDevMode);
    setTodayCount(getTodayCount());
    
    // Check for pending PDF from blog
    const pendingPdf = localStorage.getItem('blog_pending_pdf');
    const pendingPdfName = localStorage.getItem('blog_pending_pdf_name');
    if (pendingPdf && pendingPdfName) {
      // Convert base64 to File
      fetch(pendingPdf)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], pendingPdfName, { type: 'application/pdf' });
          setPdfFile(file);
          setStep('sign');
          // Clear pending
          localStorage.removeItem('blog_pending_pdf');
          localStorage.removeItem('blog_pending_pdf_name');
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
    canvas.width = 400;
    canvas.height = 100;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'transparent';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `italic 48px ${selectedFont}`;
    ctx.fillStyle = '#1e3a8a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);
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
  const canSignToday = hasSubscription || todayCount < DAILY_LIMIT;

  const handleSign = async () => {
    if (!pdfFile || !canSign) return;

    // Check daily limit
    if (!canSignToday) {
      setShowPricing(true);
      return;
    }

    setIsProcessing(true);
    try {
      const activePlacements = placements.filter(p => selectedPages.includes(p.page));

      // 100% client-side — no server, no size limits
      const blob = await signPdfInBrowser({
        pdfFile,
        signatureDataUrl: signatureData,
        typedName,
        signMode: signMode as 'draw' | 'type',
        placements: activePlacements,
        addWatermark: !hasSubscription,
      });
      const url = URL.createObjectURL(blob);
      setSignedPdfUrl(url);

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
        if (!hasSubscription) setTimeout(() => showToast(), 400);
      }

      // Save to history
      const reader = new FileReader();
      reader.onload = () => {
        saveToHistory(pdfFile!.name, blob.size, reader.result as string);
        window.dispatchEvent(new Event('signmypdf:saved'));
      };
      reader.readAsDataURL(blob);

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
    toastTimerRef.current = setTimeout(() => setShowWatermarkToast(false), 5000);
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
      <header className="header">
        <div className="header-inner">
          <a href="/" className="logo"><Logo /></a>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <a href="/blog" style={{ color: '#475569', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
              Blog
            </a>
            <span className="header-tag">🔒 No registration required</span>
          </nav>
        </div>
      </header>

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

      <div className="container">

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
            <div className="features">
              {[
                { icon: '⚡', title: 'Instant signing', desc: 'Done in under 30 seconds' },
                { icon: '🔒', title: 'Private & secure', desc: 'File stays in your browser' },
                { icon: '✅', title: 'Legally binding', desc: 'Accepted worldwide' },
              ].map(f => (
                <div className="feat" key={f.title}>
                  <div className="feat-icon">{f.icon}</div>
                  <div className="feat-title">{f.title}</div>
                  <div className="feat-desc">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SIGN ── */}
        {step === 'sign' && (
          <div>
            <div className="step-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <h2 className="step-title">Sign your document</h2>
              {!hasSubscription && (
                <div style={{ fontSize: 13, color: todayCount >= DAILY_LIMIT ? '#d97706' : '#64748b', background: todayCount >= DAILY_LIMIT ? '#fffbeb' : '#f8fafc', padding: '6px 12px', borderRadius: 8, border: `1px solid ${todayCount >= DAILY_LIMIT ? '#fcd34d' : '#e2e8f0'}` }}>
                  {todayCount >= DAILY_LIMIT 
                    ? `📄 ${todayCount}/${DAILY_LIMIT} used — upgrade to save`
                    : `📄 ${todayCount}/${DAILY_LIMIT} free signatures today`
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

            {/* Sign button */}
            <button
              className="btn-primary full"
              style={{ 
                padding: '16px', 
                fontSize: 16, 
                borderRadius: 16,
              }}
              onClick={handleSign}
              disabled={isProcessing || !canSign}
            >
              {isProcessing
                ? <><span className="spinner" /> Signing...</>
                : `✍️  Sign ${selectedPages.length > 0 ? selectedPages.length + ' page' + (selectedPages.length > 1 ? 's' : '') : ''} & Download`}
            </button>
            
            {selectedPages.length === 0 && (
              <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 8 }}>
                Select at least one page to sign above
              </p>
            )}
          </div>
        )}

        {/* ── DONE ── */}
        {step === 'done' && (
          <div className="done-wrap">
            <div className="done-icon">✅</div>
            <h2 className="done-title">Document signed!</h2>
            <p className="done-sub">Your PDF is ready. Save it to your device.</p>

            {/* Primary action — save */}
            <button
              className="btn-primary"
              style={{ width: '100%', padding: '18px', fontSize: 18, marginBottom: 12, borderRadius: 16 }}
              onClick={async () => {
                await downloadOrShare(signedPdfUrl!, `signed-${pdfFile?.name || 'document.pdf'}`);
                if (!hasSubscription) setTimeout(() => showToast(), 400);
              }}
            >
              ⬇️  Save Signed PDF
            </button>

            <button className="btn-ghost" style={{ width: '100%', padding: '14px', fontSize: 15 }} onClick={reset}>
              📄 Sign another document
            </button>
          </div>
        )}

      </div>

      {/* File History — sticky bottom bar */}
      <div className="container">
      <FileHistory 
        hasSubscription={hasSubscription}
        onDownload={(item: HistoryItem, canDownload: boolean) => {
          if (canDownload) {
            downloadOrShare(item.dataUrl, `signed-${item.name}`);
          } else {
            setPendingDownload(item);
            setShowPricing(true);
          }
        }}
      />
      </div>

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
                  ? `Free plan: ${DAILY_LIMIT} signatures per day. Upgrade to save your signed document.`
                  : 'Unlimited signing, saved signatures, and download history with premium'
                }
              </p>
            </div>
            
            <div className="pricing-grid">

              {/* Free */}
              <div className="plan-card">
                <div className="plan-name">Free</div>
                <div className="plan-price">$0<span>/mo</span></div>
                <div className="plan-desc">2 PDFs per day</div>
                <ul className="plan-perks">
                  <li>✓ 2 PDF signings/day</li>
                  <li>✓ Draw or type signature</li>
                  <li>✓ No registration needed</li>
                  <li style={{ color: '#cbd5e1' }}>✗ SignMyPDF watermark</li>
                  <li style={{ color: '#cbd5e1' }}>✗ Save signatures</li>
                  <li style={{ color: '#cbd5e1' }}>✗ Download history</li>
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
                  <li>✓ No watermark</li>
                  <li>✓ Download history</li>
                  <li>✓ Priority support</li>
                </ul>
                <button
                  className="plan-btn"
                  onClick={() => {
                    localStorage.setItem(SUBSCRIPTION_KEY, 'true');
                    setHasSubscription(true);
                    setShowPricing(false);
                    alert('✅ Premium activated! (Demo mode)');
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
                  <li>✓ No watermark</li>
                  <li>✓ Download history</li>
                  <li>✓ Priority support</li>
                </ul>
                <button
                  className="plan-btn plan-btn-featured"
                  onClick={() => {
                    localStorage.setItem(SUBSCRIPTION_KEY, 'true');
                    setHasSubscription(true);
                    setShowPricing(false);
                    alert('✅ Premium activated! (Demo mode)');
                  }}
                >
                  Get Annual Plan
                </button>
              </div>

            </div>

            <p className="pricing-fine">Cancel anytime · Secure payment · No hidden fees</p>
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
                onClick={e => { e.preventDefault(); setShowWatermarkToast(false); setShowPricing(true); }}
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
                animation: 'toastProgress 5s linear forwards',
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

      {/* Footer */}
      <footer style={{
        background: '#f8fafc',
        borderTop: '1px solid #e2e8f0',
        padding: '32px 0 24px',
        marginTop: 48,
      }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 24,
            marginBottom: 24,
          }}>
            {/* Company Info */}
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>
                SignMyPDF
              </h4>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                Simple and secure PDF signing tool. No registration required. 
                Sign your documents online.
              </p>
            </div>

            {/* Contacts */}
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>
                Contact
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 14, color: '#64748b', lineHeight: 2 }}>
                <li>📧 support@signmypdf.io</li>
                <li>🌐 https://signmypdf.io</li>
              </ul>
            </div>

            {/* Blog */}
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>
                Resources
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13, lineHeight: 1.8 }}>
                <li>
                  <a href="/blog" style={{ color: '#64748b', textDecoration: 'none' }}>
                    Blog
                  </a>
                </li>
                <li>
                  <a href="/blog/how-to-sign-pdf-online-free" style={{ color: '#64748b', textDecoration: 'none' }}>
                    How to Sign PDF
                  </a>
                </li>
                <li>
                  <a href="/blog/electronic-signature-legality" style={{ color: '#64748b', textDecoration: 'none' }}>
                    E-Signature Legal Guide
                  </a>
                </li>
                <li>
                  <a href="/blog/sign-pdf-iphone-ipad" style={{ color: '#64748b', textDecoration: 'none' }}>
                    Sign on iPhone/iPad
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>
                Legal
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13, lineHeight: 1.8 }}>
                <li>
                  <a href="/terms" style={{ color: '#64748b', textDecoration: 'none' }}>
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="/privacy" style={{ color: '#64748b', textDecoration: 'none' }}>
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>

            {/* About */}
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>
                Company
              </h4>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                PIXELTIDE LLC<br />
                833 Saint Vincent<br />
                Irvine, CA 92618, USA
              </p>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{
            borderTop: '1px solid #e2e8f0',
            paddingTop: 16,
            textAlign: 'center',
            fontSize: 12,
            color: '#94a3b8',
          }}>
            © {new Date().getFullYear()} PIXELTIDE LLC. All rights reserved. · <a href="/terms" style={{ color: '#94a3b8' }}>Terms</a> · <a href="/privacy" style={{ color: '#94a3b8' }}>Privacy</a>
          </div>
        </div>
      </footer>
    </>
  );
}
