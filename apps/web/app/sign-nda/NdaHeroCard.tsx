'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import {
  ArrowLeft,
  CheckCircle,
  Download,
  FileSignature,
  FileText,
  Loader2,
  Mail,
  MessageCircle,
  PenLine,
  RefreshCw,
  Send,
  Upload,
} from 'lucide-react';
import FillSignEditor from '../components/FillSignEditor';
import type { FsElement } from '../utils/fillSignPdf';
import { setupPdfjs } from '@signmypdf/pdf-core';

const TEMPLATE_PDF_URL  = '/templates/nda-template.pdf';
const TEMPLATE_DOCX_URL = '/templates/nda-template.docx';

const DRAFT_KEY = 'sign-nda-draft';
const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;        // 50 MB

const SHARE_TEXT_BASE = "I'm sending you the signed NDA. (Attach the file from your downloads.)";

interface SavedDraft {
  elements: FsElement[];
  timestamp: number;
}

function readDraft(): SavedDraft | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedDraft> | null;
    if (!parsed || !parsed.timestamp || !Array.isArray(parsed.elements)) return null;
    if (Date.now() - parsed.timestamp > DRAFT_MAX_AGE_MS) return null;
    if (parsed.elements.length === 0) return null;
    return { elements: parsed.elements as FsElement[], timestamp: parsed.timestamp };
  } catch {
    return null;
  }
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch {/* ignore */}
}

