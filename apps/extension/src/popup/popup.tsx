import { useCallback, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FileSignature, Loader2, Upload } from 'lucide-react';
import { putPdf } from '../lib/idbHandoff';

/**
 * Popup — appears under the toolbar icon. Single job: accept a PDF
 * (drag-drop or click-to-choose), stash it in IndexedDB, ask the
 * background service worker to open the editor tab. The popup itself
 * does no signing — it's the entry gate.
 */
function Popup() {
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handFileToEditor = useCallback(async (file: File) => {
    if (busy) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please choose a PDF file.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const id = await putPdf(file, file.name || 'document.pdf');
      const response = await chrome.runtime.sendMessage({ type: 'openEditor', id });
      if (!response?.ok) {
        throw new Error(response?.error || 'Could not open editor.');
      }
      // Closing the popup is implicit — once the new tab opens and
      // takes focus the popup window closes on its own.
      window.close();
    } catch (e) {
      console.error('[Sign PDF] popup hand-off failed:', e);
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setBusy(false);
    }
  }, [busy]);

  const onDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handFileToEditor(file);
  }, [handFileToEditor]);

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) handFileToEditor(file);
  }, [handFileToEditor]);

  return (
    <div className="popup-root">
      <header className="popup-head">
        <FileSignature size={20} strokeWidth={2.2} />
        <h1>Sign PDF</h1>
      </header>

      <label
        className={`popup-drop${dragOver ? ' popup-drop--over' : ''}${busy ? ' popup-drop--busy' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={onChange}
          disabled={busy}
        />
        {busy ? (
          <>
            <Loader2 size={32} strokeWidth={1.6} className="popup-spin" />
            <span className="popup-drop-title">Opening editor…</span>
          </>
        ) : (
          <>
            <Upload size={32} strokeWidth={1.6} />
            <span className="popup-drop-title">Drop PDF here</span>
            <span className="popup-drop-hint">or click to choose</span>
          </>
        )}
      </label>

      {error && <div className="popup-error" role="alert">{error}</div>}

      <footer className="popup-foot">
        <span>Made by</span>{' '}
        <a href="https://signmypdf.io" target="_blank" rel="noopener noreferrer">
          SignMyPDF · signmypdf.io
        </a>
      </footer>
    </div>
  );
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<Popup />);
