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
  onUpgrade: () => void;
}

export default function FileHistory({ onUpgrade }: Props) {
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
    <div className="history-wrap">
      <div className="history-header">
        <span className="history-title">📂 Recent documents</span>
        <span className="history-sub">{list.length} file{list.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="history-list">
        {list.map((item, i) => {
          const locked = !item.free;
          return (
            <div key={item.id} className={`history-item${locked ? ' locked' : ''}`}>
              <div className="history-icon">📄</div>
              <div className="history-meta">
                <div className="history-name">{item.name}</div>
                <div className="history-info">{fmt(item.size)} · {timeAgo(item.date)}</div>
              </div>
              {locked ? (
                <button className="history-lock-btn" onClick={onUpgrade}>
                  🔒 Upgrade
                </button>
              ) : (
                <a
                  href={item.dataUrl}
                  download={`signed-${item.name}`}
                  className="history-dl-btn"
                >
                  ⬇️ Download
                </a>
              )}
            </div>
          );
        })}
      </div>
      <p className="history-note">
        🔒 Free plan: 1 download per day · <button className="history-upgrade-link" onClick={onUpgrade}>Upgrade for unlimited access</button>
      </p>
    </div>
  );
}
