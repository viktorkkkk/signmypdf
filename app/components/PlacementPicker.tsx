'use client';

import { useState } from 'react';

export interface Placement {
  zone: number; // 0-8, row-major (0=top-left … 8=bottom-right)
}

interface Props {
  signatureDataUrl: string;
  fileName: string;
  totalPages: number;
  selectedPage: number;
  onPageChange: (p: number) => void;
  onPlacement: (zone: number) => void;
  selectedZone: number;
}

const ZONE_LABELS = [
  'Top left',    'Top center',    'Top right',
  'Middle left', 'Middle center', 'Middle right',
  'Bottom left', 'Bottom center', 'Bottom right',
];

// Map zone → PDF coordinates (x%, y% from bottom-left)
export function zoneToPdfCoords(zone: number, pageW: number, pageH: number) {
  const col = zone % 3;   // 0 1 2
  const row = Math.floor(zone / 3); // 0=top 1=mid 2=bottom
  const xPct = [0.05, 0.35, 0.65][col];
  // PDF y=0 is bottom; row 0=top means high y value
  const yPct = [0.82, 0.50, 0.12][row];
  return { x: xPct * pageW, y: yPct * pageH };
}

export default function PlacementPicker({
  signatureDataUrl, fileName, totalPages,
  selectedPage, onPageChange, onPlacement, selectedZone,
}: Props) {
  return (
    <div>
      {/* Page selector */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Sign on page:</span>
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

      {/* Page visual + grid */}
      <div style={{ position: 'relative' }}>
        {/* Document representation */}
        <div style={{
          background: 'white',
          border: '1.5px solid #e2e8f0',
          borderRadius: 10,
          padding: '0',
          aspectRatio: '0.707', // A4 ratio
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        }}>
          {/* Page header lines (decorative) */}
          <div style={{ padding: '8% 10%', height: '100%', display: 'flex', flexDirection: 'column', gap: '3%' }}>
            <div style={{ height: '3%', background: '#e2e8f0', borderRadius: 4, width: '70%' }} />
            <div style={{ height: '2%', background: '#f1f5f9', borderRadius: 4, width: '90%' }} />
            <div style={{ height: '2%', background: '#f1f5f9', borderRadius: 4, width: '85%' }} />
            <div style={{ height: '2%', background: '#f1f5f9', borderRadius: 4, width: '88%' }} />
            <div style={{ height: '2%', background: '#f1f5f9', borderRadius: 4, width: '60%' }} />
            <div style={{ flex: 1 }} />
            <div style={{ height: '2%', background: '#f1f5f9', borderRadius: 4, width: '75%' }} />
            <div style={{ height: '2%', background: '#f1f5f9', borderRadius: 4, width: '80%' }} />
          </div>

          {/* 3×3 clickable grid overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)',
            gap: 4, padding: 8,
          }}>
            {ZONE_LABELS.map((label, i) => {
              const active = selectedZone === i;
              return (
                <button
                  key={i}
                  title={label}
                  onClick={() => onPlacement(i)}
                  style={{
                    border: active ? '2.5px solid #2563eb' : '2px dashed #cbd5e1',
                    borderRadius: 8,
                    background: active ? 'rgba(37,99,235,0.12)' : 'rgba(255,255,255,0.4)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s',
                    padding: 0,
                    position: 'relative',
                  }}
                >
                  {active && signatureDataUrl ? (
                    <img
                      src={signatureDataUrl}
                      style={{ maxWidth: '90%', maxHeight: '70%', objectFit: 'contain', pointerEvents: 'none' }}
                      alt="sig"
                    />
                  ) : active ? (
                    <div style={{ width: 8, height: 8, background: '#2563eb', borderRadius: '50%' }} />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Page label */}
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
            Page {selectedPage} of {totalPages}
          </span>
        </div>
      </div>

      {/* Selected zone label */}
      <div style={{
        marginTop: 12, padding: '10px 16px',
        background: selectedZone >= 0 ? '#eff6ff' : '#f8fafc',
        border: `1.5px solid ${selectedZone >= 0 ? '#93c5fd' : '#e2e8f0'}`,
        borderRadius: 10,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 18 }}>📍</span>
        <span style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>
          {selectedZone >= 0
            ? <>Signature will be placed at: <strong style={{ color: '#2563eb' }}>{ZONE_LABELS[selectedZone]}</strong></>
            : 'Tap a zone to place your signature'}
        </span>
      </div>
    </div>
  );
}
