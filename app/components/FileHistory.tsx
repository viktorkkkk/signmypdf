'use client';

import { useEffect, useState } from 'react';

export interface HistoryItem {
  id: string;
  name: string;
  date: string;   // ISO
  size: number;   // bytes
  dataUrl: string; // base64 PDF
  free: boolean;  // first one is free
}

const STORAGE_KEY = 'signmypdf_history';
const MAX_ITEMS   = 10;

export function saveToHistory(name: string, size: number, dataUrl: string) {
  const raw = localStorage.getItem(STORAGE_KEY);
  const list: HistoryItem[] = raw ? JSON.parse(raw) : [];
  const isFree = list.length === 0;

  const item: HistoryItem = {
    id:      Math.random().toString(36).slice(2),
    name:    name.replace(/^signed-/, ''),
    date:    new Date().toISOString(),
    size,
    dataUrl,
    free:    isFree,
  };

  const updated = [item, ...list].slice(0, MAX_ITEMS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return item;
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
  onDownload: (item: HistoryItem, canDownload: boolean) => void;
}

export default function FileHistory({ hasSubscription = false, onDownload }: Props) {
  const [list, setList] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const load = () => {
      const raw = localStorage.getItem(STORAGE_KEY);
      setList(raw ? JSON.parse(raw) : []);
    };
    load();
    window.addEventListener('signmypdf:saved', load);
    return () => window.removeEventListener('signmypdf:saved', load);
  }, []);

  if (list.length === 0) return null;

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
          📂 Recent documents
        </span>
        <span style={{ fontSize: 13, color: '#64748b' }}>
          {list.length} file{list.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
        {list.map((item, index) => {
          // Most recent file can always be downloaded (just signed)
          // Older files require subscription
          const canDownload = hasSubscription || index === 0;
          
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
                opacity: canDownload ? 1 : 0.7,
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
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    {fmt(item.size)} · {timeAgo(item.date)}
                    {!canDownload && (
                      <span style={{ color: '#dc2626', marginLeft: 8, fontWeight: 500 }}>
                        🔒 Требуется подписка
                      </span>
                    )}
                    {canDownload && index === 0 && !hasSubscription && (
                      <span style={{ color: '#22c55e', marginLeft: 8, fontWeight: 500 }}>
                        ✓ Доступно
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => onDownload(item, canDownload)}
                style={{
                  padding: '8px 16px',
                  background: canDownload ? '#2563eb' : '#f1f5f9',
                  color: canDownload ? 'white' : '#94a3b8',
                  border: canDownload ? 'none' : '1px solid #e2e8f0',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {canDownload ? 'Download' : '🔒'}
              </button>
            </div>
          );
        })}
      </div>
      
      {!hasSubscription && list.length > 1 && (
        <p style={{ fontSize: 12, color: '#64748b', marginTop: 12, textAlign: 'center' }}>
          🔒 Только последний файл доступен для скачивания.{' '}
          <button
            onClick={() => onDownload(list[0], false)}
            style={{
              background: 'none',
              border: 'none',
              color: '#2563eb',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            Оформить подписку для доступа ко всем
          </button>
        </p>
      )}
    </div>
  );
}
