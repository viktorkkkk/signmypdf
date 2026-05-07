'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Pencil, MousePointerClick } from 'lucide-react';
import { setupPdfjs } from '@signmypdf/pdf-core';

export interface TextField {
  id: string;
  page: number;
  x: number;      // % of overlay width — left edge of text character
  y: number;      // % of overlay height — top edge of text character
  text: string;
  fontSize: number;
  color: string;
  width: number;  // px
}

const TEXT_COLORS = [
  { value: '#000000', label: 'Black' },
  { value: '#1d4ed8', label: 'Blue' },
];

function autoResize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

interface Props {
  file: File;
  textFields: TextField[];
  onTextFieldsChange: (fields: TextField[]) => void;
}

export default function PDFTextEditor({ file, textFields, onTextFieldsChange }: Props) {
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const overlayRef    = useRef<HTMLDivElement>(null);
  const scrollWrapRef = useRef<HTMLDivElement>(null);
  const pdfRef        = useRef<any>(null);
  const renderRef     = useRef<any>(null);

  const [numPages,   setNumPages]   = useState(0);
  const [curPage,    setCurPage]    = useState(1);
  const [loaded,     setLoaded]     = useState(false);
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});

  const [editingId,      setEditingId]      = useState<string | null>(null);
  const [fontSizeInputs, setFontSizeInputs] = useState<Record<string, string>>({});
  const [zoom,           setZoom]           = useState(1);
  // pageScale = ratio of canvas CSS pixels to PDF points at zoom=1
  // field.fontSize is in PDF pts; multiply by pageScale*zoom to get CSS px on screen
  const [pageScale,      setPageScale]      = useState(1);

  const ZOOM_STEPS = [1, 1.5, 2, 3];

  const fieldsRef       = useRef(textFields);
  const textareasRef    = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const preventNextTap  = useRef(false);
  const touchDragging   = useRef(false);
  const touchStartPos   = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => { fieldsRef.current = textFields; }, [textFields]);
  useEffect(() => { textareasRef.current.forEach(el => autoResize(el)); }, [textFields]);

  // ── Load PDF ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjsLib = await setupPdfjs('/pdf.worker.min.mjs');
        const buf = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
        if (cancelled) return;
        pdfRef.current = pdf;
        setNumPages(pdf.numPages);
        setLoaded(true);

        const thumbs: Record<number, string> = {};
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const vp   = page.getViewport({ scale: 0.4 });
          const c    = document.createElement('canvas');
          c.width = vp.width; c.height = vp.height;
          await page.render({ canvas: c as any, viewport: vp }).promise;
          thumbs[i] = c.toDataURL('image/jpeg', 0.8);
        }
        if (!cancelled) setThumbnails(thumbs);
      } catch (e) {
        console.error('PDF load error:', e);
        setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [file]);

  // ── Render page (crisp on Retina, zoom-aware) ────────────────────────────
  useEffect(() => {
    if (!pdfRef.current || !canvasRef.current || !loaded) return;
    (async () => {
      try {
        const page  = await pdfRef.current.getPage(curPage);
        // scrollWrapper width = base for 1× zoom
        const baseW = scrollWrapRef.current?.clientWidth || containerRef.current?.clientWidth || 600;
        const vp0   = page.getViewport({ scale: 1 });
        const dpr   = window.devicePixelRatio || 1;
        const baseScale = Math.min((baseW - 2) / vp0.width, 2);
        setPageScale(baseScale); // expose to field rendering so text matches PDF size
        // Bake zoom into render scale for crisp output at every zoom level
        const scale = baseScale * zoom;
        const vp    = page.getViewport({ scale: scale * dpr });
        const canvas = canvasRef.current!;
        canvas.width        = vp.width;
        canvas.height       = vp.height;
        canvas.style.width  = Math.round(vp.width  / dpr) + 'px';
        canvas.style.height = Math.round(vp.height / dpr) + 'px';
        if (renderRef.current) { try { renderRef.current.cancel(); } catch {} }
        renderRef.current = page.render({ canvas: canvas as any, viewport: vp });
        await renderRef.current.promise;
        syncOverlay();
      } catch (e: any) {
        if (e?.name !== 'RenderingCancelledException') console.error(e);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curPage, loaded, zoom]);

  // Overlay exactly covers the canvas CSS rect
  const syncOverlay = () => {
    const canvas  = canvasRef.current;
    const overlay = overlayRef.current;
    const wrap    = containerRef.current;
    if (!canvas || !overlay || !wrap) return;
    const cr = canvas.getBoundingClientRect();
    const wr = wrap.getBoundingClientRect();
    overlay.style.left   = (cr.left - wr.left) + 'px';
    overlay.style.top    = (cr.top  - wr.top)  + 'px';
    overlay.style.width  = cr.width  + 'px';
    overlay.style.height = cr.height + 'px';
  };

  useEffect(() => {
    window.addEventListener('resize', syncOverlay);
    return () => window.removeEventListener('resize', syncOverlay);
  }, []);

  const currentPageFields = textFields.filter(f => f.page === curPage);

  const updateField = useCallback((id: string, updates: Partial<TextField>) => {
    onTextFieldsChange(fieldsRef.current.map(f => f.id === id ? { ...f, ...updates } : f));
  }, [onTextFieldsChange]);

  const deleteField = useCallback((id: string) => {
    onTextFieldsChange(fieldsRef.current.filter(f => f.id !== id));
    if (editingId === id) setEditingId(null);
  }, [onTextFieldsChange, editingId]);

  const isTouchDevice = typeof window !== 'undefined' &&
    (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
     (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  // ── Add field ─────────────────────────────────────────────────────────────
  const addFieldAt = useCallback((clientX: number, clientY: number) => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const rect = overlay.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width)  * 100;
    const y = ((clientY - rect.top)  / rect.height) * 100;
    if (x < -1 || x > 101 || y < -1 || y > 101) return;
    const id = Math.random().toString(36).slice(2);
    const defaultWidthPct = Math.min(50, 200 / rect.width * 100);
    onTextFieldsChange([...fieldsRef.current, {
      id, page: curPage,
      x: Math.max(0, Math.min(100 - defaultWidthPct, x)),
      y: Math.max(0, Math.min(95, y)),
      text: '', fontSize: 14, color: '#000000', width: 200,
    }]);
    setEditingId(id);
    setFontSizeInputs(prev => ({ ...prev, [id]: '14' }));
  }, [curPage, onTextFieldsChange]);

  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (preventNextTap.current) { preventNextTap.current = false; return; }
    if ((e.target as HTMLElement).closest('[data-textfield]')) return;
    addFieldAt(e.clientX, e.clientY);
  }, [addFieldAt]);

  const handleOverlayTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-textfield]')) return;
    const t = e.touches[0];
    touchStartPos.current = { x: t.clientX, y: t.clientY };
  }, []);

  const handleOverlayTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (touchDragging.current) return;
    if (preventNextTap.current) { preventNextTap.current = false; return; }
    if ((e.target as HTMLElement).closest('[data-textfield]')) return;
    const t     = e.changedTouches[0];
    const start = touchStartPos.current;
    touchStartPos.current = null;
    if (start && (Math.abs(t.clientX - start.x) > 10 || Math.abs(t.clientY - start.y) > 10)) return;
    addFieldAt(t.clientX, t.clientY);
    preventNextTap.current = true;
  }, [addFieldAt]);

  // ── Drag — constrained within overlay ────────────────────────────────────
  function startDrag(clientX: number, clientY: number, id: string, origX: number, origY: number, fieldWidthPx: number) {
    const sx = clientX, sy = clientY;
    const overlay = overlayRef.current;
    const overlayW = overlay?.offsetWidth  || 600;
    const overlayH = overlay?.offsetHeight || 800;
    // Allow text to go all the way to the right edge (field box may overflow visually — that's fine)
    const maxX = 97;

    const move = (cx: number, cy: number) => {
      const rect = overlayRef.current?.getBoundingClientRect();
      if (!rect) return;
      const newX = Math.max(0, Math.min(maxX, origX + ((cx - sx) / rect.width)  * 100));
      const newY = Math.max(0, Math.min(94,   origY + ((cy - sy) / rect.height) * 100));
      onTextFieldsChange(fieldsRef.current.map(f => f.id !== id ? f : { ...f, x: newX, y: newY }));
    };
    const onMM = (ev: MouseEvent)  => move(ev.clientX, ev.clientY);
    const onMU = () => {
      preventNextTap.current = true;
      document.removeEventListener('mousemove', onMM);
      document.removeEventListener('mouseup',   onMU);
    };
    const onTM = (ev: TouchEvent)  => { ev.preventDefault(); move(ev.touches[0].clientX, ev.touches[0].clientY); };
    const onTE = () => {
      touchDragging.current  = false;
      preventNextTap.current = true;
      document.removeEventListener('touchmove', onTM);
      document.removeEventListener('touchend',  onTE);
    };
    return { onMM, onMU, onTM, onTE };
  }

  const handleDragMouse = (e: React.MouseEvent, id: string, origX: number, origY: number, w: number) => {
    e.preventDefault(); e.stopPropagation();
    const h = startDrag(e.clientX, e.clientY, id, origX, origY, w);
    document.addEventListener('mousemove', h.onMM);
    document.addEventListener('mouseup',   h.onMU);
  };
  const handleDragTouch = (e: React.TouchEvent, id: string, origX: number, origY: number, w: number) => {
    e.stopPropagation();
    touchDragging.current = true;
    const h = startDrag(e.touches[0].clientX, e.touches[0].clientY, id, origX, origY, w);
    document.addEventListener('touchmove', h.onTM, { passive: false });
    document.addEventListener('touchend',  h.onTE);
  };

  // ── Resize ────────────────────────────────────────────────────────────────
  function startResize(clientX: number, id: string, origWidth: number, origFontSize: number) {
    const sx = clientX;
    const overlay = overlayRef.current;
    const overlayW = overlay?.offsetWidth || 600;
    const move = (cx: number) => {
      const rawW   = Math.max(60, origWidth + (cx - sx) / zoom);
      const maxW   = overlayW * 0.98 / zoom;
      const newWidth = Math.min(rawW, maxW);
      const newSize  = Math.round(Math.max(8, Math.min(72, origFontSize * newWidth / origWidth)));
      onTextFieldsChange(fieldsRef.current.map(f => f.id !== id ? f : { ...f, width: newWidth, fontSize: newSize }));
      setFontSizeInputs(prev => ({ ...prev, [id]: String(newSize) }));
    };
    const onMM = (ev: MouseEvent)  => move(ev.clientX);
    const onMU = () => {
      preventNextTap.current = true;
      document.removeEventListener('mousemove', onMM);
      document.removeEventListener('mouseup',   onMU);
    };
    const onTM = (ev: TouchEvent)  => { ev.preventDefault(); move(ev.touches[0].clientX); };
    const onTE = () => {
      touchDragging.current  = false;
      preventNextTap.current = true;
      document.removeEventListener('touchmove', onTM);
      document.removeEventListener('touchend',  onTE);
    };
    return { onMM, onMU, onTM, onTE };
  }

  const handleResizeMouse = (e: React.MouseEvent, id: string, w: number, fs: number) => {
    e.preventDefault(); e.stopPropagation();
    const h = startResize(e.clientX, id, w, fs);
    document.addEventListener('mousemove', h.onMM);
    document.addEventListener('mouseup',   h.onMU);
  };
  const handleResizeTouch = (e: React.TouchEvent, id: string, w: number, fs: number) => {
    e.stopPropagation();
    touchDragging.current = true;
    const h = startResize(e.touches[0].clientX, id, w, fs);
    document.addEventListener('touchmove', h.onTM, { passive: false });
    document.addEventListener('touchend',  h.onTE);
  };

  const commitFontSize = (id: string, raw: string) => {
    const parsed  = parseInt(raw, 10);
    const clamped = isNaN(parsed) ? 14 : Math.max(8, Math.min(72, parsed));
    updateField(id, { fontSize: clamped });
    setFontSizeInputs(prev => ({ ...prev, [id]: String(clamped) }));
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>

      {/* ── Page navigation strip (thumbnails + numbers) ─────────────────── */}
      {numPages > 1 && (
        <div style={{
          display: 'flex', gap: 8, marginBottom: 14,
          overflowX: 'auto', paddingBottom: 6,
          scrollbarWidth: 'thin',
        }}>
          {Array.from({ length: numPages }, (_, i) => i + 1).map(p => {
            const active  = curPage === p;
            const hasFill = textFields.some(f => f.page === p);
            return (
              <div
                key={p}
                onClick={() => setCurPage(p)}
                style={{
                  flexShrink: 0, cursor: 'pointer', textAlign: 'center',
                  userSelect: 'none',
                }}
              >
                {/* Thumbnail */}
                <div style={{
                  border: `2px solid ${active ? '#2563eb' : '#e2e8f0'}`,
                  borderRadius: 8, overflow: 'hidden', marginBottom: 4,
                  boxShadow: active ? '0 0 0 3px rgba(37,99,235,0.15)' : 'none',
                  transition: 'all 0.15s',
                  position: 'relative',
                }}>
                  {thumbnails[p]
                    ? <img src={thumbnails[p]} alt={`Page ${p}`} style={{ display: 'block', height: 70, width: 'auto' }} />
                    : <div style={{ width: 50, height: 70, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#94a3b8' }}>{p}</div>
                  }
                  {hasFill && (
                    <div style={{
                      position: 'absolute', top: 3, right: 3,
                      width: 8, height: 8, background: '#2563eb',
                      borderRadius: '50%', border: '1.5px solid white',
                    }} />
                  )}
                </div>
                {/* Page number */}
                <div style={{
                  fontSize: 11,
                  fontWeight: active ? 700 : 400,
                  color: active ? '#2563eb' : '#94a3b8',
                }}>
                  {p}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Zoom controls ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Zoom:</span>
        <button
          onClick={() => { const i = ZOOM_STEPS.indexOf(zoom); if (i > 0) setZoom(ZOOM_STEPS[i - 1]); }}
          disabled={zoom === ZOOM_STEPS[0]}
          style={{
            width: 30, height: 30, borderRadius: 8, border: '1.5px solid #e2e8f0',
            background: zoom === ZOOM_STEPS[0] ? '#f8fafc' : 'white',
            color: zoom === ZOOM_STEPS[0] ? '#cbd5e1' : '#334155',
            fontSize: 18, fontWeight: 700, cursor: zoom === ZOOM_STEPS[0] ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
          }}
        >−</button>
        <span style={{
          fontSize: 13, fontWeight: 700, color: '#2563eb',
          minWidth: 36, textAlign: 'center',
        }}>{zoom === 1 ? '1×' : `${zoom}×`}</span>
        <button
          onClick={() => { const i = ZOOM_STEPS.indexOf(zoom); if (i < ZOOM_STEPS.length - 1) setZoom(ZOOM_STEPS[i + 1]); }}
          disabled={zoom === ZOOM_STEPS[ZOOM_STEPS.length - 1]}
          style={{
            width: 30, height: 30, borderRadius: 8, border: '1.5px solid #e2e8f0',
            background: zoom === ZOOM_STEPS[ZOOM_STEPS.length - 1] ? '#f8fafc' : 'white',
            color: zoom === ZOOM_STEPS[ZOOM_STEPS.length - 1] ? '#cbd5e1' : '#334155',
            fontSize: 18, fontWeight: 700, cursor: zoom === ZOOM_STEPS[ZOOM_STEPS.length - 1] ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
          }}
        >+</button>
        {zoom > 1 && (
          <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>
            Scroll to navigate · tap to add text
          </span>
        )}
      </div>

      {/* ── Canvas + overlay (scrollable when zoomed) ────────────────────── */}
      {/* overflow:hidden prevents fields near right edge from expanding page width */}
      <div ref={scrollWrapRef} style={{ width: '100%', overflowX: 'auto', overflowY: 'visible', WebkitOverflowScrolling: 'touch' as any }}>
      <div ref={containerRef} style={{ position: 'relative', display: 'block', width: '100%' }}>
        <canvas ref={canvasRef} style={{
          display: 'block',
          borderRadius: 8, boxShadow: '0 2px 12px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0',
        }} />

        {/* Overlay — sized to match canvas CSS bounds exactly */}
        {loaded && (
          <div
            ref={overlayRef}
            onClick={handleOverlayClick}
            onTouchStart={handleOverlayTouchStart}
            onTouchEnd={handleOverlayTouchEnd}
            style={{
              position: 'absolute',
              cursor: 'crosshair',
              borderRadius: 8,
              touchAction: zoom > 1 ? 'pan-x pan-y' : 'pan-y',
              // overflow: visible so toolbars can show above/below
              overflow: 'visible',
            }}
          >
            {currentPageFields.map(field => {
              const isEditing = editingId === field.id;
              const fsInput   = fontSizeInputs[field.id] ?? String(field.fontSize);

              return (
                <div
                  key={field.id}
                  data-textfield="1"
                  onClick={e => e.stopPropagation()}
                  onMouseDown={e => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    left: `${field.x}%`,
                    top:  `${field.y}%`,
                    zIndex: isEditing ? 20 : 10,
                    // field div is just the anchor — no background, no padding
                  }}
                >
                  {/* ── Text area / display — transparent, starts exactly at x,y ── */}
                  {isEditing ? (
                    <div style={{
                      position: 'relative',
                      width: field.width * zoom,
                      minWidth: 60,
                      border: '1.5px dashed #2563eb',
                      borderRadius: 4,
                      background: 'rgba(239,246,255,0.18)',
                    }}>
                      {/* Textarea — at the very top, finger doesn't obscure it */}
                      <textarea
                        ref={el => {
                          if (el) { textareasRef.current.set(field.id, el); autoResize(el); }
                          else textareasRef.current.delete(field.id);
                        }}
                        autoFocus={field.text === '' && !isTouchDevice}
                        value={field.text}
                        rows={1}
                        onChange={e => { updateField(field.id, { text: e.target.value }); autoResize(e.target); }}
                        placeholder="Type…"
                        onClick={e => e.stopPropagation()}
                        onMouseDown={e => e.stopPropagation()}
                        style={{
                          display: 'block',
                          width: '100%',
                          border: 'none', outline: 'none',
                          padding: '0',
                          margin: '0',
                          // field.fontSize is PDF pts; pageScale converts to screen px
                          fontSize: field.fontSize * pageScale * zoom,
                          fontFamily: 'Helvetica, Arial, sans-serif',
                          color: field.color,
                          background: 'transparent',
                          resize: 'none', overflow: 'hidden',
                          lineHeight: 1.35,
                          minHeight: field.fontSize * pageScale * zoom * 1.5,
                          boxSizing: 'border-box',
                        }}
                      />

                      {/* Bottom bar: drag handle (left) + controls (right) */}
                      <div style={{
                        display: 'flex', alignItems: 'center',
                        borderTop: '1px dashed rgba(37,99,235,0.3)',
                        background: 'rgba(239,246,255,0.85)',
                        borderRadius: '0 0 4px 4px',
                        gap: 5, padding: '4px 5px',
                        minHeight: 34,
                      }}>
                        {/* Drag handle */}
                        <span
                          onMouseDown={e => { e.preventDefault(); e.stopPropagation(); handleDragMouse(e, field.id, field.x, field.y, field.width); }}
                          onTouchStart={e => { e.stopPropagation(); handleDragTouch(e, field.id, field.x, field.y, field.width); }}
                          title="Drag to move"
                          style={{
                            color: '#2563eb', fontSize: 17,
                            cursor: 'grab', userSelect: 'none', touchAction: 'none',
                            padding: '3px 5px', flexShrink: 0,
                            minWidth: 30, minHeight: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >⠿</span>

                        <div style={{ width: 1, height: 16, background: 'rgba(37,99,235,0.2)', flexShrink: 0 }} />

                        {/* Font size */}
                        <input
                          type="number" min={8} max={72}
                          value={fsInput}
                          onChange={e => setFontSizeInputs(prev => ({ ...prev, [field.id]: e.target.value }))}
                          onBlur={e  => commitFontSize(field.id, e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { commitFontSize(field.id, (e.target as HTMLInputElement).value); e.preventDefault(); } }}
                          onClick={e => e.stopPropagation()}
                          onMouseDown={e => e.stopPropagation()}
                          style={{
                            width: 40, height: 30, border: '1.5px solid #bfdbfe', borderRadius: 5,
                            fontSize: 13, fontWeight: 700, color: '#334155',
                            textAlign: 'center', padding: '0', outline: 'none', background: 'white',
                            flexShrink: 0,
                          }}
                        />

                        <div style={{ width: 1, height: 16, background: 'rgba(37,99,235,0.2)', flexShrink: 0 }} />

                        {/* Color dots */}
                        {TEXT_COLORS.map(c => (
                          <button key={c.value}
                            onClick={e => { e.stopPropagation(); updateField(field.id, { color: c.value }); }}
                            onMouseDown={e => e.stopPropagation()}
                            title={c.label}
                            style={{
                              width: 20, height: 20, borderRadius: '50%',
                              background: c.value, cursor: 'pointer', padding: 0, border: 'none',
                              outline: field.color === c.value ? `2.5px solid ${c.value === '#000000' ? '#64748b' : '#2563eb'}` : '1.5px solid #e2e8f0',
                              outlineOffset: 2, flexShrink: 0,
                            }}
                          />
                        ))}

                        <div style={{ flex: 1 }} />

                        {/* Resize grip */}
                        <div
                          onMouseDown={e => { e.preventDefault(); e.stopPropagation(); handleResizeMouse(e, field.id, field.width, field.fontSize); }}
                          onTouchStart={e => { e.stopPropagation(); handleResizeTouch(e, field.id, field.width, field.fontSize); }}
                          title="Drag to resize"
                          style={{
                            cursor: 'ew-resize', touchAction: 'none', flexShrink: 0,
                            width: 34, height: 30,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(37,99,235,0.08)',
                            borderRadius: 5,
                            userSelect: 'none',
                          }}
                        >
                          <svg width="16" height="14" viewBox="0 0 16 14" style={{ display: 'block', pointerEvents: 'none' }}>
                            <line x1="2" y1="7" x2="14" y2="7" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
                            <polyline points="10,3 14,7 10,11" fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
                            <polyline points="6,3 2,7 6,11" fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
                          </svg>
                        </div>

                        <div style={{ width: 1, height: 16, background: 'rgba(37,99,235,0.2)', flexShrink: 0 }} />

                        {/* ✓ Done */}
                        <button
                          onClick={e => { e.stopPropagation(); setEditingId(null); }}
                          onMouseDown={e => e.stopPropagation()}
                          title="Done"
                          style={{
                            minWidth: 34, height: 30, borderRadius: 6,
                            border: 'none', background: '#16a34a',
                            color: 'white', cursor: 'pointer',
                            fontSize: 14, fontWeight: 800,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >✓</button>

                        {/* ✕ Delete */}
                        <button
                          onClick={e => { e.stopPropagation(); deleteField(field.id); }}
                          onMouseDown={e => e.stopPropagation()}
                          title="Delete"
                          style={{
                            minWidth: 34, height: 30, borderRadius: 6,
                            border: 'none', background: '#fee2e2',
                            color: '#dc2626', cursor: 'pointer',
                            fontSize: 14, fontWeight: 800,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >✕</button>
                      </div>
                    </div>
                  ) : (
                    /* ── DISPLAY MODE ─────────────────────────────────── */
                    <div style={{
                      position: 'relative',
                      width: field.width * zoom, minWidth: 60,
                      border: '1.5px solid #16a34a',
                      borderRadius: 4,
                      background: 'rgba(240,253,244,0.15)',
                    }}>
                      {/* Text — click to edit */}
                      <div
                        onClick={e => { e.stopPropagation(); setEditingId(field.id); }}
                        onTouchEnd={e => {
                          e.stopPropagation();
                          if (!touchDragging.current) {
                            setEditingId(field.id);
                            preventNextTap.current = true;
                          }
                        }}
                        style={{
                          padding: '0',
                          fontSize: field.fontSize * pageScale * zoom,
                          fontFamily: 'Helvetica, Arial, sans-serif',
                          color: field.color, lineHeight: 1.35,
                          cursor: 'text', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                          minHeight: field.fontSize * pageScale * zoom * 1.5,
                        }}
                      >
                        {field.text || (
                          <span style={{ color: 'rgba(22,163,74,0.7)', fontStyle: 'italic', fontSize: 13, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Pencil size={12} /> tap to type</span>
                        )}
                      </div>

                      {/* Bottom bar: drag (left) + ✓ (right) */}
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        borderTop: '1px solid rgba(22,163,74,0.2)',
                        background: 'rgba(240,253,244,0.85)',
                        borderRadius: '0 0 4px 4px',
                        padding: '3px 5px',
                        minHeight: 30,
                      }}>
                        <span
                          onMouseDown={e => { e.preventDefault(); e.stopPropagation(); handleDragMouse(e, field.id, field.x, field.y, field.width); }}
                          onTouchStart={e => { e.stopPropagation(); handleDragTouch(e, field.id, field.x, field.y, field.width); }}
                          style={{
                            color: '#86efac', fontSize: 17,
                            cursor: 'grab', userSelect: 'none', touchAction: 'none',
                            padding: '3px 5px', minWidth: 30, minHeight: 30,
                            display: 'flex', alignItems: 'center',
                          }}
                          title="Drag to move"
                        >⠿</span>
                        <span style={{ color: '#16a34a', fontSize: 14, fontWeight: 700, userSelect: 'none', padding: '3px 5px' }}>✓</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Tap hint when no fields on this page */}
            {currentPageFields.length === 0 && (
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none', textAlign: 'center',
                background: 'rgba(255,255,255,0.9)', borderRadius: 14,
                padding: '16px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                border: '1px solid #e2e8f0',
              }}>
                <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'center' }}><MousePointerClick size={28} color="#2563eb" /></div>
                <div style={{ fontSize: 14, color: '#334155', fontWeight: 600 }}>Tap anywhere to add text</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                  Drag <strong>⠿</strong> to reposition · press <strong style={{ color: '#16a34a' }}>✓</strong> to confirm
                </div>
              </div>
            )}
          </div>
        )}

        {!loaded && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.8)' }}>
            <div className="spinner" style={{ width: 28, height: 28, borderColor: '#c7d2fe', borderTopColor: '#2563eb' }} />
          </div>
        )}
      </div>
      </div>{/* end scrollWrapRef */}
    </div>
  );
}
