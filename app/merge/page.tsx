'use client';

import { useState, useCallback, useRef, useEffect, type DragEvent, type ChangeEvent } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Files,
  Lock,
  Zap,
  Star,
  RefreshCw,
  Plus,
  Download,
  PenLine,
  FileSignature,
  ArrowUp,
  ArrowDown,
  GripVertical,
  X,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import NavHeader from '../components/NavHeader';
import SiteFooter from '../components/SiteFooter';
import FileHistory, { saveToHistory } from '../components/FileHistory';
import PaywallModal from '../components/PaywallModal';
import {
  PADDLE_CLIENT_TOKEN,
  MERGE_FREE_FILE_LIMIT,
  MERGE_PRO_FILE_LIMIT,
  MERGE_FREE_SIZE_LIMIT,
  MERGE_PRO_SIZE_LIMIT,
} from '../constants';
import { isProActive, activateSubscription } from '../utils/subscription';
import { storePendingFile } from '../utils/pendingUpload';
import { blobToDataUrl } from '../utils/watermark';
import { mergePdf, MergePdfError } from '../utils/mergePdf';
import { useRouter } from 'next/navigation';

type Step = 'upload' | 'arrange' | 'done';

interface FileEntry {
  id: string;
  file: File;
  pageCount: number | null;
  thumbnail: string | null;
}

const STEPS = [
  { id: 'upload',  label: 'Upload PDFs' },
  { id: 'arrange', label: 'Arrange Order' },
  { id: 'done',    label: 'Download' },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function bytesToMB(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1);
}

function track(event: string, params: Record<string, string | number | boolean> = {}) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).gtag?.('event', event, params);
  } catch { /* no-op */ }
}

