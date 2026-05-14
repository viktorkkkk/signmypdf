import { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FileSignature, Loader2, Upload } from 'lucide-react';
import FillSignEditor from './FillSignEditor';
import {
  cleanupOldEntries,
  deletePdf,
  getPdf,
  putPdf,
} from '../lib/idbHandoff';

/**
 * Editor page — opened in a new tab by the popup or by the
 * background's context-menu handler. URL carries an `id=` query
 * parameter that points at the IDB record holding the PDF blob.
 *
 * Flow on mount:
 *   1. Sweep IDB records older than 1h (orphan cleanup if a previous
 *      session crashed before its beforeunload fired).
 *   2. Load the blob for ?id=…. If the param is missing or the record
 *      is gone, fall through to the empty state (a dropzone in case
 *      the user opens the editor directly without an upstream popup).
 *   3. Build a File object from the blob and hand it to FillSignEditor.
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

  /** Signed-PDF callback from FillSignEditor. We Object-URL the Blob
   *  and hand it to chrome.downloads. The output filename inherits the
   *  input name with a `-signed.pdf` suffix, falling back to a generic
   *  name when the input was unnamed. */
  const onSignedDone = useCallback((blob: Blob) => {
    const downloadName = buildSignedFilename(file?.name);
    const url = URL.createObjectURL(blob);
    chrome.downloads.download(
      { url, filename: downloadName, saveAs: true },
      (_downloadId) => {
        // chrome.downloads consumes the blob URL synchronously; we can
        // revoke after a short delay so even slow disks aren't racing.
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
    );
  }, [file?.name]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const picked = e.dataTransfer.files?.[0];
    if (picked) handlePicked(picked);
  }, [handlePicked]);

  return (
    <div className="ext-root">
      <header className="ext-topbar">
        <div className="ext-brand">
          <FileSignature size={20} strokeWidth={2.2} />
          <span>Sign PDF</span>
        </div>
        <span className="ext-tag">Standalone editor · no signup</span>
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
