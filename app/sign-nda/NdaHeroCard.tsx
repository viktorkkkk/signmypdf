'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle, Download, FileText, Loader2, PenLine } from 'lucide-react';
import FillSignEditor from '../components/FillSignEditor';
import { saveToHistory } from '../components/FileHistory';
import { getTodayCount, incrementTodayCount, isProActive } from '../utils/subscription';
import { DAILY_LIMIT } from '../constants';

const TEMPLATE_PDF_URL  = '/templates/nda-template.pdf';
const TEMPLATE_DOCX_URL = '/templates/nda-template.docx';

export default function NdaHeroCard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [thumbReady, setThumbReady] = useState(false);
  const [thumbError, setThumbError] = useState(false);
  const [loadingForEdit, setLoadingForEdit] = useState(false);
  const [editorFile, setEditorFile] = useState<File | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const [downloaded, setDownloaded] = useState(false);

  // Read subscription + today's count on mount.
  useEffect(() => {
    setSubscribed(isProActive());
    setTodayCount(getTodayCount());
  }, []);

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
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

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

  const onFillAndSign = async () => {
    if (loadingForEdit) return;
    setLoadingForEdit(true);
    try {
      const res = await fetch(TEMPLATE_PDF_URL);
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      const blob = await res.blob();
      const file = new File([blob], 'nda-template.pdf', { type: 'application/pdf' });
      setEditorFile(file);
      // Scroll the editor into view once it mounts.
      requestAnimationFrame(() => {
        setTimeout(() => {
          document.querySelector('.fse')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
      });
    } catch (e) {
      console.error('NDA fetch for edit failed:', e);
      setLoadingForEdit(false);
    }
  };

  const onCloseEditor = () => {
    setEditorFile(null);
    setLoadingForEdit(false);
    setDownloaded(false);
    requestAnimationFrame(() => {
      document.querySelector('.nda-hero')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const onEditorDone = async (blob: Blob) => {
    const willHaveWatermark = !subscribed && todayCount >= DAILY_LIMIT;
    const filename = 'signed-nda-template.pdf';
    try {
      await saveToHistory(filename, blob.size, blob, 'sign', willHaveWatermark);
      window.dispatchEvent(new Event('signmypdf:saved'));
    } catch {/* IDB unavailable — download still works */}

    incrementTodayCount();
    setTodayCount(getTodayCount());

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    setDownloaded(true);
  };

  // ── Editor surface ──────────────────────────────────────────────────

  if (editorFile) {
    const willHaveWatermark = !subscribed && todayCount >= DAILY_LIMIT;
    return (
      <div className="nda-editor-host">
        <button type="button" className="nda-editor-back" onClick={onCloseEditor}>
          <ArrowLeft size={16} /> Back to template page
        </button>

        <FillSignEditor
          file={editorFile}
          defaultTool="text"
          hasSubscription={subscribed}
          addWatermark={willHaveWatermark}
          onDone={onEditorDone}
        />

        {downloaded && (
          <div className="nda-done-toast" role="status">
            <CheckCircle size={18} />
            <span>PDF downloaded — check your Downloads folder.</span>
          </div>
        )}
      </div>
    );
  }

  // ── Hero card surface (default) ─────────────────────────────────────

  return (
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
    </div>
  );
}
