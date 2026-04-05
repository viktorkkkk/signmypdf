'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'signmypdf_signatures';
const MAX = 5;

export interface SavedSig {
  id: string;
  dataUrl: string;
  label: string;
  date: string;
}

export function getSavedSigs(): SavedSig[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveSig(dataUrl: string): SavedSig {
  const list = getSavedSigs();
  const item: SavedSig = {
    id: Math.random().toString(36).slice(2),
    dataUrl,
    label: `Signature ${list.length + 1}`,
    date: new Date().toISOString(),
  };
  const updated = [item, ...list].slice(0, MAX);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return item;
}

export function deleteSig(id: string) {
  const list = getSavedSigs().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

interface Props {
  onSelect: (dataUrl: string) => void;
  currentSig: string;
  onSaveCurrent: () => void;
}

export default function SavedSignatures({ onSelect, currentSig, onSaveCurrent }: Props) {
  const [sigs, setSigs] = useState<SavedSig[]>([]);

  useEffect(() => {
    setSigs(getSavedSigs());
    const handler = () => setSigs(getSavedSigs());
    window.addEventListener('signmypdf:sigs', handler);
    return () => window.removeEventListener('signmypdf:sigs', handler);
  }, []);

  if (sigs.length === 0 && !currentSig) return null;

  return (
    <div className="saved-sigs">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          💾 Saved signatures
        </span>
        {currentSig && (
          <button
            onClick={onSaveCurrent}
            style={{
              fontSize: 11, fontWeight: 600, color: '#2563eb',
              background: '#eff6ff', border: '1px solid #bfdbfe',
              borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
            }}
          >
            + Save current
          </button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
        {sigs.map(s => (
          <div key={s.id} style={{
            border: '1.5px solid #e2e8f0', borderRadius: 10, padding: 8,
            background: 'white', cursor: 'pointer', flexShrink: 0,
            minWidth: 100, textAlign: 'center', position: 'relative',
            transition: 'border-color 0.15s',
          }}
            onClick={() => onSelect(s.dataUrl)}
          >
            <img src={s.dataUrl} style={{ height: 32, maxWidth: 100, objectFit: 'contain' }} alt="saved" />
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>{s.label}</div>
            <button
              onClick={(e) => { e.stopPropagation(); deleteSig(s.id); window.dispatchEvent(new Event('signmypdf:sigs')); }}
              style={{
                position: 'absolute', top: 2, right: 4,
                background: 'none', border: 'none', color: '#cbd5e1',
                cursor: 'pointer', fontSize: 12, lineHeight: 1,
              }}
              title="Delete"
            >✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
