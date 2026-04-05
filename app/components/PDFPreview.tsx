'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  file: File;
  signatureDataUrl: string;
  onPositionChange: (page: number, x: number, y: number, pageWidth: number, pageHeight: number) => void;
}

export default function PDFPreview({ file, signatureDataUrl, onPositionChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [sigPos, setSigPos] = useState({ x: 60, y: 75 }); // % of page
  const [isDragging, setIsDragging] = useState(false);
  const [pageSize, setPageSize] = useState({ width: 595, height: 842 });
  const [renderScale, setRenderScale] = useState(1);
  const pdfDocRef = useRef<any>(null);

  // Load and render PDF
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (cancelled) return;
        pdfDocRef.current = pdf;
        setTotalPages(pdf.numPages);
        // Default to last page
        setCurrentPage(pdf.numPages);
      } catch (e) {
        console.error('PDF load error', e);
      }
    })();
    return () => { cancelled = true; };
  }, [file]);

  // Render current page
  useEffect(() => {
    if (!pdfDocRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const page = await pdfDocRef.current.getPage(currentPage);
        const viewport = page.getViewport({ scale: 1 });
        setPageSize({ width: viewport.width, height: viewport.height });

        const canvas = canvasRef.current!;
        const container = containerRef.current!;
        const containerWidth = container.clientWidth || 400;
        const scale = containerWidth / viewport.width;
        setRenderScale(scale);

        const scaledViewport = page.getViewport({ scale });
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
        if (cancelled) return;

        // Report initial position
        onPositionChange(currentPage, (sigPos.x / 100) * viewport.width, viewport.height - (sigPos.y / 100) * viewport.height, viewport.width, viewport.height);
      } catch (e) {
        console.error('Render error', e);
      }
    })();
    return () => { cancelled = true; };
  }, [currentPage, pdfDocRef.current]);

  // Handle dragging signature on PDF
  const getRelativePos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    const xPct = Math.max(0, Math.min(85, ((clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(5, Math.min(95, ((clientY - rect.top) / rect.height) * 100));
    return { x: xPct, y: yPct };
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    const xPct = Math.max(0, Math.min(85, ((clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(2, Math.min(95, ((clientY - rect.top) / rect.height) * 100));
    setSigPos({ x: xPct, y: yPct });

    const pdfX = (xPct / 100) * pageSize.width;
    const pdfY = pageSize.height - ((yPct / 100) * pageSize.height) - 30;
    onPositionChange(currentPage, pdfX, Math.max(10, pdfY), pageSize.width, pageSize.height);
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div>
      {/* Page selector */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Sign on page:</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: p === currentPage ? '#2563eb' : '#f1f5f9',
                  color: p === currentPage ? 'white' : '#64748b',
                  fontWeight: 600, fontSize: 13,
                  transition: 'all 0.15s',
                }}
              >{p}</button>
            ))}
          </div>
        </div>
      )}

      {/* PDF canvas with signature overlay */}
      <div
        ref={containerRef}
        style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '2px solid #e2e8f0', cursor: isDragging ? 'grabbing' : 'default', userSelect: 'none' }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
      >
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%' }} />

        {/* Draggable signature */}
        {signatureDataUrl && (
          <div
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
            style={{
              position: 'absolute',
              left: `${sigPos.x}%`,
              top: `${sigPos.y}%`,
              transform: 'translate(0, -50%)',
              cursor: 'grab',
              border: isDragging ? '2px solid #2563eb' : '2px dashed #93c5fd',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.85)',
              padding: '4px 8px',
              backdropFilter: 'blur(2px)',
              zIndex: 10,
              minWidth: 120,
            }}
          >
            <img src={signatureDataUrl} style={{ height: 40, display: 'block', maxWidth: 200 }} alt="signature" />
            <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', marginTop: 2 }}>drag to move</div>
          </div>
        )}

        {/* Hint when no signature yet */}
        {!signatureDataUrl && (
          <div style={{
            position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(37,99,235,0.9)', color: 'white', padding: '6px 14px',
            borderRadius: 20, fontSize: 12, fontWeight: 500, pointerEvents: 'none', whiteSpace: 'nowrap',
          }}>
            ✍️ Draw your signature to see it here
          </div>
        )}
      </div>

      <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 8, textAlign: 'center' }}>
        {signatureDataUrl ? '👆 Drag signature to reposition' : `Page ${currentPage} of ${totalPages}`}
      </p>
    </div>
  );
}
