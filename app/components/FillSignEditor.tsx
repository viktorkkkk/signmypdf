'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CalendarDays,
  Check,
  Download,
  FileSignature,
  Layers,
  Loader2,
  PenLine,
  Type as TypeIcon,
  X,
} from 'lucide-react';
import SignatureCanvas from './SignatureCanvas';
import { applyFillSign, type FsElement } from '../utils/fillSignPdf';

type ToolId = 'text' | 'date' | 'signature';

const TOOLS: { id: ToolId; label: string; Icon: typeof TypeIcon }[] = [
  { id: 'text',      label: 'Text',      Icon: TypeIcon },
  { id: 'date',      label: 'Date',      Icon: CalendarDays },
  { id: 'signature', label: 'Signature', Icon: FileSignature },
];

const DEFAULT_FONT = 14;
const TEXT_DEFAULT_COLOR = '#0f172a';
const SIG_DEFAULT_W = 22;            // % of page width
const SIG_DEFAULT_H = 8;             // % of page height
const SIG_MIN_W_PX = 50;
const SIG_MIN_H_PX = 20;
const SIG_MAX_W_PX = 400;
const SIG_MAX_H_PX = 150;

const newId = () => `el-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const todayPicker = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const isoToDisplay = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${m}/${d}/${y}` : iso;
};
const displayToIso = (display: string) => {
  const [m, d, y] = display.split('/');
  return y && m && d ? `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` : todayPicker();
};

interface PageInfo { index: number; width: number; height: number }
interface SavedSig { dataUrl: string; w: number; h: number }
interface PendingSig { dataUrl: string; applyToAllPages: boolean }

type DragState = {
  id: string;
  mode: 'drag' | 'resize';
  corner?: 'nw' | 'ne' | 'sw' | 'se';
  startX: number; startY: number;
  startEl: FsElement;
  pageRect: DOMRect;
};

interface Props {
  file: File;
  defaultTool?: ToolId;
  hasSubscription?: boolean;
  /** Caller decides watermark policy (e.g. free over-limit). */
  addWatermark?: boolean;
  /** Fired after Done; receives the final Blob. */
  onDone?: (blob: Blob) => void;
  /** Pre-Done hook — return false to abort (e.g. show paywall). */
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
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inline edit (text/date)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState('');

  // Hover state for picking which element shows X / resize handles.
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Signature flow
  const [savedSig, setSavedSig] = useState<SavedSig | null>(null);
  const [pendingSig, setPendingSig] = useState<PendingSig | null>(null);
  const [sigModal, setSigModal] = useState<'create' | 'choose' | null>(null);

  const [processing, setProcessing] = useState(false);
  const [autoScrolled, setAutoScrolled] = useState(false);

  const editorRootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfRef = useRef<any>(null);
  const dragRef = useRef<DragState | null>(null);

  // ── PDF load ──────────────────────────────────────────────────────────
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

        const containerEl = editorRootRef.current?.querySelector('.fse-page-area') as HTMLElement | null;
        const containerWidth = containerEl?.clientWidth ?? 700;
        const targetWidth = Math.min(820, containerWidth);

        const infos: PageInfo[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const p = await pdf.getPage(i);
          const baseViewport = p.getViewport({ scale: 1 });
          const scale = targetWidth / baseViewport.width;
          const viewport = p.getViewport({ scale });
          infos.push({ index: i, width: viewport.width, height: viewport.height });
        }
        if (cancelled) return;
        setPageInfos(infos);
        setLoading(false);
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

