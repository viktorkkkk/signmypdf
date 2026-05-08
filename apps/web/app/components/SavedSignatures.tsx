'use client';

import { useEffect, useRef, useState } from 'react';
import { Save, Lock } from 'lucide-react';

const STORAGE_KEY = 'signmypdf_signatures';
const MAX = 10;
// Free users get 3 saved signatures before the paywall kicks in.
// Pro/subscribed users have no limit.
export const FREE_SIGNATURE_LIMIT = 3;

export interface SavedSig {
  id: string;
  dataUrl: string;
  label: string;
  date: string;
  type: 'draw' | 'type';
  text?: string; // For typed signatures
  font?: string; // For typed signatures
}

export function getSavedSigs(): SavedSig[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveSig(dataUrl: string, type: 'draw' | 'type' = 'draw', text?: string, font?: string): SavedSig {
  const list = getSavedSigs();
  const item: SavedSig = {
    id: Math.random().toString(36).slice(2),
    dataUrl,
    label: `Signature ${list.length + 1}`,
    date: new Date().toISOString(),
    type,
    text,
    font,
  };
  const updated = [item, ...list].slice(0, MAX);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return item;
}

export function deleteSig(id: string) {
  const list = getSavedSigs().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// Re-insert a previously deleted signature at the front of the list,
// preserving its original id/label/date so undo is a true revert.
function restoreSavedSig(sig: SavedSig) {
  const list = getSavedSigs();
  if (list.some(s => s.id === sig.id)) return;
  const updated = [sig, ...list].slice(0, MAX);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

interface Props {
  onSelect: (sig: SavedSig) => void;
  currentSig: string;
  currentType: 'draw' | 'type';
  currentText?: string;
  currentFont?: string;
  onSaveCurrent: () => void;
  selectedId?: string | null;
  hasSubscription: boolean;
  onShowPricing: () => void;
}

export default function SavedSignatures({ onSelect, currentSig, currentType, currentText, currentFont, onSaveCurrent, selectedId, hasSubscription, onShowPricing }: Props) {
  const [sigs, setSigs] = useState<SavedSig[]>([]);
  const [lastDeleted, setLastDeleted] = useState<SavedSig | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSigs(getSavedSigs());
    const handler = () => setSigs(getSavedSigs());
    window.addEventListener('signmypdf:sigs', handler);
    return () => {
      window.removeEventListener('signmypdf:sigs', handler);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  if (sigs.length === 0 && !currentSig) return null;

  // Hide the "SAVED SIGNATURES" header + thumbnail strip when nothing
  // is saved yet — only the "Save current" CTA stays so a fresh user
  // sees a single nudge, not an empty section. Header + list reappear
  // as soon as the first signature is saved.
  const hasSaved = sigs.length > 0;
  // Pro users get unlimited saves; free users hit the paywall on the
  // 4th attempt (i.e. once 3 signatures already exist in localStorage).
  const canSave = hasSubscription || sigs.length < FREE_SIGNATURE_LIMIT;

  const handleSaveClick = () => {
    if (canSave) onSaveCurrent();
    else onShowPricing();
  };

  const handleDelete = (sig: SavedSig) => {
    // Remove from storage immediately and surface a 3 s undo toast.
    // The parent re-renders via the 'signmypdf:sigs' event so the
    // thumbnail disappears straight away; undo restores the same
    // sig (same id/label/date) into the same front-of-list slot.
    deleteSig(sig.id);
    setLastDeleted(sig);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setLastDeleted(null), 3000);
    window.dispatchEvent(new Event('signmypdf:sigs'));
  };

  const handleUndo = () => {
    if (!lastDeleted) return;
    restoreSavedSig(lastDeleted);
    setLastDeleted(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    window.dispatchEvent(new Event('signmypdf:sigs'));
  };

  return (
    <div className="saved-sigs">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: hasSaved ? 'space-between' : 'flex-end' }}>
        {hasSaved && (
          <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Save size={12} /> Saved signatures
          </span>
        )}
        {currentSig && (
          <button
            onClick={handleSaveClick}
            style={{
              fontSize: 11, fontWeight: 600, color: canSave ? '#2563eb' : '#d97706',
              background: canSave ? '#eff6ff' : '#fffbeb',
              border: canSave ? '1px solid #bfdbfe' : '1px solid #fcd34d',
              borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {canSave ? (
              <>+ Save current</>
            ) : (
              <><Lock size={11} /> Save current</>
            )}
          </button>
        )}
      </div>

      {/* One-line caption explaining what the button does. The copy
          flips when the free limit is reached so the button + caption
          read together as a single CTA → upsell. */}
      {currentSig && (
        <p className="save-hint">
          {canSave ? 'Save for future use' : 'Pro: unlimited saves'}
        </p>
      )}

      {hasSaved && (
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, marginTop: 10 }}>
        {sigs.map(s => {
          const isSelected = selectedId === s.id || (!selectedId && currentSig === s.dataUrl && currentType === s.type);
          return (
          <div key={s.id} style={{
            border: isSelected ? '2px solid #2563eb' : '1.5px solid #e2e8f0',
            borderRadius: 10, padding: 8,
            background: isSelected ? '#eff6ff' : 'white',
            cursor: 'pointer', flexShrink: 0,
            minWidth: 100, textAlign: 'center', position: 'relative',
            transition: 'all 0.15s',
            boxShadow: isSelected ? '0 0 0 2px #bfdbfe' : 'none',
          }}
            onClick={() => onSelect(s)}
          >
            <img src={s.dataUrl} style={{ height: 32, maxWidth: 100, objectFit: 'contain' }} alt="saved" />
            <div style={{ fontSize: 10, color: isSelected ? '#2563eb' : '#94a3b8', marginTop: 4, fontWeight: isSelected ? 600 : 400 }}>{s.label}</div>
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(s); }}
              style={{
                position: 'absolute', top: 2, right: 4,
                background: 'none', border: 'none', color: '#cbd5e1',
                cursor: 'pointer', fontSize: 12, lineHeight: 1,
              }}
              title="Delete"
            >✕</button>
          </div>
        );})}
      </div>
      )}

      {lastDeleted && (
        <div className="signature-undo-toast" role="status">
          <span>Signature deleted</span>
          <button type="button" onClick={handleUndo}>Undo</button>
        </div>
      )}
    </div>
  );
}