export default function MergePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('upload');
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [mergedUrl, setMergedUrl] = useState<string | null>(null);
  const [mergedSize, setMergedSize] = useState(0);
  const [mergedFileName, setMergedFileName] = useState('merged.pdf');
  const [mergedBlob, setMergedBlob] = useState<Blob | null>(null);

  const [hasSubscription, setHasSubscription] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [activatingPro, setActivatingPro] = useState(false);
  const [activatingEmail, setActivatingEmail] = useState('');

  const [limitBanner, setLimitBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Drag-and-drop reorder state. Tracks the ID of the card being dragged
  // so we can compute insertion in onDrop without relying on indexOf during
  // the in-flight reorder (which would be off-by-one once the array changes).
  const [dragId, setDragId] = useState<string | null>(null);

  const addInputRef = useRef<HTMLInputElement | null>(null);
  // Tracks which entry IDs we've already kicked off a thumbnail/page-count
  // load for, so each file is only loaded once even though the effect that
  // owns the loader re-runs on every entries mutation.
  const loadingRef = useRef<Set<string>>(new Set());

  // ── Compute totals + limits ─────────────────────────────────────
  const totalSize = entries.reduce((s, e) => s + e.file.size, 0);
  const maxFiles = hasSubscription ? MERGE_PRO_FILE_LIMIT : MERGE_FREE_FILE_LIMIT;
  const maxSize = hasSubscription ? MERGE_PRO_SIZE_LIMIT : MERGE_FREE_SIZE_LIMIT;

  // ── Mount: subscription + Paddle ────────────────────────────────
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
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [step]);

  // ── Asynchronously load thumbnail + page count for any new entry ──
  // Each entry's load runs as an independent async task — kicking off in
  // serial inside one big for-loop creates a double-fire problem when the
  // effect re-runs after the first setEntries (the OLD loop's cancelled
  // flag bails out the rest, while the NEW loop's tracker-based filter
  // skips them because they're already marked in-flight). Independent
  // tasks per entry sidestep that entirely.
  useEffect(() => {
    const tracker = loadingRef.current;
    const pending = entries.filter(
      e => e.thumbnail === null && e.pageCount === null && !tracker.has(e.id),
    );
    if (pending.length === 0) return;
    pending.forEach(e => tracker.add(e.id));

    pending.forEach(async (entry) => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        const buf = await entry.file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
        const pageCount = pdf.numPages;
        const page = await pdf.getPage(1);
        const baseVp = page.getViewport({ scale: 1 });
        const targetW = 160;
        const scale = Math.min(targetW / baseVp.width, 2);
        const vp = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = vp.width;
        canvas.height = vp.height;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await page.render({ canvas: canvas as any, viewport: vp }).promise;
        const thumbnail = canvas.toDataURL('image/jpeg', 0.85);
        setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, pageCount, thumbnail } : e));
      } catch {
        // Mark as done (0 pages, empty thumb) so the spinner stops. The
        // merge step will surface a real error if pdf-lib can't parse it
        // either.
        setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, pageCount: 0, thumbnail: '' } : e));
      }
    });
  }, [entries]);

  // ── Add files (validates against limits, opens paywall on overflow) ──
  const tryAddFiles = useCallback((incoming: File[]) => {
    const pdfs = incoming.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (pdfs.length === 0) return;

    const accepted: File[] = [];
    let curCount = entries.length;
    let curSize = totalSize;
    let hitFileLimit = false;
    let hitSizeLimit = false;

    for (const f of pdfs) {
      if (curCount + 1 > maxFiles) {
        hitFileLimit = true;
        continue;
      }
      if (curSize + f.size > maxSize) {
        hitSizeLimit = true;
        continue;
      }
      accepted.push(f);
      curCount++;
      curSize += f.size;
    }

    if (accepted.length) {
      const newEntries: FileEntry[] = accepted.map(file => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        pageCount: null,
        thumbnail: null,
      }));
      setEntries(prev => [...prev, ...newEntries]);
      if (step === 'upload') setStep('arrange');
      track('merge_files_added', { count: accepted.length, plan: hasSubscription ? 'pro' : 'free' });
    }

    if (hitFileLimit && !hasSubscription) {
      setLimitBanner(`Free plan supports up to ${MERGE_FREE_FILE_LIMIT} files per merge. Upgrade to combine up to ${MERGE_PRO_FILE_LIMIT} files.`);
      setShowPricing(true);
      track('merge_paywall_opened', { reason: 'file_limit' });
    } else if (hitSizeLimit && !hasSubscription) {
      setLimitBanner(`Free plan supports up to ${bytesToMB(MERGE_FREE_SIZE_LIMIT)} MB per merge. Upgrade for up to ${bytesToMB(MERGE_PRO_SIZE_LIMIT)} MB.`);
      setShowPricing(true);
      track('merge_paywall_opened', { reason: 'size_limit' });
    } else if (hitFileLimit) {
      setLimitBanner(`Maximum ${maxFiles} files per merge. Some files were not added.`);
    } else if (hitSizeLimit) {
      setLimitBanner(`Maximum ${bytesToMB(maxSize)} MB per merge. Some files were not added.`);
    }
  }, [entries.length, totalSize, maxFiles, maxSize, hasSubscription, step]);

  // ── Dropzone (initial upload + drag-n-drop on the arrange step) ──
  const onDrop = useCallback((files: File[]) => {
    setLimitBanner(null);
    tryAddFiles(files);
  }, [tryAddFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
    noClick: true,
  });

  const handleAddMoreClick = () => {
    setLimitBanner(null);
    addInputRef.current?.click();
  };

  const handleAddInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    tryAddFiles(files);
  };

  // ── Reorder helpers ─────────────────────────────────────────────
  const moveEntry = (id: string, delta: -1 | 1) => {
    setEntries(prev => {
      const idx = prev.findIndex(e => e.id === id);
      if (idx === -1) return prev;
      const next = idx + delta;
      if (next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy;
    });
  };

  const removeEntry = (id: string) => {
    setEntries(prev => {
      const next = prev.filter(e => e.id !== id);
      if (next.length === 0) {
        setStep('upload');
        setLimitBanner(null);
        setErrorBanner(null);
      }
      return next;
    });
  };

  // HTML5 drag-and-drop reorder. We drag CARDS, not files — the dragged
  // payload is just the entry id, identified by `dragId` ref. We don't
  // call setData on the DataTransfer because Safari is finicky and we
  // already control the source through React state.
  const handleCardDragStart = (e: DragEvent<HTMLDivElement>, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
    // Required by Firefox, otherwise drag never starts.
    try { e.dataTransfer.setData('text/plain', id); } catch {}
  };
  const handleCardDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (dragId) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  };
  const handleCardDrop = (e: DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault();
    if (!dragId || dragId === targetId) {
      setDragId(null);
      return;
    }
    setEntries(prev => {
      const fromIdx = prev.findIndex(it => it.id === dragId);
      const toIdx = prev.findIndex(it => it.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, moved);
      return copy;
    });
    setDragId(null);
  };
  const handleCardDragEnd = () => setDragId(null);

  // ── Merge ───────────────────────────────────────────────────────
  const canMerge = entries.length >= 2 && !isProcessing;

  const handleMerge = async () => {
    if (!canMerge) return;
    setErrorBanner(null);
    setLimitBanner(null);
    setIsProcessing(true);
    setProgress({ done: 0, total: entries.length });

    try {
      const bytes = await mergePdf(entries.map(e => e.file), {
        onProgress: (done, total) => setProgress({ done, total }),
      });
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const filename = entries.length === 2 ? 'merged.pdf' : `merged-${entries.length}-files.pdf`;

      setMergedBlob(blob);
      setMergedUrl(url);
      setMergedSize(blob.size);
      setMergedFileName(filename);

      // Save to history (Pro keeps 1 year, free keeps 24h — same as other tools).
      try {
        const dataUrl = await blobToDataUrl(blob);
        saveToHistory(filename, blob.size, dataUrl, 'merge', false);
        window.dispatchEvent(new Event('signmypdf:saved'));
      } catch {
        // history save is best-effort
      }

      // Auto-download on desktop. iOS uses the button on the done screen
      // because programmatic <a download> is blocked there.
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

      track('pdf_merged', {
        plan: hasSubscription ? 'pro' : 'free',
        file_count: entries.length,
        total_input_size: totalSize,
        output_size: blob.size,
      });

      setTimeout(() => setStep('done'), 200);
    } catch (err) {
      if (err instanceof MergePdfError) {
        const verb = err.reason === 'encrypted' ? 'is password-protected' : 'could not be read';
        setErrorBanner(`Could not merge ${err.fileName} — file ${verb}. Remove it and try again.`);
      } else {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setErrorBanner(`Merge failed: ${msg}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Universal download (iOS share sheet / desktop link) ────────
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

  // ── Cross-tool funnel: hand merged file to /sign via IndexedDB ──
  const handleSignThis = async () => {
    if (!mergedBlob) return;
    track('merge_to_sign_clicked');
    const file = new File([mergedBlob], mergedFileName, { type: 'application/pdf' });
    try {
      await storePendingFile(file);
    } catch { /* fall through to plain navigation */ }
    router.push('/sign');
  };

  const reset = () => {
    if (mergedUrl) URL.revokeObjectURL(mergedUrl);
    setEntries([]);
    loadingRef.current.clear();
    setStep('upload');
    setIsProcessing(false);
    setProgress({ done: 0, total: 0 });
    setMergedUrl(null);
    setMergedBlob(null);
    setMergedSize(0);
    setMergedFileName('merged.pdf');
    setLimitBanner(null);
    setErrorBanner(null);
  };

  const stepIndex = STEPS.findIndex(s => s.id === step);

  // JSON-LD structured data
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'SignMyPDF — Merge PDF',
    description: 'Free online PDF merger. Combine multiple PDFs into one file. No registration required.',
    url: 'https://www.signmypdf.io/merge',
    applicationCategory: 'ProductivityApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: [
      'Merge PDF documents online',
      'Drag and drop reordering',
      'No registration required',
      'Client-side processing',
      'Mobile friendly',
    ],
  };

  // ── Render ──────────────────────────────────────────────────────
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <NavHeader activeTool="merge" />

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
            <h1 className="hero-title">Merge PDF</h1>
            <p className="hero-sub">Combine multiple PDFs into one file. Free, no registration.</p>

            <div {...getRootProps()} className={`dropzone${isDragActive ? ' active' : ''}`}>
              <input {...getInputProps()} />
              <div className="dz-icon" style={{ display: 'inline-flex' }}>
                <Files size={48} color="#4f46e5" strokeWidth={1.6} />
              </div>
              <p className="dz-title">{isDragActive ? 'Drop them here!' : 'Drop PDFs here'}</p>
              <p className="dz-sub">or click to select files from your computer</p>
              <label className="btn-primary" style={{ cursor: 'pointer' }}>
                Choose PDF files
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  style={{ display: 'none' }}
                  onChange={e => {
                    const files = Array.from(e.target.files || []);
                    if (files.length) tryAddFiles(files);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
            <p style={{ textAlign: 'center', fontSize: 13, color: '#64748b', marginTop: 8 }}>
              {hasSubscription
                ? `Premium: up to ${MERGE_PRO_FILE_LIMIT} files, ${bytesToMB(MERGE_PRO_SIZE_LIMIT)} MB total`
                : `Free: up to ${MERGE_FREE_FILE_LIMIT} files, ${bytesToMB(MERGE_FREE_SIZE_LIMIT)} MB total`}
            </p>

            <p className="trust-row">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Lock size={14} color="#64748b" /> Processed locally</span>
              <span className="trust-dot">·</span>
              <span>✓ No registration</span>
              <span className="trust-dot">·</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Zap size={14} color="#64748b" /> 30 seconds</span>
            </p>
          </div>
        )}

        {/* ── ARRANGE ── */}
        {step === 'arrange' && (
          <div>
            <div className="step-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <h2 className="step-title">Arrange &amp; merge</h2>
              {hasSubscription ? (
                <div style={{ fontSize: 13, color: '#16a34a', background: '#f0fdf4', padding: '6px 12px', borderRadius: 8, border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Star size={14} color="#F59E0B" fill="#F59E0B" /> Premium active
                </div>
              ) : (
                <div style={{ fontSize: 13, color: '#64748b', background: '#f8fafc', padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Files size={14} color="#64748b" /> Free plan
                </div>
              )}
            </div>

            {/* Counter row */}
            <div className="merge-counter">
              <strong>{entries.length}</strong> of {maxFiles} files
              <span className="merge-counter-dot">·</span>
              <strong>{bytesToMB(totalSize)}</strong> of {bytesToMB(maxSize)} MB
            </div>

            {/* Inline limit banner — stays visible after the paywall closes
                so the user understands which file got rejected. */}
            {limitBanner && (
              <div className="merge-banner merge-banner-warn">
                <AlertTriangle size={16} color="#d97706" />
                <span style={{ flex: 1 }}>{limitBanner}</span>
                <button onClick={() => setLimitBanner(null)} aria-label="Dismiss" className="merge-banner-close"><X size={14} /></button>
              </div>
            )}
            {errorBanner && (
              <div className="merge-banner merge-banner-error">
                <AlertTriangle size={16} color="#dc2626" />
                <span style={{ flex: 1 }}>{errorBanner}</span>
                <button onClick={() => setErrorBanner(null)} aria-label="Dismiss" className="merge-banner-close"><X size={14} /></button>
              </div>
            )}

            {/* File list */}
            <div className="merge-list">
              {entries.map((entry, idx) => {
                const isDragging = dragId === entry.id;
                return (
                  <div
                    key={entry.id}
                    className={`merge-card${isDragging ? ' merge-card-dragging' : ''}`}
                    draggable={!isProcessing}
                    onDragStart={(e) => handleCardDragStart(e, entry.id)}
                    onDragOver={handleCardDragOver}
                    onDrop={(e) => handleCardDrop(e, entry.id)}
                    onDragEnd={handleCardDragEnd}
                  >
                    {/* Drag handle (desktop) */}
                    <span className="merge-drag-handle" aria-hidden="true">
                      <GripVertical size={18} />
                    </span>

                    {/* Mobile reorder arrows */}
                    <div className="merge-arrows">
                      <button
                        type="button"
                        onClick={() => moveEntry(entry.id, -1)}
                        disabled={idx === 0 || isProcessing}
                        aria-label="Move up"
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveEntry(entry.id, 1)}
                        disabled={idx === entries.length - 1 || isProcessing}
                        aria-label="Move down"
                      >
                        <ArrowDown size={16} />
                      </button>
                    </div>

                    {/* Thumbnail */}
                    <div className="merge-thumb">
                      {entry.thumbnail === null ? (
                        <span className="spinner" />
                      ) : entry.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={entry.thumbnail} alt={`Page 1 of ${entry.file.name}`} />
                      ) : (
                        <Files size={28} color="#cbd5e1" />
                      )}
                    </div>

                    {/* Meta */}
                    <div className="merge-meta">
                      <div className="merge-name" title={entry.file.name}>{entry.file.name}</div>
                      <div className="merge-info">
                        {entry.pageCount === null
                          ? 'Loading…'
                          : entry.pageCount > 0
                            ? `${entry.pageCount} ${entry.pageCount === 1 ? 'page' : 'pages'} · ${formatFileSize(entry.file.size)}`
                            : formatFileSize(entry.file.size)}
                      </div>
                    </div>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removeEntry(entry.id)}
                      disabled={isProcessing}
                      className="merge-remove"
                      aria-label={`Remove ${entry.file.name}`}
                    >
                      <X size={16} />
                    </button>
                  </div>
                );
              })}
            </div>

            <input
              ref={addInputRef}
              type="file"
              accept="application/pdf"
              multiple
              style={{ display: 'none' }}
              onChange={handleAddInputChange}
            />

            {/* Action row */}
            <div className="merge-actions">
              <button
                type="button"
                className="btn-ghost merge-add-btn"
                onClick={handleAddMoreClick}
                disabled={isProcessing}
              >
                <Plus size={16} /> Add more PDFs
              </button>

              <button
                type="button"
                className="btn-primary merge-cta"
                onClick={handleMerge}
                disabled={!canMerge}
                title={entries.length < 2 ? 'Add at least 2 files to merge' : undefined}
              >
                {isProcessing ? (
                  <><span className="spinner" /> Merging your PDFs…</>
                ) : (
                  <><Files size={18} /> Merge PDFs</>
                )}
              </button>
            </div>
            {entries.length < 2 && !isProcessing && (
              <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 12 }}>
                Add at least 2 files to merge
              </p>
            )}

            {/* Processing progress */}
            {isProcessing && (
              <div className="merge-progress">
                <div className="merge-progress-bar">
                  <div
                    className="merge-progress-fill"
                    style={{ width: `${(progress.done / Math.max(progress.total, 1)) * 100}%` }}
                  />
                </div>
                <p className="merge-progress-text">
                  Processing file {progress.done} of {progress.total}…
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── DONE ── */}
        {step === 'done' && (
          <div className="done-wrap">
            <div className="done-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={56} color="#16a34a" strokeWidth={2.2} />
            </div>
            <h2 className="done-title">Done! Your PDF is ready.</h2>
            <p className="done-sub">
              <strong>{mergedFileName}</strong> · {formatFileSize(mergedSize)}
            </p>

            <div className="done-btns">
              <button
                className="btn-primary"
                style={{ width: '100%', maxWidth: 480, padding: '16px', fontSize: 16, borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onClick={async () => {
                  if (!mergedUrl) return;
                  await downloadOrShare(mergedUrl, mergedFileName);
                  track('pdf_downloaded', { plan: hasSubscription ? 'pro' : 'free', tool: 'merge', method: 'button' });
                }}
              >
                <Download size={18} /> Download PDF
              </button>

              {/* Cross-tool funnel — Sign hands the merged file to /sign via
                  the same IndexedDB pendingUpload as the homepage dropzone. */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 480, width: '100%' }}>
                <button
                  type="button"
                  className="merge-funnel-link"
                  onClick={handleSignThis}
                >
                  <PenLine size={14} /> Sign this PDF →
                </button>
                <button
                  type="button"
                  className="merge-funnel-link"
                  onClick={() => track('merge_to_compress_clicked')}
                  title="Coming soon"
                >
                  <Files size={14} /> Compress this PDF (coming soon)
                </button>
              </div>

              <button className="btn-ghost" style={{ width: '100%', maxWidth: 480, padding: '13px', fontSize: 15, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={reset}>
                <RefreshCw size={16} /> Merge another
              </button>
            </div>
          </div>
        )}

      </div>

      {/* File History — only after merge completes */}
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, maxWidth: 880, margin: '0 auto' }}>
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
              <div className="more-tool-card more-tool-card-current">
                <div style={{ marginBottom: 8, color: '#4f46e5' }}><Files size={26} strokeWidth={1.8} /></div>
                <div className="more-tool-title">Merge PDF</div>
                <div className="more-tool-sub">Combine multiple PDFs</div>
                <span className="more-tool-cta-current">Current tool</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEO body — short, human, no AI-spam patterns */}
      {step === 'upload' && (
        <div className="container" style={{ paddingTop: 24, paddingBottom: 40 }}>
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 12, letterSpacing: '-0.01em' }}>
              Merge PDF Files Online — Free
            </h2>
            <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.7, marginBottom: 16 }}>
              Combine two or more PDFs into a single file in your browser. The whole job runs locally on your device — your documents never leave your computer. No upload, no account, no waiting in queue.
            </p>
            <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.7, marginBottom: 16 }}>
              Drag your files in any order, switch them around, drop one if it doesn&apos;t belong, then hit Merge. The output keeps every page from every input, in the exact order you set, with no quality loss.
            </p>
            <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.7, marginBottom: 0 }}>
              Free for up to {MERGE_FREE_FILE_LIMIT} files and {bytesToMB(MERGE_FREE_SIZE_LIMIT)} MB per merge. Premium lifts the limit to {MERGE_PRO_FILE_LIMIT} files and {bytesToMB(MERGE_PRO_SIZE_LIMIT)} MB if you do this every day.
            </p>
          </div>

          <div className="compact-faq" style={{ marginTop: 32 }}>
            <h2>FAQ</h2>
            <details>
              <summary>Is it really free?</summary>
              <p className="faq-answer">Yes. Up to {MERGE_FREE_FILE_LIMIT} files and {bytesToMB(MERGE_FREE_SIZE_LIMIT)} MB per merge with no signup.</p>
            </details>
            <details>
              <summary>Are my files uploaded?</summary>
              <p className="faq-answer">No. Everything runs in your browser — your PDFs never leave your device.</p>
            </details>
            <details>
              <summary>Can I reorder files before merging?</summary>
              <p className="faq-answer">Yes. Drag the cards on desktop or use the up/down arrows on mobile.</p>
            </details>
          </div>
        </div>
      )}

      <PaywallModal
        open={showPricing}
        onClose={() => setShowPricing(false)}
        tool="merge"
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
