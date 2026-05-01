'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  FileText,
  FileSignature,
  FormInput,
  Lock,
  Zap,
  CheckCircle,
  AlertTriangle,
  Star,
  Pencil,
  PenLine,
  Download,
  RefreshCw,
  Save,
  Eye,
  X,
  FolderOpen,
  MousePointerClick,
  Plus,
  Loader2,
  Files,
  Minimize2,
} from 'lucide-react';
import NavHeader from '../components/NavHeader';
import SiteFooter from '../components/SiteFooter';
import PDFTextEditor, { TextField } from '../components/PDFTextEditor';
import Logo from '../components/Logo';
import { fillPdfInBrowser } from '../utils/fillPdf';
import FileHistory, { saveToHistory } from '../components/FileHistory';
import PaywallModal from '../components/PaywallModal';
import { saveDraft as saveDraftUtil, consumePendingDraft, getDrafts } from '../utils/drafts';
import { addWatermarkToBlob } from '../utils/watermark';
import { isProActive, activateSubscription } from '../utils/subscription';
import { SUBSCRIPTION_KEY as SUB_KEY, PADDLE_CLIENT_TOKEN } from '../constants';

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
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <FileText size={16} color="#2563eb" /> Preview
        </div>
        {!loading && pages.length > 0 && (
          <div style={{ fontSize: 12, color: '#94a3b8' }}>
            {pages.length} {pages.length === 1 ? 'page' : 'pages'}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 14 }}>
          <div style={{ marginBottom: 8, display: 'inline-flex', justifyContent: 'center' }}>
            <Loader2 size={22} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
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
const SUBSCRIPTION_KEY = SUB_KEY;

// Paddle global already declared in app/page.tsx

