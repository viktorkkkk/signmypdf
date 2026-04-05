'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

interface Props {
  onSave: (dataUrl: string) => void;
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
  const [isEmpty, setIsEmpty]     = useState(true);
  const [color, setColor]         = useState(COLORS[0].value);
  const [width, setWidth]         = useState(3);
  const lastPos  = useRef<{ x: number; y: number } | null>(null);
  const strokes  = useRef<ImageData[]>([]);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.parentElement!.getBoundingClientRect();
    const dpr  = window.devicePixelRatio || 1;
    canvas.width  = rect.width * dpr;
    canvas.height = 380 * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = color;
    ctx.lineWidth   = width;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
  }, []);

  useEffect(() => { initCanvas(); }, [initCanvas]);

  // Apply color/width changes to context
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = color;
    ctx.lineWidth   = width;
  }, [color, width]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    let cx: number, cy: number;
    if ('touches' in e) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; }
    else { cx = (e as React.MouseEvent).clientX; cy = (e as React.MouseEvent).clientY; }
    const dpr = window.devicePixelRatio || 1;
    return {
      x: (cx - rect.left) * (canvas.width  / dpr / rect.width),
      y: (cy - rect.top)  * (canvas.height / dpr / rect.height),
    };
  };

  const saveStroke = () => {
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext('2d')!;
    strokes.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (strokes.current.length > 40) strokes.current.shift();
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    saveStroke();
    setIsDrawing(true);
    lastPos.current = getPos(e);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing || !lastPos.current) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.strokeStyle = color;
    ctx.lineWidth   = width;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    setIsEmpty(false);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    lastPos.current = null;
    if (!isEmpty) onSave(canvasRef.current!.toDataURL('image/png'));
  };

  const undo = () => {
    if (strokes.current.length === 0) return;
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext('2d')!;
    ctx.putImageData(strokes.current.pop()!, 0, 0);
    const data  = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const blank = !data.some(v => v !== 0);
    setIsEmpty(blank);
    onSave(blank ? '' : canvas.toDataURL('image/png'));
  };

  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext('2d')!;
    saveStroke();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    strokes.current = [];
    onSave('');
  };

  return (
    <div>
      {/* Toolbar */}
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

      {/* Canvas */}
      <div ref={containerRef} className="sig-container">
        <canvas
          ref={canvasRef}
          className="sig-canvas"
          style={{ height: '380px' }}
          onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
          onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
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
