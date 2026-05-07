'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import {
  Minimize2,
  Lock,
  Zap,
  Star,
  RefreshCw,
  Download,
  PenLine,
  FileSignature,
  Files,
  Scissors,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import NavHeader from '../components/NavHeader';
import SiteFooter from '../components/SiteFooter';
import FileHistory, { saveToHistory } from '../components/FileHistory';
import PaywallModal from '../components/PaywallModal';
import ToolDescription from '../components/ToolDescription';
import {
  PADDLE_CLIENT_TOKEN,
  COMPRESS_FREE_SIZE_LIMIT,
  COMPRESS_PRO_SIZE_LIMIT,
  COMPRESS_MIN_REDUCTION_PERCENT,
} from '../constants';
import { isProActive, activateSubscription } from '../utils/subscription';
import { storePendingFile, consumePendingFile } from '../utils/pendingUpload';
import { setupPdfjs } from '@signmypdf/pdf-core';
import {
  compressPdf,
  analyzePdf,
  predictCompression,
  CompressPdfError,
  type CompressionLevel,
  type CompressResult,
  type AnalyzeResult,
  type CompressionPrediction,
} from '../utils/compressPdf';

type Step = 'upload' | 'configure' | 'done';

const STEPS = [
  { id: 'upload',    label: 'Upload PDF' },
  { id: 'configure', label: 'Compression' },
  { id: 'done',      label: 'Download' },
];

const LEVEL_COPY: Record<CompressionLevel, { label: string; short: string; dots: number }> = {
  light:       { label: 'Light',       short: 'Best quality',   dots: 3 },
  recommended: { label: 'Recommended', short: 'Balanced',       dots: 2 },
  maximum:     { label: 'Maximum',     short: 'Smallest file',  dots: 1 },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function bytesToMB(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(0);
}

function compressedFileName(originalName: string): string {
  const cleaned = originalName.replace(/^compressed-+/, '');
  return `compressed-${cleaned}`;
}

function track(event: string, params: Record<string, string | number | boolean> = {}) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).gtag?.('event', event, params);
  } catch { /* no-op */ }
}

