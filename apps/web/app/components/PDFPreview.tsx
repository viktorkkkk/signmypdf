'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText, PenLine } from 'lucide-react';
import { setupPdfjs } from '@signmypdf/pdf-core';

interface Props {
  file: File;
  signatureDataUrl: string;
  onPositionChange: (page: number, x: number, y: number, pageWidth: number, pageHeight: number) => void;
}

export default function PDFPreview({ file, signatureDataUrl, onPositionChange }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfRef       = useRef<any>(null);
  const [totalPages, setTotalPages]   = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize]       = useState({ width: 595, height: 842 });
  const [sigPos, setSigPos]           = useState({ x: 55, y: 80 });
  const [isDragging, setIsDragging]   = useState(false);
  const [loaded, setLoaded]           = useState(false);
  const [error, setError]             = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Worker URL resolved by host (web vs CRX); see @signmypdf/pdf-core/setupPdfjs.
        const pdfjsLib = await setupPdfjs('/pdf.worker.min.mjs');

        const buf = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
        if (cancelled) return;
        pdfRef.current = pdf;
        setTotalPages(pdf.numPages);
        setCurrentPage(pdf.numPages);
        setLoaded(true);
      } catch (e) {
        console.error('PDF load:', e);
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [file]);

  useEffect(() => {
    if (!loaded || !pdfRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const page      = await pdfRef.current.getPage(currentPage);
        const viewport  = page.getViewport({ scale: 1 });
        setPageSize({ width: viewport.width, height: viewport.height });

        const container = containerRef.current!;
        const w         = container.clientWidth || 460;
        const scale     = w / viewport.width;
        const scaledVp  = page.getViewport({ scale });
        const dpr       = window.devicePixelRatio || 1;

        const canvas = canvasRef.current!;
        canvas.width        = scaledVp.width  * dpr;
        canvas.height       = scaledVp.height * dpr;
        canvas.style.width  = `${scaledVp.width}px`;
        canvas.style.height = `${scaledVp.height}px`;

        const ctx = canvas.getContext('2d')!;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport: scaledVp }).promise;
        if (cancelled) return;
        reportPos(sigPos.x, sigPos.y, viewport.width, viewport.height);
      } catch (e) {
        console.error('Render:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [loaded, currentPage]);

  const reportPos = (xPct: number, yPct: number, pw?: number, ph?: number) => {
    const w = pw ?? pageSize.width;
    const h = ph ?? pageSize.height;
    onPositionChange(currentPage, (xPct / 100) * w, Math.max(10, h - (yPct / 100) * h - 30), w, h);
  };

  const getRelPct = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const [cx, cy] = 'touches' in e
      ? [e.touches[0].clientX, e.touches[0].clientY]
      : [(e as React.MouseEvent).clientX, (e as React.MouseEvent).clientY];
    return {
      x: Math.max(0,  Math.min(80, ((cx - rect.left) / rect.width)  * 100)),
      y: Math.max(2,  Math.min(94, ((cy - rect.top)  / rect.height) * 100)),
    };
  };

  const onDown  = (e: React.MouseEvent | React.TouchEvent) => { if (!signatureDataUrl) return; e.preventDefault(); setIsDragging(true); };
  const onMove  = (e: React.MouseEvent | React.TouchEvent) => { if (!isDragging) return; e.preventDefault(); const p = getRelPct(e); setSigPos(p); reportPos(p.x, p.y); };
  const onUp    = () => setIsDragging(false);

  return (
    <div>
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Sign on page:</span>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setCurrentPage(p)} style={{
              width: 34, height: 34, borderRadius: 8, border: 'none', cursor: 'pointer',
              background: p === currentPage ? '#2563eb' : '#f1f5f9',
              color: p === currentPage ? 'white' : '#64748b',
              fontWeight: 700, fontSize: 13,
            }}>{p}</button>
          ))}
        </div>
      )}

      <div
        ref={containerRef}
        style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1.5px solid #e2e8f0', background: '#f8fafc', userSelect: 'none', minHeight: 180 }}
        onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
        onTouchMove={onMove} onTouchEnd={onUp}
      >
        {!loaded && !error && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, minHeight: 180 }}>
            <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: 13, color: '#94a3b8' }}>Loading PDF…</span>
          </div>
        )}

        {error && (
          <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
            <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}><FileText size={32} color="#94a3b8" /></div>
            Preview unavailable — your PDF will be signed correctly on download.
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: 'block', width: '100%' }} />

        {signatureDataUrl && loaded && (
          <div
            onMouseDown={onDown} onTouchStart={onDown}
            style={{
              position: 'absolute', left: `${sigPos.x}%`, top: `${sigPos.y}%`,
              transform: 'translateY(-50%)',
              cursor: isDragging ? 'grabbing' : 'grab',
              border: `2px dashed ${isDragging ? '#2563eb' : '#93c5fd'}`,
              borderRadius: 8, background: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(4px)', padding: '4px 10px', zIndex: 10,
              boxShadow: isDragging ? '0 4px 20px rgba(37,99,235,0.3)' : '0 2px 8px rgba(0,0,0,0.12)',
              minWidth: 100,
            }}
          >
            <img src={signatureDataUrl} style={{ height: 44, display: 'block', maxWidth: 180, pointerEvents: 'none' }} alt="sig" />
            <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', marginTop: 2, pointerEvents: 'none' }}>
              {isDragging ? 'drop here' : '↔ drag to move'}
            </div>
          </div>
        )}

        {!signatureDataUrl && loaded && (
          <div style={{
            position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(37,99,235,0.85)', color: 'white', padding: '6px 16px',
            borderRadius: 20, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', pointerEvents: 'none',
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><PenLine size={12} /> Draw your signature — it will appear here</span>
          </div>
        )}
      </div>

      <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, textAlign: 'center' }}>
        {signatureDataUrl ? '↔ Drag to reposition on the page' : `Page ${currentPage} of ${totalPages}`}
      </p>
    </div>
  );
}
