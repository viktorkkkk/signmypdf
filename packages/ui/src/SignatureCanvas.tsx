'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { PenLine } from 'lucide-react';

interface Props {
  onSave: (dataUrl: string, width: number, height: number) => void;
  /** Optional starting image — when provided, the canvas pre-loads
   *  this dataUrl on first mount so the user can continue editing
   *  an existing signature instead of redrawing from scratch.
   *  Used by FillSignEditor's "Edit" pencil on placed signatures. */
  initialDataUrl?: string;
}

const COLORS = [
  { label: 'Black',     value: '#0f172a' },
  { label: 'Navy',      value: '#1e3a8a' },
  { label: 'Blue',      value: '#2563eb' },
  { label: 'Dark red',  value: '#991b1b' },
  { label: 'Teal',      value: '#0f766e' },
];

const WIDTHS = [
  { label: 'Thin',   value: 1.5 },
  { label: 'Normal', value: 3   },
  { label: 'Thick',  value: 5   },
];

export default function SignatureCanvas({ onSave, initialDataUrl }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const isDrawingRef = useRef(false);
  const [isEmpty, setIsEmpty]     = useState(true);
  const isEmptyRef = useRef(true);

  const [color, setColor] = useState(COLORS[0].value);
  const [width, setWidth] = useState(3);
  // Mirrors of color/width as refs so handlers attached once at mount
  // (touchstart/touchmove/touchend) can read the current value without
  // being re-created on every color/width change.
  const colorRef = useRef(COLORS[0].value);
  const widthRef = useRef(3);

  // onSave from the parent may be a fresh closure on every render. Mirror
  // it into a ref so handlers like `stopDrawing` keep a stable identity
  // and the mount-time useEffect doesn't have to re-attach listeners
  // every time the parent re-renders.
  const onSaveRef = useRef(onSave);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const lastMid = useRef<{ x: number; y: number } | null>(null);
  const strokes = useRef<ImageData[]>([]);

  // Sync refs from state so the touch handlers (attached once at mount)
  // and the canvas-init effect both see the latest values.
  useEffect(() => { isDrawingRef.current = isDrawing; }, [isDrawing]);
  useEffect(() => {
    colorRef.current = color;
    widthRef.current = width;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = color;
    ctx.lineWidth   = width;
  }, [color, width]);

  // ── Helpers ─────────────────────────────────────────────────────────
  // Defined as useCallback BEFORE the useEffect that registers them as
  // event listeners, so ESLint can verify the deps closure statically.
  // Each helper closes over refs (not state) for values that change,
  // so its identity stays stable.

  // Coordinate calculation - handles iOS Safari visual viewport offset.
  const getPos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    const vvTop  = (window.visualViewport?.offsetTop  ?? 0);
    const vvLeft = (window.visualViewport?.offsetLeft ?? 0);
    return {
      x: clientX - rect.left - vvLeft,
      y: clientY - rect.top  - vvTop,
    };
  }, []);

  const saveStroke = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    strokes.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (strokes.current.length > 40) strokes.current.shift();
  }, []);

  const getCropped = useCallback((): { dataUrl: string; w: number; h: number } => {
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext('2d')!;
    const dpr    = window.devicePixelRatio || 1;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        if (imgData.data[(y * canvas.width + x) * 4 + 3] > 10) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (minX > maxX) return { dataUrl: '', w: 0, h: 0 };
    const pad = Math.ceil(12 * dpr);
    const sx = Math.max(0, minX - pad), sy = Math.max(0, minY - pad);
    const sw = Math.min(canvas.width  - sx, maxX - minX + pad * 2);
    const sh = Math.min(canvas.height - sy, maxY - minY + pad * 2);
    const tmp = document.createElement('canvas');
    tmp.width = sw; tmp.height = sh;
    tmp.getContext('2d')!.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
    return { dataUrl: tmp.toDataURL('image/png'), w: sw / dpr, h: sh / dpr };
  }, []);

  // Single shared "advance the curve" routine for both mouse and touch.
  const advanceStroke = useCallback((nx: number, ny: number) => {
    if (!lastPos.current) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.strokeStyle = colorRef.current;
    ctx.lineWidth   = widthRef.current;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    const pos = getPos(nx, ny);
    const mid = { x: (lastPos.current.x + pos.x) / 2, y: (lastPos.current.y + pos.y) / 2 };
    ctx.beginPath();
    if (lastMid.current) {
      ctx.moveTo(lastMid.current.x, lastMid.current.y);
      ctx.quadraticCurveTo(lastPos.current.x, lastPos.current.y, mid.x, mid.y);
    } else {
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(mid.x, mid.y);
    }
    ctx.stroke();
    lastMid.current = mid;
    lastPos.current = pos;
    setIsEmpty(false);
    isEmptyRef.current = false;
  }, [getPos]);

  const startDrawingTouch = useCallback((e: TouchEvent) => {
    saveStroke();
    setIsDrawing(true);
    isDrawingRef.current = true;
    const touch = e.touches[0];
    lastPos.current = getPos(touch.clientX, touch.clientY);
    lastMid.current = null;
  }, [getPos, saveStroke]);

  const drawTouch = useCallback((e: TouchEvent) => {
    if (!isDrawingRef.current || !lastPos.current) return;
    const touch = e.touches[0];
    advanceStroke(touch.clientX, touch.clientY);
  }, [advanceStroke]);

  const startDrawing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    saveStroke();
    setIsDrawing(true);
    isDrawingRef.current = true;
    lastPos.current = getPos(e.clientX, e.clientY);
    lastMid.current = null;
  }, [getPos, saveStroke]);

  const draw = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!isDrawingRef.current || !lastPos.current) return;
    advanceStroke(e.clientX, e.clientY);
  }, [advanceStroke]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    isDrawingRef.current = false;
    lastPos.current = null;
    if (!isEmptyRef.current) {
      const { dataUrl, w, h } = getCropped();
      onSaveRef.current(dataUrl, w, h);
    }
  }, [getCropped]);

  const undo = useCallback(() => {
    if (strokes.current.length === 0) return;
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext('2d')!;
    ctx.putImageData(strokes.current.pop()!, 0, 0);
    const data  = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const blank = !data.some(v => v !== 0);
    setIsEmpty(blank); isEmptyRef.current = blank;
    if (blank) {
      onSaveRef.current('', 0, 0);
    } else {
      const c = getCropped();
      onSaveRef.current(c.dataUrl, c.w, c.h);
    }
  }, [getCropped]);

  const clear = useCallback(() => {
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext('2d')!;
    saveStroke();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true); isEmptyRef.current = true;
    strokes.current = [];
    onSaveRef.current('', 0, 0);
  }, [saveStroke]);

  // ── Canvas init ────────────────────────────────────────────────────
  // Sets up DPR-aware canvas dimensions, copies the current ctx state
  // (color/width) from refs so initial draw matches the toolbar
  // selection. Re-runs on resize via the mount-time effect below.
  const initCanvas = useCallback((preserveContent = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let savedData: ImageData | null = null;
    if (preserveContent && canvas.width > 0 && canvas.height > 0) {
      try {
        savedData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      } catch {}
    }

    const parent = canvas.parentElement!;
    const cssW   = parent.clientWidth  || parent.offsetWidth  || 320;
    // Adaptive height: smaller on mobile.
    const isMobile = window.innerWidth <= 680;
    const cssH   = isMobile ? 240 : 380;
    const dpr    = window.devicePixelRatio || 1;
    canvas.width  = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    canvas.style.width  = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = colorRef.current;
    ctx.lineWidth   = widthRef.current;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';

    if (savedData) {
      const tmp = document.createElement('canvas');
      tmp.width = savedData.width;
      tmp.height = savedData.height;
      tmp.getContext('2d')!.putImageData(savedData, 0, 0);
      ctx.drawImage(tmp, 0, 0, canvas.width / dpr, canvas.height / dpr);
    }
  }, []);

  // Mount-time setup: init canvas + wire touch listeners. Touch handlers
  // are stable useCallback refs, so this effect re-runs only if one of
  // them genuinely changes — which they don't, since their deps are also
  // stable refs (getPos/saveStroke/getCropped/advanceStroke).
  useEffect(() => {
    initCanvas();
    const handleResize = () => initCanvas(true);
    window.addEventListener('resize', handleResize);

    const canvas = canvasRef.current!;
    const onTouchStart = (e: TouchEvent) => { e.preventDefault(); startDrawingTouch(e); };
    const onTouchMove  = (e: TouchEvent) => { e.preventDefault(); drawTouch(e); };
    const onTouchEnd   = (e: TouchEvent) => { e.preventDefault(); stopDrawing(); };
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false });
    canvas.addEventListener('touchend',   onTouchEnd,   { passive: false });
    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove',  onTouchMove);
      canvas.removeEventListener('touchend',   onTouchEnd);
    };
  }, [initCanvas, startDrawingTouch, drawTouch, stopDrawing]);

  // Pre-load initialDataUrl into the canvas (run-once after mount).
  // Used by /sign-nda's edit-existing-signature flow so the user sees
  // their current signature in the canvas and can extend or redraw it.
  // Canvas is centred at 80% of available area to leave a comfortable
  // margin around the strokes. The drawn image is captured into the
  // strokes-undo buffer so Clear / Undo behave consistently. We do NOT
  // call onSave here — the parent already has the original dataUrl
  // pre-seeded into its state for this edit session, and the next
  // stopDrawing will fire onSave with the merged result if the user
  // adds strokes on top.
  const didLoadInitialRef = useRef(false);
  useEffect(() => {
    if (!initialDataUrl) return;
    if (didLoadInitialRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    didLoadInitialRef.current = true;
    const img = new window.Image();
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const cssW = canvas.width / dpr;
      const cssH = canvas.height / dpr;
      const imgAspect = img.width / img.height;
      const canvasAspect = cssW / cssH;
      let drawW: number, drawH: number;
      if (imgAspect > canvasAspect) {
        drawW = cssW * 0.8;
        drawH = drawW / imgAspect;
      } else {
        drawH = cssH * 0.8;
        drawW = drawH * imgAspect;
      }
      const x = (cssW - drawW) / 2;
      const y = (cssH - drawH) / 2;
      ctx.drawImage(img, x, y, drawW, drawH);
      setIsEmpty(false);
      isEmptyRef.current = false;
      strokes.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    };
    img.src = initialDataUrl;
  }, [initialDataUrl]);

  return (
    <div>
      <div className="sig-toolbar">
        <div className="sig-tool-group">
          {COLORS.map(c => (
            <button
              key={c.value}
              title={c.label}
              className={`color-dot${color === c.value ? ' active' : ''}`}
              style={{ background: c.value }}
              onClick={() => setColor(c.value)}
              type="button"
            />
          ))}
        </div>
        <div className="sig-divider" />
        <div className="sig-tool-group">
          {WIDTHS.map(w => (
            <button
              key={w.value}
              title={w.label}
              className={`width-btn${width === w.value ? ' active' : ''}`}
              onClick={() => setWidth(w.value)}
              type="button"
            >
              <span style={{ width: '24px', height: `${w.value * 2}px`, background: color, borderRadius: 4, display: 'block' }} />
            </button>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="sig-container">
        <canvas
          ref={canvasRef}
          className="sig-canvas"
          style={{ touchAction: 'none' }}
          onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
        />
        <div className="sig-baseline" />
        <div className="sig-baseline-label">Sign here</div>
        {isEmpty && (
          <div className="sig-placeholder">
            <div className="sig-placeholder-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><PenLine size={28} color="#94a3b8" strokeWidth={1.6} /></div>
            <div className="sig-placeholder-text">Draw your signature</div>
          </div>
        )}
      </div>

      <div className="sig-footer">
        <span className="sig-hint">Use mouse, trackpad or finger to sign</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="clear-btn" onClick={undo} type="button">↩ Undo</button>
          <button className="clear-btn" onClick={clear} type="button">✕ Clear</button>
        </div>
      </div>
    </div>
  );
}
