'use client';

import { useState, useRef, useCallback } from 'react';
import { MapPin } from 'lucide-react';

export interface PlacementState {
  zone: number;
  scale: number; // 0.5 – 2.0
}

interface Props {
  signatureDataUrl: string;
  totalPages: number;
  selectedPage: number;
  onPageChange: (p: number) => void;
  onPlacement: (zone: number, scale: number) => void;
  selectedZone: number;
  sigScale: number;
}

const ZONE_LABELS = [
  'Top left',    'Top center',    'Top right',
  'Middle left', 'Middle center', 'Middle right',
  'Bottom left', 'Bottom center', 'Bottom right',
];

export function zoneToPdfCoords(zone: number, pageW: number, pageH: number, sigScale: number) {
  const col = zone % 3;
  const row = Math.floor(zone / 3);
  const xPct = [0.04, 0.33, 0.62][col];
  const yPct = [0.82, 0.50, 0.10][row];
  return { x: xPct * pageW, y: yPct * pageH };
}

export default function PlacementPicker({
  signatureDataUrl, totalPages, selectedPage,
  onPageChange, onPlacement, selectedZone, sigScale,
}: Props) {
  const [localScale, setLocalScale] = useState(sigScale);
  const resizing     = useRef(false);
  const resizeStart  = useRef({ x: 0, scale: 1 });

  const onResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    resizing.current = true;
    const cx = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    resizeStart.current = { x: cx, scale: localScale };
    const onMove = (ev: MouseEvent | TouchEvent) => {
      const nx = 'touches' in ev ? (ev as TouchEvent).touches[0].clientX : (ev as MouseEvent).clientX;
      const delta = (nx - resizeStart.current.x) / 80;
      const ns = Math.max(0.4, Math.min(3, resizeStart.current.scale + delta));
      setLocalScale(ns);
      onPlacement(selectedZone, ns);
    };
    const onEnd = () => {
      resizing.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup',   onEnd);
      window.removeEventListener('touchend',  onEnd);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove',  onMove, { passive: false });
    window.addEventListener('mouseup',   onEnd);
    window.addEventListener('touchend',  onEnd);
  };

  const hasSig = !!signatureDataUrl;

  // Signature display size in the grid cell (px)
  const baseSigW = 90;
  const sigW = baseSigW * localScale;

  return (
    <div>
      {/* Page selector */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Page:</span>
          {Array.from({ length: Math.min(totalPages, 12) }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => onPageChange(p)} style={{
              width: 34, height: 34, borderRadius: 8, border: 'none', cursor: 'pointer',
              background: p === selectedPage ? '#2563eb' : '#f1f5f9',
              color: p === selectedPage ? 'white' : '#64748b',
              fontWeight: 700, fontSize: 13,
            }}>{p}</button>
          ))}
        </div>
      )}

      {/* Document mock + grid */}
      <div style={{
        background: 'white',
        border: '1.5px solid #e2e8f0',
        borderRadius: 10,
        aspectRatio: '0.707',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      }}>
        {/* Decorative lines */}
        <div style={{ padding: '6% 8%', height: '100%', display: 'flex', flexDirection: 'column', gap: '2%', pointerEvents: 'none' }}>
          {[70,90,85,80,60,0,75,82,68,55].map((w, i) => (
            <div key={i} style={{ height: i === 5 ? '10%' : '2%', background: '#f1f5f9', borderRadius: 3, width: `${w}%` }} />
          ))}
        </div>

        {/* 3×3 grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)',
          gap: 3, padding: 6,
        }}>
          {ZONE_LABELS.map((label, i) => {
            const active = selectedZone === i;
            return (
              <button
                key={i}
                title={label}
                onClick={() => onPlacement(i, localScale)}
                style={{
                  border: active ? '2.5px solid #2563eb' : '1.5px dashed #cbd5e1',
                  borderRadius: 8,
                  background: active ? 'rgba(37,99,235,0.08)' : 'rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s',
                  padding: 4,
                  position: 'relative',
                  overflow: 'visible',
                }}
              >
                {active && hasSig ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img
                      src={signatureDataUrl}
                      style={{ width: sigW, maxWidth: '95%', objectFit: 'contain', display: 'block', pointerEvents: 'none' }}
                      alt="sig"
                    />
                    {/* Resize handle */}
                    <div
                      onMouseDown={onResizeStart}
                      onTouchStart={onResizeStart}
                      style={{
                        position: 'absolute', bottom: -6, right: -6,
                        width: 18, height: 18, background: '#2563eb',
                        borderRadius: '50%', cursor: 'ew-resize',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(37,99,235,0.4)',
                        zIndex: 10,
                        fontSize: 9, color: 'white', fontWeight: 700,
                      }}
                      title="Drag to resize"
                    >↔</div>
                  </div>
                ) : active ? (
                  <div style={{ width: 10, height: 10, background: '#2563eb', borderRadius: '50%', opacity: 0.5 }} />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status bar */}
      <div style={{
        marginTop: 10, padding: '10px 14px',
        background: hasSig && selectedZone >= 0 ? '#eff6ff' : '#f8fafc',
        border: `1.5px solid ${hasSig && selectedZone >= 0 ? '#93c5fd' : '#e2e8f0'}`,
        borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center' }}><MapPin size={16} color="#2563eb" /></span>
          <span style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>
            {hasSig && selectedZone >= 0
              ? <><strong style={{ color: '#2563eb' }}>{ZONE_LABELS[selectedZone]}</strong> · page {selectedPage}</>
              : !hasSig ? 'Draw signature first, then tap a zone'
              : 'Tap a zone to place your signature'}
          </span>
        </div>
        {hasSig && (
          <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>
            drag ↔ to resize
          </span>
        )}
      </div>
    </div>
  );
}
