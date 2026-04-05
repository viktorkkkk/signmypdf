'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface Props {
  file: File;
  signatureDataUrl: string;
  onPosition: (page: number, xPct: number, yPct: number, wPct: number, hPct: number) => void;
}

export default function PDFViewer({ file, signatureDataUrl, onPosition }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const wrapRef      = useRef<HTMLDivElement>(null);
  const pdfRef       = useRef<any>(null);
  const [pages, setPages]       = useState(1);
  const [curPage, setCurPage]   = useState(1);
  const [loaded, setLoaded]     = useState(false);
  const [canvasH, setCanvasH]   = useState(400);

  // Signature position/size as % of rendered canvas
  const [sig, setSig] = useState({ x: 5, y: 75, w: 30, h: 12 });
  const dragging = useRef<null | 'move' | 'resize'>(null);
  const dragStart = useRef({ mx: 0, my: 0, sx: 0, sy: 0, sw: 0, sh: 0 });

  // Load PDF
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        const buf = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
        if (cancelled) return;
        pdfRef.current = pdf;
        setPages(pdf.numPages);
        setCurPage(pdf.numPages);
        setLoaded(true);
      } catch (e) {
        console.error('PDF load:', e);
        setLoaded(true); // show fallback
      }
    })();
    return () => { cancelled = true; };
  }, [file]);

  // Render page
  useEffect(() => {
    if (!loaded || !pdfRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const page = await pdfRef.current.getPage(curPage);
        const vp   = page.getViewport({ scale: 1 });
        const wrap = wrapRef.current!;
        const cw   = wrap.clientWidth || 500;
        const scale = cw / vp.width;
        const svp  = page.getViewport({ scale });
        const dpr  = window.devicePixelRatio || 1;
        const canvas = canvasRef.current!;
        canvas.width  = svp.width  * dpr;
        canvas.height = svp.height * dpr;
        canvas.style.width  = `${svp.width}px`;
        canvas.style.height = `${svp.height}px`;
        setCanvasH(svp.height);
        const ctx = canvas.getContext('2d')!;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport: svp }).promise;
      } catch (e) { console.error('render:', e); }
    })();
  }, [loaded, curPage]);

  // Report position whenever sig changes
  useEffect(() => {
    onPosition(curPage, sig.x, sig.y, sig.w, sig.h);
  }, [sig, curPage]);

  // --- Drag & Resize ---
  const getClientXY = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if ('touches' in e && (e as TouchEvent).touches.length > 0) {
      const t = (e as TouchEvent).touches[0];
      return { cx: t.clientX, cy: t.clientY };
    }
    return { cx: (e as MouseEvent).clientX, cy: (e as MouseEvent).clientY };
  };

  const onPointerDown = (mode: 'move' | 'resize') => (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragging.current = mode;
    const { cx, cy } = getClientXY(e as any);
    dragStart.current = { mx: cx, my: cy, sx: sig.x, sy: sig.y, sw: sig.w, sh: sig.h };

    const onMove = (ev: MouseEvent | TouchEvent) => {
      ev.preventDefault();
      const { cx: nx, cy: ny } = getClientXY(ev);
      const wrap = wrapRef.current!;
      const rect = wrap.getBoundingClientRect();
      const dx = ((nx - dragStart.current.mx) / rect.width)  * 100;
      const dy = ((ny - dragStart.current.my) / rect.height) * 100;
      if (dragging.current === 'move') {
        setSig(s => ({
          ...s,
          x: Math.max(0, Math.min(100 - s.w, dragStart.current.sx + dx)),
          y: Math.max(0, Math.min(100 - s.h, dragStart.current.sy + dy)),
        }));
      } else {
        setSig(s => ({
          ...s,
          w: Math.max(10, Math.min(80, dragStart.current.sw + dx)),
          h: Math.max(5, Math.min(40, dragStart.current.sh + dy)),
        }));
      }
    };
    const onUp = () => {
      dragging.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup',   onUp);
      window.removeEventListener('touchend',  onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove',  onMove, { passive: false });
    window.addEventListener('mouseup',   onUp);
    window.addEventListener('touchend',  onUp);
  };

  return (
    <div>
      {/* Page tabs */}
      {pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Page:</span>
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setCurPage(p)} style={{
              width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
              background: p === curPage ? '#2563eb' : '#f1f5f9',
              color: p === curPage ? 'white' : '#64748b',
              fontWeight: 700, fontSize: 12,
            }}>{p}</button>
          ))}
        </div>
      )}

      {/* Canvas + signature overlay */}
      <div
        ref={wrapRef}
        style={{
          position: 'relative', borderRadius: 10, overflow: 'hidden',
          border: '1.5px solid #e2e8f0', background: '#f8fafc',
          minHeight: 200, userSelect: 'none',
        }}
      >
        {!loaded && (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ width: 28, height: 28, border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
            Loading PDF…
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: 'block', width: '100%' }} />

        {/* Signature overlay */}
        {signatureDataUrl && loaded && (
          <div
            onMouseDown={onPointerDown('move')}
            onTouchStart={onPointerDown('move')}
            style={{
              position: 'absolute',
              left: `${sig.x}%`, top: `${sig.y}%`,
              width: `${sig.w}%`, height: `${sig.h}%`,
              cursor: dragging.current === 'move' ? 'grabbing' : 'grab',
              border: '2px dashed #2563eb',
              borderRadius: 6,
              background: 'rgba(255,255,255,0.85)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 4,
              boxShadow: '0 2px 12px rgba(37,99,235,0.2)',
              touchAction: 'none',
            }}
          >
            <img src={signatureDataUrl} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', pointerEvents: 'none' }} alt="sig" />

            {/* Resize handle bottom-right */}
            <div
              onMouseDown={onPointerDown('resize')}
              onTouchStart={onPointerDown('resize')}
              style={{
                position: 'absolute', bottom: -7, right: -7,
                width: 16, height: 16, background: '#2563eb',
                borderRadius: 3, cursor: 'nwse-resize',
                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                touchAction: 'none',
              }}
            />
          </div>
        )}

        {!signatureDataUrl && loaded && (
          <div style={{
            position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(37,99,235,0.85)', color: 'white', padding: '6px 16px',
            borderRadius: 20, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', pointerEvents: 'none',
          }}>
            ✍️ Draw your signature above — it will appear here
          </div>
        )}
      </div>

      <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, textAlign: 'center' }}>
        {signatureDataUrl ? 'Drag to move · corner handle to resize' : `Page ${curPage} of ${pages}`}
      </p>
    </div>
  );
}