function getTodayCount(): number {
  const key = `signmypdf_count_${new Date().toISOString().split('T')[0]}`;
  return parseInt(localStorage.getItem(key) || '0', 10);
}
function incrementTodayCount() {
  const key = `signmypdf_count_${new Date().toISOString().split('T')[0]}`;
  localStorage.setItem(key, String(getTodayCount() + 1));
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
  const [showDlHint, setShowDlHint]           = useState(false);
  const [loadedDraftName, setLoadedDraftName] = useState<string | null>(null);
  // "PDF ready" modal
  const [showReadyModal, setShowReadyModal]   = useState(false);
  const [pendingPdfUrl, setPendingPdfUrl]     = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [localDrafts, setLocalDrafts] = useState<import('../utils/drafts').Draft[]>([]);
  const [dismissedDraftBanner, setDismissedDraftBanner] = useState(false);

  useEffect(() => {
    const sub = isProActive();
    setHasSubscription(sub);
    setTodayCount(getTodayCount());

    // Check for pending draft from dashboard
    const pendingDraft = consumePendingDraft();
    if (pendingDraft) {
      setTextFields(pendingDraft.fields);
      setLoadedDraftName(pendingDraft.name);
      setShowDraftBanner(true);
    }

    // Load localStorage drafts for banner
    const drafts = getDrafts();
    if (drafts.length > 0) setLocalDrafts(drafts);

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
            }
          },
        });
      };
      document.head.appendChild(script);
    } else if (window.Paddle) {
      window.Paddle.Initialize({
        token: PADDLE_CLIENT_TOKEN,
        eventCallback(e) {
          if (e.name === 'checkout.completed') {
            activateSubscription();
            setHasSubscription(true);
            setShowPricing(false);
          }
        },
      });
    }
  }, []);

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

  // "Add Signature →" — save filled PDF to sessionStorage, redirect to /sign
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
        window.location.href = '/sign';
      };
      reader.readAsDataURL(blob);
    } catch {
      // Fallback: just redirect
      window.location.href = '/sign';
    }
  };

  const doSave = async (cleanUrl: string, downloadUrl?: string) => {
    const filename = `filled-${pdfFile?.name || 'document.pdf'}`;
    const urlToDownload = downloadUrl || cleanUrl;
    await downloadOrShare(urlToDownload, filename);
    // Save CLEAN version to history (Blob → IndexedDB).
    try {
      const res = await fetch(cleanUrl);
      const blob = await res.blob();
      await saveToHistory(filename, blob.size, blob, 'fill', willHaveWatermark);
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

      <div className="container" style={{ paddingTop: 48, minHeight: 'calc(100vh - 300px)', paddingBottom: 80 }}>

        {/* ── STEPS BAR (fill / preview / done) ── */}
        {step !== 'upload' && (
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, gap: 0, maxWidth: 480, margin: '0 auto 20px' }}>
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

            {step === 'upload' && localDrafts.length > 0 && !dismissedDraftBanner && (
              <div style={{
                background: '#eff6ff',
                border: '1.5px solid #bfdbfe',
                borderRadius: 12,
                padding: '14px 20px',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1e40af' }}>
                    You have a saved draft
                  </div>
                  <div style={{ fontSize: 13, color: '#3b82f6', marginTop: 2 }}>
                    {localDrafts[0].name} &middot; {localDrafts[0].fieldCount} fields
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => {
                      setTextFields(localDrafts[0].fields);
                      setDismissedDraftBanner(true);
                    }}
                    style={{
                      padding: '8px 16px',
                      background: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Continue editing
                  </button>
                  <button
                    onClick={() => {
                      import('../utils/drafts').then(({ deleteDraft }) => deleteDraft(localDrafts[0].id));
                      setLocalDrafts(prev => prev.slice(1));
                      setDismissedDraftBanner(true);
                    }}
                    style={{
                      padding: '8px 14px',
                      background: 'transparent',
                      color: '#64748b',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: 8,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}

            <div {...getRootProps()} className={`dropzone${isDragActive ? ' active' : ''}`}>
              <input {...getInputProps()} />
              <div className="dz-icon" style={{ display: 'inline-flex' }}><FormInput size={48} color="#2563eb" strokeWidth={1.6} /></div>
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
                <span style={{ display: 'inline-flex', alignItems: 'center' }}><FolderOpen size={18} color="#2563eb" /></span>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1d4ed8' }}>
                  Draft "{loadedDraftName}" loaded — upload a PDF to apply it
                </div>
                <button onClick={() => setShowDraftBanner(false)} aria-label="Dismiss" style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', display: 'inline-flex', alignItems: 'center' }}><X size={16} /></button>
              </div>
            )}

            {/* Compact trust row */}
            <p className="trust-row">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Lock size={14} color="#64748b" /> Processed locally</span>
              <span className="trust-dot">·</span>
              <span>✓ No registration</span>
              <span className="trust-dot">·</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Zap size={14} color="#64748b" /> 30 seconds</span>
            </p>

            {/* More PDF Tools */}
            <div style={{ marginTop: 48, borderTop: '1px solid #e2e8f0', paddingTop: 32 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#64748b', textAlign: 'center', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                More PDF Tools
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, maxWidth: 1080, margin: '0 auto' }}>
                <a href="/sign" style={{ background: 'white', borderRadius: 16, padding: '20px', border: '1.5px solid #e2e8f0', textDecoration: 'none', display: 'block', transition: 'all 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2563eb'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(37,99,235,0.1)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                >
                  <div style={{ marginBottom: 8, color: '#2563eb' }}><PenLine size={28} strokeWidth={1.8} /></div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Sign PDF</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>Draw or type your signature</div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#2563eb' }}>Try it →</span>
                </a>
                <div style={{ background: 'white', borderRadius: 16, padding: '20px', border: '2px solid #2563eb', boxShadow: '0 4px 16px rgba(37,99,235,0.1)' }}>
                  <div style={{ marginBottom: 8, color: '#2563eb' }}><FileSignature size={28} strokeWidth={1.8} /></div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Fill PDF Form</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>Click to type in any field</div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: 20 }}>Current tool</span>
                </div>
                <a href="/protect" style={{ background: 'white', borderRadius: 16, padding: '20px', border: '1.5px solid #e2e8f0', textDecoration: 'none', display: 'block', transition: 'all 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2563eb'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(37,99,235,0.1)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                >
                  <div style={{ marginBottom: 8, color: '#2563eb' }}><Lock size={28} strokeWidth={1.8} /></div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Protect PDF</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>Add password &amp; permissions</div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#2563eb' }}>Try it →</span>
                </a>
                <a href="/merge" style={{ background: 'white', borderRadius: 16, padding: '20px', border: '1.5px solid #e2e8f0', textDecoration: 'none', display: 'block', transition: 'all 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2563eb'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(37,99,235,0.1)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                >
                  <div style={{ marginBottom: 8, color: '#4f46e5' }}><Files size={28} strokeWidth={1.8} /></div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Merge PDF</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>Combine multiple PDFs</div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#2563eb' }}>Try it →</span>
                </a>
                <a href="/compress" style={{ background: 'white', borderRadius: 16, padding: '20px', border: '1.5px solid #e2e8f0', textDecoration: 'none', display: 'block', transition: 'all 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2563eb'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(37,99,235,0.1)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                >
                  <div style={{ marginBottom: 8, color: '#0891b2' }}><Minimize2 size={28} strokeWidth={1.8} /></div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Compress PDF</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>Reduce PDF file size</div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#2563eb' }}>Try it →</span>
                </a>
              </div>
            </div>

            {/* Compact FAQ */}
            <div className="compact-faq" style={{ marginTop: 40 }}>
              <h2>FAQ</h2>
              <details>
                <summary>Is it free?</summary>
                <p className="faq-answer">Yes. First 2 PDFs per day, no account needed.</p>
              </details>
              <details>
                <summary>What if my PDF won&apos;t let me type?</summary>
                <p className="faq-answer">SignMyPDF works on any PDF regardless of format — scanned, locked or image-based.</p>
              </details>
              <details>
                <summary>Does my file get uploaded?</summary>
                <p className="faq-answer">Processed locally in your browser. Not stored on our servers.</p>
              </details>
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
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <RefreshCw size={12} /> Change
                    <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" style={{ display: 'none' }} onChange={handleFileChange} />
                  </label>
                </div>
                {!hasSubscription && (
                  <div style={{ fontSize: 11, color: todayCount >= DAILY_LIMIT ? '#d97706' : '#64748b', background: todayCount >= DAILY_LIMIT ? '#fffbeb' : '#f8fafc', padding: '5px 10px', borderRadius: 8, border: `1px solid ${todayCount >= DAILY_LIMIT ? '#fcd34d' : '#e2e8f0'}`, flexShrink: 0, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {todayCount >= DAILY_LIMIT ? (
                      <><AlertTriangle size={12} /> Watermark</>
                    ) : (
                      <><FileText size={12} /> {todayCount}/{DAILY_LIMIT} free</>
                    )}
                  </div>
                )}
                {hasSubscription && (
                  <div style={{ fontSize: 11, color: '#16a34a', background: '#f0fdf4', padding: '5px 10px', borderRadius: 8, border: '1px solid #bbf7d0', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Star size={12} color="#F59E0B" fill="#F59E0B" /> Pro</div>
                )}
              </div>
              {/* Hint */}
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: 8 }}>
                <MousePointerClick size={16} style={{ flexShrink: 0 }} /> <span><strong>Click anywhere on the document</strong> to add a text field · drag <strong>⠿</strong> to move</span>
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
                  <label style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', fontSize: 12, fontWeight: 600, color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px', cursor: 'pointer', textAlign: 'center' }}>
                    <RefreshCw size={12} /> Change file
                    <input type="file" accept="application/pdf,.pdf" style={{ display: 'none' }} onChange={handleFileChange} />
                  </label>
                </div>

                {/* Plan badge */}
                {!hasSubscription && (
                  <div style={{ fontSize: 12, color: todayCount >= DAILY_LIMIT ? '#d97706' : '#64748b', background: todayCount >= DAILY_LIMIT ? '#fffbeb' : '#f8fafc', padding: '8px 12px', borderRadius: 10, border: `1px solid ${todayCount >= DAILY_LIMIT ? '#fcd34d' : '#e2e8f0'}`, textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%' }}>
                    {todayCount >= DAILY_LIMIT ? (
                      <><AlertTriangle size={14} /> Watermark after PDF #{DAILY_LIMIT + 1}</>
                    ) : (
                      <><FileText size={14} /> {todayCount}/{DAILY_LIMIT} free today</>
                    )}
                  </div>
                )}
                {hasSubscription && (
                  <div style={{ fontSize: 12, color: '#16a34a', background: '#f0fdf4', padding: '8px 12px', borderRadius: 10, border: '1px solid #bbf7d0', textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%' }}><Star size={14} color="#F59E0B" fill="#F59E0B" /> Premium active</div>
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
                  {draftSaved ? (
                    <><CheckCircle size={16} color="#16a34a" /> Draft saved!</>
                  ) : (
                    <><Save size={16} /> Save draft{!hasSubscription && <span style={{ fontSize: 10, background: '#e0e7ff', color: '#4f46e5', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>PRO</span>}</>
                  )}
                </button>
              </div>

              {/* Action buttons — at bottom of sidebar */}
              <button
                className="btn-ghost"
                style={{ width: '100%', padding: '13px', fontSize: 15, borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onClick={handlePreview}
                disabled={isProcessing || !hasContent}
              >
                {isProcessing ? <><span className="spinner" /></> : <><Eye size={16} /> Preview</>}
              </button>
              <button
                className="btn-primary"
                style={{ width: '100%', padding: '13px', fontSize: 15, borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onClick={handleDownload}
                disabled={isProcessing || !hasContent}
              >
                {isProcessing ? <><span className="spinner" /> Processing…</> : <><Download size={16} /> Save PDF</>}
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
                style={{ width: '100%', padding: '11px', fontSize: 14, borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onClick={() => setStep('fill')}
              >
                <Pencil size={14} /> Back to edit
              </button>
              <button
                className="btn-primary"
                style={{ width: '100%', padding: '13px', fontSize: 15, borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onClick={handleSaveFromPreview}
              >
                <Download size={16} /> Save PDF
              </button>
              <button
                style={{ width: '100%', padding: '10px', fontSize: 13, borderRadius: 12, border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                onClick={reset}
              >
                <FileText size={14} /> Start over
              </button>
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {step === 'done' && (
          <>
          <div className="done-wrap">
            <div className="done-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle size={56} color="#16a34a" strokeWidth={2.2} /></div>
            <h2 className="done-title">PDF saved!</h2>
            <p className="done-sub">Your filled document has been saved to your device.</p>

            <div className="done-btns">
              <button className="btn-primary" style={{ width: '100%', maxWidth: 480, padding: '16px', fontSize: 16, borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onClick={() => doSave(filledPdfUrl!)}>
                <Download size={18} /> Save again
              </button>

              <button className="btn-ghost" style={{ width: '100%', maxWidth: 480, padding: '13px', fontSize: 15, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={reset}>
                <FileText size={16} /> Fill another document
              </button>
            </div>

            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <a href="/sign" style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
                Need to sign a PDF instead? →
              </a>
            </div>
          </div>

          <FileHistory
            hasSubscription={hasSubscription}
            onShowPricing={() => setShowPricing(true)}
            showDlHint={showDlHint}
          />
          </>
        )}

      </div>

      {/* Unified Paywall — radio-select + sticky CTA */}
      <PaywallModal
        open={showPricing}
        onClose={() => setShowPricing(false)}
        tool="fill"
        todayCount={todayCount}
        onProActivated={() => setHasSubscription(true)}
      />

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
            <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0, marginTop: 1 }}><CheckCircle size={18} color="#22c55e" /></span>
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
              aria-label="Close"
              style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '2px 4px', flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}
            ><X size={16} /></button>
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
            <div style={{ marginBottom: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#22c55e' }}>
              <FileText size={40} color="#2563eb" strokeWidth={1.6} />
              <CheckCircle size={32} color="#22c55e" />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: -0.3 }}>
              Your PDF is ready!
            </h3>
            <p style={{ fontSize: 15, color: '#64748b', margin: '0 0 28px', lineHeight: 1.6 }}>
              Want to also add your signature?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={handleGoToSign}
                style={{ padding: '14px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', letterSpacing: -0.2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <PenLine size={18} /> Add Signature →
              </button>
              <button
                onClick={handleDownloadAsIs}
                style={{ padding: '13px 24px', background: '#f8fafc', color: '#475569', border: '1.5px solid #e2e8f0', borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <Download size={16} /> Download as is
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

      <SiteFooter />
    </>
  );
}
