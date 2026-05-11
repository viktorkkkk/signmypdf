import { StrictMode, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DropZone } from './DropZone';
import { stashPdfForHandoff } from '../lib/fileTransfer';
import {
  CHROME_LANDING_URL,
  MAX_PDF_BYTES,
  SIGN_URL,
  SITE_ORIGIN,
} from '../lib/constants';
import { track } from '../lib/analytics';

import './popup.css';

type Status =
  | { kind: 'idle' }
  | { kind: 'busy'; message: string }
  | { kind: 'error'; message: string; helpLink?: string }
  | { kind: 'success'; message: string };

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function Popup() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  useEffect(() => {
    track('extension_popup_opened').catch(() => {});
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setStatus({ kind: 'busy', message: `Encoding ${file.name}…` });
    const result = await stashPdfForHandoff(file, 'popup');
    if (!result.ok) {
      if (result.reason === 'too-large') {
        await track('extension_pdf_too_large', { size: file.size });
        setStatus({
          kind: 'error',
          message: `File is ${formatBytes(file.size)} — extension limit is ${formatBytes(MAX_PDF_BYTES)}.`,
          helpLink: SITE_ORIGIN + '/sign',
        });
        return;
      }
      if (result.reason === 'not-pdf') {
        setStatus({
          kind: 'error',
          message: 'Only PDF files are supported in the extension.',
        });
        return;
      }
      setStatus({
        kind: 'error',
        message: 'Could not save the file to extension storage.',
        helpLink: SITE_ORIGIN + '/sign',
      });
      return;
    }

    await track('extension_pdf_dropped', { size: result.size });
    setStatus({ kind: 'success', message: 'Opening editor on signmypdf.io…' });

    try {
      await chrome.tabs.create({ url: SIGN_URL });
      // Closing the popup is best-effort — Chrome auto-closes on
      // some platforms once focus moves to the new tab, but we
      // call window.close() explicitly so the popup never lingers
      // showing a stale success state.
      window.close();
    } catch {
      setStatus({
        kind: 'error',
        message: 'Could not open a new tab. Please try again.',
      });
    }
  }, []);

  const isBusy = status.kind === 'busy';

  return (
    <>
      <div className="popup-header">
        <div className="popup-header-mark">S</div>
        <div>
          <div className="popup-title">Sign PDF Free</div>
          <div className="popup-sub">Drop a PDF, sign on signmypdf.io.</div>
        </div>
      </div>

      <DropZone onFile={handleFile} disabled={isBusy} />

      {status.kind === 'busy' && (
        <div className="status busy" role="status">
          <span className="spinner" aria-hidden="true" />
          {status.message}
        </div>
      )}
      {status.kind === 'error' && (
        <div className="status error" role="alert">
          {status.message}
          {status.helpLink && (
            <>
              {' '}
              <a href={status.helpLink} target="_blank" rel="noreferrer">
                Open signmypdf.io →
              </a>
            </>
          )}
        </div>
      )}
      {status.kind === 'success' && (
        <div className="status success" role="status">
          {status.message}
        </div>
      )}

      <div className="footer">
        <a href={CHROME_LANDING_URL} target="_blank" rel="noreferrer">
          About this extension
        </a>
      </div>
    </>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <Popup />
    </StrictMode>,
  );
}
