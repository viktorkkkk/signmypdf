'use client';
import { useEffect, useState } from 'react';
import { addWatermarkToBlob, blobToDataUrl } from '../utils/watermark';

export interface HistoryItem {
  id: string;
  name: string;
  date: string;
  size: number;
  dataUrl?: string;        // absent if quota exceeded
  type: 'fill' | 'sign' | 'protect';
  hadWatermark?: boolean;  // whether watermark was on original download
}

const STORAGE_KEY = 'signmypdf_history_v2';
const MAX_ITEMS   = 20;
const FREE_TTL    = 24  * 60 * 60 * 1000;   // 24 hours
const PRO_TTL     = 365 * 24 * 60 * 60 * 1000; // 1 year

export function saveToHistory(
  name: string,
  size: number,
  dataUrl: string,
  type: 'fill' | 'sign' | 'protect' = 'fill',
  hadWatermark = false,
) {
  try {
    const raw  = localStorage.getItem(STORAGE_KEY);
    const list: HistoryItem[] = raw ? JSON.parse(raw) : [];
    const item: HistoryItem = {
      id: Math.random().toString(36).slice(2),
      name: name.replace(/^(signed-|filled-|protected-)+/g, ''),
      date: new Date().toISOString(),
      size,
      dataUrl,
      type,
      hadWatermark,
    };
    try {
      const updated = [item, ...list].slice(0, MAX_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (quotaErr) {
      // Quota exceeded — save metadata only (no dataUrl)
      const metaItem: HistoryItem = { ...item, dataUrl: undefined };
      const updated = [metaItem, ...list].slice(0, MAX_ITEMS);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
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

  const isLocked = (item: HistoryItem): boolean => {
    if (!item.dataUrl) return true; // metadata-only
    if (hasSubscription) return false;
    return Date.now() - new Date(item.date).getTime() >= FREE_TTL;
  };

  const handleDownload = async (item: HistoryItem) => {
    if (!item.dataUrl) return;
    setDownloading(item.id);
    try {
      if (hasSubscription || !item.hadWatermark) {
        // Pro or originally clean: serve clean PDF
        const a = document.createElement('a');
        a.href = item.dataUrl;
        a.download = item.name;
        a.click();
      } else {
        // Free + had watermark: re-add watermark before download
        const res  = await fetch(item.dataUrl);
        const blob = await res.blob();
        const watermarkedBlob = await addWatermarkToBlob(blob);
        const url  = URL.createObjectURL(watermarkedBlob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = item.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
    } catch (e) {
      console.error('Download error', e);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div style={{ marginTop: 32, marginBottom: 24 }}>

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
              const noData       = !item.dataUrl;

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
                            : '#fef3c7',
                          color:
                            item.type === 'sign' ? '#2563eb'
                            : item.type === 'fill' ? '#16a34a'
                            : '#b45309',
                          padding: '1px 6px',
                          borderRadius: 4,
                        }}>
                          {item.type === 'sign' ? 'signed' : item.type === 'fill' ? 'filled' : 'protected'}
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
