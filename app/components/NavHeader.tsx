'use client';

import { useState, useRef } from 'react';
import Logo from './Logo';

interface NavHeaderProps {
  activeTool?: 'sign' | 'fill';
}

export default function NavHeader({ activeTool }: NavHeaderProps) {
  const [toolsOpen, setToolsOpen] = useState(false);
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
        <nav style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
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

          <a href="/blog" style={{ color: '#475569', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
            Blog
          </a>
          <span className="header-tag">🔒 No registration required</span>
        </nav>
      </div>
    </header>
  );
}
