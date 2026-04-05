'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

interface Props {
  onSave: (dataUrl: string) => void;
}

export default function SignatureCanvas({ onSave }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty]     = useState(true);
  const lastPos  = useRef<{ x: number; y: number } | null>(null);
  const strokes  = useRef<ImageData[]>([]); // undo stack

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.parentElement!.getBoundingClientRect();
    const dpr  = window.devicePixelRatio || 1;
    canvas.width  = rect.width  * dpr;
    canvas.height = 380 * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth   = 3;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
  }, []);

  useEffect(() => { initCanvas(); }, [initCanvas]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
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
    const dpr = window.devicePixelRatio || 1;
    // Scale CSS coords → logical drawing coords (accounts for DPR + any resize)
    return {
      x: (clientX - rect.left) * (canvas.width  / dpr / rect.width),
      y: (clientY - rect.top)  * (canvas.height / dpr / rect.height),
    };
  };

  const saveStroke = () => {
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext('2d')!;
    strokes.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (strokes.current.length > 30) strokes.current.shift();
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    saveStroke(); // save state before stroke
    setIsDrawing(true);
    lastPos.current = getPos(e);
    containerRef.current?.classList.add('drawing');
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing || !lastPos.current) return;
    const ctx = canvasRef.current!.getContext('2d')!;
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
    containerRef.current?.classList.remove('drawing');
    if (!isEmpty) onSave(canvasRef.current!.toDataURL('image/png'));
  };

  const undo = () => {
    if (strokes.current.length === 0) return;
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext('2d')!;
    const prev   = strokes.current.pop()!;
    ctx.putImageData(prev, 0, 0);
    // Check if canvas is now blank
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
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
        <span className="sig-hint">Use mouse or finger to sign</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="clear-btn" onClick={undo} type="button" title="Undo last stroke">↩ Undo</button>
          <button className="clear-btn" onClick={clear} type="button">✕ Clear</button>
        </div>
      </div>
    </div>
  );
}
