'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { FileText, MousePointer2, PenLine } from 'lucide-react';
import { storePendingFile } from '../utils/pendingUpload';
import ChromeIcon from '../components/ChromeIcon';

interface Props {
  chromeStoreUrl: string;
  howItWorks: { n: number; title: string; body: string }[];
  whyUse: string[];
}

function track(name: string, params?: Record<string, string | number | boolean>) {
  try {
    (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag?.(
      'event',
      name,
      params || {},
    );
  } catch {
    // intentionally silent
  }
}

/**
 * Stage 5 PR 4 redesign — single-purpose page. The hero hosts a
 * working dropzone so visitors can try the product before installing,
 * plus an "Add to Chrome" CTA. Everything else (3-step how-it-works,
 * 4-point why list, final CTA) is compact support.
 *
 * No FAQ, no pricing tile, no marketing trust row — pricing lives at
 * /pricing, the dropzone IS the trust signal.
 */
export default function ChromeLandingClient({ chromeStoreUrl, howItWorks, whyUse }: Props) {
  const router = useRouter();
  const [isHanding, setIsHanding] = useState(false);

  useEffect(() => {
    track('chrome_landing_view');
  }, []);

  const installClicked = useCallback(() => {
    track('chrome_install_clicked');
  }, []);

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file || file.type !== 'application/pdf') return;
      setIsHanding(true);
      try {
        await storePendingFile(file);
        track('chrome_landing_pdf_dropped', { size: file.size });
        router.push('/sign?from=chrome-landing');
      } catch {
        setIsHanding(false);
      }
    },
    [router],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    noClick: true,
    useFsAccessApi: false,
  });

  return (
    <>
      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="container chrome-hero">
        <h1 className="chrome-h1">Sign PDF in your browser</h1>
        <p className="chrome-sub">Free · No signup · In seconds</p>

        <div
          {...getRootProps()}
          className={`chrome-hero-dropzone${isDragActive ? ' is-dragging' : ''}`}
        >
          <input {...getInputProps()} />
          <div className="chrome-hero-dz-icon" aria-hidden="true">
            <FileText size={48} strokeWidth={1.6} />
          </div>
          <p className="chrome-hero-dz-title">
            {isHanding ? 'Opening editor…' : isDragActive ? 'Drop it here!' : 'Drop your PDF here'}
          </p>
          <label className="chrome-hero-pick" aria-label="Choose a PDF file">
            Choose PDF
            <input
              type="file"
              accept="application/pdf,.pdf"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onDrop([file]);
                e.target.value = '';
              }}
              disabled={isHanding}
            />
          </label>
        </div>

        <div className="chrome-or">or</div>

        <a
          href={chromeStoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="chrome-install-card"
          onClick={installClicked}
        >
          <span className="chrome-install-icon" aria-hidden="true">
            <ChromeIcon size={48} />
          </span>
          <span className="chrome-install-text">
            <span className="chrome-install-title">Install Free Chrome Extension</span>
            <span className="chrome-install-sub">Free forever. No credit card.</span>
          </span>
        </a>
      </section>

      {/* ── How the extension works ────────────────────────── */}
      <section className="container chrome-section">
        <h2 className="chrome-h2">How the extension works</h2>
        <div className="chrome-steps">
          {howItWorks.map((s) => (
            <div key={s.n} className="chrome-step">
              <div className="chrome-step-num">{s.n}</div>
              <div className="chrome-step-screenshot" role="img" aria-label={`Screenshot ${s.n}: ${s.title}`}>
                <div className="chrome-screen-bar">
                  <span /><span /><span />
                </div>
                <div className="chrome-screen-placeholder-body">
                  {s.n === 1 && <ChromeIcon size={32} />}
                  {s.n === 2 && <MousePointer2 size={32} />}
                  {s.n === 3 && <PenLine size={32} />}
                  <span>[Screenshot {s.n}: {s.title}]</span>
                </div>
              </div>
              <h3 className="chrome-step-title">{s.title}</h3>
              <p className="chrome-step-body">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Why use the extension ──────────────────────────── */}
      <section className="container chrome-section chrome-why">
        <h2 className="chrome-h2">Why use the extension</h2>
        <ul className="chrome-why-list">
          {whyUse.map((item) => (
            <li key={item} className="chrome-why-item">
              <span className="chrome-why-check" aria-hidden="true">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Final CTA ──────────────────────────────────────── */}
      <section className="container chrome-section chrome-final">
        <a
          href={chromeStoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="chrome-install-card"
          onClick={installClicked}
        >
          <span className="chrome-install-icon" aria-hidden="true">
            <ChromeIcon size={48} />
          </span>
          <span className="chrome-install-text">
            <span className="chrome-install-title">Install Free Chrome Extension</span>
            <span className="chrome-install-sub">Free forever. No credit card.</span>
          </span>
        </a>
      </section>
    </>
  );
}
