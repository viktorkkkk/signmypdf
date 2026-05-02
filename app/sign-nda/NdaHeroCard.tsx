'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, FileText, Loader2, PenLine } from 'lucide-react';
import { storePendingFile } from '../utils/pendingUpload';

const TEMPLATE_PDF_URL  = '/templates/nda-template.pdf';
const TEMPLATE_DOCX_URL = '/templates/nda-template.docx';

export default function NdaHeroCard() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [thumbReady, setThumbReady] = useState(false);
  const [thumbError, setThumbError] = useState(false);
  const [signing, setSigning] = useState(false);

  // Render page 1 of the NDA template into the thumbnail canvas. Same
  // pdfjs pattern used in PDFPreview.tsx — dynamic import + local worker.
  useEffect(() => {
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
  }, []);

  // Hand off the NDA template to the /sign tool via IndexedDB. /sign
  // calls consumePendingFile() on mount and skips straight to the sign
  // step when a file is found.
  const onFillAndSign = async () => {
    if (signing) return;
    setSigning(true);
    try {
      const res = await fetch(TEMPLATE_PDF_URL);
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      const blob = await res.blob();
      const file = new File([blob], 'nda-template.pdf', { type: 'application/pdf' });
      await storePendingFile(file);
      router.push('/sign');
    } catch (e) {
      console.error('NDA hand-off failed:', e);
      // Fall back to plain navigation; the /sign dropzone is the safety net.
      router.push('/sign');
    }
  };

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
          disabled={signing}
          className="nda-btn nda-btn-primary"
        >
          {signing ? <Loader2 size={18} className="nda-thumb-spinner" /> : <PenLine size={18} />}
          <span>{signing ? 'Loading…' : 'Fill & sign online'}</span>
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
