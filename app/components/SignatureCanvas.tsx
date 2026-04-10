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

interface Point {
  x: number;
  y: number;
}

export default function SignatureCanvas({ onSave }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const isDrawingRef = useRef(false); // For touch handlers
  const [isEmpty, setIsEmpty]     = useState(true);
  const isEmptyRef = useRef(true);
  const [color, setColor]         = useState(COLORS[0].value);
  const [width, setWidth]         = useState(3);
  const colorRef = useRef(COLORS[0].value);
  const widthRef = useRef(3);
  const strokes  = useRef<ImageData[]>([]);
  const lastPosRef = useRef<Point | null>(null);

  // Sync isDrawing state with ref
  useEffect(() => {
    isDrawingRef.current = isDrawing;
  }, [isDrawing]);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement!;
    const cssW   = parent.clientWidth  || 320;
    const cssH   = 380;
    const dpr    = window.devicePixelRatio || 1;
    
    canvas.width  = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    
    const ctx = canvas.getContext('2d')!;
    ctx.strokeStyle = color;
    ctx.lineWidth   = width * dpr;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
  }, []);

  useEffect(() => {
    initCanvas();
    const canvas = canvasRef.current!;
    
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      saveStroke();
      isDrawingRef.current = true;
      setIsDrawing(true);
      
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const pos = {
        x: (touch.clientX - rect.left) * dpr,
        y: (touch.clientY - rect.top) * dpr,
      };
      lastPosRef.current = pos;
      
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = colorRef.current;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, (widthRef.current * dpr) / 2, 0, Math.PI * 2);
      ctx.fill();
      
      setIsEmpty(false);
      isEmptyRef.current = false;
    };
    
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!isDrawingRef.current || !lastPosRef.current) return;
      
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const pos = {
        x: (touch.clientX - rect.left) * dpr,
        y: (touch.clientY - rect.top) * dpr,
      };
      
      const ctx = canvas.getContext('2d')!;
      ctx.strokeStyle = colorRef.current;
      ctx.lineWidth = widthRef.current * dpr;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      
      lastPosRef.current = pos;
    };
    
    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      isDrawingRef.current = false;
      setIsDrawing(false);
      lastPosRef.current = null;
      if (!isEmptyRef.current) {
        const result = getCropped();
        onSave(result.dataUrl, result.w, result.h);
      }
    };
    
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    
    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [initCanvas, onSave]);

  useEffect(() => {
    colorRef.current = color;
    widthRef.current = width;
  }, [color, width]);

  const getCanvasPoint = (clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    const dpr    = window.devicePixelRatio || 1;
    return {
      x: (clientX - rect.left) * dpr,
      y: (clientY - rect.top) * dpr,
    };
  };

  const saveStroke = () => {
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext('2d')!;
    strokes.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (strokes.current.length > 40) strokes.current.shift();
  };

  const startDrawingMouse = (e: React.MouseEvent) => {
    e.preventDefault();
    saveStroke();
    setIsDrawing(true);
    isDrawingRef.current = true;
    
    const pos = getCanvasPoint(e.clientX, e.clientY);
    lastPosRef.current = pos;
    
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    ctx.fillStyle = colorRef.current;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, (widthRef.current * dpr) / 2, 0, Math.PI * 2);
    ctx.fill();
    
    setIsEmpty(false);
    isEmptyRef.current = false;
  };

  const drawMouse = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isDrawingRef.current || !lastPosRef.current) return;
    
    const pos = getCanvasPoint(e.clientX, e.clientY);
    
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    ctx.strokeStyle = colorRef.current;
    ctx.lineWidth = widthRef.current * dpr;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    
    lastPosRef.current = pos;
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
    setIsDrawing(false);
    lastPosRef.current = null;
    if (!isEmptyRef.current) {
      const result = getCropped();
      onSave(result.dataUrl, result.w, result.h);
    }
  };

  const getCropped = () => {
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext('2d')!;
    const dpr    = window.devicePixelRatio || 1;
    const w = canvas.width;
    const h = canvas.height;
    
    const imgData = ctx.getImageData(0, 0, w, h);
    let minX = w, minY = h, maxX = 0, maxY = 0;
    
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (imgData.data[(y * w + x) * 4 + 3] > 10) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }
    
    if (minX > maxX) return { dataUrl: '', w: 0, h: 0 };
    
    const pad = Math.ceil(12 * dpr);
    const sx = Math.max(0, minX - pad);
    const sy = Math.max(0, minY - pad);
    const sw = Math.min(w - sx, maxX - minX + pad * 2);
    const sh = Math.min(h - sy, maxY - minY + pad * 2);
    
    const tmp = document.createElement('canvas');
    tmp.width = sw;
    tmp.height = sh;
    tmp.getContext('2d')!.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
    
    return { 
      dataUrl: tmp.toDataURL('image/png'), 
      w: sw / dpr, 
      h: sh / dpr 
    };
  };

  const undo = () => {
    if (strokes.current.length === 0) return;
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext('2d')!;
    ctx.putImageData(strokes.current.pop()!, 0, 0);
    const data  = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const blank = !data.some(v => v !== 0);
    setIsEmpty(blank); 
    isEmptyRef.current = blank;
    if (blank) { 
      onSave('', 0, 0); 
    } else { 
      const c = getCropped(); 
      onSave(c.dataUrl, c.w, c.h); 
    }
  };

  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext('2d')!;
    saveStroke();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true); 
    isEmptyRef.current = true;
    strokes.current = [];
    lastPosRef.current = null;
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
          style={{ height: '380px', touchAction: 'none' }}
          onMouseDown={startDrawingMouse} 
          onMouseMove={drawMouse} 
          onMouseUp={stopDrawing} 
          onMouseLeave={stopDrawing}
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
        <span className="sig-hint">Use mouse or trackpad to sign</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="clear-btn" onClick={undo} type="button">↩ Undo</button>
          <button className="clear-btn" onClick={clear} type="button">✕ Clear</button>
        </div>
      </div>
    </div>
  );
}
