'use client';
import { useEffect, useState } from 'react';
import { addWatermarkToBlob } from '../utils/watermark';
import {
  saveHistoryBlob,
  getHistoryBlob,
  deleteHistoryBlob,
  pruneHistoryBlobs,
} from '../utils/historyBlobs';

export interface HistoryItem {
  id: string;
  name: string;
  date: string;
  size: number;
  /** True if the blob is in IndexedDB (new path, since 2026-05-01). */
  hasBlob?: boolean;
  /** Legacy base64 data URL (pre-2026-05-01 entries). Reads still honored. */
  dataUrl?: string;
  type: 'fill' | 'sign' | 'protect' | 'merge' | 'compress';
  hadWatermark?: boolean;  // whether watermark was on original download
}

const STORAGE_KEY = 'signmypdf_history_v2';
const MAX_ITEMS   = 20;
const FREE_TTL    = 24  * 60 * 60 * 1000;   // 24 hours
const PRO_TTL     = 365 * 24 * 60 * 60 * 1000; // 1 year

/**
 * Persist a finished PDF to history.
 *
 * Stores the Blob in IndexedDB (no quota issues for typical PDFs) and
 * the metadata-only HistoryItem in localStorage. The old base64-in-
 * localStorage path was the cause of the "storage full" chip flashing
 * on freshly-created files: a single 3-4 MB merge inflated to ~5 MB
 * base64, exhausting the per-origin localStorage quota immediately.
 *
 * Returns nothing — failures fire the `signmypdf:quota_exceeded` event
 * for the UI to surface a banner. The corresponding HistoryItem is
 * still added (metadata-only) so the user sees the file existed even
 * if the blob couldn't be stored.
 */
export async function saveToHistory(
  name: string,
  size: number,
  blob: Blob,
  type: 'fill' | 'sign' | 'protect' | 'merge' | 'compress' = 'fill',
  hadWatermark = false,
): Promise<void> {
  try {
    const id = Math.random().toString(36).slice(2);
    const cleanedName = name.replace(/^(signed-|filled-|protected-|merged-|compressed-)+/g, '');

    // Try to put the blob in IndexedDB first. If this fails (private mode,
    // IDB quota), the item is still recorded but stays locked.
    const hasBlob = await saveHistoryBlob(id, blob);

    const item: HistoryItem = {
      id,
      name: cleanedName,
      date: new Date().toISOString(),
      size,
      hasBlob,
      type,
      hadWatermark,
    };

    const raw = localStorage.getItem(STORAGE_KEY);
    const list: HistoryItem[] = raw ? JSON.parse(raw) : [];
    const updated = [item, ...list].slice(0, MAX_ITEMS);

    // Anything that fell off the MAX_ITEMS tail can have its blob evicted.
    const dropped = list.slice(MAX_ITEMS - 1);
    for (const old of dropped) {
      if (old.id !== id) deleteHistoryBlob(old.id).catch(() => {});
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Even metadata-only failed — extremely rare. Tell the UI to show
      // the quota banner.
      window.dispatchEvent(new Event('signmypdf:quota_exceeded'));
    }

    if (!hasBlob) {
      window.dispatchEvent(new Event('signmypdf:quota_exceeded'));
    }
  } catch {}
}

export function getHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function clearExpiredHistory() {
  try {
    const list = getHistory().filter(
      item => Date.now() - new Date(item.date).getTime() < PRO_TTL,
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    // Prune any IDB blobs whose metadata is no longer in the list.
    pruneHistoryBlobs(new Set(list.map(i => i.id))).catch(() => {});
  } catch {}
}

function fmt(bytes: number) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}

