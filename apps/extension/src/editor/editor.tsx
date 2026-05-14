import { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CheckCircle2, FilePlus2, FileSignature, Loader2, Upload, X } from 'lucide-react';
import FillSignEditor from './FillSignEditor';
import {
  cleanupOldEntries,
  deletePdf,
  getPdf,
  putPdf,
} from '../lib/idbHandoff';

/**
 * Editor page — opened in a new tab by the toolbar icon click handler
 * or by the background's context-menu handler. URL carries an optional
 * `id=` query parameter pointing at the IDB record holding the PDF blob;
 * if missing, the empty-state dropzone lets the user pick a local file.
 *
 * Flow on mount:
 *   1. Sweep IDB records older than 1h (orphan cleanup if a previous
 *      session crashed before its beforeunload fired).
 *   2. If `id` is present, load the blob and hand it to FillSignEditor.
 *      Otherwise show the dropzone so the user can pick a PDF.
 *
 * Cleanup:
 *   - beforeunload deletes our IDB record best-effort.
 *   - background.ts ALSO deletes it on chrome.tabs.onRemoved, so a
 *     forced close still cleans up.
 *   - cleanupOldEntries on next editor mount catches anything else.
 */
function EditorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const handoffIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await cleanupOldEntries();
      } catch (e) {
        console.warn('[Sign PDF] handoff sweep failed:', e);
      }
      const id = new URLSearchParams(window.location.search).get('id');
      if (!id) {
        if (!cancelled) setLoading(false);
        return;
      }
      handoffIdRef.current = id;
      try {
        const rec = await getPdf(id);
        if (cancelled) return;
        if (!rec) {
          setLoadError('This signing session has expired. Please pick a PDF again.');
          setLoading(false);
          return;
        }
        const blobFile = new File([rec.blob], rec.filename || 'document.pdf', {
          type: 'application/pdf',
        });
        setFile(blobFile);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        console.error('[Sign PDF] failed to load handoff:', e);
        setLoadError('Could not open the PDF. Try again.');
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // beforeunload best-effort cleanup. IDB ops are async, so we kick
  // them off and let the browser flush them on the way out; the
  // background's tabs.onRemoved + the 1h TTL sweep are the backstops.
  useEffect(() => {
    const handler = () => {
      const id = handoffIdRef.current;
      if (id) {
        deletePdf(id).catch(() => { /* best-effort */ });
      }
    };
    window.addEventListener('beforeunload', handler);
    window.addEventListener('pagehide', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
      window.removeEventListener('pagehide', handler);
    };
  }, []);

  /** Empty-state file picker — same shape as the popup's drop zone. */
  const handlePicked = useCallback(async (picked: File) => {
    if (picked.type !== 'application/pdf' && !picked.name.toLowerCase().endsWith('.pdf')) {
      setLoadError('Please choose a PDF file.');
      return;
    }
    setLoadError(null);
    try {
      // Register the locally-picked file in IDB so the standard cleanup
      // path catches it too (tabs.onRemoved on this tab, beforeunload
      // listener above).
      const id = await putPdf(picked, picked.name || 'document.pdf');
      handoffIdRef.current = id;
      setFile(picked);
    } catch (e) {
      console.error('[Sign PDF] local picker failed:', e);
      setLoadError('Could not load that PDF.');
    }
  }, []);

  /** Reset to empty state — drops the loaded PDF, clears the handoff
   *  IDB record, and brings back the dropzone. The FillSignEditor
   *  unmounts (because we set file=null) so all of its internal state
   *  — elements, savedSig, selection — disappears with it. */
  const resetToEmpty = useCallback(async () => {
    const id = handoffIdRef.current;
    handoffIdRef.current = null;
    if (id) {
      try { await deletePdf(id); } catch { /* best-effort */ }
    }
    setFile(null);
    setLoadError(null);
    setShowResetConfirm(false);
    setToastOpen(false);
  }, []);

  /** Top-bar "New PDF" button. Confirms before discarding work when
   *  the user has a PDF open. With no PDF loaded yet, it's a no-op. */
  const handleNewPdfClick = useCallback(() => {
    if (!file) return;
    setShowResetConfirm(true);
  }, [file]);

  /** Signed-PDF callback from FillSignEditor. We Object-URL the Blob
   *  and hand it to chrome.downloads. The output filename inherits the
   *  input name with a `-signed.pdf` suffix. After the download starts,
   *  raise the success toast — that's the only success affordance the
   *  user gets, so it both confirms the action and offers a shortcut
   *  to sign another PDF. */
  const onSignedDone = useCallback((blob: Blob) => {
    const downloadName = buildSignedFilename(file?.name);
    const url = URL.createObjectURL(blob);
    chrome.downloads.download(
      { url, filename: downloadName, saveAs: true },
      () => {
        // chrome.downloads consumes the blob URL synchronously; we can
        // revoke after a short delay so even slow disks aren't racing.
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
    );
    setToastOpen(true);
  }, [file?.name]);

  // Toast auto-dismiss timer.
  useEffect(() => {
    if (!toastOpen) return;
    const t = setTimeout(() => setToastOpen(false), 7000);
    return () => clearTimeout(t);
  }, [toastOpen]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const picked = e.dataTransfer.files?.[0];
    if (picked) handlePicked(picked);
  }, [handlePicked]);

  return (
    <div className="ext-root">
      <header className="ext-topbar">
        <div className="ext-topbar-inner">
          <div className="ext-topbar-left">
            <button
              type="button"
              className="ext-newpdf"
              onClick={handleNewPdfClick}
              disabled={!file}
              aria-label="Load a new PDF"
              title="Load a new PDF"
            >
              <FilePlus2 size={16} strokeWidth={2} />
              <span>New PDF</span>
            </button>
            <div className="ext-brand">
              <FileSignature size={20} strokeWidth={2.2} />
              <span>Sign PDF</span>
            </div>
          </div>
          <span className="ext-tag">Free · No signup · Files stay private</span>
        </div>
      </header>

      <main className="ext-main">
        {loading && (
          <div className="ext-state">
            <Loader2 className="ext-spin" size={28} />
            <span>Loading…</span>
          </div>
        )}

        {!loading && !file && (
          <label
            className={`ext-drop${dragOver ? ' ext-drop--over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => {
                const picked = e.target.files?.[0];
                e.target.value = '';
                if (picked) handlePicked(picked);
              }}
            />
            <Upload size={36} strokeWidth={1.6} />
            <span className="ext-drop-title">Drop a PDF here</span>
            <span className="ext-drop-hint">or click to choose · stays on your device</span>
            {loadError && <span className="ext-drop-error" role="alert">{loadError}</span>}
          </label>
        )}

        {!loading && file && (
          <FillSignEditor file={file} onDone={onSignedDone} />
        )}
      </main>

      <footer className="ext-foot">
        Made by{' '}
        <a href="https://signmypdf.io" target="_blank" rel="noopener noreferrer">
          SignMyPDF · signmypdf.io
        </a>
      </footer>

      {showResetConfirm && (
        <div
          className="ext-modal"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowResetConfirm(false)}
        >
          <div className="ext-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Discard changes and load a new PDF?</h3>
            <p>Your placed text, dates and signatures will be lost.</p>
            <div className="ext-modal-actions">
              <button
                type="button"
                className="ext-btn ext-btn-secondary"
                onClick={() => setShowResetConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ext-btn ext-btn-danger"
                onClick={resetToEmpty}
                autoFocus
              >
                Discard & Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {toastOpen && (
        <div className="ext-toast" role="status" aria-live="polite">
          <div className="ext-toast-icon">
            <CheckCircle2 size={20} strokeWidth={2.2} />
          </div>
          <div className="ext-toast-body">
            <strong>Signed PDF downloaded</strong>
            <span>Check your Downloads folder</span>
            <button
              type="button"
              className="ext-toast-cta"
              onClick={resetToEmpty}
            >
              Sign another PDF
            </button>
          </div>
          <button
            type="button"
            className="ext-toast-close"
            onClick={() => setToastOpen(false)}
            aria-label="Dismiss"
          >
            <X size={14} strokeWidth={2.4} />
          </button>
        </div>
      )}
    </div>
  );
}

function buildSignedFilename(inputName: string | undefined): string {
  if (!inputName) return 'signed-document.pdf';
  const trimmed = inputName.replace(/\.pdf$/i, '');
  return `${trimmed || 'signed-document'}-signed.pdf`;
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<EditorPage />);
