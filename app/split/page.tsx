'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import {
  Scissors,
  Lock,
  Zap,
  Star,
  RefreshCw,
  Download,
  PenLine,
  FileSignature,
  Files,
  Minimize2,
  CheckCircle,
  AlertTriangle,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  Bookmark,
  SplitSquareHorizontal,
} from 'lucide-react';
import NavHeader from '../components/NavHeader';
import SiteFooter from '../components/SiteFooter';
import FileHistory, { saveToHistory } from '../components/FileHistory';
import PaywallModal from '../components/PaywallModal';
import {
  PADDLE_CLIENT_TOKEN,
  SPLIT_FREE_SIZE_LIMIT,
  SPLIT_PRO_SIZE_LIMIT,
  SPLIT_FREE_PAGE_LIMIT,
  SPLIT_FREE_PARTS_LIMIT,
  SPLIT_PRO_PARTS_LIMIT,
} from '../constants';
import { isProActive, activateSubscription } from '../utils/subscription';
import { storePendingFile, consumePendingFile } from '../utils/pendingUpload';
import {
  splitPdf,
  parsePageRanges,
  SplitPdfError,
} from '../utils/splitPdf';

type Step = 'upload' | 'configure' | 'done';
type Mode = 'extract' | 'parts' | 'every-n' | 'bookmarks';

interface PartRange {
  id: string;
  from: number;
  to: number;
}

const STEPS = [
  { id: 'upload',    label: 'Upload PDF' },
  { id: 'configure', label: 'Choose pages' },
  { id: 'done',      label: 'Download' },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function bytesToMB(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(0);
}

function track(event: string, params: Record<string, string | number | boolean> = {}) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).gtag?.('event', event, params);
  } catch { /* no-op */ }
}

function newPartId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Format selected page numbers as a compact range string for previews:
 * `[1, 2, 3, 5, 8, 9, 10]` → "1-3, 5, 8-10".
 */
function summarizePages(pages: number[]): string {
  if (pages.length === 0) return '';
  const sorted = [...pages].sort((a, b) => a - b);
  const out: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const p = sorted[i];
    if (p === prev + 1) {
      prev = p;
      continue;
    }
    out.push(start === prev ? String(start) : `${start}-${prev}`);
    start = p;
    prev = p;
  }
  out.push(start === prev ? String(start) : `${start}-${prev}`);
  return out.join(', ');
}