  // ── Render the active page ────────────────────────────────────────────
  useEffect(() => {
    if (loading || !pdfRef.current || !canvasRef.current) return;
    const info = pageInfos.find(p => p.index === currentPage);
    if (!info) return;
    let cancelled = false;
    (async () => {
      try {
        const page = await pdfRef.current.getPage(currentPage);
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = info.width / baseViewport.width;
        const viewport = page.getViewport({ scale });
        const dpr = window.devicePixelRatio || 1;
        const canvas = canvasRef.current!;
        canvas.width = viewport.width * dpr;
        canvas.height = viewport.height * dpr;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        const ctx = canvas.getContext('2d')!;
        ctx.scale(dpr, dpr);
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        if (cancelled) return;
      } catch (e) {
        if (!cancelled) console.error('Render page:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [currentPage, loading, pageInfos]);

  // ── Auto-scroll editor into view once on first ready render ──────────
  useEffect(() => {
    if (loading || autoScrolled) return;
    const el = editorRootRef.current;
    if (!el) return;
    const id = window.setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setAutoScrolled(true);
    }, 60);
    return () => window.clearTimeout(id);
  }, [loading, autoScrolled]);

  // ── Auto-open native date picker when a date element enters edit mode ─
  useEffect(() => {
    if (!editingId) return;
    const el = elements.find(e => e.id === editingId);
    if (el && el.type === 'date' && dateInputRef.current) {
      // Some browsers expose showPicker() — open the native picker right away.
      const inputEl = dateInputRef.current as HTMLInputElement & { showPicker?: () => void };
      if (typeof inputEl.showPicker === 'function') {
        try { inputEl.showPicker(); } catch { /* user-gesture required in some browsers */ }
      }
    }
  }, [editingId, elements]);

  // ── Element CRUD ─────────────────────────────────────────────────────
  const addElement = useCallback((el: FsElement) => {
    setElements(prev => [...prev, el]);
  }, []);

  const updateElement = useCallback((id: string, patch: Partial<FsElement>) => {
    setElements(prev => prev.map(e => (e.id === id ? ({ ...e, ...patch } as FsElement) : e)));
  }, []);

  const removeElement = useCallback((id: string) => {
    setElements(prev => prev.filter(e => e.id !== id));
    setEditingId(curr => (curr === id ? null : curr));
    setHoverId(curr => (curr === id ? null : curr));
  }, []);

  // ── Tool changes ──────────────────────────────────────────────────────
  const onToolClick = (t: ToolId) => {
    setTool(t);
    if (t === 'signature') {
      // Open the modal IMMEDIATELY — don't wait for a click on the PDF.
      setSigModal(savedSig ? 'choose' : 'create');
    } else {
      // Drop any pending signature when leaving Signature tool.
      setPendingSig(null);
    }
  };

  const onSigCreated = (dataUrl: string, _w: number, _h: number) => {
    if (!dataUrl) return;
    const sig: SavedSig = { dataUrl, w: _w, h: _h };
    setSavedSig(sig);
    setPendingSig({ dataUrl, applyToAllPages: false });
    setSigModal(null);
  };

  const onSigReuse = () => {
    if (!savedSig) return;
    setPendingSig({ dataUrl: savedSig.dataUrl, applyToAllPages: false });
    setSigModal(null);
  };

  const onSigCreateNew = () => setSigModal('create');

  const onSigCancel = () => {
    setSigModal(null);
    if (!pendingSig) setTool('text');
  };

  // ── Click on the PDF canvas → place an element ────────────────────────
  const onPageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target instanceof HTMLElement && e.target.closest('.fse-element')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top)  / rect.height) * 100;
    const id = newId();

    if (tool === 'text') {
      addElement({
        id, type: 'text', page: currentPage, x: xPct, y: yPct,
        value: '', fontSize: DEFAULT_FONT, color: TEXT_DEFAULT_COLOR,
      });
      setEditingId(id);
      setEditingDraft('');
      return;
    }

    if (tool === 'date') {
      const today = todayPicker();
      addElement({
        id, type: 'date', page: currentPage, x: xPct, y: yPct,
        value: isoToDisplay(today), fontSize: DEFAULT_FONT, color: TEXT_DEFAULT_COLOR,
      });
      setEditingId(id);
      setEditingDraft(today);
      return;
    }

    if (tool === 'signature' && pendingSig) {
      const sigEl: FsElement = {
        id, type: 'signature', page: currentPage, x: xPct, y: yPct,
        w: SIG_DEFAULT_W, h: SIG_DEFAULT_H, dataUrl: pendingSig.dataUrl,
      };
      if (pendingSig.applyToAllPages) {
        const all: FsElement[] = pageInfos.map(p => ({ ...sigEl, id: newId(), page: p.index }));
        setElements(prev => [...prev, ...all]);
      } else {
        addElement(sigEl);
      }
      // pendingSig stays so user can place more.
    }
  };

  // ── Inline edit save / cancel ─────────────────────────────────────────
  const commitEdit = useCallback(() => {
    if (!editingId) return;
    const el = elements.find(e => e.id === editingId);
    if (!el) { setEditingId(null); setEditingDraft(''); return; }
    if (el.type === 'text') {
      const val = editingDraft.trim();
      if (val) updateElement(editingId, { value: val } as Partial<FsElement>);
      else removeElement(editingId);
    } else if (el.type === 'date') {
      const display = isoToDisplay(editingDraft || todayPicker());
      updateElement(editingId, { value: display } as Partial<FsElement>);
    }
    setEditingId(null);
    setEditingDraft('');
  }, [editingId, editingDraft, elements, updateElement, removeElement]);

  const cancelEdit = useCallback(() => {
    if (!editingId) return;
    const el = elements.find(e => e.id === editingId);
    if (el && el.type === 'text' && !el.value) {
      // Brand-new text with nothing typed → drop it.
      removeElement(editingId);
    }
    setEditingId(null);
    setEditingDraft('');
  }, [editingId, elements, removeElement]);

  const startEdit = (el: FsElement) => {
    if (el.type === 'text') {
      setEditingDraft(el.value);
      setEditingId(el.id);
    } else if (el.type === 'date') {
      setEditingDraft(displayToIso(el.value));
      setEditingId(el.id);
    }
  };

  // ── Drag / resize ─────────────────────────────────────────────────────
  const beginDrag = (clientX: number, clientY: number, el: FsElement, target: HTMLElement) => {
    if (editingId === el.id) return;
    const pageEl = target.closest('.fse-page') as HTMLElement | null;
    if (!pageEl) return;
    dragRef.current = {
      id: el.id, mode: 'drag',
      startX: clientX, startY: clientY,
      startEl: { ...el },
      pageRect: pageEl.getBoundingClientRect(),
    };
    setDraggingId(el.id);
    document.body.style.userSelect = 'none';
  };

  const onElementMouseDown = (e: React.MouseEvent, el: FsElement) => {
    if (e.target instanceof HTMLElement && e.target.closest('.fse-resize')) return;
    e.stopPropagation();
    e.preventDefault();
    beginDrag(e.clientX, e.clientY, el, e.currentTarget as HTMLElement);

    const onMove = (ev: MouseEvent) => {
      const ds = dragRef.current;
      if (!ds || ds.mode !== 'drag') return;
      const dxPct = ((ev.clientX - ds.startX) / ds.pageRect.width) * 100;
      const dyPct = ((ev.clientY - ds.startY) / ds.pageRect.height) * 100;
      const newX = Math.max(0, Math.min(100, ds.startEl.x + dxPct));
      const newY = Math.max(0, Math.min(100, ds.startEl.y + dyPct));
      updateElement(ds.id, { x: newX, y: newY } as Partial<FsElement>);
    };
    const onUp = () => {
      dragRef.current = null;
      setDraggingId(null);
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const onElementTouchStart = (e: React.TouchEvent, el: FsElement) => {
    if (e.target instanceof HTMLElement && e.target.closest('.fse-resize')) return;
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    e.stopPropagation();
    beginDrag(t.clientX, t.clientY, el, e.currentTarget as HTMLElement);

    const onMove = (ev: TouchEvent) => {
      ev.preventDefault();
      const ds = dragRef.current;
      if (!ds) return;
      const tt = ev.touches[0];
      const dxPct = ((tt.clientX - ds.startX) / ds.pageRect.width) * 100;
      const dyPct = ((tt.clientY - ds.startY) / ds.pageRect.height) * 100;
      const newX = Math.max(0, Math.min(100, ds.startEl.x + dxPct));
      const newY = Math.max(0, Math.min(100, ds.startEl.y + dyPct));
      updateElement(ds.id, { x: newX, y: newY } as Partial<FsElement>);
    };
    const onUp = () => {
      dragRef.current = null;
      setDraggingId(null);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  };

  const onResizeMouseDown = (e: React.MouseEvent, el: FsElement, corner: 'nw' | 'ne' | 'sw' | 'se') => {
    if (el.type !== 'signature') return;
    e.stopPropagation();
    e.preventDefault();
    const pageEl = (e.currentTarget as HTMLElement).closest('.fse-page') as HTMLElement | null;
    if (!pageEl) return;
    const pageRect = pageEl.getBoundingClientRect();
    const aspect = el.w / el.h;

    const minWpct = (SIG_MIN_W_PX / pageRect.width)  * 100;
    const minHpct = (SIG_MIN_H_PX / pageRect.height) * 100;
    const maxWpct = (SIG_MAX_W_PX / pageRect.width)  * 100;
    const maxHpct = (SIG_MAX_H_PX / pageRect.height) * 100;

    const startX = e.clientX, startY = e.clientY;
    const startW = el.w, startH = el.h;
    const startElX = el.x, startElY = el.y;

    setDraggingId(el.id);

    const onMove = (ev: MouseEvent) => {
      const dxPct = ((ev.clientX - startX) / pageRect.width)  * 100;
      const dyPct = ((ev.clientY - startY) / pageRect.height) * 100;
      let newW = startW, newH = startH;
      let newXel = startElX, newYel = startElY;

      if (corner === 'se') { newW = startW + dxPct; newH = startH + dyPct; }
      else if (corner === 'sw') { newW = startW - dxPct; newXel = startElX + dxPct; newH = startH + dyPct; }
      else if (corner === 'ne') { newW = startW + dxPct; newH = startH - dyPct; newYel = startElY + dyPct; }
      else if (corner === 'nw') { newW = startW - dxPct; newXel = startElX + dxPct; newH = startH - dyPct; newYel = startElY + dyPct; }

      // Preserve aspect ratio — driven by the larger fractional change.
      const wRatio = Math.abs((newW / startW) - 1);
      const hRatio = Math.abs((newH / startH) - 1);
      if (wRatio > hRatio) {
        const adjustedH = newW / aspect;
        if (corner === 'ne' || corner === 'nw') newYel = startElY + (startH - adjustedH);
        newH = adjustedH;
      } else {
        const adjustedW = newH * aspect;
        if (corner === 'sw' || corner === 'nw') newXel = startElX + (startW - adjustedW);
        newW = adjustedW;
      }

      newW = Math.max(minWpct, Math.min(maxWpct, newW));
      newH = Math.max(minHpct, Math.min(maxHpct, newH));
      newXel = Math.max(0, Math.min(100 - newW, newXel));
      newYel = Math.max(0, Math.min(100 - newH, newYel));

      updateElement(el.id, { w: newW, h: newH, x: newXel, y: newYel } as Partial<FsElement>);
    };
    const onUp = () => {
      setDraggingId(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // ── Done ──────────────────────────────────────────────────────────────
  const handleDone = async () => {
    if (processing) return;
    if (elements.length === 0) return;
    if (onBeforeDone) {
      const ok = await onBeforeDone();
      if (!ok) return;
    }
    setProcessing(true);
    try {
      const blob = await applyFillSign({ pdfFile: file, elements, addWatermark });
      onDone?.(blob);
    } catch (e) {
      console.error('FillSign done:', e);
      setError(e instanceof Error ? e.message : 'Could not generate PDF.');
    } finally {
      setProcessing(false);
    }
  };

  // ── Render helpers ────────────────────────────────────────────────────
  const renderElement = (el: FsElement) => {
    const isEditing = editingId === el.id;
    const isHover = hoverId === el.id;
    const isDragging = draggingId === el.id;
    const elementClass = [
      'fse-element',
      `fse-element-${el.type === 'signature' ? 'image' : el.type}`,
      isEditing  ? 'fse-element-editing'  : '',
      isHover    ? 'fse-element-hover'    : '',
      isDragging ? 'fse-element-dragging' : '',
    ].filter(Boolean).join(' ');

    const onMouseEnter = () => setHoverId(el.id);
    const onMouseLeave = () => setHoverId(curr => (curr === el.id ? null : curr));
    const dragHandlers = {
      onMouseDown:  (e: React.MouseEvent) => onElementMouseDown(e, el),
      onTouchStart: (e: React.TouchEvent) => onElementTouchStart(e, el),
      onClick:      (e: React.MouseEvent) => e.stopPropagation(),
      onDoubleClick:(e: React.MouseEvent) => { e.stopPropagation(); startEdit(el); },
      onMouseEnter, onMouseLeave,
    };

    if (el.type === 'text' || el.type === 'date') {
      const isDate = el.type === 'date';
      return (
        <div
          key={el.id}
          className={elementClass}
          style={{ left: `${el.x}%`, top: `${el.y}%` }}
          {...dragHandlers}
        >
          {isEditing ? (
            <div className="fse-edit-row">
              <input
                ref={isDate ? dateInputRef : undefined}
                type={isDate ? 'date' : 'text'}
                autoFocus={!isDate}
                value={editingDraft}
                onChange={e => setEditingDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitEdit();
                  if (e.key === 'Escape') cancelEdit();
                }}
                className="fse-edit-input"
                style={{ fontSize: isDate ? 13 : `${el.fontSize}px` }}
                placeholder={isDate ? '' : 'Type text…'}
                onClick={e => e.stopPropagation()}
              />
              <button type="button" className="fse-edit-confirm" onClick={(e) => { e.stopPropagation(); commitEdit(); }} aria-label="Save">
                <Check size={12} />
              </button>
              <button type="button" className="fse-edit-cancel" onClick={(e) => { e.stopPropagation(); cancelEdit(); }} aria-label="Cancel">
                <X size={12} />
              </button>
            </div>
          ) : (
            <>
              <span className="fse-element-value" style={{ fontSize: `${el.fontSize}px`, color: el.color }}>
                {el.value || (isDate ? 'date' : 'text')}
              </span>
              <button
                type="button"
                className="fse-element-x"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); removeElement(el.id); }}
                aria-label="Delete"
              >
                <X size={11} />
              </button>
            </>
          )}
        </div>
      );
    }

    // signature
    if (el.type !== 'signature') return null;
    return (
      <div
        key={el.id}
        className={elementClass}
        style={{ left: `${el.x}%`, top: `${el.y}%`, width: `${el.w}%`, height: `${el.h}%` }}
        {...dragHandlers}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={el.dataUrl} alt="signature" className="fse-element-img" draggable={false} />
        <button
          type="button"
          className="fse-element-x"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); removeElement(el.id); }}
          aria-label="Delete"
        >
          <X size={11} />
        </button>
        {(['nw', 'ne', 'sw', 'se'] as const).map(c => (
          <span
            key={c}
            className={`fse-resize fse-resize-${c}`}
            onMouseDown={(e) => onResizeMouseDown(e, el, c)}
            aria-hidden="true"
          />
        ))}
      </div>
    );
  };