export default function CompressPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('upload');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [level, setLevel] = useState<CompressionLevel>('recommended');

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const [result, setResult] = useState<CompressResult | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState('');

  // Result preview thumbnails (first 3 pages) rendered via pdfjs.
  const [previewThumbs, setPreviewThumbs] = useState<string[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [hasSubscription, setHasSubscription] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [activatingPro, setActivatingPro] = useState(false);
  const [activatingEmail, setActivatingEmail] = useState('');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [limitBanner, setLimitBanner] = useState<string | null>(null);

  // Mount: subscription, Paddle, and file handoff (e.g. from /merge → "Compress this PDF").
  useEffect(() => {
    setHasSubscription(isProActive());

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
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // Pick up handoff from /merge (or any other tool that does
    // storePendingFile → router.push('/compress')).
    consumePendingFile().then(file => {
      if (file) acceptFile(file);
    }).catch(() => { /* no pending */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [step]);

  // Free users get one preset; Pro can pick. Force back to recommended
  // any time the user lands on free (e.g. after canceling Paddle checkout).
  useEffect(() => {
    if (!hasSubscription) setLevel('recommended');
  }, [hasSubscription]);

  // Run the analyzePdf prediction once a file is loaded.
  useEffect(() => {
    if (!pdfFile) {
      setAnalysis(null);
      return;
    }
    let cancelled = false;
    setAnalysisLoading(true);
    analyzePdf(pdfFile)
      .then(a => { if (!cancelled) setAnalysis(a); })
      .catch(() => { if (!cancelled) setAnalysis({ hasImages: false, pageCount: 0, imageCount: 0, imageAreaRatio: 0 }); })
      .finally(() => { if (!cancelled) setAnalysisLoading(false); });
    return () => { cancelled = true; };
  }, [pdfFile]);

  // Render the result preview (first 3 pages) once we have a blob URL.
  useEffect(() => {
    if (!resultBlob) {
      setPreviewThumbs([]);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    (async () => {
      try {
        const pdfjsLib = await setupPdfjs('/pdf.worker.min.mjs');
        const buf = await resultBlob.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
        if (cancelled) return;
        const max = Math.min(3, pdf.numPages);
        const out: string[] = [];
        for (let i = 1; i <= max; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          const baseVp = page.getViewport({ scale: 1 });
          const targetW = 220;
          const scale = Math.min(targetW / baseVp.width, 2);
          const vp = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = vp.width;
          canvas.height = vp.height;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await page.render({ canvas: canvas as any, viewport: vp }).promise;
          out.push(canvas.toDataURL('image/jpeg', 0.85));
        }
        if (!cancelled) setPreviewThumbs(out);
      } catch {
        if (!cancelled) setPreviewThumbs([]);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [resultBlob]);

  const maxSize = hasSubscription ? COMPRESS_PRO_SIZE_LIMIT : COMPRESS_FREE_SIZE_LIMIT;

  // Predicted output size per level — drives the three level cards on Step 2
  // and the dynamic helper line above the CTA. Heuristic: see
  // predictCompression in app/utils/compressPdf.ts. The UI surfaces these
  // with a tilde so the user understands they're estimates.
  const prediction: CompressionPrediction | null = useMemo(() => {
    if (!pdfFile || !analysis) return null;
    return predictCompression(pdfFile.size, analysis);
  }, [pdfFile, analysis]);

  const reductionPctFor = (predicted: number): number => {
    if (!pdfFile || pdfFile.size === 0) return 0;
    return Math.max(0, Math.round(((pdfFile.size - predicted) / pdfFile.size) * 100));
  };

  // Click on a level card. On Free, Light and Maximum are locked — the
  // card itself is the upsell CTA; clicking opens the paywall instead of
  // selecting. On Pro any card switches the active level.
  const handleLevelClick = (l: CompressionLevel) => {
    if (isProcessing) return;
    if (!hasSubscription && l !== 'recommended') {
      track('compress_locked_level_clicked', { level: l });
      setShowPricing(true);
      return;
    }
    setLevel(l);
  };

  const acceptFile = useCallback((file: File) => {
    setErrorBanner(null);
    setLimitBanner(null);
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorBanner('Only PDF files are supported.');
      return;
    }
    if (file.size > maxSize) {
      const limitMB = bytesToMB(maxSize);
      if (!hasSubscription) {
        setLimitBanner(`Free plan supports files up to ${limitMB} MB. Upgrade to compress files up to ${bytesToMB(COMPRESS_PRO_SIZE_LIMIT)} MB.`);
        setShowPricing(true);
        track('compress_paywall_opened', { reason: 'size_limit' });
      } else {
        setLimitBanner(`File too large. Max size on Premium is ${limitMB} MB.`);
      }
      return;
    }
    setPdfFile(file);
    setStep('configure');
    track('compress_file_loaded', { size: file.size, plan: hasSubscription ? 'pro' : 'free' });
  }, [maxSize, hasSubscription]);

  const onDrop = useCallback((files: File[]) => {
    const f = files[0];
    if (f) acceptFile(f);
  }, [acceptFile]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    multiple: false,
    noClick: true,
    // Bypass Chrome's experimental File System Access API path. With it
    // on, drops on a dropzone that *also* contains a nested
    // `<input type="file">` (our explicit "Choose PDF file" picker)
    // intermittently swallow the drop event without invoking onDrop —
    // surfaced as a "drag-drop not working" bug report on /compress.
    useFsAccessApi: false,
  });

  const handleCompress = async () => {
    if (!pdfFile || isProcessing) return;
    setErrorBanner(null);
    setIsProcessing(true);
    setProgress(0);

    try {
      const res = await compressPdf(pdfFile, level, p => setProgress(p));
      const blob = new Blob([res.bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const filename = compressedFileName(pdfFile.name);

      setResult(res);
      setResultBlob(blob);
      setResultUrl(url);
      setResultFileName(filename);

      // Persist to FileHistory (Blob → IDB; metadata → localStorage).
      try {
        await saveToHistory(filename, blob.size, blob, 'compress', false);
        window.dispatchEvent(new Event('signmypdf:saved'));
      } catch { /* best-effort */ }

      // Auto-download on desktop. iOS uses the explicit Download button on
      // the done screen because programmatic <a download> is blocked there.
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (!isIOS) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      track('pdf_compressed', {
        plan: hasSubscription ? 'pro' : 'free',
        level,
        original: res.originalSize,
        compressed: res.compressedSize,
        reduction: res.reductionPercent,
      });

      setTimeout(() => setStep('done'), 200);
    } catch (err) {
      if (err instanceof CompressPdfError) {
        if (err.reason === 'encrypted') {
          setErrorBanner('This PDF is password-protected. Unlock it first using the Protect PDF tool, then come back.');
        } else {
          setErrorBanner('Could not read this PDF. The file may be corrupted.');
        }
      } else {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setErrorBanner(`Compression failed: ${msg}`);
      }
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
      } catch (e) {
        if ((e as { name?: string })?.name === 'AbortError') return;
      }
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handSignThis = async () => {
    if (!resultBlob) return;
    track('compress_to_sign_clicked');
    const file = new File([resultBlob], resultFileName, { type: 'application/pdf' });
    try { await storePendingFile(file); } catch { /* fall through */ }
    router.push('/sign');
  };

  const handMergeThis = async () => {
    if (!resultBlob) return;
    track('compress_to_merge_clicked');
    const file = new File([resultBlob], resultFileName, { type: 'application/pdf' });
    try { await storePendingFile(file); } catch { /* fall through */ }
    router.push('/merge');
  };

  const handSplitThis = async () => {
    if (!resultBlob) return;
    track('compress_to_split_clicked');
    const file = new File([resultBlob], resultFileName, { type: 'application/pdf' });
    try { await storePendingFile(file); } catch { /* fall through */ }
    router.push('/split');
  };

  const reset = () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setPdfFile(null);
    setAnalysis(null);
    setLevel('recommended');
    setResult(null);
    setResultBlob(null);
    setResultUrl(null);
    setResultFileName('');
    setPreviewThumbs([]);
    setProgress(0);
    setErrorBanner(null);
    setLimitBanner(null);
    setStep('upload');
  };

  const stepIndex = STEPS.findIndex(s => s.id === step);

  // "Already optimized" state fires when reduction is real but tiny —
  // typically text-only PDFs where there's nothing meaningful to re-encode.
  const isOptimized = result !== null && result.reductionPercent < COMPRESS_MIN_REDUCTION_PERCENT;
  const showProCta = result !== null && !hasSubscription && result.reductionPercent >= COMPRESS_MIN_REDUCTION_PERCENT;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'SignMyPDF — Compress PDF',
    description: 'Free online PDF compressor. Reduce file size for email and uploads, no registration.',
    url: 'https://www.signmypdf.io/compress',
    applicationCategory: 'ProductivityApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    featureList: [
      'Compress PDF in browser',
      'Reduce file size for email',
      'No registration required',
      'Client-side processing',
      'Mobile friendly',
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <NavHeader activeTool="compress" />

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

      <div className="container" style={{ paddingTop: 48, paddingBottom: step === 'upload' ? 0 : step === 'done' ? 16 : 64 }}>

        {/* ── UPLOAD ── */}
        {step === 'upload' && (
          <div>
            <h1 className="hero-title">Compress PDF</h1>
            <p className="hero-sub">Reduce PDF file size for email and uploads. Free, no registration.</p>

            <div {...getRootProps()} className={`dropzone${isDragActive ? ' active' : ''}`}>
              <input {...getInputProps()} />
              <div className="dz-icon" style={{ display: 'inline-flex' }}>
                <Minimize2 size={48} color="#0891b2" strokeWidth={1.6} />
              </div>
              <p className="dz-title">{isDragActive ? 'Drop it here!' : 'Drop a PDF here'}</p>
              <p className="dz-sub">or click to select a file from your computer</p>
              {/* Picker uses react-dropzone's `open` so there's only ONE
                  hidden file input on the page (the one from
                  getInputProps()). The previous nested
                  `<label><input type="file"/></label>` pattern competed
                  with the dropzone's own input on drop events and made
                  drag-drop intermittently swallow the file. */}
              <button
                type="button"
                className="btn-primary"
                style={{ cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); open(); }}
              >
                Choose PDF file
              </button>
            </div>
            <p style={{ textAlign: 'center', fontSize: 13, color: '#64748b', marginTop: 8 }}>
              {hasSubscription
                ? `Premium: files up to ${bytesToMB(COMPRESS_PRO_SIZE_LIMIT)} MB`
                : `Free: files up to ${bytesToMB(COMPRESS_FREE_SIZE_LIMIT)} MB`}
            </p>
            {errorBanner && (
              <p style={{ textAlign: 'center', fontSize: 13, color: '#dc2626', marginTop: 4 }}>
                {errorBanner}
              </p>
            )}
            {limitBanner && (
              <p style={{ textAlign: 'center', fontSize: 13, color: '#d97706', marginTop: 4 }}>
                {limitBanner}
              </p>
            )}

            <p className="trust-row">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Lock size={14} color="#64748b" /> Processed locally</span>
              <span className="trust-dot">·</span>
              <span>✓ No registration</span>
              <span className="trust-dot">·</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Zap size={14} color="#64748b" /> 30 seconds</span>
            </p>
          </div>
        )}

        {/* ── CONFIGURE ── */}
        {step === 'configure' && pdfFile && (
          <div style={{ maxWidth: 880, margin: '0 auto' }}>
            <div className="step-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              <h2 className="step-title">Compression options</h2>
              {hasSubscription ? (
                <div style={{ fontSize: 13, color: '#16a34a', background: '#f0fdf4', padding: '6px 12px', borderRadius: 8, border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Star size={14} color="#F59E0B" fill="#F59E0B" /> Premium active
                </div>
              ) : (
                <div style={{ fontSize: 13, color: '#64748b', background: '#f8fafc', padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Minimize2 size={14} color="#64748b" /> Free plan
                </div>
              )}
            </div>

            {/* Block A — File hero. Filename + big size lead the screen so
                the user immediately knows what they're working with. The
                meta row folds page count and the honest "mostly text /
                contains images" prediction into a single subordinate line.
                "Choose another file" is a text link, not a button — it
                must not compete with the main CTA below. */}
            <div className="compress-hero">
              <div className="compress-hero-main">
                <div className="compress-hero-name" title={pdfFile.name}>{pdfFile.name}</div>
                <div className="compress-hero-size">{formatFileSize(pdfFile.size)}</div>
                <div className="compress-hero-meta">
                  {analysis && analysis.pageCount > 0 && (
                    <>{analysis.pageCount} {analysis.pageCount === 1 ? 'page' : 'pages'}</>
                  )}
                  {analysis && analysis.pageCount > 0 && <span className="compress-hero-meta-dot">·</span>}
                  {analysisLoading
                    ? 'Analyzing PDF…'
                    : analysis?.hasImages
                      ? 'This PDF contains images — good compression expected'
                      : 'This PDF is mostly text — compression will be limited'}
                </div>
              </div>
              <button
                type="button"
                onClick={reset}
                disabled={isProcessing}
                className="compress-hero-link"
              >
                Choose another file
              </button>
            </div>

            {/* Block B — Three level cards in a row. On Free, Light and
                Maximum are visually dimmed and clicking opens the paywall;
                Recommended is selected by default and carries a
                "Most popular" badge. On Pro, all three are selectable. */}
            <div className="compress-level-grid">
              {(['light', 'recommended', 'maximum'] as const).map(l => {
                const meta = LEVEL_COPY[l];
                const locked = !hasSubscription && l !== 'recommended';
                const selected = level === l;
                const predicted = prediction?.[l] ?? null;
                const reduction = predicted !== null ? reductionPctFor(predicted) : null;
                return (
                  <button
                    key={l}
                    type="button"
                    onClick={() => handleLevelClick(l)}
                    disabled={isProcessing}
                    className={[
                      'compress-level-card',
                      selected ? 'compress-level-card-selected' : '',
                      locked ? 'compress-level-card-locked' : '',
                    ].filter(Boolean).join(' ')}
                    aria-pressed={selected}
                  >
                    {locked && (
                      <span className="compress-level-pro-badge">
                        <Lock size={11} /> Pro
                      </span>
                    )}
                    {!locked && l === 'recommended' && !hasSubscription && (
                      <span className="compress-level-popular-badge">Most popular</span>
                    )}
                    <div className="compress-level-name">{meta.label}</div>
                    <div className="compress-level-predicted">
                      {predicted === null
                        ? <span className="compress-level-predicted-pending">Calculating…</span>
                        : <>~{formatFileSize(predicted)}</>}
                    </div>
                    {reduction !== null && (
                      <div className="compress-level-reduction">−{reduction}%</div>
                    )}
                    <div className="compress-level-short">{meta.short}</div>
                    <div className="compress-level-dots" aria-hidden="true">
                      {[0, 1, 2].map(i => (
                        <span
                          key={i}
                          className={`compress-level-dot${i < meta.dots ? ' compress-level-dot-on' : ''}`}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            {errorBanner && (
              <div className="merge-banner merge-banner-error" style={{ marginBottom: 16 }}>
                <AlertTriangle size={16} color="#dc2626" />
                <span style={{ flex: 1 }}>{errorBanner}</span>
              </div>
            )}

            {/* Block C — Single dominant CTA with a dynamic helper line.
                The helper updates as the user picks a different level so
                the button isn't acting on hidden state. */}
            <div className="compress-cta-block">
              <p className="compress-cta-helper">
                {isProcessing
                  ? 'Re-encoding images…'
                  : prediction
                    ? <>Compress with <strong>{LEVEL_COPY[level].label}</strong> · ~{formatFileSize(prediction[level])} expected</>
                    : <>Compress with <strong>{LEVEL_COPY[level].label}</strong></>}
              </p>
              <button
                type="button"
                className="btn-primary compress-cta-btn"
                onClick={handleCompress}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <><span className="spinner" /> Compressing your PDF…</>
                ) : (
                  <><Minimize2 size={18} /> Compress PDF</>
                )}
              </button>
            </div>

            {isProcessing && (
              <div className="merge-progress">
                <div className="merge-progress-bar">
                  <div className="merge-progress-fill" style={{ width: `${Math.max(progress, 4)}%` }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── DONE ── */}
        {step === 'done' && result && (
          <div className="done-wrap" style={{ maxWidth: 640 }}>
            <div className="done-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={56} color="#16a34a" strokeWidth={2.2} />
            </div>

            {isOptimized ? (
              <>
                <h2 className="done-title">This PDF is already optimized.</h2>
                <p className="done-sub" style={{ maxWidth: 520, margin: '0 auto 36px' }}>
                  We compressed it from <strong>{formatFileSize(result.originalSize)}</strong> to{' '}
                  <strong>{formatFileSize(result.compressedSize)}</strong>{' '}
                  (−{result.reductionPercent}%). Most of the savings would come from re-encoding images, but this PDF is mostly text.
                </p>
                <div className="done-btns">
                  <button
                    className="btn-ghost"
                    style={{ width: '100%', maxWidth: 480, padding: '14px', fontSize: 15, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    onClick={async () => {
                      if (!resultUrl) return;
                      await downloadOrShare(resultUrl, resultFileName);
                      track('pdf_downloaded', { plan: hasSubscription ? 'pro' : 'free', tool: 'compress', method: 'button', optimized: true });
                    }}
                  >
                    <Download size={16} /> Download anyway
                  </button>
                  <button
                    className="btn-primary"
                    style={{ width: '100%', maxWidth: 480, padding: '16px', fontSize: 16, borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    onClick={reset}
                  >
                    <RefreshCw size={18} /> Try another file
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="done-title">Done! Your PDF is ready.</h2>

                {/* Before / after numbers */}
                <div className="compress-result">
                  <div className="compress-result-row">
                    <div className="compress-result-cell">
                      <div className="compress-result-label">Before</div>
                      <div className="compress-result-value">{formatFileSize(result.originalSize)}</div>
                    </div>
                    <div className="compress-result-arrow" aria-hidden="true">→</div>
                    <div className="compress-result-cell">
                      <div className="compress-result-label">After</div>
                      <div className="compress-result-value">{formatFileSize(result.compressedSize)}</div>
                    </div>
                  </div>
                  <div className="compress-result-percent">−{result.reductionPercent}%</div>
                  <div className="compress-result-name">{resultFileName}</div>
                </div>

                {/* Result preview */}
                <div className="compress-preview">
                  <div className="compress-preview-label">Preview of compressed result</div>
                  <div className="compress-preview-thumbs">
                    {previewLoading && previewThumbs.length === 0 ? (
                      <div style={{ padding: '20px', color: '#94a3b8', fontSize: 13 }}>Rendering preview…</div>
                    ) : (
                      previewThumbs.map((src, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={src} alt={`Page ${i + 1}`} className="compress-preview-thumb" />
                      ))
                    )}
                  </div>
                </div>

                <div className="done-btns">
                  <button
                    className="btn-primary"
                    style={{ width: '100%', maxWidth: 480, padding: '16px', fontSize: 16, borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    onClick={async () => {
                      if (!resultUrl) return;
                      await downloadOrShare(resultUrl, resultFileName);
                      track('pdf_downloaded', { plan: hasSubscription ? 'pro' : 'free', tool: 'compress', method: 'button' });
                    }}
                  >
                    <Download size={18} /> Download PDF
                  </button>

                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 480, width: '100%' }}>
                    <button type="button" className="merge-funnel-link" onClick={handSignThis}>
                      <PenLine size={14} /> Sign this PDF →
                    </button>
                    <button type="button" className="merge-funnel-link" onClick={handMergeThis}>
                      <Files size={14} /> Merge with another PDF →
                    </button>
                    <button type="button" className="merge-funnel-link" onClick={handSplitThis}>
                      <Scissors size={14} /> Split this PDF →
                    </button>
                  </div>

                  <button className="btn-ghost" style={{ width: '100%', maxWidth: 480, padding: '13px', fontSize: 15, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={reset}>
                    <RefreshCw size={16} /> Compress another
                  </button>
                </div>

                {/* Pro upsell — only when there was real, observable savings on free */}
                {showProCta && (
                  <div className="compress-pro-cta">
                    <div className="compress-pro-cta-title">Need it smaller?</div>
                    <div className="compress-pro-cta-body">
                      Pro unlocks Maximum compression — typically 30–50% smaller on files like this.
                    </div>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ padding: '12px 22px', fontSize: 14, borderRadius: 12 }}
                      onClick={() => { setShowPricing(true); track('compress_pro_cta_clicked'); }}
                    >
                      Upgrade to Pro
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </div>

      {/* File History — only after compress completes */}
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
        <div className="container" style={{ paddingTop: 48, paddingBottom: 32 }}>
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 32 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#64748b', textAlign: 'center', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              More PDF Tools
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, maxWidth: 1080, margin: '0 auto' }}>
              <a href="/sign" className="more-tool-card">
                <div style={{ marginBottom: 8, color: '#2563eb' }}><PenLine size={26} strokeWidth={1.8} /></div>
                <div className="more-tool-title">Sign PDF</div>
                <div className="more-tool-sub">Draw or type your signature</div>
                <span className="more-tool-cta">Try it →</span>
              </a>
              <a href="/fill" className="more-tool-card">
                <div style={{ marginBottom: 8, color: '#2563eb' }}><FileSignature size={26} strokeWidth={1.8} /></div>
                <div className="more-tool-title">Fill PDF Form</div>
                <div className="more-tool-sub">Click to type in any field</div>
                <span className="more-tool-cta">Try it →</span>
              </a>
              <a href="/protect" className="more-tool-card">
                <div style={{ marginBottom: 8, color: '#2563eb' }}><Lock size={26} strokeWidth={1.8} /></div>
                <div className="more-tool-title">Protect PDF</div>
                <div className="more-tool-sub">Add password &amp; permissions</div>
                <span className="more-tool-cta">Try it →</span>
              </a>
              <a href="/merge" className="more-tool-card">
                <div style={{ marginBottom: 8, color: '#4f46e5' }}><Files size={26} strokeWidth={1.8} /></div>
                <div className="more-tool-title">Merge PDF</div>
                <div className="more-tool-sub">Combine multiple PDFs</div>
                <span className="more-tool-cta">Try it →</span>
              </a>
              <div className="more-tool-card more-tool-card-current">
                <div style={{ marginBottom: 8, color: '#0891b2' }}><Minimize2 size={26} strokeWidth={1.8} /></div>
                <div className="more-tool-title">Compress PDF</div>
                <div className="more-tool-sub">Reduce PDF file size</div>
                <span className="more-tool-cta-current">Current tool</span>
              </div>
              <a href="/split" className="more-tool-card">
                <div style={{ marginBottom: 8, color: '#c026d3' }}><Scissors size={26} strokeWidth={1.8} /></div>
                <div className="more-tool-title">Split PDF</div>
                <div className="more-tool-sub">Extract pages or split</div>
                <span className="more-tool-cta">Try it →</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* SEO body — wrapped in the shared <ToolDescription> card. */}
      {step === 'upload' && (
        <ToolDescription
          title="Compress PDF Files Online — Free"
          paragraphs={[
            'Drop a PDF and get a smaller file back, ready for email or upload limits. The whole job runs in your browser — your document never leaves your device. No account, no upload, no waiting in a queue.',
            "How much you can save depends on what's inside the file. Scanned PDFs and reports with photos compress 30–80% because we re-encode the embedded images at a lower resolution. PDFs that are mostly text barely shrink — there's nothing big to compress, and we'll tell you that on the next step instead of pretending we did real work.",
            `You see the before-and-after size, a preview of the result, and decide whether to keep it. If a level you picked made things worse, we hand you back the original. Free for files up to ${bytesToMB(COMPRESS_FREE_SIZE_LIMIT)} MB; Premium lifts the cap to ${bytesToMB(COMPRESS_PRO_SIZE_LIMIT)} MB and unlocks Light and Maximum levels.`,
          ]}
        />
      )}

      {step === 'upload' && (
        <div className="container" style={{ paddingBottom: 40 }}>
          <div className="compact-faq">
            <h2>FAQ</h2>
            <details>
              <summary>Is it really free?</summary>
              <p className="faq-answer">Yes. Files up to {bytesToMB(COMPRESS_FREE_SIZE_LIMIT)} MB at the Recommended level, no signup.</p>
            </details>
            <details>
              <summary>Are my files uploaded?</summary>
              <p className="faq-answer">No. Everything runs in your browser — your PDF never leaves your device.</p>
            </details>
            <details>
              <summary>Why didn&apos;t my file shrink much?</summary>
              <p className="faq-answer">Compression works mostly on embedded images. PDFs that are mostly text are already nearly as small as they can get.</p>
            </details>
          </div>
        </div>
      )}

      <PaywallModal
        open={showPricing}
        onClose={() => setShowPricing(false)}
        tool="compress"
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