export default function SplitPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('upload');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [thumbsLoading, setThumbsLoading] = useState(false);

  const [mode, setMode] = useState<Mode>('extract');
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set()); // 1-indexed
  const [rangeInput, setRangeInput] = useState('');
  const [rangeInputError, setRangeInputError] = useState<string | null>(null);

  const [parts, setParts] = useState<PartRange[]>([]);
  const [asZip, setAsZip] = useState(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // Done-step result. Holds either an extract output or a list of parts.
  const [resultMode, setResultMode] = useState<'extract' | 'parts' | null>(null);
  const [resultBlobs, setResultBlobs] = useState<Array<{ name: string; blob: Blob; url: string }>>([]);
  const [resultZip, setResultZip] = useState<{ name: string; blob: Blob; url: string } | null>(null);

  const [hasSubscription, setHasSubscription] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [activatingPro, setActivatingPro] = useState(false);
  const [activatingEmail, setActivatingEmail] = useState('');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [limitBanner, setLimitBanner] = useState<string | null>(null);

  // De-duplicate the thumbnail-render effect against React's StrictMode
  // double-invoke + the per-file-change re-run so we don't kick off two
  // pdfjs jobs for the same file.
  const thumbsLoadedForRef = useRef<File | null>(null);

  // ── Mount: subscription + Paddle + pendingFile handoff ─────────
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

    consumePendingFile().then(file => {
      if (file) acceptFile(file);
    }).catch(() => { /* no pending */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [step]);

  // ── Render thumbnails for the source PDF ──────────────────────
  useEffect(() => {
    if (!pdfFile) {
      setThumbnails([]);
      setPageCount(0);
      thumbsLoadedForRef.current = null;
      return;
    }
    if (thumbsLoadedForRef.current === pdfFile) return;
    thumbsLoadedForRef.current = pdfFile;

    let cancelled = false;
    setThumbsLoading(true);
    setThumbnails([]);
    (async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        const buf = await pdfFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
        if (cancelled) return;
        const pc = pdf.numPages;
        setPageCount(pc);

        // Initialize parts list once we know the page count.
        const mid = Math.max(1, Math.floor(pc / 2));
        setParts([
          { id: newPartId(), from: 1, to: mid },
          { id: newPartId(), from: Math.min(pc, mid + 1), to: pc },
        ]);

        // Free + > page cap → open paywall and don't render the rest.
        const renderUpTo = isProActive() ? pc : Math.min(pc, SPLIT_FREE_PAGE_LIMIT);
        if (!isProActive() && pc > SPLIT_FREE_PAGE_LIMIT) {
          setLimitBanner(`Free plan supports PDFs up to ${SPLIT_FREE_PAGE_LIMIT} pages. Upgrade to split larger documents.`);
          setShowPricing(true);
          track('split_paywall_opened', { reason: 'page_limit', pages: pc });
        }

        const out: string[] = [];
        for (let i = 1; i <= renderUpTo; i++) {
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
          if (!cancelled) setThumbnails([...out]);
        }
      } catch (e) {
        if (!cancelled) {
          const msg = (e as Error)?.message ?? '';
          if (/encrypt|password/i.test(msg)) {
            setErrorBanner('This PDF is password-protected. Unlock it first using Protect PDF, then come back.');
          } else {
            setErrorBanner('Could not read this PDF. The file may be corrupted.');
          }
        }
      } finally {
        if (!cancelled) setThumbsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [pdfFile]);

  // ── Limits ──────────────────────────────────────────────────
  // The size limit itself is enforced inside `acceptFile` (using the
  // live `isProActive()` snapshot, which works during the cold mount
  // before `hasSubscription` state has settled). Only `maxParts` and
  // the page-overflow flag need to be reactive in render.
  const maxParts = hasSubscription ? SPLIT_PRO_PARTS_LIMIT : SPLIT_FREE_PARTS_LIMIT;
  const exceededFreePageLimit = !hasSubscription && pageCount > SPLIT_FREE_PAGE_LIMIT;

  // ── Range input → selectedPages syncing ─────────────────────
  // Parse on Apply click rather than every keystroke so the user can
  // freely edit `1-3, 5, 8-10` without the grid flickering.
  const applyRangeInput = () => {
    if (pageCount === 0) return;
    if (!rangeInput.trim()) {
      setSelectedPages(new Set());
      setRangeInputError(null);
      return;
    }
    const pages = parsePageRanges(rangeInput, pageCount);
    if (pages === null) {
      setRangeInputError('Use formats like 1-3, 5, 8-10');
      return;
    }
    setSelectedPages(new Set(pages));
    setRangeInputError(null);
  };

  // ── Selection helpers ────────────────────────────────────────
  const toggleSelected = (page1: number) => {
    setSelectedPages(prev => {
      const next = new Set(prev);
      if (next.has(page1)) next.delete(page1);
      else next.add(page1);
      return next;
    });
  };
  const selectAll = () => setSelectedPages(new Set(Array.from({ length: pageCount }, (_, i) => i + 1)));
  const clearSelection = () => setSelectedPages(new Set());
  const invertSelection = () => {
    setSelectedPages(prev => {
      const next = new Set<number>();
      for (let i = 1; i <= pageCount; i++) if (!prev.has(i)) next.add(i);
      return next;
    });
  };

  // ── Parts editor ─────────────────────────────────────────────
  const updatePart = (id: string, patch: Partial<PartRange>) => {
    setParts(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  };
  const removePart = (id: string) => {
    setParts(prev => prev.length <= 1 ? prev : prev.filter(p => p.id !== id));
  };
  const addPart = () => {
    if (parts.length >= maxParts) {
      if (!hasSubscription) {
        setLimitBanner(`Free supports up to ${SPLIT_FREE_PARTS_LIMIT} parts per split. Upgrade for up to ${SPLIT_PRO_PARTS_LIMIT}.`);
        setShowPricing(true);
        track('split_paywall_opened', { reason: 'parts_limit' });
      }
      return;
    }
    const last = parts[parts.length - 1];
    const from = last ? Math.min(pageCount, last.to + 1) : 1;
    const to = pageCount;
    setParts(prev => [...prev, { id: newPartId(), from, to }]);
  };

  // ── Validation derived ───────────────────────────────────────
  const partsValid = useMemo(() => {
    if (parts.length === 0) return false;
    for (const p of parts) {
      if (!Number.isFinite(p.from) || !Number.isFinite(p.to)) return false;
      if (p.from < 1 || p.to > pageCount) return false;
      if (p.from > p.to) return false;
    }
    return true;
  }, [parts, pageCount]);

  // Estimate output size proportionally — cosmetic, helps users understand
  // the rough split ratios before committing.
  const partEstimateBytes = (range: PartRange): number => {
    if (!pdfFile || pageCount === 0) return 0;
    const span = Math.max(0, range.to - range.from + 1);
    return Math.round((span / pageCount) * pdfFile.size);
  };

  const extractEstimateBytes: number = useMemo(() => {
    if (!pdfFile || pageCount === 0) return 0;
    return Math.round((selectedPages.size / pageCount) * pdfFile.size);
  }, [pdfFile, pageCount, selectedPages.size]);

  const canRunExtract = mode === 'extract' && selectedPages.size > 0 && !exceededFreePageLimit;
  const canRunParts = mode === 'parts' && partsValid && !exceededFreePageLimit;
  const canRun = (canRunExtract || canRunParts) && !isProcessing;

  // ── File acceptance ─────────────────────────────────────────
  const acceptFile = useCallback((file: File) => {
    setErrorBanner(null);
    setLimitBanner(null);
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorBanner('Only PDF files are supported.');
      return;
    }
    const limit = isProActive() ? SPLIT_PRO_SIZE_LIMIT : SPLIT_FREE_SIZE_LIMIT;
    if (file.size > limit) {
      if (!isProActive()) {
        setLimitBanner(`Free supports up to ${bytesToMB(SPLIT_FREE_SIZE_LIMIT)} MB. Upgrade to split files up to ${bytesToMB(SPLIT_PRO_SIZE_LIMIT)} MB.`);
        setShowPricing(true);
        track('split_paywall_opened', { reason: 'size_limit' });
      } else {
        setLimitBanner(`File too large. Max size on Premium is ${bytesToMB(SPLIT_PRO_SIZE_LIMIT)} MB.`);
      }
      return;
    }
    setPdfFile(file);
    setSelectedPages(new Set());
    setRangeInput('');
    setRangeInputError(null);
    setMode('extract');
    setStep('configure');
    track('split_file_loaded', { size: file.size, plan: isProActive() ? 'pro' : 'free' });
  }, []);

  const onDrop = useCallback((files: File[]) => {
    const f = files[0];
    if (f) acceptFile(f);
  }, [acceptFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    multiple: false,
    noClick: true,
  });

  // ── Mode tabs ──────────────────────────────────────────────
  const handleModeClick = (m: Mode) => {
    if (m === 'every-n' || m === 'bookmarks') {
      track('split_locked_mode_clicked', { mode: m });
      setShowPricing(true);
      return;
    }
    setMode(m);
  };

  // ── Run split ──────────────────────────────────────────────
  const handleRun = async () => {
    if (!pdfFile || !canRun) return;
    setErrorBanner(null);
    setIsProcessing(true);
    setProgress(0);

    try {
      let result;
      if (mode === 'extract') {
        const indices = Array.from(selectedPages).sort((a, b) => a - b).map(p => p - 1);
        result = await splitPdf(pdfFile, { mode: 'extract', pageIndices: indices }, p => setProgress(p));
      } else {
        result = await splitPdf(
          pdfFile,
          {
            mode: 'parts',
            ranges: parts.map(p => ({ from: p.from, to: p.to })),
            asZip,
          },
          p => setProgress(p),
        );
      }

      if (result.mode === 'extract') {
        const blob = new Blob([result.bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setResultMode('extract');
        setResultBlobs([{ name: result.filename, blob, url }]);
        setResultZip(null);
        await saveToHistory(result.filename, blob.size, blob, 'split', false);
      } else {
        const blobs = result.files.map(f => {
          const b = new Blob([f.bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
          return { name: f.filename, blob: b, url: URL.createObjectURL(b) };
        });
        setResultMode('parts');
        setResultBlobs(blobs);
        if (result.zipBytes && result.zipFilename) {
          const zb = new Blob([result.zipBytes.buffer as ArrayBuffer], { type: 'application/zip' });
          const zu = URL.createObjectURL(zb);
          setResultZip({ name: result.zipFilename, blob: zb, url: zu });
          // Store the zip in history so re-download survives reload.
          await saveToHistory(result.zipFilename, zb.size, zb, 'split', false);
        } else {
          setResultZip(null);
          // No zip — store each part as its own history entry.
          for (const b of blobs) {
            await saveToHistory(b.name, b.blob.size, b.blob, 'split', false);
          }
        }
      }
      window.dispatchEvent(new Event('signmypdf:saved'));

      // Auto-download on desktop.
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (!isIOS) {
        // Pick the canonical artifact: extract → the single PDF; parts+zip → the zip;
        // parts without zip → trigger sequential downloads with small delays.
        if (result.mode === 'extract') {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(new Blob([result.bytes.buffer as ArrayBuffer], { type: 'application/pdf' }));
          a.download = result.filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else if (result.zipBytes && result.zipFilename) {
          const zb = new Blob([result.zipBytes.buffer as ArrayBuffer], { type: 'application/zip' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(zb);
          a.download = result.zipFilename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else {
          for (let i = 0; i < result.files.length; i++) {
            const f = result.files[i];
            const b = new Blob([f.bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(b);
            a.download = f.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            if (i < result.files.length - 1) await new Promise(r => setTimeout(r, 250));
          }
        }
      }

      track('pdf_split', {
        plan: hasSubscription ? 'pro' : 'free',
        mode,
        parts: result.mode === 'parts' ? result.files.length : 1,
        as_zip: result.mode === 'parts' && !!result.zipBytes,
      });

      setTimeout(() => setStep('done'), 200);
    } catch (err) {
      if (err instanceof SplitPdfError) {
        if (err.reason === 'encrypted') {
          setErrorBanner('This PDF is password-protected. Unlock it first using Protect PDF, then come back.');
        } else if (err.reason === 'corrupted') {
          setErrorBanner('Could not read this PDF. The file may be corrupted.');
        } else {
          setErrorBanner(err.message);
        }
      } else {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setErrorBanner(`Split failed: ${msg}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Universal download (iOS share / desktop link) ──────────
  const downloadOrShare = async (url: string, filename: string, mime = 'application/pdf') => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOS && navigator.share) {
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const file = new File([blob], filename, { type: mime });
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

  // ── Cross-tool funnels (Sign / Merge / Compress) ──────────
  // For extract: hand the single PDF.
  // For parts: hand the first part (most useful default).
  const handoffPdfBlob = (): { blob: Blob; name: string } | null => {
    if (resultMode === 'extract' && resultBlobs[0]) return { blob: resultBlobs[0].blob, name: resultBlobs[0].name };
    if (resultMode === 'parts' && resultBlobs[0]) return { blob: resultBlobs[0].blob, name: resultBlobs[0].name };
    return null;
  };
  const goWithFile = async (route: string, evt: string) => {
    const h = handoffPdfBlob();
    if (!h) return;
    track(evt);
    try {
      await storePendingFile(new File([h.blob], h.name, { type: 'application/pdf' }));
    } catch {}
    router.push(route);
  };

  const reset = () => {
    for (const b of resultBlobs) URL.revokeObjectURL(b.url);
    if (resultZip) URL.revokeObjectURL(resultZip.url);
    setPdfFile(null);
    setPageCount(0);
    setThumbnails([]);
    setSelectedPages(new Set());
    setRangeInput('');
    setRangeInputError(null);
    setParts([]);
    setMode('extract');
    setAsZip(true);
    setIsProcessing(false);
    setProgress(0);
    setResultMode(null);
    setResultBlobs([]);
    setResultZip(null);
    setErrorBanner(null);
    setLimitBanner(null);
    setStep('upload');
  };

  const stepIndex = STEPS.findIndex(s => s.id === step);

  const ctaLabel = mode === 'extract'
    ? (selectedPages.size > 0
        ? `Extract ${selectedPages.size} ${selectedPages.size === 1 ? 'page' : 'pages'} → 1 PDF`
        : 'Extract pages')
    : `Split into ${parts.length} ${parts.length === 1 ? 'part' : 'parts'}`;

  const ctaPreview = mode === 'extract'
    ? (selectedPages.size > 0
        ? `Result: pages ${summarizePages(Array.from(selectedPages))} (${selectedPages.size} ${selectedPages.size === 1 ? 'page' : 'pages'}, ~${formatFileSize(extractEstimateBytes)})`
        : 'Select at least 1 page')
    : (parts.length > 0
        ? `Result: ${parts.length} ${parts.length === 1 ? 'PDF' : 'PDFs'}${asZip && parts.length > 1 ? ' bundled in a ZIP' : ''}`
        : 'Add at least 1 part');

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'SignMyPDF — Split PDF',
    description: 'Free online PDF splitter. Extract pages or split a PDF into multiple files. No registration.',
    url: 'https://www.signmypdf.io/split',
    applicationCategory: 'ProductivityApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    featureList: [
      'Extract pages from PDF',
      'Split PDF into multiple files',
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

      <NavHeader activeTool="split" />

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
            <h1 className="hero-title">Split PDF</h1>
            <p className="hero-sub">Extract pages or split a PDF into multiple files. Free, no registration.</p>

            <div {...getRootProps()} className={`dropzone${isDragActive ? ' active' : ''}`}>
              <input {...getInputProps()} />
              <div className="dz-icon" style={{ display: 'inline-flex' }}>
                <Scissors size={48} color="#c026d3" strokeWidth={1.6} />
              </div>
              <p className="dz-title">{isDragActive ? 'Drop it here!' : 'Drop a PDF here'}</p>
              <p className="dz-sub">or click to select a file from your computer</p>
              <label className="btn-primary" style={{ cursor: 'pointer' }}>
                Choose PDF file
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) acceptFile(file);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
            <p style={{ textAlign: 'center', fontSize: 13, color: '#64748b', marginTop: 8 }}>
              {hasSubscription
                ? `Premium: files up to ${bytesToMB(SPLIT_PRO_SIZE_LIMIT)} MB`
                : `Free: files up to ${bytesToMB(SPLIT_FREE_SIZE_LIMIT)} MB, up to ${SPLIT_FREE_PAGE_LIMIT} pages`}
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
          <div style={{ maxWidth: 1080, margin: '0 auto' }}>
            <div className="step-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              <h2 className="step-title">Choose what to split</h2>
              {hasSubscription ? (
                <div style={{ fontSize: 13, color: '#16a34a', background: '#f0fdf4', padding: '6px 12px', borderRadius: 8, border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Star size={14} color="#F59E0B" fill="#F59E0B" /> Premium active
                </div>
              ) : (
                <div style={{ fontSize: 13, color: '#64748b', background: '#f8fafc', padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Scissors size={14} color="#64748b" /> Free plan
                </div>
              )}
            </div>

            {/* File hero */}
            <div className="compress-hero">
              <div className="compress-hero-main">
                <div className="compress-hero-name" title={pdfFile.name}>{pdfFile.name}</div>
                <div className="compress-hero-size">{formatFileSize(pdfFile.size)}</div>
                <div className="compress-hero-meta">
                  {pageCount > 0 ? <>{pageCount} {pageCount === 1 ? 'page' : 'pages'}</> : <>Reading PDF…</>}
                </div>
              </div>
              <button type="button" onClick={reset} disabled={isProcessing} className="compress-hero-link">
                Choose another file
              </button>
            </div>

            {/* Mode tabs */}
            <div className="split-tabs" role="tablist">
              {([
                { id: 'extract',   label: 'Extract pages',         icon: <CheckSquare size={15} />, locked: false },
                { id: 'parts',     label: 'Split into parts',      icon: <SplitSquareHorizontal size={15} />, locked: false },
                { id: 'every-n',   label: 'Split every N pages',   icon: <Files size={15} />,       locked: !hasSubscription },
                { id: 'bookmarks', label: 'Split by bookmarks',    icon: <Bookmark size={15} />,    locked: !hasSubscription },
              ] as const).map(t => {
                const active = mode === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => handleModeClick(t.id)}
                    className={[
                      'split-tab',
                      active ? 'split-tab-active' : '',
                      t.locked ? 'split-tab-locked' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    {t.icon}
                    <span>{t.label}</span>
                    {t.locked && <span className="split-tab-pro"><Lock size={10} /> Pro</span>}
                  </button>
                );
              })}
            </div>

            {limitBanner && (
              <div className="merge-banner merge-banner-warn">
                <AlertTriangle size={16} color="#d97706" />
                <span style={{ flex: 1 }}>{limitBanner}</span>
                <button onClick={() => setLimitBanner(null)} aria-label="Dismiss" className="merge-banner-close"><Trash2 size={14} /></button>
              </div>
            )}
            {errorBanner && (
              <div className="merge-banner merge-banner-error">
                <AlertTriangle size={16} color="#dc2626" />
                <span style={{ flex: 1 }}>{errorBanner}</span>
                <button onClick={() => setErrorBanner(null)} aria-label="Dismiss" className="merge-banner-close"><Trash2 size={14} /></button>
              </div>
            )}

            {/* Mode panel */}
            {mode === 'extract' && (
              <div className="split-panel">
                {/* Selection toolbar */}
                <div className="split-toolbar">
                  <div className="split-counter">
                    Selected: <strong>{selectedPages.size}</strong> of {pageCount} pages
                  </div>
                  <div className="split-toolbar-actions">
                    <button type="button" onClick={selectAll} className="split-link-btn">Select all</button>
                    <span className="split-link-sep">·</span>
                    <button type="button" onClick={clearSelection} className="split-link-btn">Clear</button>
                    <span className="split-link-sep">·</span>
                    <button type="button" onClick={invertSelection} className="split-link-btn">Invert selection</button>
                  </div>
                </div>

                {/* Page grid */}
                <div className="split-grid">
                  {thumbsLoading && thumbnails.length === 0 && (
                    <div className="split-grid-loading">Rendering pages…</div>
                  )}
                  {thumbnails.map((src, i) => {
                    const page = i + 1;
                    const sel = selectedPages.has(page);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleSelected(page)}
                        className={`split-thumb${sel ? ' split-thumb-selected' : ''}`}
                        aria-pressed={sel}
                      >
                        <span className="split-thumb-checkbox" aria-hidden="true">
                          {sel ? <CheckSquare size={16} /> : <Square size={16} />}
                        </span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={`Page ${page}`} />
                        <span className="split-thumb-label">{page}</span>
                      </button>
                    );
                  })}
                  {/* Locked overlay for free users with > 30 pages */}
                  {exceededFreePageLimit && pageCount > thumbnails.length && (
                    <div className="split-grid-locked">
                      <Lock size={20} />
                      <div>
                        <strong>+{pageCount - SPLIT_FREE_PAGE_LIMIT} more pages</strong>
                        <p>Upgrade to Pro to split documents over {SPLIT_FREE_PAGE_LIMIT} pages.</p>
                      </div>
                      <button onClick={() => setShowPricing(true)} className="btn-primary" style={{ padding: '8px 14px', fontSize: 13, borderRadius: 10 }}>
                        Upgrade
                      </button>
                    </div>
                  )}
                </div>

                {/* Range input */}
                <div className="split-range-input-row">
                  <label className="split-range-label">Or type page ranges:</label>
                  <input
                    type="text"
                    value={rangeInput}
                    onChange={e => setRangeInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') applyRangeInput(); }}
                    placeholder="1-3, 5, 8-10"
                    className="split-range-input"
                  />
                  <button type="button" onClick={applyRangeInput} className="split-apply-btn">Apply</button>
                </div>
                {rangeInputError && (
                  <p className="split-range-error">{rangeInputError}</p>
                )}
              </div>
            )}

            {mode === 'parts' && (
              <div className="split-panel">
                <div className="split-counter" style={{ marginBottom: 12 }}>
                  <strong>{parts.length}</strong> of {maxParts} parts
                </div>

                <div className="split-parts-list">
                  {parts.map((p, idx) => {
                    const span = Math.max(0, p.to - p.from + 1);
                    const valid = p.from >= 1 && p.to <= pageCount && p.from <= p.to;
                    return (
                      <div key={p.id} className={`split-part${valid ? '' : ' split-part-invalid'}`}>
                        <span className="split-part-prefix">Part {idx + 1}:</span>
                        <span className="split-part-pages">pages</span>
                        <input
                          type="number"
                          min={1}
                          max={pageCount}
                          value={p.from}
                          onChange={e => updatePart(p.id, { from: parseInt(e.target.value || '0', 10) })}
                          className="split-part-input"
                        />
                        <span className="split-part-to">to</span>
                        <input
                          type="number"
                          min={1}
                          max={pageCount}
                          value={p.to}
                          onChange={e => updatePart(p.id, { to: parseInt(e.target.value || '0', 10) })}
                          className="split-part-input"
                        />
                        <span className="split-part-summary">
                          {valid ? `${span} ${span === 1 ? 'page' : 'pages'} · ~${formatFileSize(partEstimateBytes(p))}` : 'Invalid range'}
                        </span>
                        <button
                          type="button"
                          onClick={() => removePart(p.id)}
                          disabled={parts.length <= 1}
                          aria-label={`Remove part ${idx + 1}`}
                          className="split-part-remove"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={addPart}
                  disabled={isProcessing}
                  className={`split-add-part${parts.length >= maxParts ? ' split-add-part-locked' : ''}`}
                >
                  <Plus size={14} /> Add another part
                  {!hasSubscription && parts.length >= SPLIT_FREE_PARTS_LIMIT && (
                    <span className="split-tab-pro" style={{ marginLeft: 6 }}><Lock size={10} /> Pro</span>
                  )}
                </button>

                {parts.length > 1 && (
                  <label className="split-zip-toggle">
                    <input
                      type="checkbox"
                      checked={asZip}
                      onChange={e => setAsZip(e.target.checked)}
                    />
                    <span>Download as ZIP ({parts.length} files in one archive)</span>
                  </label>
                )}
              </div>
            )}

            {/* Action area */}
            <div className="split-cta-block">
              <p className="compress-cta-helper">{ctaPreview}</p>
              <button
                type="button"
                className="btn-primary compress-cta-btn"
                onClick={handleRun}
                disabled={!canRun}
                title={!canRun && mode === 'extract' && selectedPages.size === 0 ? 'Select at least 1 page' : undefined}
              >
                {isProcessing ? (
                  <><span className="spinner" /> {mode === 'extract' ? 'Extracting your pages…' : `Creating part…`}</>
                ) : (
                  <><Scissors size={18} /> {ctaLabel}</>
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
        {step === 'done' && resultMode && (
          <div className="done-wrap" style={{ maxWidth: 640 }}>
            <div className="done-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={56} color="#16a34a" strokeWidth={2.2} />
            </div>

            {resultMode === 'extract' ? (
              <>
                <h2 className="done-title">Done! Your PDF is ready.</h2>
                {resultBlobs[0] && (
                  <p className="done-sub">
                    <strong>{resultBlobs[0].name}</strong> · {selectedPages.size} {selectedPages.size === 1 ? 'page' : 'pages'} · {formatFileSize(resultBlobs[0].blob.size)}
                  </p>
                )}
              </>
            ) : (
              <>
                <h2 className="done-title">Done! Your {resultBlobs.length} PDFs are ready.</h2>
                {resultZip ? (
                  <p className="done-sub">
                    <strong>{resultZip.name}</strong> · {resultBlobs.length} files · {formatFileSize(resultZip.blob.size)} total
                  </p>
                ) : (
                  <p className="done-sub">{resultBlobs.length} separate PDFs · {formatFileSize(resultBlobs.reduce((s, b) => s + b.blob.size, 0))} total</p>
                )}
              </>
            )}

            <div className="done-btns">
              {/* Primary download(s) */}
              {resultMode === 'extract' && resultBlobs[0] && (
                <button
                  className="btn-primary"
                  style={{ width: '100%', maxWidth: 480, padding: '16px', fontSize: 16, borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  onClick={async () => {
                    await downloadOrShare(resultBlobs[0].url, resultBlobs[0].name);
                    track('pdf_downloaded', { plan: hasSubscription ? 'pro' : 'free', tool: 'split', method: 'button' });
                  }}
                >
                  <Download size={18} /> Download PDF
                </button>
              )}

              {resultMode === 'parts' && resultZip && (
                <button
                  className="btn-primary"
                  style={{ width: '100%', maxWidth: 480, padding: '16px', fontSize: 16, borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  onClick={async () => {
                    await downloadOrShare(resultZip.url, resultZip.name, 'application/zip');
                    track('pdf_downloaded', { plan: hasSubscription ? 'pro' : 'free', tool: 'split', method: 'zip' });
                  }}
                >
                  <Download size={18} /> Download ZIP
                </button>
              )}

              {resultMode === 'parts' && !resultZip && (
                <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {resultBlobs.map((b, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12 }}>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14, color: '#334155' }}>{b.name}</span>
                      <span style={{ color: '#94a3b8', fontSize: 12 }}>{formatFileSize(b.blob.size)}</span>
                      <button
                        className="btn-ghost"
                        style={{ padding: '8px 14px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        onClick={() => downloadOrShare(b.url, b.name)}
                      >
                        <Download size={14} /> Save
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Cross-tool funnel */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 480, width: '100%' }}>
                <button type="button" className="merge-funnel-link" onClick={() => goWithFile('/sign', 'split_to_sign_clicked')}>
                  <PenLine size={14} /> Sign this PDF →
                </button>
                <button type="button" className="merge-funnel-link" onClick={() => goWithFile('/merge', 'split_to_merge_clicked')}>
                  <Files size={14} /> Merge with another PDF →
                </button>
                <button type="button" className="merge-funnel-link" onClick={() => goWithFile('/compress', 'split_to_compress_clicked')}>
                  <Minimize2 size={14} /> Compress this PDF →
                </button>
              </div>

              <button className="btn-ghost" style={{ width: '100%', maxWidth: 480, padding: '13px', fontSize: 15, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={reset}>
                <RefreshCw size={16} /> Split another
              </button>
            </div>
          </div>
        )}

      </div>

      {/* File History — only after split completes */}
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
              <a href="/compress" className="more-tool-card">
                <div style={{ marginBottom: 8, color: '#0891b2' }}><Minimize2 size={26} strokeWidth={1.8} /></div>
                <div className="more-tool-title">Compress PDF</div>
                <div className="more-tool-sub">Reduce PDF file size</div>
                <span className="more-tool-cta">Try it →</span>
              </a>
              <div className="more-tool-card more-tool-card-current">
                <div style={{ marginBottom: 8, color: '#c026d3' }}><Scissors size={26} strokeWidth={1.8} /></div>
                <div className="more-tool-title">Split PDF</div>
                <div className="more-tool-sub">Extract pages or split</div>
                <span className="more-tool-cta-current">Current tool</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEO body */}
      {step === 'upload' && (
        <div className="container" style={{ paddingTop: 24, paddingBottom: 40 }}>
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 12, letterSpacing: '-0.01em' }}>
              Split PDF Files Online — Free
            </h2>
            <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.7, marginBottom: 16 }}>
              Drop a PDF, pick the pages you want, and get back either one extracted PDF or several smaller ones — whichever fits your task. The whole job runs in your browser, so the document never leaves your device. No upload, no account, no waiting in queue.
            </p>
            <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.7, marginBottom: 16 }}>
              Use Extract pages when you only need a few pages out of a long document, like pulling a single section out of a contract. Use Split into parts when you want to break a bigger PDF into independent files — chapters, monthly reports, anything you&apos;d normally save separately. Either way, the original page order is preserved and quality is unchanged.
            </p>
            <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.7, marginBottom: 0 }}>
              Free for files up to {bytesToMB(SPLIT_FREE_SIZE_LIMIT)} MB and {SPLIT_FREE_PAGE_LIMIT} pages, with up to {SPLIT_FREE_PARTS_LIMIT} output parts. Premium lifts the cap to {bytesToMB(SPLIT_PRO_SIZE_LIMIT)} MB, removes the page limit, and unlocks Split every N pages and Split by bookmarks.
            </p>
          </div>

          <div className="compact-faq" style={{ marginTop: 32 }}>
            <h2>FAQ</h2>
            <details>
              <summary>Is it really free?</summary>
              <p className="faq-answer">Yes. Files up to {bytesToMB(SPLIT_FREE_SIZE_LIMIT)} MB and {SPLIT_FREE_PAGE_LIMIT} pages, no signup.</p>
            </details>
            <details>
              <summary>Are my files uploaded?</summary>
              <p className="faq-answer">No. Everything runs in your browser — your PDF never leaves your device.</p>
            </details>
            <details>
              <summary>What&apos;s the difference between Extract and Split into parts?</summary>
              <p className="faq-answer">Extract makes one PDF out of the pages you select. Split into parts makes several PDFs, one per range you define.</p>
            </details>
          </div>
        </div>
      )}

      <PaywallModal
        open={showPricing}
        onClose={() => setShowPricing(false)}
        tool="split"
        onProActivated={() => setHasSubscription(true)}
      />

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
