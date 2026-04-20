'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import NavHeader from '../components/NavHeader';
import PDFTextEditor, { TextField } from '../components/PDFTextEditor';
import Logo from '../components/Logo';
import { fillPdfInBrowser } from '../utils/fillPdf';
import FileHistory, { saveToHistory } from '../components/FileHistory';
import { saveDraft as saveDraftUtil, consumePendingDraft } from '../utils/drafts';
import { blobToDataUrl, addWatermarkToBlob } from '../utils/watermark';

type Step = 'upload' | 'fill' | 'preview' | 'done';

// ── Inline PDF preview with page tabs ────────────────────────────────────
function FilledPDFPreview({ url }: { url: string }) {
  const [pages,   setPages]   = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [curPage, setCurPage] = useState(0); // 0-indexed

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        const resp = await fetch(url);
        const buf  = await resp.arrayBuffer();
        const pdf  = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
        const dpr  = window.devicePixelRatio || 1;
        const imgs: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page  = await pdf.getPage(i);
          const vp0   = page.getViewport({ scale: 1 });
          const baseW = Math.min(window.innerWidth - 48, 600);
          const scale = (baseW / vp0.width) * dpr;
          const vp    = page.getViewport({ scale });
          const c     = document.createElement('canvas');
          c.width  = vp.width;
          c.height = vp.height;
          await page.render({ canvas: c as any, viewport: vp }).promise;
          imgs.push(c.toDataURL('image/jpeg', 0.92));
        }
        if (!cancelled) { setPages(imgs); setLoading(false); }
      } catch (e) {
        console.error('Preview error', e);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  return (
    <div style={{ marginTop: 16, background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
          📄 Preview
        </div>
        {!loading && pages.length > 0 && (
          <div style={{ fontSize: 12, color: '#94a3b8' }}>
            {pages.length} {pages.length === 1 ? 'page' : 'pages'}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 14 }}>
          <div style={{ marginBottom: 8 }}>⏳</div>
          Rendering preview…
        </div>
      ) : (
        <>
          {/* Page tabs — only shown if more than 1 page */}
          {pages.length > 1 && (
            <div style={{
              display: 'flex', gap: 6, padding: '10px 12px',
              overflowX: 'auto', background: 'white',
              borderBottom: '1px solid #e2e8f0',
              scrollbarWidth: 'none',
            }}>
              {pages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurPage(i)}
                  style={{
                    flexShrink: 0,
                    minWidth: 36, height: 32,
                    borderRadius: 8,
                    border: `2px solid ${curPage === i ? '#2563eb' : '#e2e8f0'}`,
                    background: curPage === i ? '#eff6ff' : 'white',
                    color: curPage === i ? '#2563eb' : '#64748b',
                    fontSize: 13, fontWeight: curPage === i ? 700 : 400,
                    cursor: 'pointer',
                    padding: '0 10px',
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}

          {/* Current page image */}
          <div style={{ padding: 12 }}>
            <img
              src={pages[curPage]}
              alt={`Page ${curPage + 1}`}
              style={{
                display: 'block', width: '100%', borderRadius: 8,
                boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
                border: '1px solid #e2e8f0',
              }}
            />
          </div>

          {/* Prev / Next nav for multi-page */}
          {pages.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px 12px' }}>
              <button
                onClick={() => setCurPage(p => Math.max(0, p - 1))}
                disabled={curPage === 0}
                style={{
                  padding: '8px 16px', borderRadius: 8,
                  border: '1.5px solid #e2e8f0', background: 'white',
                  color: curPage === 0 ? '#cbd5e1' : '#334155',
                  fontSize: 13, fontWeight: 600, cursor: curPage === 0 ? 'default' : 'pointer',
                }}
              >← Prev</button>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{curPage + 1} / {pages.length}</span>
              <button
                onClick={() => setCurPage(p => Math.min(pages.length - 1, p + 1))}
                disabled={curPage === pages.length - 1}
                style={{
                  padding: '8px 16px', borderRadius: 8,
                  border: '1.5px solid #e2e8f0', background: 'white',
                  color: curPage === pages.length - 1 ? '#cbd5e1' : '#334155',
                  fontSize: 13, fontWeight: 600, cursor: curPage === pages.length - 1 ? 'default' : 'pointer',
                }}
              >Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const DAILY_LIMIT      = 2;
const SUBSCRIPTION_KEY = 'signmypdf_subscribed';

function getTodayCount(): number {
  const key = `signmypdf_count_${new Date().toISOString().split('T')[0]}`;
  return parseInt(localStorage.getItem(key) || '0', 10);
}
function incrementTodayCount() {
  const key = `signmypdf_count_${new Date().toISOString().split('T')[0]}`;
  localStorage.setItem(key, String(getTodayCount() + 1));
}
function isSubscribed(): boolean {
  return localStorage.getItem(SUBSCRIPTION_KEY) === 'true';
}

export default function FillPage() {
  const [step, setStep]                       = useState<Step>('upload');
  const [pdfFile, setPdfFile]                 = useState<File | null>(null);
  const [filledPdfUrl, setFilledPdfUrl]       = useState<string | null>(null);
  const [textFields, setTextFields]           = useState<TextField[]>([]);
  const [isProcessing, setIsProcessing]       = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [todayCount, setTodayCount]           = useState(0);
  const [showPricing, setShowPricing]         = useState(false);
  const [showWatermarkToast, setShowWatermarkToast] = useState(false);
  const [draftSaved, setDraftSaved]           = useState(false); // toast after save
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [loadedDraftName, setLoadedDraftName] = useState<string | null>(null);
  // "PDF ready" modal
  const [showReadyModal, setShowReadyModal]   = useState(false);
  const [pendingPdfUrl, setPendingPdfUrl]     = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const isDevMode = typeof window !== 'undefined' && window.location.search.includes('dev=1');
    const sub = isSubscribed() || isDevMode;
    setHasSubscription(sub);
    setTodayCount(getTodayCount());

    // Check for pending draft from dashboard
    const pendingDraft = consumePendingDraft();
    if (pendingDraft) {
      setTextFields(pendingDraft.fields);
      setLoadedDraftName(pendingDraft.name);
      setShowDraftBanner(true);
    }
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [step]);

  // Lock viewport zoom for the entire fill page — prevents iOS Safari
  // from zooming on input focus, canvas resize, or any layout shift
  useEffect(() => {
    const viewport = document.querySelector('meta[name=viewport]');
    if (!viewport) return;
    const orig = viewport.getAttribute('content') || '';
    viewport.setAttribute('content', orig + ', maximum-scale=1');
    return () => viewport.setAttribute('content', orig);
  }, []);

  const willHaveWatermark = !hasSubscription && todayCount >= DAILY_LIMIT;

  const trackEvent = (name: string, params?: Record<string, string | boolean | number>) => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    try {
      (window as any).gtag?.('event', name, { device: isMobile ? 'mobile' : 'desktop', ...params });
    } catch {}
  };

  const onDrop = useCallback((files: File[]) => {
    const f = files[0];
    if (f?.type === 'application/pdf') {
      setPdfFile(f);
      setTextFields([]);
      setStep('fill');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    noClick: true,
  });

  // Generate PDF and go to preview (no watermark on preview)
  const handlePreview = async () => {
    if (!pdfFile) return;
    setIsProcessing(true);
    try {
      const blob = await fillPdfInBrowser({ pdfFile, textFields, addWatermark: false });
      setFilledPdfUrl(URL.createObjectURL(blob));
      setStep('preview');
    } catch (err: any) {
      alert('Error: ' + (err?.message || 'unknown'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate PDF and show "ready" modal
  const handleDownload = async () => {
    if (!pdfFile) return;
    setIsProcessing(true);
    try {
      // Always generate clean PDF for history
      const cleanBlob = await fillPdfInBrowser({ pdfFile, textFields, addWatermark: false });
      const cleanUrl = URL.createObjectURL(cleanBlob);

      // For download: add watermark if needed
      let downloadUrl = cleanUrl;
      if (willHaveWatermark) {
        const wBlob = await addWatermarkToBlob(cleanBlob);
        downloadUrl = URL.createObjectURL(wBlob);
      }

      setFilledPdfUrl(cleanUrl);
      setPendingPdfUrl(cleanUrl);
      // Store downloadUrl so doSave can use it
      (window as any).__fillDownloadUrl = downloadUrl;

      trackEvent('pdf_filled', { plan: hasSubscription ? 'pro' : 'free', fields: textFields.length, watermark: willHaveWatermark });
      setShowReadyModal(true);
    } catch (err: any) {
      alert('Error: ' + (err?.message || 'unknown'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Save from preview step — also show ready modal
  const handleSaveFromPreview = async () => {
    if (!filledPdfUrl) return;
    setPendingPdfUrl(filledPdfUrl);
    // If watermark needed, generate watermarked version
    if (willHaveWatermark) {
      try {
        const res = await fetch(filledPdfUrl);
        const blob = await res.blob();
        const wBlob = await addWatermarkToBlob(blob);
        const wUrl = URL.createObjectURL(wBlob);
        (window as any).__fillDownloadUrl = wUrl;
      } catch {}
    } else {
      (window as any).__fillDownloadUrl = undefined;
    }
    trackEvent('pdf_filled', { plan: hasSubscription ? 'pro' : 'free', fields: textFields.length, watermark: willHaveWatermark });
    setShowReadyModal(true);
  };

  // "Download as is" from ready modal
  const handleDownloadAsIs = async () => {
    setShowReadyModal(false);
    const downloadUrl = (window as any).__fillDownloadUrl as string | undefined;
    await doSave(pendingPdfUrl!, downloadUrl);
    incrementTodayCount();
    setTodayCount(getTodayCount());
    setStep('done');
  };

  // "Add Signature →" — save filled PDF to sessionStorage, redirect to /
  const handleGoToSign = async () => {
    if (!pendingPdfUrl || !pdfFile) return;
    setShowReadyModal(false);
    try {
      const res  = await fetch(pendingPdfUrl);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        sessionStorage.setItem('signmypdf_pending_fill_pdf', reader.result as string);
        sessionStorage.setItem('signmypdf_pending_fill_name', `filled-${pdfFile.name}`);
        window.location.href = '/';
      };
      reader.readAsDataURL(blob);
    } catch {
      // Fallback: just redirect
      window.location.href = '/';
    }
  };

  const doSave = async (cleanUrl: string, downloadUrl?: string) => {
    const filename = `filled-${pdfFile?.name || 'document.pdf'}`;
    const urlToDownload = downloadUrl || cleanUrl;
    await downloadOrShare(urlToDownload, filename);
    // Save CLEAN version to history
    try {
      const res = await fetch(cleanUrl);
      const blob = await res.blob();
      const dataUrl = await blobToDataUrl(blob);
      saveToHistory(filename, blob.size, dataUrl, 'fill');
      window.dispatchEvent(new Event('signmypdf:saved'));
    } catch {}
    if (willHaveWatermark) setTimeout(() => showToast(), 400);
  };

  const downloadOrShare = async (url: string, filename: string) => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOS && navigator.share) {
      try {
        const res  = await fetch(url);
        const blob = await res.blob();
        const file = new File([blob], filename, { type: 'application/pdf' });
        await navigator.share({ files: [file], title: filename });
        return;
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
      }
    }
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const showToast = () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setShowWatermarkToast(true);
    toastTimerRef.current = setTimeout(() => setShowWatermarkToast(false), 8000);
  };

  const reset = () => {
    setPdfFile(null);
    setFilledPdfUrl(null);
    setTextFields([]);
    setStep('upload');
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveDraft = () => {
    if (!pdfFile || !hasContent) return;
    saveDraftUtil(pdfFile.name, textFields);
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f?.type === 'application/pdf') {
      setPdfFile(f);
      setTextFields([]);
    }
    e.target.value = '';
  };

  const hasContent = textFields.some(f => f.text.trim());

  return (
    <>
      <NavHeader activeTool="fill" />

      <div className="container">

        {/* ── STEPS BAR (fill / preview / done) ── */}
        {step !== 'upload' && (
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, gap: 0 }}>
            {[
              { id: 'fill',    label: 'Edit',    n: 1 },
              { id: 'preview', label: 'Preview', n: 2 },
              { id: 'done',    label: 'Done',    n: 3 },
            ].map((s, i) => {
              const stepOrder = { fill: 1, preview: 2, done: 3 } as Record<string, number>;
              const curOrder  = stepOrder[step] ?? 1;
              const sOrder    = s.n;
              const isActive  = sOrder === curOrder;
              const isDone    = sOrder < curOrder;
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: s.n < 3 ? 1 : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: isDone ? '#16a34a' : isActive ? '#2563eb' : '#e2e8f0',
                      color: isDone || isActive ? 'white' : '#94a3b8',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: isDone ? 14 : 13, fontWeight: 700,
                      transition: 'all 0.2s',
                    }}>
                      {isDone ? '✓' : s.n}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: isActive ? 700 : 400, color: isActive ? '#2563eb' : isDone ? '#16a34a' : '#94a3b8', whiteSpace: 'nowrap' }}>
                      {s.label}
                    </span>
                  </div>
                  {s.n < 3 && (
                    <div style={{ flex: 1, height: 2, background: isDone ? '#16a34a' : '#e2e8f0', margin: '0 6px', marginBottom: 18, transition: 'background 0.3s' }} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── UPLOAD ── */}
        {step === 'upload' && (
          <div>
            <h1 className="hero-title">Fill PDF Form Online Free</h1>
            <p className="hero-sub">Click any field and type. No software, no registration.</p>

            <div {...getRootProps()} className={`dropzone${isDragActive ? ' active' : ''}`}>
              <input {...getInputProps()} />
              <div className="dz-icon">📋</div>
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

            {/* Draft loaded banner */}
            {showDraftBanner && loadedDraftName && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 14, padding: '12px 16px', marginBottom: 20 }}>
                <span style={{ fontSize: 18 }}>📂</span>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1d4ed8' }}>
                  Draft "{loadedDraftName}" loaded — upload a PDF to apply it
                </div>
                <button onClick={() => setShowDraftBanner(false)} style={{ fontSize: 18, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}>×</button>
              </div>
            )}

            <div className="features">
              {[
                { icon: '👆', title: 'Click to type', desc: 'Add text anywhere on the PDF' },
                { icon: '🔒', title: 'Private & secure', desc: 'File stays in your browser' },
                { icon: '⚡', title: 'Instant download', desc: 'Done in under a minute' },
              ].map(f => (
                <div className="feat" key={f.title}>
                  <div className="feat-icon">{f.icon}</div>
                  <div className="feat-title">{f.title}</div>
                  <div className="feat-desc">{f.desc}</div>
                </div>
              ))}
            </div>

            {/* File History */}
            <FileHistory
              hasSubscription={hasSubscription}
              onShowPricing={() => setShowPricing(true)}
            />

            {/* More PDF Tools */}
            <div style={{ marginTop: 48, borderTop: '1px solid #e2e8f0', paddingTop: 32 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#64748b', textAlign: 'center', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                More PDF Tools
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, maxWidth: 440, margin: '0 auto' }}>
                <a href="/" style={{ background: 'white', borderRadius: 16, padding: '20px', border: '1.5px solid #e2e8f0', textDecoration: 'none', display: 'block', transition: 'all 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2563eb'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(37,99,235,0.1)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                >
                  <div style={{ fontSize: 28, marginBottom: 8 }}>✍️</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Sign PDF</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>Draw or type your signature</div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#2563eb' }}>Try it →</span>
                </a>
                <div style={{ background: 'white', borderRadius: 16, padding: '20px', border: '2px solid #2563eb', boxShadow: '0 4px 16px rgba(37,99,235,0.1)' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📝</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Fill PDF Form</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>Click to type in any field</div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: 20 }}>Current tool</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── FILL ── */}
        {step === 'fill' && (
          /* Two-column on desktop: editor (left) + sidebar (right) */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, alignItems: 'start' }} className="fill-layout">
            {/* Left — PDF editor — min-width:0 prevents canvas from blowing grid width */}
            <div style={{ minWidth: 0 }}>
              {/* Mobile-only top bar: file change + plan badge */}
              <div className="fill-mobile-top">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                  <div className="doc-badge" style={{ width: 22, height: 22, fontSize: 7, flexShrink: 0 }}>PDF</div>
                  <span style={{ fontSize: 12, color: '#334155', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{pdfFile?.name}</span>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                    🔄 Change
                    <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" style={{ display: 'none' }} onChange={handleFileChange} />
                  </label>
                </div>
                {!hasSubscription && (
                  <div style={{ fontSize: 11, color: todayCount >= DAILY_LIMIT ? '#d97706' : '#64748b', background: todayCount >= DAILY_LIMIT ? '#fffbeb' : '#f8fafc', padding: '5px 10px', borderRadius: 8, border: `1px solid ${todayCount >= DAILY_LIMIT ? '#fcd34d' : '#e2e8f0'}`, flexShrink: 0, whiteSpace: 'nowrap' }}>
                    {todayCount >= DAILY_LIMIT ? `⚠️ Watermark` : `📄 ${todayCount}/${DAILY_LIMIT} free`}
                  </div>
                )}
                {hasSubscription && (
                  <div style={{ fontSize: 11, color: '#16a34a', background: '#f0fdf4', padding: '5px 10px', borderRadius: 8, border: '1px solid #bbf7d0', flexShrink: 0 }}>⭐ Pro</div>
                )}
              </div>
              {/* Hint */}
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#1d4ed8' }}>
                👆 <strong>Click anywhere on the document</strong> to add a text field · drag <strong>⠿</strong> to move
              </div>
              <div className="card" style={{ padding: 16 }}>
                {pdfFile && (
                  <PDFTextEditor
                    file={pdfFile}
                    textFields={textFields}
                    onTextFieldsChange={setTextFields}
                  />
                )}
              </div>
            </div>

            {/* Right — sticky sidebar */}
            <div style={{ position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>

              <div className="fill-sidebar-info">
                {/* File info */}
                <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div className="doc-badge" style={{ width: 28, height: 28, fontSize: 8, flexShrink: 0 }}>PDF</div>
                    <span style={{ fontSize: 13, color: '#334155', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pdfFile?.name}</span>
                  </div>
                  <label style={{ display: 'block', width: '100%', fontSize: 12, fontWeight: 600, color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px', cursor: 'pointer', textAlign: 'center' }}>
                    🔄 Change file
                    <input type="file" accept="application/pdf,.pdf" style={{ display: 'none' }} onChange={handleFileChange} />
                  </label>
                </div>

                {/* Plan badge */}
                {!hasSubscription && (
                  <div style={{ fontSize: 12, color: todayCount >= DAILY_LIMIT ? '#d97706' : '#64748b', background: todayCount >= DAILY_LIMIT ? '#fffbeb' : '#f8fafc', padding: '8px 12px', borderRadius: 10, border: `1px solid ${todayCount >= DAILY_LIMIT ? '#fcd34d' : '#e2e8f0'}`, textAlign: 'center' }}>
                    {todayCount >= DAILY_LIMIT ? `⚠️ Watermark after PDF #${DAILY_LIMIT + 1}` : `📄 ${todayCount}/${DAILY_LIMIT} free today`}
                  </div>
                )}
                {hasSubscription && (
                  <div style={{ fontSize: 12, color: '#16a34a', background: '#f0fdf4', padding: '8px 12px', borderRadius: 10, border: '1px solid #bbf7d0', textAlign: 'center' }}>⭐ Premium active</div>
                )}
              </div>

              {/* Field count */}
              {textFields.length > 0 && (
                <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center', padding: '4px 0' }}>
                  {textFields.filter(f => f.text.trim()).length} of {textFields.length} field{textFields.length !== 1 ? 's' : ''} filled
                </div>
              )}

              {/* Save draft — visible to all, gated for free users */}
              <div style={{ position: 'relative' }}>
                <button
                  style={{
                    width: '100%', padding: '10px', fontSize: 13, borderRadius: 10,
                    border: '1.5px dashed #cbd5e1',
                    background: hasSubscription ? '#f8fafc' : '#f8fafc',
                    color: hasSubscription ? '#475569' : '#94a3b8',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                  onClick={() => hasSubscription ? handleSaveDraft() : setShowPricing(true)}
                  disabled={hasSubscription && (!hasContent || isProcessing)}
                >
                  {draftSaved ? '✅ Draft saved!' : (
                    <>💾 Save draft{!hasSubscription && <span style={{ fontSize: 10, background: '#e0e7ff', color: '#4f46e5', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>PRO</span>}</>
                  )}
                </button>
              </div>

              {/* Action buttons — at bottom of sidebar */}
              <button
                className="btn-ghost"
                style={{ width: '100%', padding: '13px', fontSize: 15, borderRadius: 12 }}
                onClick={handlePreview}
                disabled={isProcessing || !hasContent}
              >
                {isProcessing ? <><span className="spinner" /></> : '👁 Preview'}
              </button>
              <button
                className="btn-primary"
                style={{ width: '100%', padding: '13px', fontSize: 15, borderRadius: 12 }}
                onClick={handleDownload}
                disabled={isProcessing || !hasContent}
              >
                {isProcessing ? <><span className="spinner" /> Processing…</> : '⬇️ Save PDF'}
              </button>
              {!hasContent && (
                <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', margin: 0 }}>
                  Add text to the document to continue
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── PREVIEW ── */}
        {step === 'preview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 24, alignItems: 'start' }} className="fill-layout">
            {/* Left — preview */}
            <div style={{ minWidth: 0 }}>
              <FilledPDFPreview url={filledPdfUrl!} />
            </div>

            {/* Right — sticky sidebar */}
            <div style={{ position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 13, color: '#64748b', textAlign: 'center', fontWeight: 500 }}>
                Looks good?
              </div>
              <button
                className="btn-ghost"
                style={{ width: '100%', padding: '11px', fontSize: 14, borderRadius: 12 }}
                onClick={() => setStep('fill')}
              >
                ✏️ Back to edit
              </button>
              <button
                className="btn-primary"
                style={{ width: '100%', padding: '13px', fontSize: 15, borderRadius: 12 }}
                onClick={handleSaveFromPreview}
              >
                ⬇️ Save PDF
              </button>
              <button
                style={{ width: '100%', padding: '10px', fontSize: 13, borderRadius: 12, border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer' }}
                onClick={reset}
              >
                📄 Start over
              </button>
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {step === 'done' && (
          <div className="done-wrap">
            <div className="done-icon">✅</div>
            <h2 className="done-title">PDF saved!</h2>
            <p className="done-sub">Your filled document has been saved to your device.</p>

            <button className="btn-primary" style={{ width: '100%', padding: '16px', fontSize: 16, marginBottom: 12, borderRadius: 16 }}
              onClick={() => doSave(filledPdfUrl!)}>
              ⬇️ Save again
            </button>

            <button className="btn-ghost" style={{ width: '100%', padding: '14px', fontSize: 15 }} onClick={reset}>
              📄 Fill another document
            </button>

            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <a href="/" style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
                Need to sign a PDF instead? →
              </a>
            </div>

            <FileHistory
              hasSubscription={hasSubscription}
              onShowPricing={() => setShowPricing(true)}
            />
          </div>
        )}

      </div>

      {/* Pricing modal */}
      {showPricing && (
        <div className="modal-overlay" onClick={() => setShowPricing(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowPricing(false)}>✕</button>
            <div className="pricing-header">
              <div style={{ fontSize: 28, marginBottom: 6 }}>🚀</div>
              <h3 className="pricing-title">Unlock Unlimited PDF Tools</h3>
              <p className="pricing-sub">
                {todayCount >= DAILY_LIMIT
                  ? `Free plan: watermark added after ${DAILY_LIMIT} PDFs/day. Upgrade to remove it.`
                  : 'Unlimited PDFs per day, no watermark, and more'}
              </p>
            </div>
            <div className="pricing-grid">
              <div className="plan-card">
                <div className="plan-name">Free</div>
                <div className="plan-price">$0<span>/mo</span></div>
                <div className="plan-desc">2 PDFs/day without watermark</div>
                <ul className="plan-perks">
                  <li>✓ 2 PDFs/day (no watermark)</li>
                  <li>✓ Sign & fill PDFs</li>
                  <li>✓ No registration needed</li>
                  <li style={{ color: '#cbd5e1' }}>✗ Watermark after 2 PDFs/day</li>
                </ul>
                <button className="plan-btn" onClick={() => setShowPricing(false)}>Current plan</button>
              </div>
              <div className="plan-card">
                <div className="plan-name">Monthly</div>
                <div className="plan-price">$9<span>/mo</span></div>
                <div className="plan-desc">Billed monthly</div>
                <ul className="plan-perks">
                  <li>✓ Unlimited PDFs per day</li>
                  <li>✓ No watermark ever</li>
                  <li>✓ Save form drafts</li>
                  <li>✓ 1 year document history</li>
                  <li>✓ Sign + Fill in one flow</li>
                </ul>
                <button className="plan-btn" onClick={() => {
                  localStorage.setItem(SUBSCRIPTION_KEY, 'true');
                  setHasSubscription(true);
                  setShowPricing(false);
                  alert('✅ Premium activated! (Demo mode)');
                }}>Get Monthly</button>
              </div>
              <div className="plan-card plan-featured" style={{ transform: 'scale(1.04)', zIndex: 1 }}>
                <div className="plan-badge">Best Value — Save 17%</div>
                <div className="plan-name">Annual</div>
                <div className="plan-price">$7.50<span>/mo</span></div>
                <div className="plan-desc">Billed $90/year</div>
                <ul className="plan-perks">
                  <li>✓ Unlimited PDFs per day</li>
                  <li>✓ No watermark ever</li>
                  <li>✓ Save form drafts</li>
                  <li>✓ 1 year document history</li>
                  <li>✓ Sign + Fill in one flow</li>
                </ul>
                <button className="plan-btn plan-btn-featured" onClick={() => {
                  localStorage.setItem(SUBSCRIPTION_KEY, 'true');
                  setHasSubscription(true);
                  setShowPricing(false);
                  alert('✅ Premium activated! (Demo mode)');
                }}>Get Annual Plan</button>
              </div>
            </div>
            <p className="pricing-fine">Cancel anytime · Secure payment · No hidden fees</p>
          </div>
        </div>
      )}

      {/* Watermark Toast */}
      {showWatermarkToast && (
        <div
          className="watermark-toast"
          style={{
            position: 'fixed', bottom: 24, right: 24, left: 'auto',
            zIndex: 9999, background: '#1a1a1a', color: '#fff',
            borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
            padding: '14px 16px 10px', minWidth: 300, maxWidth: 360,
            display: 'flex', flexDirection: 'column', gap: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: 18, lineHeight: 1.3, flexShrink: 0 }}>✅</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.35, marginBottom: 3 }}>
                PDF filled — contains SignMyPDF watermark
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
              style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 16, padding: '2px 4px', flexShrink: 0 }}
            >✕</button>
          </div>
          <div style={{ marginTop: 10, height: 3, background: '#333', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#2563eb', borderRadius: 2, animation: 'toastProgress 8s linear forwards' }} />
          </div>
        </div>
      )}

      {/* ── "PDF ready" modal ── */}
      {showReadyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setShowReadyModal(false)}>
          <div style={{ background: '#fff', borderRadius: 24, padding: '36px 32px', maxWidth: 420, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.18)', textAlign: 'center' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>📄✅</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: -0.3 }}>
              Your PDF is ready!
            </h3>
            <p style={{ fontSize: 15, color: '#64748b', margin: '0 0 28px', lineHeight: 1.6 }}>
              Want to also add your signature?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={handleGoToSign}
                style={{ padding: '14px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', letterSpacing: -0.2 }}
              >
                ✍️ Add Signature →
              </button>
              <button
                onClick={handleDownloadAsIs}
                style={{ padding: '13px 24px', background: '#f8fafc', color: '#475569', border: '1.5px solid #e2e8f0', borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
              >
                ⬇️ Download as is
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes toastProgress { from { width: 100%; } to { width: 0%; } }
        @media (max-width: 767px) {
          .watermark-toast { left: 10px !important; right: 10px !important; bottom: 16px !important; min-width: 0 !important; max-width: none !important; }
        }
      `}</style>

      {/* Footer */}
      <footer style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '32px 0 24px', marginTop: 48 }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 24, marginBottom: 24 }}>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>SignMyPDF</h4>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>Simple and secure PDF tools. No registration required.</p>
            </div>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>Contact</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 14, color: '#64748b', lineHeight: 2 }}>
                <li>📧 support@signmypdf.io</li>
                <li>🌐 https://signmypdf.io</li>
              </ul>
            </div>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>PDF Tools</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13, lineHeight: 1.8 }}>
                <li><a href="/" style={{ color: '#64748b', textDecoration: 'none' }}>Sign PDF</a></li>
                <li><a href="/fill" style={{ color: '#64748b', textDecoration: 'none' }}>Fill PDF Form</a></li>
                <li><a href="/blog" style={{ color: '#64748b', textDecoration: 'none' }}>Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>Legal</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13, lineHeight: 1.8 }}>
                <li><a href="/terms" style={{ color: '#64748b', textDecoration: 'none' }}>Terms of Service</a></li>
                <li><a href="/privacy" style={{ color: '#64748b', textDecoration: 'none' }}>Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16, textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
            © {new Date().getFullYear()} PIXELTIDE LLC. All rights reserved. · <a href="/terms" style={{ color: '#94a3b8' }}>Terms</a> · <a href="/privacy" style={{ color: '#94a3b8' }}>Privacy</a>
          </div>
        </div>
      </footer>
    </>
  );
}
