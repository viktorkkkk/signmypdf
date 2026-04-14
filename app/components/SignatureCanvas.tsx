'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

interface Props {
  onSave: (dataUrl: string, width: number, height: number) => void;
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

export default function SignatureCanvas({ onSave }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const isDrawingRef = useRef(false);
  const [isEmpty, setIsEmpty]     = useState(true);
  const isEmptyRef = useRef(true);
  const [color, setColor]         = useState(COLORS[0].value);
  const [width, setWidth]         = useState(3);
  const colorRef = useRef(COLORS[0].value);
  const widthRef = useRef(3);
  const lastPos  = useRef<{ x: number; y: number } | null>(null);
  const lastMid  = useRef<{ x: number; y: number } | null>(null);
  const strokes  = useRef<ImageData[]>([]);

  useEffect(() => { isDrawingRef.current = isDrawing; }, [isDrawing]);

  const initCanvas = useCallback((preserveContent = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Save existing content if needed
    let savedData: ImageData | null = null;
    if (preserveContent && canvas.width > 0 && canvas.height > 0) {
      try {
        savedData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      } catch {}
    }
    
    const parent = canvas.parentElement!;
    const cssW   = parent.clientWidth  || parent.offsetWidth  || 320;
    // Adaptive height: smaller on mobile
    const isMobile = window.innerWidth <= 680;
    const cssH   = isMobile ? 240 : 380;
    const dpr    = window.devicePixelRatio || 1;
    canvas.width  = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    canvas.style.width  = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = color;
    ctx.lineWidth   = width;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    
    // Restore content if available
    if (savedData) {
      const tmp = document.createElement('canvas');
      tmp.width = savedData.width;
      tmp.height = savedData.height;
      tmp.getContext('2d')!.putImageData(savedData, 0, 0);
      ctx.drawImage(tmp, 0, 0, canvas.width / dpr, canvas.height / dpr);
    }
  }, []);

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
  }, [initCanvas]);

  useEffect(() => {
    colorRef.current = color;
    widthRef.current = width;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = color;
    ctx.lineWidth   = width;
  }, [color, width]);

  // Coordinate calculation - handles iOS Safari visual viewport offset
  const getPos = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    // On iOS, visualViewport may have an offset when the address bar is transitioning
    const vvTop  = (window.visualViewport?.offsetTop  ?? 0);
    const vvLeft = (window.visualViewport?.offsetLeft ?? 0);
    return {
      x: clientX - rect.left - vvLeft,
      y: clientY - rect.top  - vvTop,
    };
  };

  const startDrawingTouch = (e: TouchEvent) => {
    saveStroke();
    setIsDrawing(true);
    isDrawingRef.current = true;
    const touch = e.touches[0];
    lastPos.current = getPos(touch.clientX, touch.clientY);
    lastMid.current = null;
  };

  const drawTouch = (e: TouchEvent) => {
    if (!isDrawingRef.current || !lastPos.current) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.strokeStyle = colorRef.current;
    ctx.lineWidth   = widthRef.current;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    const touch = e.touches[0];
    const pos = getPos(touch.clientX, touch.clientY);
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
  };

  const startDrawing = (e: React.MouseEvent) => {
    e.preventDefault();
    saveStroke();
    setIsDrawing(true);
    lastPos.current = getPos(e.clientX, e.clientY);
    lastMid.current = null;
  };

  const draw = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isDrawing || !lastPos.current) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.strokeStyle = color;
    ctx.lineWidth   = width;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    const pos = getPos(e.clientX, e.clientY);
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
  };

  const saveStroke = () => {
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext('2d')!;
    strokes.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (strokes.current.length > 40) strokes.current.shift();
  };

  const getCropped = (): { dataUrl: string; w: number; h: number } => {
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
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    isDrawingRef.current = false;
    lastPos.current = null;
    if (!isEmptyRef.current) {
      const { dataUrl, w, h } = getCropped();
      onSave(dataUrl, w, h);
    }
  };

  const undo = () => {
    if (strokes.current.length === 0) return;
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext('2d')!;
    ctx.putImageData(strokes.current.pop()!, 0, 0);
    const data  = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const blank = !data.some(v => v !== 0);
    setIsEmpty(blank); isEmptyRef.current = blank;
    if (blank) { onSave('', 0, 0); }
    else { const c = getCropped(); onSave(c.dataUrl, c.w, c.h); }
  };

  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext('2d')!;
    saveStroke();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true); isEmptyRef.current = true;
    strokes.current = [];
    onSave('', 0, 0);
  };

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
            <div className="sig-placeholder-icon">✍️</div>
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
