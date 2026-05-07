'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { FileText, PenLine, CheckSquare } from 'lucide-react';
import type { SignaturePlacement } from '@signmypdf/pdf-core';

// Re-export so existing `import { SignaturePlacement } from '.../PDFViewer'`
// callers keep working until PR B moves the component to packages/ui.
export type { SignaturePlacement };

interface Props {
  file: File;
  signatureDataUrl: string;
  placements: SignaturePlacement[];  // All signature placements across pages
  selectedPages: number[];           // Pages selected for signing
  onPlacementsChange: (placements: SignaturePlacement[]) => void;
  onSelectedPagesChange: (pages: number[]) => void;
}

export default function PDFViewer({ 
  file, 
  signatureDataUrl, 
  placements,
  selectedPages,
  onPlacementsChange,
  onSelectedPagesChange 
}: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const wrapRef      = useRef<HTMLDivElement>(null);
  const pdfRef       = useRef<any>(null);
  const [pages, setPages]       = useState(1);
  const [curPage, setCurPage]   = useState(1);
  const [loaded, setLoaded]     = useState(false);
  const [thumbnails, setThumbnails] = useState<{[key: number]: string}>({});

  // Current page signature position
  const currentPlacement = placements.find(p => p.page === curPage) || { page: curPage, x: 5, y: 75, w: 30, h: 12 };
  const [sig, setSig] = useState({ x: currentPlacement.x, y: currentPlacement.y, w: currentPlacement.w, h: currentPlacement.h });
  
  const dragging = useRef<null | 'move' | 'resize'>(null);
  const dragStart = useRef({ mx: 0, my: 0, sx: 0, sy: 0, sw: 0, sh: 0, cw: 0, ch: 0 });

  // Load PDF and generate thumbnails
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
        setLoaded(true);

        // Generate thumbnails for all pages
        const thumbs: {[key: number]: string} = {};
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const vp = page.getViewport({ scale: 0.3 });
          const canvas = document.createElement('canvas');
          canvas.width = vp.width;
          canvas.height = vp.height;
          await page.render({ canvas: canvas as any, viewport: vp }).promise;
          thumbs[i] = canvas.toDataURL('image/jpeg', 0.7);
        }
        setThumbnails(thumbs);
      } catch (e) {
        console.error('PDF load:', e);
        setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [file]);

  // Update sig when switching pages or placements change
  useEffect(() => {
    const placement = placements.find(p => p.page === curPage);
    if (placement) {
      setSig({ x: placement.x, y: placement.y, w: placement.w, h: placement.h });
    } else if (selectedPages.includes(curPage)) {
      // Default position for newly selected page
      setSig({ x: 5, y: 75, w: 30, h: 12 });
    }
  }, [curPage, placements, selectedPages]);

  // Render current page
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
        const ctx = canvas.getContext('2d')!;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport: svp }).promise;
      } catch (e) { console.error('render:', e); }
    })();
  }, [loaded, curPage]);



  // Toggle page selection
  const togglePageSelection = (pageNum: number) => {
    if (selectedPages.includes(pageNum)) {
      // Remove page from selection
      onSelectedPagesChange(selectedPages.filter(p => p !== pageNum));
      // Remove placement for this page
      onPlacementsChange(placements.filter(p => p.page !== pageNum));
    } else {
      // Add page to selection
      const newSelected = [...selectedPages, pageNum].sort((a, b) => a - b);
      onSelectedPagesChange(newSelected);
      // Add default placement for this page
      if (!placements.find(p => p.page === pageNum)) {
        onPlacementsChange([...placements, { page: pageNum, x: 5, y: 75, w: 30, h: 12 }]);
      }
      // Switch to this page
      setCurPage(pageNum);
    }
  };

  // --- Drag & Resize ---
  const getClientXY = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if ('touches' in e && (e as TouchEvent).touches.length > 0) {
      const t = (e as TouchEvent).touches[0];
      return { cx: t.clientX, cy: t.clientY };
    }
    return { cx: (e as MouseEvent).clientX, cy: (e as MouseEvent).clientY };
  };

  const onPointerDown = (mode: 'move' | 'resize') => (e: React.MouseEvent | React.TouchEvent) => {
    if (!selectedPages.includes(curPage)) return;
    // Ignore mouse events when a touch is active (prevents double-fire on Android)
    if (e.type === 'mousedown' && 'ontouchstart' in window && (e as React.MouseEvent).buttons === 1) {
      const ev = e.nativeEvent as MouseEvent;
      if ((ev as any).sourceCapabilities?.firesTouchEvents) return;
    }
    e.preventDefault(); e.stopPropagation();
    dragging.current = mode;
    const { cx, cy } = getClientXY(e as any);
    const wrap = wrapRef.current!;
    const rect = wrap.getBoundingClientRect();
    // Store container dimensions at drag start to avoid feedback loop
    dragStart.current = { mx: cx, my: cy, sx: sig.x, sy: sig.y, sw: sig.w, sh: sig.h, 
                          cw: rect.width, ch: rect.height } as any;

    const onMove = (ev: MouseEvent | TouchEvent) => {
      ev.preventDefault();
      const { cx: nx, cy: ny } = getClientXY(ev);
      const ds = dragStart.current as any;
      const dx = ((nx - ds.mx) / ds.cw) * 100;
      const dy = ((ny - ds.my) / ds.ch) * 100;
      if (dragging.current === 'move') {
        setSig(s => ({
          ...s,
          x: Math.max(0, Math.min(100 - s.w, ds.sx + dx)),
          y: Math.max(0, Math.min(100 - s.h, ds.sy + dy)),
        }));
      } else {
        setSig(s => ({
          ...s,
          w: Math.max(10, Math.min(80, ds.sw + dx)),
          h: Math.max(5, Math.min(40, ds.sh + dy)),
        }));
      }
    };
    const onUp = () => {
      dragging.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup',   onUp);
      window.removeEventListener('touchend',  onUp);
      // Save placement on drag end using current sig values
      setSig(currentSig => {
        if (selectedPages.includes(curPage)) {
          const newPlacements = [...placements.filter(p => p.page !== curPage)];
          newPlacements.push({ page: curPage, x: currentSig.x, y: currentSig.y, w: currentSig.w, h: currentSig.h });
          onPlacementsChange(newPlacements);
        }
        return currentSig;
      });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove',  onMove, { passive: false });
    window.addEventListener('mouseup',   onUp);
    window.addEventListener('touchend',  onUp);
  };

  const isCurrentPageSelected = selectedPages.includes(curPage);

  return (
    <div>
      {/* Page selector with thumbnails */}
      {pages > 1 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <FileText size={14} /> Select pages to sign:
          </div>
          <div style={{ 
            display: 'flex', 
            gap: 12, 
            overflowX: 'auto', 
            padding: '8px 4px',
            scrollbarWidth: 'thin',
          }}>
            {Array.from({ length: pages }, (_, i) => i + 1).map(p => {
              const isSelected = selectedPages.includes(p);
              return (
                <div 
                  key={p}
                  onClick={() => { setCurPage(p); }}
                  style={{
                    flexShrink: 0,
                    width: 80,
                    cursor: 'pointer',
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: curPage === p ? '2px solid #2563eb' : isSelected ? '2px solid #22c55e' : '2px solid transparent',
                    boxShadow: curPage === p ? '0 0 0 2px #bfdbfe' : '0 1px 3px rgba(0,0,0,0.1)',
                    background: 'white',
                  }}
                >
                  {/* Thumbnail */}
                  <div style={{ 
                    height: 100, 
                    background: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}>
                    {thumbnails[p] ? (
                      <img 
                        src={thumbnails[p]} 
                        alt={`Page ${p}`}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: 12 }}>Page {p}</span>
                    )}
                    {/* Selection indicator */}
                    {isSelected && (
                      <div style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: '#22c55e',
                        color: 'white',
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>✓</div>
                    )}
                  </div>
                  {/* Page number + checkbox */}
                  <div style={{ 
                    padding: '6px 8px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    background: isSelected ? '#f0fdf4' : '#f8fafc',
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: isSelected ? '#166534' : '#64748b' }}>
                      {p}
                    </span>
                    <input 
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => { e.stopPropagation(); togglePageSelection(p); }}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <CheckSquare size={11} /> Check the pages you want to sign · Click thumbnail to preview
          </div>
        </div>
      )}

      {/* Selected pages summary */}
      {selectedPages.length > 0 && (
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: 8,
          padding: '10px 14px',
          marginBottom: 16,
          fontSize: 13,
          color: '#166534',
        }}>
          <strong>✓ Signing {selectedPages.length} page{selectedPages.length > 1 ? 's' : ''}:</strong>{' '}
          {selectedPages.join(', ')}
        </div>
      )}

      {/* Canvas + signature overlay - ALWAYS VISIBLE */}
      <div>
        {/* Page navigation for current page */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 12, 
          marginBottom: 12,
          justifyContent: 'center',
        }}>
          <button 
            onClick={() => setCurPage(Math.max(1, curPage - 1))}
            disabled={curPage <= 1}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid #e2e8f0',
              background: 'white',
              cursor: curPage <= 1 ? 'not-allowed' : 'pointer',
              opacity: curPage <= 1 ? 0.5 : 1,
            }}
          >← Prev</button>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
            Page {curPage} of {pages}
          </span>
          <button 
            onClick={() => setCurPage(Math.min(pages, curPage + 1))}
            disabled={curPage >= pages}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid #e2e8f0',
              background: 'white',
              cursor: curPage >= pages ? 'not-allowed' : 'pointer',
              opacity: curPage >= pages ? 0.5 : 1,
            }}
          >Next →</button>
        </div>

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

          {/* Signature overlay - only if page is selected for signing */}
          {signatureDataUrl && loaded && isCurrentPageSelected && (
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

          {/* Hint to create signature first */}
          {!signatureDataUrl && loaded && isCurrentPageSelected && (
            <div style={{
              position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(37,99,235,0.85)', color: 'white', padding: '6px 16px',
              borderRadius: 20, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', pointerEvents: 'none',
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><PenLine size={12} /> Draw your signature above — it will appear here</span>
            </div>
          )}

          {/* Overlay for non-selected pages */}
          {!isCurrentPageSelected && loaded && (
            <div style={{
              position: 'absolute', 
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(255,255,255,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(2px)',
            }}>
              <div style={{
                background: 'white',
                padding: '16px 24px',
                borderRadius: 12,
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                textAlign: 'center',
              }}>
                <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}><CheckSquare size={24} color="#2563eb" /></div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
                  Check page {curPage} to sign it
                </div>
                <button
                  onClick={() => togglePageSelection(curPage)}
                  style={{
                    marginTop: 12,
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
                  Sign this page
                </button>
              </div>
            </div>
          )}
        </div>

        <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, textAlign: 'center' }}>
          {signatureDataUrl && isCurrentPageSelected 
            ? `Page ${curPage}: Drag to move · corner handle to resize` 
            : isCurrentPageSelected 
              ? `Page ${curPage}: Create signature above to place it here`
              : `Page ${curPage}: Preview only — check the checkbox above to sign`}
        </p>
      </div>
    </div>
  );
}
