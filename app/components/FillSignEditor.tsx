'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CalendarDays,
  Check,
  Download,
  FileSignature,
  Loader2,
  PenLine,
  SquareCheckBig,
  Type as TypeIcon,
  X,
} from 'lucide-react';
import SignatureCanvas from './SignatureCanvas';
import { applyFillSign, type FsElement } from '../utils/fillSignPdf';

type ToolId = 'text' | 'date' | 'signature' | 'checkbox' | 'initial';

interface ToolDef {
  id: ToolId;
  label: string;
  Icon: typeof TypeIcon;
}

const TOOLS: ToolDef[] = [
  { id: 'text',      label: 'Text',      Icon: TypeIcon },
  { id: 'date',      label: 'Date',      Icon: CalendarDays },
  { id: 'signature', label: 'Signature', Icon: FileSignature },
  { id: 'checkbox',  label: 'Checkbox',  Icon: SquareCheckBig },
  { id: 'initial',   label: 'Initial',   Icon: PenLine },
];

const DEFAULT_FONT_SIZE = 14;       // PDF points
const DEFAULT_TEXT_COLOR = '#0f172a';
const SIG_DEFAULT_W = 22;            // % of page width
const SIG_DEFAULT_H = 8;             // % of page height
const INI_DEFAULT_W = 10;            // %
const INI_DEFAULT_H = 6;             // %

const newId = () => `el-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const todayISO = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${d.getFullYear()}`;
};

interface PageInfo {
  index: number;        // 1-indexed
  width: number;        // CSS px
  height: number;       // CSS px
}

interface Props {
  file: File;
  defaultTool?: ToolId;
  hasSubscription?: boolean;
  /** Caller-provided counter increment + watermark logic. If false the
   *  editor renders without a watermark and assumes the caller already
   *  decided this is allowed. */
  addWatermark?: boolean;
  /** Fired after Done; receives the final Blob. Caller handles download
   *  / FileHistory / counter increment / paywall. */
  onDone?: (blob: Blob) => void;
  /** Fired on Done before the blob is generated, gives caller a chance
   *  to deny (e.g. show paywall instead of producing the watermarked
   *  output). Return false to abort. */
  onBeforeDone?: () => boolean | Promise<boolean>;
}

