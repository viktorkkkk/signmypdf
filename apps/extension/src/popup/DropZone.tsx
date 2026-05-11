import { useCallback, useRef, useState } from 'react';

interface Props {
  /** Called with a single File when the user drops or picks a PDF. */
  onFile: (file: File) => void;
  /** Disable interaction (e.g. while encoding the previous drop). */
  disabled?: boolean;
}

/**
 * Drop-zone for the popup. Native HTML drag/drop with a transparent
 * `<input type="file">` overlay so click-to-pick works without us
 * having to wire `Programmatic` openers. PDF-only via the `accept`
 * attribute; oversized / wrong-type guards live in fileTransfer.ts
 * so this component stays presentational.
 */
export function DropZone({ onFile, disabled = false }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files?.[0];
      if (file) onFile(file);
    },
    [onFile, disabled],
  );

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFile(file);
      // Reset so the same file can be re-selected after an error.
      e.target.value = '';
    },
    [onFile],
  );

  return (
    <label
      className={`dropzone${isDragging ? ' is-dragging' : ''}`}
      onDragEnter={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={onChange}
        disabled={disabled}
      />
      <div className="dropzone-icon" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      </div>
      <div className="dropzone-title">{isDragging ? 'Drop it here!' : 'Drop your PDF here'}</div>
      <div className="dropzone-sub">or click to choose a file</div>
    </label>
  );
}