function freeTimeLeft(iso: string): string | null {
  const ms = FREE_TTL - (Date.now() - new Date(iso).getTime());
  if (ms <= 0) return null;
  const totalMin = Math.ceil(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `Available for ${h}h ${m}m`;
  return `Available for ${m}m`;
}

interface Props {
  hasSubscription?: boolean;
  onShowPricing?: () => void;
  showDlHint?: boolean; // show "available 24h" banner above list
}

export default function FileHistory({ hasSubscription = false, onShowPricing, showDlHint = false }: Props) {
  const [list, setList]               = useState<HistoryItem[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [showQuotaOffer, setShowQuotaOffer] = useState(false);
  const [quotaDismissed, setQuotaDismissed] = useState(false);
  const [, forceUpdate]               = useState(0);

  useEffect(() => {
    const load = () => {
      const all = getHistory();
      setList(all);
    };
    load();
    window.addEventListener('signmypdf:saved', load);
    window.addEventListener('signmypdf:quota_exceeded', () => setShowQuotaOffer(true));
    return () => {
      window.removeEventListener('signmypdf:saved', load);
    };
  }, [hasSubscription]);

  // Update timers every minute
  useEffect(() => {
    const id = setInterval(() => forceUpdate(n => n + 1), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  if (list.length === 0 && !showQuotaOffer) return null;

  // Locked = no data we can serve OR (free user AND TTL exceeded). The
  // "no data" branch is what surfaces the storage-full chip in the UI;
  // the TTL branch surfaces the Expired chip.
  const hasData = (item: HistoryItem) => !!item.hasBlob || !!item.dataUrl;

  const isLocked = (item: HistoryItem): boolean => {
    if (!hasData(item)) return true;
    if (hasSubscription) return false;
    return Date.now() - new Date(item.date).getTime() >= FREE_TTL;
  };

  const fetchItemBlob = async (item: HistoryItem): Promise<Blob | null> => {
    if (item.hasBlob) {
      const b = await getHistoryBlob(item.id);
      if (b) return b;
    }
    if (item.dataUrl) {
      // Legacy entries (pre-2026-05-01) used base64 data URLs.
      const res = await fetch(item.dataUrl);
      return res.blob();
    }
    return null;
  };

  const handleDownload = async (item: HistoryItem) => {
    if (!hasData(item)) return;
    setDownloading(item.id);
    let createdUrl: string | null = null;
    try {
      const baseBlob = await fetchItemBlob(item);
      if (!baseBlob) return;
      const finalBlob = (hasSubscription || !item.hadWatermark)
        ? baseBlob
        : await addWatermarkToBlob(baseBlob);
      createdUrl = URL.createObjectURL(finalBlob);
      const a = document.createElement('a');
      a.href = createdUrl;
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error('Download error', e);
    } finally {
      if (createdUrl) setTimeout(() => URL.revokeObjectURL(createdUrl as string), 5000);
      setDownloading(null);
    }
  };

  return (
    <div className="file-history-wrap">

      {/* Quota offer banner */}
      {showQuotaOffer && !quotaDismissed && (
        <div style={{
          background: '#fff7ed',
          border: '1.5px solid #fed7aa',
          borderRadius: 12,
          padding: '14px 20px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <div style={{ fontSize: 14, color: '#92400e', fontWeight: 500 }}>
            You have used your free storage
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {onShowPricing && (
              <button
                onClick={onShowPricing}
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Upgrade to Pro &mdash; $7.50/mo &rarr;
              </button>
            )}
            <button
              onClick={() => setQuotaDismissed(true)}
              style={{
                padding: '8px 14px',
                background: 'transparent',
                color: '#64748b',
                border: '1.5px solid #cbd5e1',
                borderRadius: 8,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Continue without history
            </button>
          </div>
        </div>
      )}

      {list.length > 0 && (
        <div style={{
          background: '#f8fafc',
          borderRadius: 12,
          padding: '16px 20px',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: showDlHint && !hasSubscription ? 10 : 16,
          }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
              Recent documents
            </span>
            <span style={{ fontSize: 13, color: '#64748b' }}>
              {list.length} file{list.length !== 1 ? 's' : ''}
            </span>
          </div>

          {showDlHint && !hasSubscription && (
            <div style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: 13, color: '#1e40af' }}>
                ✓ File saved &middot; Available for re-download for <strong>24h</strong>
              </span>
              {onShowPricing && (
                <button
                  onClick={onShowPricing}
                  style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }}
                >
                  Keep files forever →
                </button>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
            {list.map(item => {
              const locked       = isLocked(item);
              const isDownloading = downloading === item.id;
              const timeLeft     = !hasSubscription && !locked ? freeTimeLeft(item.date) : null;
              const noData       = !hasData(item);

              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: locked ? '#fafafa' : 'white',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    opacity: locked ? 0.7 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 20 }}>{locked ? '\uD83D\uDD12' : '\uD83D\uDCC4'}</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: locked ? '#94a3b8' : '#1e293b',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {fmt(item.size)} &middot; {timeAgo(item.date)}
                        <span style={{
                          fontSize: 10,
                          fontWeight: 600,
                          background:
                            item.type === 'sign' ? '#eff6ff'
                            : item.type === 'fill' ? '#f0fdf4'
                            : item.type === 'merge' ? '#eef2ff'
                            : item.type === 'compress' ? '#ecfeff'
                            : '#fef3c7',
                          color:
                            item.type === 'sign' ? '#2563eb'
                            : item.type === 'fill' ? '#16a34a'
                            : item.type === 'merge' ? '#4f46e5'
                            : item.type === 'compress' ? '#0891b2'
                            : '#b45309',
                          padding: '1px 6px',
                          borderRadius: 4,
                        }}>
                          {item.type === 'sign' ? 'signed'
                           : item.type === 'fill' ? 'filled'
                           : item.type === 'merge' ? 'merged'
                           : item.type === 'compress' ? 'compressed'
                           : 'protected'}
                        </span>
                        {!locked && !hasSubscription && (
                          <span style={{ color: '#16a34a', fontSize: 11, fontWeight: 500 }}>Available for 24 hours</span>
                        )}
                        {locked && !noData && (
                          <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 500 }}>Expired</span>
                        )}
                        {noData && (
                          <span style={{ color: '#d97706', fontSize: 11 }}>storage full</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {locked ? (
                    <button
                      onClick={onShowPricing}
                      style={{
                        padding: '8px 14px',
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Unlock with Pro
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDownload(item)}
                      disabled={isDownloading}
                      style={{
                        padding: '8px 16px',
                        background: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: isDownloading ? 'default' : 'pointer',
                        whiteSpace: 'nowrap',
                        opacity: isDownloading ? 0.7 : 1,
                      }}
                    >
                      {isDownloading ? '...' : 'Download'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {!hasSubscription && (
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 12, textAlign: 'center' }}>
              Free plan: files available for 24h.{' '}
              {onShowPricing && (
                <button
                  onClick={onShowPricing}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  Upgrade to Pro for 1-year access &rarr;
                </button>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