export default function FillSignEditor({
  file,
  defaultTool = 'text',
  hasSubscription,
  addWatermark = false,
  onDone,
  onBeforeDone,
}: Props) {
  const [tool, setTool] = useState<ToolId>(defaultTool);
  const [elements, setElements] = useState<FsElement[]>([]);
  const [pageInfos, setPageInfos] = useState<PageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signaturePanelOpen, setSignaturePanelOpen] = useState<{ kind: 'signature' | 'initial' } | null>(null);
  const [savedSignature, setSavedSignature] = useState<{ dataUrl: string; w: number; h: number } | null>(null);
  const [savedInitial, setSavedInitial] = useState<{ dataUrl: string; w: number; h: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState('');
  const [pendingPosition, setPendingPosition] = useState<{ page: number; x: number; y: number; tool: ToolId } | null>(null);
  const [processing, setProcessing] = useState(false);

  const pdfRef = useRef<unknown>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number; pageEl: HTMLElement } | null>(null);

  // Load PDF and render every page once. We render at the container's
  // current width — pages stay inside their respective .fse-page slot
  // and the document scrolls as one tall column.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        const buf = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
        if (cancelled) return;
        pdfRef.current = pdf;

        const containerWidth = containerRef.current?.clientWidth ?? 700;
        const targetWidth = Math.min(820, containerWidth);

        const infos: PageInfo[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = targetWidth / baseViewport.width;
          const viewport = page.getViewport({ scale });
          infos.push({ index: i, width: viewport.width, height: viewport.height });
        }
        if (cancelled) return;
        setPageInfos(infos);
        setLoading(false);

        // Render after DOM mounts the canvases.
        await new Promise(r => requestAnimationFrame(() => r(null)));
        if (cancelled) return;
        const dpr = window.devicePixelRatio || 1;
        for (const info of infos) {
          const canvas = canvasRefs.current.get(info.index);
          if (!canvas) continue;
          const page = await pdf.getPage(info.index);
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = info.width / baseViewport.width;
          const viewport = page.getViewport({ scale });
          canvas.width = viewport.width * dpr;
          canvas.height = viewport.height * dpr;
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          const ctx = canvas.getContext('2d')!;
          ctx.scale(dpr, dpr);
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;
          if (cancelled) return;
        }
      } catch (e) {
        if (!cancelled) {
          console.error('FillSignEditor PDF load:', e);
          setError('Could not open this PDF. Try a different file.');
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [file]);

  // ── Element CRUD ──────────────────────────────────────────────────────

  const addElement = useCallback((el: FsElement) => {
    setElements(prev => [...prev, el]);
  }, []);

  const updateElement = useCallback((id: string, patch: Partial<FsElement>) => {
    setElements(prev => prev.map(e => (e.id === id ? ({ ...e, ...patch } as FsElement) : e)));
  }, []);

  const removeElement = useCallback((id: string) => {
    setElements(prev => prev.filter(e => e.id !== id));
    setEditingId(curr => (curr === id ? null : curr));
  }, []);

  // ── Page click → place new element at clicked position ────────────────

  const handlePageClick = useCallback((page: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target instanceof HTMLElement && e.target.closest('.fse-element')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top)  / rect.height) * 100;

    if (tool === 'text') {
      setPendingPosition({ page, x: xPct, y: yPct, tool });
      setEditingDraft('');
      return;
    }
    if (tool === 'date') {
      const value = todayISO();
      addElement({
        id: newId(), type: 'date', page, x: xPct, y: yPct,
        value, fontSize: DEFAULT_FONT_SIZE, color: DEFAULT_TEXT_COLOR,
      });
      return;
    }
    if (tool === 'checkbox') {
      addElement({
        id: newId(), type: 'checkbox', page, x: xPct, y: yPct,
        checked: true, fontSize: 22, color: '#16a34a',
      });
      return;
    }
    if (tool === 'signature') {
      if (savedSignature) {
        addElement({
          id: newId(), type: 'signature', page, x: xPct, y: yPct,
          w: SIG_DEFAULT_W, h: SIG_DEFAULT_H, dataUrl: savedSignature.dataUrl,
        });
      } else {
        setPendingPosition({ page, x: xPct, y: yPct, tool });
        setSignaturePanelOpen({ kind: 'signature' });
      }
      return;
    }
    if (tool === 'initial') {
      if (savedInitial) {
        addElement({
          id: newId(), type: 'initial', page, x: xPct, y: yPct,
          w: INI_DEFAULT_W, h: INI_DEFAULT_H, dataUrl: savedInitial.dataUrl,
        });
      } else {
        setPendingPosition({ page, x: xPct, y: yPct, tool });
        setSignaturePanelOpen({ kind: 'initial' });
      }
    }
  }, [tool, savedSignature, savedInitial, addElement]);

  // Confirm a pending text/date placement after the inline mini-input.
  const commitPendingText = useCallback(() => {
    if (!pendingPosition) return;
    const value = editingDraft.trim();
    if (value && pendingPosition.tool === 'text') {
      addElement({
        id: newId(), type: 'text',
        page: pendingPosition.page, x: pendingPosition.x, y: pendingPosition.y,
        value, fontSize: DEFAULT_FONT_SIZE, color: DEFAULT_TEXT_COLOR,
      });
    }
    setPendingPosition(null);
    setEditingDraft('');
  }, [pendingPosition, editingDraft, addElement]);

  const cancelPending = () => {
    setPendingPosition(null);
    setEditingDraft('');
    setSignaturePanelOpen(null);
  };

  // Signature/Initial panel saves → place on the pending position.
  const handleSignaturePanelSave = (dataUrl: string, w: number, h: number) => {
    if (!signaturePanelOpen || !pendingPosition) {
      // Fallback: store the signature for later placements.
      if (signaturePanelOpen?.kind === 'initial') setSavedInitial({ dataUrl, w, h });
      else setSavedSignature({ dataUrl, w, h });
      setSignaturePanelOpen(null);
      return;
    }
    if (signaturePanelOpen.kind === 'signature') {
      setSavedSignature({ dataUrl, w, h });
      addElement({
        id: newId(), type: 'signature',
        page: pendingPosition.page, x: pendingPosition.x, y: pendingPosition.y,
        w: SIG_DEFAULT_W, h: SIG_DEFAULT_H, dataUrl,
      });
    } else {
      setSavedInitial({ dataUrl, w, h });
      addElement({
        id: newId(), type: 'initial',
        page: pendingPosition.page, x: pendingPosition.x, y: pendingPosition.y,
        w: INI_DEFAULT_W, h: INI_DEFAULT_H, dataUrl,
      });
    }
    setSignaturePanelOpen(null);
    setPendingPosition(null);
  };

  // ── Drag-to-move ──────────────────────────────────────────────────────

  const onElementMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    const pageEl = target.closest('.fse-page') as HTMLElement | null;
    if (!pageEl) return;
    const pageRect = pageEl.getBoundingClientRect();
    const elRect = target.getBoundingClientRect();
    dragRef.current = {
      id,
      offsetX: e.clientX - elRect.left,
      offsetY: e.clientY - elRect.top,
      pageEl,
    };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const pr = dragRef.current.pageEl.getBoundingClientRect();
      const newLeft = ev.clientX - pr.left - dragRef.current.offsetX;
      const newTop  = ev.clientY - pr.top  - dragRef.current.offsetY;
      const xPct = Math.max(0, Math.min(100, (newLeft / pr.width) * 100));
      const yPct = Math.max(0, Math.min(100, (newTop  / pr.height) * 100));
      updateElement(dragRef.current.id, { x: xPct, y: yPct } as Partial<FsElement>);
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    void pageRect;
  };

  // Touch support — single-finger drag.
  const onElementTouchStart = (e: React.TouchEvent, id: string) => {
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    const pageEl = target.closest('.fse-page') as HTMLElement | null;
    if (!pageEl) return;
    const pageRect = pageEl.getBoundingClientRect();
    const elRect = target.getBoundingClientRect();
    const touch = e.touches[0];
    dragRef.current = {
      id,
      offsetX: touch.clientX - elRect.left,
      offsetY: touch.clientY - elRect.top,
      pageEl,
    };
    const onMove = (ev: TouchEvent) => {
      if (!dragRef.current) return;
      const t = ev.touches[0];
      const pr = dragRef.current.pageEl.getBoundingClientRect();
      const newLeft = t.clientX - pr.left - dragRef.current.offsetX;
      const newTop  = t.clientY - pr.top  - dragRef.current.offsetY;
      const xPct = Math.max(0, Math.min(100, (newLeft / pr.width) * 100));
      const yPct = Math.max(0, Math.min(100, (newTop  / pr.height) * 100));
      updateElement(dragRef.current.id, { x: xPct, y: yPct } as Partial<FsElement>);
      ev.preventDefault();
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    void pageRect;
  };

  // ── Done flow ────────────────────────────────────────────────────────

  const handleDone = async () => {
    if (processing) return;
    if (elements.length === 0) return;
    if (onBeforeDone) {
      const allow = await onBeforeDone();
      if (!allow) return;
    }
    setProcessing(true);
    try {
      const blob = await applyFillSign({ pdfFile: file, elements, addWatermark });
      onDone?.(blob);
    } catch (e) {
      console.error('FillSignEditor done:', e);
      setProcessing(false);
      setError(e instanceof Error ? e.message : 'Could not generate PDF.');
    }
  };

  // ── Render helpers ───────────────────────────────────────────────────

  const renderElement = (el: FsElement) => {
    const common = {
      onMouseDown: (e: React.MouseEvent) => onElementMouseDown(e, el.id),
      onTouchStart: (e: React.TouchEvent) => onElementTouchStart(e, el.id),
      onClick: (e: React.MouseEvent) => { e.stopPropagation(); setEditingId(el.id); },
    };

    if (el.type === 'text' || el.type === 'date') {
      return (
        <div
          key={el.id}
          className={`fse-element fse-element-text${editingId === el.id ? ' fse-element-active' : ''}`}
          style={{ left: `${el.x}%`, top: `${el.y}%` }}
          {...common}
        >
          <span className="fse-element-value" style={{ fontSize: `${el.fontSize}px`, color: el.color }}>
            {el.value || (el.type === 'date' ? 'date' : 'text')}
          </span>
          <button type="button" className="fse-element-x" onClick={(e) => { e.stopPropagation(); removeElement(el.id); }} aria-label="Delete">
            <X size={12} />
          </button>
        </div>
      );
    }

    if (el.type === 'checkbox') {
      return (
        <div
          key={el.id}
          className={`fse-element fse-element-checkbox${editingId === el.id ? ' fse-element-active' : ''}`}
          style={{ left: `${el.x}%`, top: `${el.y}%` }}
          {...common}
          onDoubleClick={(e) => { e.stopPropagation(); updateElement(el.id, { checked: !el.checked } as Partial<FsElement>); }}
        >
          <span className="fse-element-value" style={{ fontSize: `${el.fontSize}px`, color: el.color }}>
            {el.checked ? '✓' : '✕'}
          </span>
          <button type="button" className="fse-element-x" onClick={(e) => { e.stopPropagation(); removeElement(el.id); }} aria-label="Delete">
            <X size={12} />
          </button>
        </div>
      );
    }

    if (el.type !== 'signature' && el.type !== 'initial') return null;
    // signature / initial — discriminated union narrowed by the guard above
    return (
      <div
        key={el.id}
        className={`fse-element fse-element-image${editingId === el.id ? ' fse-element-active' : ''}`}
        style={{ left: `${el.x}%`, top: `${el.y}%`, width: `${el.w}%`, height: `${el.h}%` }}
        {...common}
      >
        <img src={el.dataUrl} alt={el.type} className="fse-element-img" draggable={false} />
        <button type="button" className="fse-element-x" onClick={(e) => { e.stopPropagation(); removeElement(el.id); }} aria-label="Delete">
          <X size={12} />
        </button>
      </div>
    );
  };

  const renderListEntry = (el: FsElement) => {
    let preview = '';
    if (el.type === 'text' || el.type === 'date') preview = el.value || `(${el.type})`;
    else if (el.type === 'checkbox') preview = el.checked ? '✓' : '✕';
    else preview = el.type === 'signature' ? 'Signature' : 'Initial';
    return (
      <li key={el.id} className="fse-list-item">
        <span className="fse-list-type">{el.type}</span>
        <span className="fse-list-preview">{preview}</span>
        <span className="fse-list-page">p{el.page}</span>
        <button type="button" className="fse-list-remove" onClick={() => removeElement(el.id)} aria-label="Remove">
          <X size={14} />
        </button>
      </li>
    );
  };

  return (
    <div className="fse">
      <div className="fse-main">
        <div className="fse-toolbar" role="toolbar" aria-label="Editor tools">
          {TOOLS.map(t => (
            <button
              key={t.id}
              type="button"
              className={`fse-tool-btn${tool === t.id ? ' active' : ''}`}
              onClick={() => setTool(t.id)}
            >
              <t.Icon size={16} strokeWidth={2} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className={`fse-pages tool-${tool}`} ref={containerRef}>
          {loading && (
            <div className="fse-pages-state">
              <Loader2 className="fse-spin" size={28} strokeWidth={1.7} />
              <span>Loading PDF…</span>
            </div>
          )}
          {error && !loading && (
            <div className="fse-pages-state fse-pages-error">{error}</div>
          )}
          {!loading && !error && pageInfos.map(info => (
            <div
              key={info.index}
              className="fse-page"
              style={{ width: info.width, height: info.height }}
              onClick={(e) => handlePageClick(info.index, e)}
            >
              <canvas
                ref={el => {
                  if (el) canvasRefs.current.set(info.index, el);
                  else canvasRefs.current.delete(info.index);
                }}
              />
              <div className="fse-page-overlay">
                {elements.filter(el => el.page === info.index).map(renderElement)}
                {pendingPosition && pendingPosition.page === info.index && pendingPosition.tool === 'text' && (
                  <div
                    className="fse-pending"
                    style={{ left: `${pendingPosition.x}%`, top: `${pendingPosition.y}%` }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      autoFocus
                      value={editingDraft}
                      onChange={(e) => setEditingDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitPendingText();
                        if (e.key === 'Escape') cancelPending();
                      }}
                      onBlur={commitPendingText}
                      placeholder="Type text…"
                      className="fse-pending-input"
                    />
                  </div>
                )}
              </div>
              <span className="fse-page-label">Page {info.index} of {pageInfos.length}</span>
            </div>
          ))}
        </div>

        {!loading && !error && (
          <div className="fse-cta-row">
            <button
              type="button"
              className="fse-cta"
              disabled={processing || elements.length === 0}
              onClick={handleDone}
            >
              {processing ? <Loader2 className="fse-spin" size={18} /> : <Download size={18} />}
              <span>{processing ? 'Generating PDF…' : `Done — Download PDF${addWatermark ? ' (with watermark)' : ''}`}</span>
            </button>
            {elements.length === 0 && (
              <p className="fse-cta-hint">Click a tool above, then click on the PDF to place it.</p>
            )}
          </div>
        )}
      </div>

      <aside className="fse-sidebar">
        <div className="fse-sidebar-card">
          <div className="fse-sidebar-title">
            <Check size={14} /> Placed elements ({elements.length})
          </div>
          {elements.length === 0 ? (
            <p className="fse-sidebar-empty">Nothing yet. Pick a tool, click on the PDF.</p>
          ) : (
            <ul className="fse-list">
              {elements.map(renderListEntry)}
            </ul>
          )}
          <div className="fse-sidebar-tip">
            <span>Tip:</span> drag any element to reposition. Click <X size={12} /> to delete.
          </div>
          {!hasSubscription && (
            <div className="fse-sidebar-plan">
              Free plan — output gets a small <strong>SignMyPDF.io</strong> watermark after the daily limit.
            </div>
          )}
        </div>
      </aside>

      {signaturePanelOpen && (
        <div className="fse-modal" role="dialog" aria-modal="true" onClick={cancelPending}>
          <div className="fse-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="fse-modal-head">
              <h3>{signaturePanelOpen.kind === 'signature' ? 'Draw your signature' : 'Draw your initial'}</h3>
              <button type="button" className="fse-modal-close" onClick={cancelPending} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <SignatureCanvas onSave={(dataUrl, w, h) => handleSignaturePanelSave(dataUrl, w, h)} />
          </div>
        </div>
      )}
    </div>
  );
}