  const visibleElements = elements.filter(e => e.page === currentPage);
  const currentInfo = pageInfos.find(p => p.index === currentPage);
  const canDone = elements.length > 0 && !processing;

  return (
    <div className="fse" ref={editorRootRef}>
      <div className="fse-main">
        {/* Sticky top bar — toolbar + Sign & Download */}
        <div className="fse-topbar">
          <div className="fse-toolbar" role="toolbar" aria-label="Editor tools">
            {TOOLS.map(t => (
              <button
                key={t.id}
                type="button"
                className={`fse-tool-btn${tool === t.id ? ' active' : ''}`}
                onClick={() => onToolClick(t.id)}
              >
                <t.Icon size={16} strokeWidth={2} />
                <span>{t.label}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="fse-cta-top"
            disabled={!canDone}
            onClick={handleDone}
          >
            {processing ? <Loader2 className="fse-spin" size={16} /> : <Download size={16} />}
            <span>{processing ? 'Generating…' : 'Sign & Download'}</span>
          </button>
        </div>

        {/* Pending signature ribbon — visible while user has a sig waiting to be placed */}
        {pendingSig && (
          <div className="fse-pending-bar">
            <div className="fse-pending-info">
              <FileSignature size={14} />
              <span>Signature ready — click on the PDF to place it</span>
            </div>
            <label className="fse-pending-checkbox">
              <input
                type="checkbox"
                checked={pendingSig.applyToAllPages}
                onChange={e => setPendingSig({ ...pendingSig, applyToAllPages: e.target.checked })}
              />
              <Layers size={13} />
              <span>Apply to all pages</span>
            </label>
            <button type="button" className="fse-pending-cancel" onClick={() => setPendingSig(null)}>
              Cancel
            </button>
          </div>
        )}

        {/* Page switcher */}
        {!loading && pageInfos.length > 1 && (
          <div className="fse-page-switcher">
            <button
              type="button"
              className="fse-page-nav"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              ← Prev
            </button>
            <div className="fse-page-numbers">
              <span className="fse-page-numbers-label">Page {currentPage} / {pageInfos.length}</span>
              <div className="fse-page-mini">
                {pageInfos.map(p => (
                  <button
                    key={p.index}
                    type="button"
                    className={`fse-page-num${currentPage === p.index ? ' active' : ''}`}
                    onClick={() => setCurrentPage(p.index)}
                  >
                    {p.index}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              className="fse-page-nav"
              disabled={currentPage >= pageInfos.length}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Next →
            </button>
          </div>
        )}

        {/* PDF area */}
        <div className="fse-page-area">
          {loading && (
            <div className="fse-pages-state">
              <Loader2 className="fse-spin" size={28} />
              <span>Loading PDF…</span>
            </div>
          )}
          {error && !loading && <div className="fse-pages-state fse-pages-error">{error}</div>}
          {!loading && !error && currentInfo && (
            <div
              className={`fse-page tool-${tool}${pendingSig ? ' has-pending-sig' : ''}`}
              style={{ width: currentInfo.width, height: currentInfo.height }}
              onClick={onPageClick}
            >
              <canvas ref={canvasRef} />
              <div className="fse-page-overlay">
                {visibleElements.map(renderElement)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar — sticky list of all placed elements */}
      <aside className="fse-sidebar">
        <div className="fse-sidebar-card">
          <div className="fse-sidebar-title">
            <Check size={14} /> Placed elements ({elements.length})
          </div>
          {elements.length === 0 ? (
            <p className="fse-sidebar-empty">Pick a tool above, then click on the PDF to place it.</p>
          ) : (
            <ul className="fse-list">
              {elements.map(el => {
                const preview = el.type === 'signature'
                  ? 'Signature'
                  : (el.value || `(${el.type})`);
                return (
                  <li key={el.id} className="fse-list-item">
                    <span className="fse-list-type">{el.type}</span>
                    <span className="fse-list-preview" onClick={() => setCurrentPage(el.page)}>{preview}</span>
                    <span className="fse-list-page">p{el.page}</span>
                    <button
                      type="button"
                      className="fse-list-remove"
                      onClick={() => removeElement(el.id)}
                      aria-label="Remove"
                    >
                      <X size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="fse-sidebar-tip">
            <span>Tip:</span> drag to move, double-click to edit, drag corners to resize signatures.
          </div>
          {!hasSubscription && (
            <div className="fse-sidebar-plan">
              Free plan — output gets a small <strong>SignMyPDF.io</strong> watermark after the daily limit.
            </div>
          )}
        </div>
      </aside>

      {/* Mobile-only floating Sign & Download */}
      <button
        type="button"
        className="fse-fab"
        disabled={!canDone}
        onClick={handleDone}
      >
        {processing ? <Loader2 className="fse-spin" size={18} /> : <Download size={18} />}
        <span>{processing ? 'Generating…' : 'Sign & Download'}</span>
      </button>

      {/* Signature creation modal */}
      {sigModal === 'create' && (
        <div className="fse-modal" role="dialog" aria-modal="true" onClick={onSigCancel}>
          <div className="fse-modal-card" onClick={e => e.stopPropagation()}>
            <div className="fse-modal-head">
              <h3>Draw your signature</h3>
              <button type="button" className="fse-modal-close" onClick={onSigCancel} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <SignatureCanvas onSave={onSigCreated} />
          </div>
        </div>
      )}

      {/* Signature reuse chooser */}
      {sigModal === 'choose' && savedSig && (
        <div className="fse-modal" role="dialog" aria-modal="true" onClick={onSigCancel}>
          <div className="fse-modal-card" onClick={e => e.stopPropagation()}>
            <div className="fse-modal-head">
              <h3>Use a signature</h3>
              <button type="button" className="fse-modal-close" onClick={onSigCancel} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="fse-sig-chooser">
              <button type="button" className="fse-sig-choice fse-sig-choice-saved" onClick={onSigReuse}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={savedSig.dataUrl} alt="Saved signature" />
                <span>Use this signature</span>
              </button>
              <button type="button" className="fse-sig-choice fse-sig-choice-new" onClick={onSigCreateNew}>
                <PenLine size={20} />
                <span>Create new</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
