'use client';

import { useState, useRef, useEffect } from 'react';
import Logo from './Logo';

interface NavHeaderProps {
  activeTool?: 'sign' | 'fill';
  onShowPricing?: () => void;
}

export default function NavHeader({ activeTool, onShowPricing }: NavHeaderProps) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    const hasToken = !!localStorage.getItem('signmypdf_dashboard_token');
    setIsPro(hasToken);
  }, []);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMenu = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setToolsOpen(true);
  };

  const closeMenu = () => {
    closeTimer.current = setTimeout(() => setToolsOpen(false), 180);
  };

  return (
    <header className="header">
      <div className="header-inner">
        <a href="/" className="logo"><Logo /></a>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Tools dropdown */}
          <div
            style={{ position: 'relative' }}
            onMouseEnter={openMenu}
            onMouseLeave={closeMenu}
          >
            <button
              className="nav-tools-btn"
              onClick={() => setToolsOpen(o => !o)}
              aria-haspopup="true"
              aria-expanded={toolsOpen}
            >
              Tools <span style={{ fontSize: 10, marginLeft: 2 }}>▾</span>
            </button>

            {toolsOpen && (
              <div className="nav-dropdown" onMouseEnter={openMenu} onMouseLeave={closeMenu}>
                <a
                  href="/"
                  className={`nav-dropdown-item${activeTool === 'sign' ? ' nav-dropdown-item--active' : ''}`}
                >
                  <span>✍️</span>
                  <span>Sign PDF</span>
                </a>
                <a
                  href="/fill"
                  className={`nav-dropdown-item${activeTool === 'fill' ? ' nav-dropdown-item--active' : ''}`}
                >
                  <span>📝</span>
                  <span>Fill PDF Form</span>
                </a>
              </div>
            )}
          </div>

          <a href="/blog" style={{
            color: '#374151', textDecoration: 'none', fontSize: 14, fontWeight: 600,
            padding: '6px 12px', borderRadius: 8, letterSpacing: -0.1,
            transition: 'color 0.15s'
          }}>
            Blog
          </a>

          {isPro && <div style={{ width: 1, height: 20, background: '#e2e8f0', margin: '0 6px' }} />}

          {isPro ? (
            <a href="/dashboard" style={{
              color: '#2563eb', textDecoration: 'none', fontSize: 14, fontWeight: 700,
              padding: '8px 16px', background: '#eff6ff', borderRadius: 10,
              display: 'flex', alignItems: 'center', gap: 6,
              border: '1px solid #bfdbfe'
            }}>
              <span style={{ fontSize: 12 }}>✦</span> My Account
            </a>
          ) : (
            <span className="header-tag">🔒 No registration required</span>
          )}
        </nav>
      </div>
    </header>
  );
}
