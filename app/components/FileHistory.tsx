'use client';
import { useEffect, useState } from 'react';
import { addWatermarkToBlob, blobToDataUrl } from '../utils/watermark';

export interface HistoryItem {
  id: string;
  name: string;
  date: string;   // ISO
  size: number;
  dataUrl: string; // CLEAN PDF (no watermark)
  type: 'fill' | 'sign';
}

const STORAGE_KEY = 'signmypdf_history_v2';
const MAX_ITEMS = 20;
const FREE_TTL  = 7  * 24 * 60 * 60 * 1000;  // 7 days
const PRO_TTL   = 365 * 24 * 60 * 60 * 1000; // 1 year

export function saveToHistory(name: string, size: number, dataUrl: string, type: 'fill' | 'sign' = 'fill') {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: HistoryItem[] = raw ? JSON.parse(raw) : [];
    const item: HistoryItem = {
      id: Math.random().toString(36).slice(2),
      name: name.replace(/^(signed|filled)-/, ''),
      date: new Date().toISOString(),
      size,
      dataUrl,
      type,
    };
    const updated = [item, ...list].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

export function getHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function clearExpiredHistory(isPro: boolean) {
  try {
    const ttl = isPro ? PRO_TTL : FREE_TTL;
    const list = getHistory().filter(item => Date.now() - new Date(item.date).getTime() < ttl);
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

interface Props {
  hasSubscription?: boolean;
  onShowPricing?: () => void;
}

export default function FileHistory({ hasSubscription = false, onShowPricing }: Props) {
  const [list, setList] = useState<HistoryItem[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    const load = () => {
      const ttl = hasSubscription ? PRO_TTL : FREE_TTL;
      const all = getHistory();
      const filtered = all.filter(item => Date.now() - new Date(item.date).getTime() < ttl);
      setList(filtered);
    };
    load();
    window.addEventListener('signmypdf:saved', load);
    return () => window.removeEventListener('signmypdf:saved', load);
  }, [hasSubscription]);

  if (list.length === 0) return null;

  const handleDownload = async (item: HistoryItem) => {
    setDownloading(item.id);
    try {
      if (hasSubscription) {
        // Pro: download clean PDF directly
        const a = document.createElement('a');
        a.href = item.dataUrl;
        a.download = item.name;
        a.click();
      } else {
        // Free: add watermark before download
        const res = await fetch(item.dataUrl);
        const blob = await res.blob();
        const watermarkedBlob = await addWatermarkToBlob(blob);
        const url = URL.createObjectURL(watermarkedBlob);
        const a = document.createElement('a');
        a.href = url;
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
    <div style={{
      background: '#f8fafc',
      borderRadius: 12,
      padding: '16px 20px',
      marginTop: 32,
      marginBottom: 24,
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
      }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
          Recent documents
        </span>
        <span style={{ fontSize: 13, color: '#64748b' }}>
          {list.length} file{list.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
        {list.map((item) => {
          const isDownloading = downloading === item.id;
          return (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'white',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 20 }}>📄</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#1e293b',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {fmt(item.size)} · {timeAgo(item.date)}
                    <span style={{
                      fontSize: 10,
                      fontWeight: 600,
                      background: item.type === 'sign' ? '#eff6ff' : '#f0fdf4',
                      color: item.type === 'sign' ? '#2563eb' : '#16a34a',
                      padding: '1px 6px',
                      borderRadius: 4,
                    }}>
                      {item.type === 'sign' ? 'signed' : 'filled'}
                    </span>
                    {!hasSubscription && (
                      <span style={{ color: '#d97706', fontSize: 10 }}>watermark</span>
                    )}
                  </div>
                </div>
              </div>

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
            </div>
          );
        })}
      </div>

      {!hasSubscription && (
        <p style={{ fontSize: 12, color: '#64748b', marginTop: 12, textAlign: 'center' }}>
          Free plan: downloads include watermark.{' '}
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
              Upgrade for clean downloads
            </button>
          )}
        </p>
      )}

      {!hasSubscription && (
        <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, textAlign: 'center' }}>
          History is kept for 7 days on the free plan (1 year on Pro)
        </p>
      )}
    </div>
  );
}