export default function NdaHeroCard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [thumbReady, setThumbReady] = useState(false);
  const [thumbError, setThumbError] = useState(false);
  const [loadingForEdit, setLoadingForEdit] = useState(false);
  const [editorFile, setEditorFile] = useState<File | null>(null);
  const [editorInitialElements, setEditorInitialElements] = useState<FsElement[]>([]);
  const [downloaded, setDownloaded] = useState(false);
  const [downloadedFilename, setDownloadedFilename] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Restore-prompt state — shown when a saved draft is found right after
  // the user clicks "Fill & sign online" (template flow only — uploaded
  // PDFs always start fresh because the draft is keyed to the template).
  const pendingFileRef = useRef<File | null>(null);
  const [restoreCandidate, setRestoreCandidate] = useState<SavedDraft | null>(null);

  // Toggle a body-level class while the editor is active so the H1 and
  // subtitle (rendered by the parent server component for SEO) collapse
  // and the editor breaks out of the 880px hero container.
  useEffect(() => {
    if (editorFile) document.body.classList.add('nda-editor-mode');
    else document.body.classList.remove('nda-editor-mode');
    return () => { document.body.classList.remove('nda-editor-mode'); };
  }, [editorFile]);

  // Page-1 thumbnail render. Only runs while the hero card is visible —
  // when the editor is mounted the canvas is unmounted and this effect
  // re-runs on next mount (pdf is small, cost is negligible).
  useEffect(() => {
    if (editorFile) return;
    let cancelled = false;
    (async () => {
      try {
        const pdfjsLib = await setupPdfjs('/pdf.worker.min.mjs');

        const res = await fetch(TEMPLATE_PDF_URL);
        if (!res.ok) throw new Error(`fetch ${res.status}`);
        const buf = await res.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
        if (cancelled) return;

        const page = await pdf.getPage(1);
        const baseViewport = page.getViewport({ scale: 1 });
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;

        const targetWidth = container.clientWidth || 220;
        const scale = targetWidth / baseViewport.width;
        const viewport = page.getViewport({ scale });
        const dpr = window.devicePixelRatio || 1;

        canvas.width = viewport.width * dpr;
        canvas.height = viewport.height * dpr;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        const ctx = canvas.getContext('2d')!;
        ctx.scale(dpr, dpr);
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        if (cancelled) return;
        setThumbReady(true);
      } catch (e) {
        console.warn('NDA thumbnail render failed:', e);
        if (!cancelled) setThumbError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [editorFile]);

  const launchEditor = (file: File, initial: FsElement[]) => {
    setEditorInitialElements(initial);
    setEditorFile(file);
    setDownloaded(false);
    setDownloadedFilename('');
    requestAnimationFrame(() => {
      setTimeout(() => {
        document.querySelector('.fse')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    });
  };

  const onFillAndSign = async () => {
    if (loadingForEdit) return;
    setLoadingForEdit(true);
    try {
      const res = await fetch(TEMPLATE_PDF_URL);
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      const blob = await res.blob();
      const file = new File([blob], 'nda-template.pdf', { type: 'application/pdf' });

      const draft = readDraft();
      if (draft) {
        // Stash the file and ask the user before mounting the editor.
        pendingFileRef.current = file;
        setRestoreCandidate(draft);
        setLoadingForEdit(false);
        return;
      }

      launchEditor(file, []);
    } catch (e) {
      console.error('NDA fetch for edit failed:', e);
      setLoadingForEdit(false);
    }
  };

  const onRestoreYes = () => {
    if (!restoreCandidate || !pendingFileRef.current) return;
    const file = pendingFileRef.current;
    const elements = restoreCandidate.elements;
    pendingFileRef.current = null;
    setRestoreCandidate(null);
    launchEditor(file, elements);
  };

  const onRestoreNo = () => {
    if (!pendingFileRef.current) return;
    clearDraft();
    const file = pendingFileRef.current;
    pendingFileRef.current = null;
    setRestoreCandidate(null);
    launchEditor(file, []);
  };

  const onCloseEditor = () => {
    setEditorFile(null);
    setEditorInitialElements([]);
    setLoadingForEdit(false);
    setDownloaded(false);
    setDownloadedFilename('');
    requestAnimationFrame(() => {
      document.querySelector('.nda-hero')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const onEditorDone = async (blob: Blob) => {
    // /sign-nda is a free magnet flow — no daily counter, no FileHistory,
    // no watermark (the editor was passed `unlimited`). Download, then
    // swap to the success state with share-out CTAs.
    const sourceName = editorFile?.name ?? 'nda-template.pdf';
    const baseName = sourceName.replace(/\.pdf$/i, '');
    const filename = `signed-${baseName}.pdf`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    // Successful sign → discard the draft so the next visit starts clean.
    clearDraft();

    setDownloadedFilename(filename);
    setDownloaded(true);
  };

  // ── Upload-your-own dropzone ────────────────────────────────────────
  const onDrop = useCallback((accepted: File[], rejected: FileRejection[]) => {
    setUploadError(null);
    if (rejected && rejected.length) {
      const first = rejected[0];
      const reasons = first.errors.map(e => e.code);
      if (reasons.includes('file-too-large')) {
        setUploadError(`File is over the ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB limit.`);
      } else if (reasons.includes('file-invalid-type')) {
        setUploadError('Only PDF files are supported.');
      } else {
        setUploadError("Couldn't read that file.");
      }
      return;
    }
    const file = accepted?.[0];
    if (!file) return;
    launchEditor(file, []);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    maxSize: MAX_UPLOAD_BYTES,
    useFsAccessApi: false,
  });

  // ── Share-target URLs (built from current downloaded filename) ──────
  const shareSubject = encodeURIComponent('Signed NDA');
  const shareBody = encodeURIComponent(
    `${SHARE_TEXT_BASE}\n\nFile: ${downloadedFilename}`,
  );
  const mailtoHref = `mailto:?subject=${shareSubject}&body=${shareBody}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(SHARE_TEXT_BASE)}`;
  const telegramHref = `https://t.me/share/url?url=${encodeURIComponent('https://www.signmypdf.io/sign-nda')}&text=${encodeURIComponent(SHARE_TEXT_BASE)}`;

  // ── Editor / Success surface ────────────────────────────────────────

  if (editorFile && downloaded) {
    return (
      <div className="nda-editor-host">
        <div className="nda-success" role="status">
          <div className="nda-success-check">
            <CheckCircle size={64} strokeWidth={2.4} />
          </div>
          <h2 className="nda-success-title">Done! Your signed PDF is ready.</h2>
          {downloadedFilename && (
            <div className="nda-success-filename">
              <FileSignature size={14} />
              <span>{downloadedFilename}</span>
            </div>
          )}

          <p className="nda-success-prompt">Send it to the other party:</p>
          <div className="nda-success-buttons">
            <a href={mailtoHref} className="nda-share-btn">
              <Mail size={18} />
              <span>Email</span>
            </a>
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="nda-share-btn">
              <MessageCircle size={18} />
              <span>WhatsApp</span>
            </a>
            <a href={telegramHref} target="_blank" rel="noopener noreferrer" className="nda-share-btn">
              <Send size={18} />
              <span>Telegram</span>
            </a>
          </div>
          <p className="nda-success-hint">
            Open the app, then attach the signed PDF from your Downloads folder.
          </p>

          <button type="button" className="nda-success-restart" onClick={onCloseEditor}>
            Sign another document
          </button>
        </div>
      </div>
    );
  }

  if (editorFile) {
    return (
      <div className="nda-editor-host">
        <button type="button" className="nda-editor-back" onClick={onCloseEditor}>
          <ArrowLeft size={16} /> Back to template page
        </button>

        <FillSignEditor
          file={editorFile}
          defaultTool="text"
          unlimited
          draftKey={DRAFT_KEY}
          initialElements={editorInitialElements}
          onDone={onEditorDone}
        />
      </div>
    );
  }

  // ── Hero card surface (default) ─────────────────────────────────────

  return (
    <>
      <div className="nda-hero-card">
        <div ref={containerRef} className="nda-thumb">
          {!thumbReady && !thumbError && (
            <div className="nda-thumb-state">
              <Loader2 size={20} className="nda-thumb-spinner" />
            </div>
          )}
          {thumbError && (
            <div className="nda-thumb-state">
              <FileText size={32} color="#94a3b8" />
              <span>NDA template</span>
            </div>
          )}
          <canvas ref={canvasRef} aria-hidden="true" />
        </div>

        <div className="nda-actions">
          <button
            type="button"
            onClick={onFillAndSign}
            disabled={loadingForEdit}
            className="nda-btn nda-btn-primary"
          >
            {loadingForEdit ? <Loader2 size={18} className="nda-thumb-spinner" /> : <PenLine size={18} />}
            <span>{loadingForEdit ? 'Loading…' : 'Fill & sign online'}</span>
          </button>

          <a href={TEMPLATE_PDF_URL} download="nda-template.pdf" className="nda-btn nda-btn-secondary">
            <Download size={18} />
            <span>Download PDF</span>
          </a>

          <a href={TEMPLATE_DOCX_URL} download="nda-template.docx" className="nda-btn nda-btn-secondary">
            <Download size={18} />
            <span>Download Word (.docx)</span>
          </a>
        </div>

        {/* Restore-draft modal */}
        {restoreCandidate && (
          <div className="nda-restore-overlay" role="dialog" aria-modal="true" onClick={onRestoreNo}>
            <div className="nda-restore-card" onClick={(e) => e.stopPropagation()}>
              <RefreshCw size={22} className="nda-restore-icon" />
              <h3>Restore your previous work?</h3>
              <p>
                You had <strong>{restoreCandidate.elements.length}</strong>{' '}
                element{restoreCandidate.elements.length === 1 ? '' : 's'} placed.
              </p>
              <div className="nda-restore-actions">
                <button type="button" className="nda-btn nda-btn-primary nda-restore-btn" onClick={onRestoreYes}>
                  Restore
                </button>
                <button type="button" className="nda-btn nda-btn-secondary nda-restore-btn" onClick={onRestoreNo}>
                  Start fresh
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Always-visible "your own NDA" dropzone — no extra click needed.
          Drop a PDF and the editor opens with that file. */}
      <div className="nda-upload-divider" aria-hidden="true">
        <span>OR</span>
      </div>
      <div
        {...getRootProps({
          className: `nda-upload-dropzone${isDragActive ? ' active' : ''}`,
        })}
      >
        <input {...getInputProps()} />
        <div className="nda-upload-icon">
          <Upload size={32} strokeWidth={1.6} />
        </div>
        <p className="nda-upload-title">
          {isDragActive ? 'Drop your NDA here' : 'Drop your NDA here'}
        </p>
        <p className="nda-upload-sub">or click to browse · PDF only · up to 50 MB</p>
        {uploadError && <p className="nda-upload-error">{uploadError}</p>}
      </div>
    </>
  );
}
