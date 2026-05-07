'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CalendarDays,
  Check,
  CheckSquare,
  CopyPlus,
  Download,
  FileSignature,
  FileText,
  GripVertical,
  Keyboard,
  Layers,
  Lightbulb,
  Loader2,
  PenLine,
  Pencil,
  Type as TypeIcon,
  X,
} from 'lucide-react';
import { SignatureCanvas } from '@signmypdf/ui';
import { applyFillSign, type FsElement } from '../utils/fillSignPdf';
import { setupPdfjs } from '@signmypdf/pdf-core';

/** Drag threshold — mousedown + this many CSS px of movement before a
 *  click is treated as a drag instead of an "open editor" click. */
const DRAG_THRESHOLD_PX = 5;

type ToolId = 'text' | 'date' | 'signature';

const TOOLS: { id: ToolId; label: string; Icon: typeof TypeIcon }[] = [
  { id: 'text',      label: 'Text',      Icon: TypeIcon },
  { id: 'date',      label: 'Date',      Icon: CalendarDays },
  { id: 'signature', label: 'Signature', Icon: FileSignature },
];

const DEFAULT_FONT = 11;
const FONT_SIZES: { id: 'sm' | 'md' | 'lg'; label: string; pt: number }[] = [
  { id: 'sm', label: 'S', pt: 9 },
  { id: 'md', label: 'M', pt: 11 },
  { id: 'lg', label: 'L', pt: 14 },
];
const TEXT_DEFAULT_COLOR = '#0f172a';
const SIG_DEFAULT_W = 22;
const SIG_DEFAULT_H = 8;
/** Vertical placement for auto-placed signatures (% of page height,
 *  top edge). 70% drops the box into the bottom third where contracts
 *  conventionally sit. The horizontal default is computed at place
 *  time as 50 - SIG_DEFAULT_W / 2 so the box is centered. */
const SIG_AUTOPLACE_Y = 70;

/** Persists the most-recent signature dataUrl + dimensions across
 *  sessions / documents. Read on mount, written on every successful
 *  signature creation. Same key may be shared with /sign in a future
 *  refactor, but for now /sign-nda owns it independently. */
const SIG_LS_KEY = 'signmypdf-saved-signature';

/** Type-tab font choices for the signature modal — same palette as
 *  /sign so the user gets a consistent feel across surfaces. */
const SIG_FONTS = [
  { name: 'Script',      value: '"Brush Script MT", "Dancing Script", cursive' },
  { name: 'Handwritten', value: '"Comic Sans MS", "Chalkboard SE", cursive' },
  { name: 'Elegant',     value: '"Times New Roman", Georgia, serif' },
  { name: 'Modern',      value: '"Segoe UI", Roboto, sans-serif' },
] as const;
const SIG_MIN_W_PX = 50;
const SIG_MIN_H_PX = 20;
const SIG_MAX_W_PX = 400;
const SIG_MAX_H_PX = 150;
const POPUP_WIDTH_PX = 300;
const POPUP_HEIGHT_PX = 44;

const newId = () => `el-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const todayDisplay = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${d.getFullYear()}`;
};

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

/** Sidebar preview: show only the FIRST line of a value, truncated to
 *  25 chars + "…". Multi-line text values shouldn't blow out the row. */
const previewLine = (s: string, n = 25) => {
  const firstLine = s.split('\n')[0] ?? '';
  return truncate(firstLine, n);
};

const typeIconFor = (t: 'text' | 'date' | 'signature') => {
  if (t === 'text') return TypeIcon;
  if (t === 'date') return CalendarDays;
  return FileSignature;
};

interface PageInfo { index: number; width: number; height: number }
interface SavedSig { dataUrl: string; w: number; h: number }
/** In-flight state of the signature-creation modal. Captures both
 *  Draw-tab and Type-tab fields so the user can flip between tabs
 *  without losing work, and the Apply-to-all toggle decides whether
 *  Save places the signature on every page or just the current one. */
interface CreatingSigState {
  mode: 'draw' | 'type';
  drawData: string;
  drawW: number;
  drawH: number;
  typedName: string;
  typedFont: string;
  applyToAll: boolean;
}
/** Active inline-edit state. Tracks the original value so Esc / ✕ can
 *  revert; if the original was empty the element is removed instead. */
interface EditingState {
  id: string;
  originalValue: string;
  draftValue: string;
}

interface Props {
  file: File;
  defaultTool?: ToolId;
  hasSubscription?: boolean;
  /** Watermark policy. Ignored when `unlimited` is true. */
  addWatermark?: boolean;
  /** Mark this surface as no-limits / no-watermark / no-history.
   *  /sign-nda passes true; /sign and /fill keep the default false
   *  so they stay on the metered free-tier path. */
  unlimited?: boolean;
  /** Initial elements to seed (e.g. restoring a saved draft). */
  initialElements?: FsElement[];
  /** localStorage key for the auto-saved draft. When set, the
   *  editor writes a `{elements, timestamp}` JSON to this key on
   *  every change (throttled 500ms). When empty, the key is
   *  removed instead. */
  draftKey?: string;
  onDone?: (blob: Blob) => void;
  onBeforeDone?: () => boolean | Promise<boolean>;
}

export default function FillSignEditor({
  file,
  defaultTool = 'text',
  hasSubscription,
  addWatermark = false,
  unlimited = false,
  initialElements,
  draftKey,
  onDone,
  onBeforeDone,
}: Props) {
  const [tool, setTool] = useState<ToolId>(defaultTool);
  const [elements, setElements] = useState<FsElement[]>(initialElements ?? []);
  const [pageInfos, setPageInfos] = useState<PageInfo[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<EditingState | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // True for one event-loop tick after a drag/resize ends. Used to
  // suppress the synthetic `click` event that fires immediately after
  // mouseup, so the page-level onPageClick does NOT mistake a drag-
  // release-into-empty-area for "user clicked empty page → place new
  // element". Reset via setTimeout(0) so the click handler sees true
  // but a future genuine click sees false.
  const justDraggedRef = useRef(false);
  const markJustDragged = useCallback(() => {
    justDraggedRef.current = true;
    setTimeout(() => { justDraggedRef.current = false; }, 0);
  }, []);

  const [savedSig, setSavedSig] = useState<SavedSig | null>(null);
  const [creatingSig, setCreatingSig] = useState<CreatingSigState | null>(null);
  const [typedSigDataUrl, setTypedSigDataUrl] = useState<string>('');
  const typedSigSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const [sigModal, setSigModal] = useState<'create' | 'choose' | null>(null);
  /** When set, the signature-creation modal is acting as a re-draw
   *  surface for the existing element with this id (Edit button on
   *  a placed signature). On save, we update that element's dataUrl
   *  in place rather than auto-placing a new element. */
  const [editingSig, setEditingSig] = useState<{ id: string } | null>(null);

  // Derived: the set of pages that hold at least one signature
  // placement. Recomputed below from `elements` so the thumbnail
  // strip's check ticks track placements automatically.
  const [selectedPages, setSelectedPages] = useState<number[]>([]);

  // ── Hydrate saved signature from localStorage on mount ─────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SIG_LS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<SavedSig> | null;
      if (parsed && typeof parsed.dataUrl === 'string' && parsed.dataUrl
          && typeof parsed.w === 'number' && typeof parsed.h === 'number') {
        setSavedSig({ dataUrl: parsed.dataUrl, w: parsed.w, h: parsed.h });
      }
    } catch {/* ignore quota / private mode */}
  }, []);

  const persistSavedSig = useCallback((sig: SavedSig) => {
    try { localStorage.setItem(SIG_LS_KEY, JSON.stringify(sig)); } catch {/* ignore */}
  }, []);

  const [processing, setProcessing] = useState(false);
  const [autoScrolled, setAutoScrolled] = useState(false);

  const editorRootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfRef = useRef<any>(null);

  // ── PDF load + thumbnails ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const pdfjsLib = await setupPdfjs('/pdf.worker.min.mjs');
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

        const thumbs: Record<number, string> = {};
        for (let i = 1; i <= pdf.numPages; i++) {
          const p = await pdf.getPage(i);
          const vp = p.getViewport({ scale: 0.3 });
          const canvas = document.createElement('canvas');
          canvas.width = vp.width;
          canvas.height = vp.height;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await p.render({ canvas: canvas as any, viewport: vp }).promise;
          thumbs[i] = canvas.toDataURL('image/jpeg', 0.7);
          if (cancelled) return;
          setThumbnails(prev => ({ ...prev, [i]: thumbs[i] }));
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

  // Auto-scroll editor into view once.
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

  // ── Auto-save draft (throttled 500 ms) ────────────────────────────────
  // When `draftKey` is set, every change to elements is mirrored to
  // localStorage[draftKey] as `{elements, timestamp}`. Empty elements
  // array → key removed (no stale "you had 0 placed" prompts).
  const draftThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!draftKey) return;
    if (draftThrottleRef.current) clearTimeout(draftThrottleRef.current);
    draftThrottleRef.current = setTimeout(() => {
      try {
        if (elements.length === 0) {
          localStorage.removeItem(draftKey);
        } else {
          localStorage.setItem(
            draftKey,
            JSON.stringify({ elements, timestamp: Date.now() }),
          );
        }
      } catch {/* quota / private mode — fail silently */}
    }, 500);
    return () => {
      if (draftThrottleRef.current) clearTimeout(draftThrottleRef.current);
    };
  }, [elements, draftKey]);

  // ── Element CRUD ─────────────────────────────────────────────────────
  const addElement = useCallback((el: FsElement) => {
    setElements(prev => [...prev, el]);
  }, []);

  const updateElement = useCallback((id: string, patch: Partial<FsElement>) => {
    setElements(prev => prev.map(e => (e.id === id ? ({ ...e, ...patch } as FsElement) : e)));
  }, []);

  const removeElement = useCallback((id: string) => {
    setElements(prev => prev.filter(e => e.id !== id));
    setEditing(curr => (curr?.id === id ? null : curr));
  }, []);

  /** Duplicate an element 20px down-and-right from its original. The
   *  20px offset is converted to percent against the source element's
   *  page geometry so the visual offset stays constant regardless of
   *  zoom / page size. The new element is clamped to the page bounds
   *  (for signatures, the right/bottom edge is also clamped against
   *  the element's own width/height). Auto-save fires reactively from
   *  the elements-state change in the existing draftKey effect. */
  const duplicateElement = useCallback((id: string) => {
    setElements(prev => {
      const orig = prev.find(e => e.id === id);
      if (!orig) return prev;
      const info = pageInfos.find(p => p.index === orig.page);
      if (!info) return prev;
      const offsetXPct = (20 / info.width)  * 100;
      const offsetYPct = (20 / info.height) * 100;
      let newX = orig.x + offsetXPct;
      let newY = orig.y + offsetYPct;
      if (orig.type === 'signature') {
        newX = Math.max(0, Math.min(100 - orig.w, newX));
        newY = Math.max(0, Math.min(100 - orig.h, newY));
      } else {
        newX = Math.max(0, Math.min(100, newX));
        newY = Math.max(0, Math.min(100, newY));
      }
      const dup: FsElement = { ...orig, id: newId(), x: newX, y: newY } as FsElement;
      return [...prev, dup];
    });
  }, [pageInfos]);

  // ── Tool changes ──────────────────────────────────────────────────────
  const initCreatingSig = (overrides: Partial<CreatingSigState> = {}): CreatingSigState => ({
    mode: 'draw',
    drawData: '',
    drawW: 0,
    drawH: 0,
    typedName: '',
    typedFont: SIG_FONTS[0].value,
    applyToAll: false,
    ...overrides,
  });

  const onToolClick = (t: ToolId) => {
    setTool(t);
    if (t === 'signature') {
      // Existing saved signature → offer "Use saved / Create new"
      // chooser. Otherwise straight into the Draw/Type modal.
      if (savedSig) {
        setSigModal('choose');
      } else {
        setCreatingSig(initCreatingSig());
        setSigModal('create');
      }
    }
    // Switching tool while editing — close the editor without saving.
    if (editing) {
      const el = elements.find(e => e.id === editing.id);
      if (el && (el.type === 'text' || el.type === 'date') && !el.value) {
        removeElement(editing.id);
      }
      setEditing(null);
    }
  };

  /** Single source of truth for placing a signature element. Called
   *  from "Use this signature" (chooser) and from Save in the create
   *  modal. Persists the dataUrl to localStorage so the next visit
   *  keeps offering the saved sig, then auto-places at the page
   *  bottom-third. After placing, switches tool back to 'text' so the
   *  follow-up click on the PDF doesn't accidentally request another
   *  signature workflow. */
  const placeSignature = useCallback((dataUrl: string, w: number, h: number, applyToAll: boolean) => {
    if (!dataUrl) return;
    const targetPages = applyToAll && pageInfos.length > 0
      ? pageInfos.map(p => p.index)
      : [currentPage];
    const xPct = Math.max(0, 50 - SIG_DEFAULT_W / 2);
    const yPct = Math.max(0, Math.min(100 - SIG_DEFAULT_H, SIG_AUTOPLACE_Y));
    setElements(prev => [
      ...prev,
      ...targetPages.map<FsElement>(p => ({
        id: newId(),
        type: 'signature',
        page: p,
        x: xPct,
        y: yPct,
        w: SIG_DEFAULT_W,
        h: SIG_DEFAULT_H,
        dataUrl,
      })),
    ]);
    const sig: SavedSig = { dataUrl, w: w || 0, h: h || 0 };
    setSavedSig(sig);
    persistSavedSig(sig);
    setSigModal(null);
    setCreatingSig(null);
    setEditingSig(null);
    setTool('text');
  }, [currentPage, pageInfos, persistSavedSig]);

  /** "Use this signature" in the chooser modal — auto-place the saved
   *  sig on the current page. Apply-to-all is only offered in the
   *  create modal; chooser is one-click for the common case. */
  const onSigReuse = () => {
    if (!savedSig) return;
    placeSignature(savedSig.dataUrl, savedSig.w, savedSig.h, false);
  };
  const onSigCreateNew = () => {
    setCreatingSig(initCreatingSig());
    setSigModal('create');
  };
  const onSigCancel = () => {
    setSigModal(null);
    setCreatingSig(null);
    if (editingSig) { setEditingSig(null); return; }
    setTool('text');
  };

  /** Fired by the SignatureCanvas on every stroke-end. We only stash
   *  the dataUrl into creatingSig — actual placement happens when the
   *  user clicks Save in the modal toolbar. */
  const onDrawData = useCallback((dataUrl: string, w: number, h: number) => {
    setCreatingSig(prev => prev ? { ...prev, drawData: dataUrl, drawW: w, drawH: h } : prev);
  }, []);

  /** Save handler for the create-signature modal. Distinguishes
   *  Edit-existing (from the pencil icon on a placed sig) from
   *  brand-new placement. Edit replaces dataUrl in-place; new
   *  placement auto-places via placeSignature(). */
  const onSaveCreatingSig = () => {
    if (!creatingSig) return;
    let dataUrl = '', w = 0, h = 0;
    if (creatingSig.mode === 'draw') {
      if (!creatingSig.drawData) return;
      dataUrl = creatingSig.drawData;
      w = creatingSig.drawW;
      h = creatingSig.drawH;
    } else {
      if (!creatingSig.typedName.trim() || !typedSigDataUrl) return;
      dataUrl = typedSigDataUrl;
      w = typedSigSizeRef.current.w;
      h = typedSigSizeRef.current.h;
    }
    if (editingSig) {
      updateElement(editingSig.id, { dataUrl } as Partial<FsElement>);
      const sig: SavedSig = { dataUrl, w, h };
      setSavedSig(sig);
      persistSavedSig(sig);
      setEditingSig(null);
      setSigModal(null);
      setCreatingSig(null);
      return;
    }
    placeSignature(dataUrl, w, h, creatingSig.applyToAll);
  };

  // ── Type-tab signature → PNG dataUrl. Mirrors the canvas-render
  // pipeline used by /sign so the on-screen preview and the embedded
  // PNG match pixel-for-pixel. Recomputes whenever the typed name or
  // font changes; clears when the input is empty.
  useEffect(() => {
    if (!creatingSig || creatingSig.mode !== 'type') return;
    const name = creatingSig.typedName;
    if (!name.trim()) {
      setTypedSigDataUrl('');
      return;
    }
    const canvas = document.createElement('canvas');
    const maxW = 600;
    const H = 100;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    let fontSize = 48;
    ctx.font = `italic ${fontSize}px ${creatingSig.typedFont}`;
    let textW = ctx.measureText(name).width;
    const padding = 24;
    while (textW > maxW - padding && fontSize > 18) {
      fontSize -= 2;
      ctx.font = `italic ${fontSize}px ${creatingSig.typedFont}`;
      textW = ctx.measureText(name).width;
    }
    canvas.width = Math.min(maxW, textW + padding);
    ctx.clearRect(0, 0, canvas.width, H);
    ctx.font = `italic ${fontSize}px ${creatingSig.typedFont}`;
    ctx.fillStyle = '#1e3a8a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, canvas.width / 2, H / 2);
    setTypedSigDataUrl(canvas.toDataURL('image/png'));
    typedSigSizeRef.current = { w: canvas.width, h: canvas.height };
  }, [creatingSig?.mode, creatingSig?.typedName, creatingSig?.typedFont, creatingSig]);

  // ── Click on the PDF canvas → place an element + open inline editor ──
  const onPageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Suppress the synthetic click that fires right after a drag/
    // resize mouseup. Without this, releasing a drag into a sliver
    // of empty page area (cursor outpacing the element by a few px)
    // creates a stray new element on top of the just-moved one.
    if (justDraggedRef.current) return;
    if (e.target instanceof HTMLElement && (
      e.target.closest('.fse-text-wrap') ||
      e.target.closest('.fse-element-image') ||
      e.target.closest('.fse-popup')
    )) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top)  / rect.height) * 100;

    if (tool === 'text') {
      const id = newId();
      addElement({
        id, type: 'text', page: currentPage, x: xPct, y: yPct,
        value: '', fontSize: DEFAULT_FONT, color: TEXT_DEFAULT_COLOR,
      });
      setEditing({ id, originalValue: '', draftValue: '' });
      return;
    }

    if (tool === 'date') {
      const id = newId();
      const today = todayDisplay();
      addElement({
        id, type: 'date', page: currentPage, x: xPct, y: yPct,
        value: today, fontSize: DEFAULT_FONT, color: TEXT_DEFAULT_COLOR,
      });
      // Open popup pre-filled with today; user can leave or edit.
      setEditing({ id, originalValue: today, draftValue: today });
      return;
    }

    // Signature tool no longer uses click-to-place — auto-placement
    // happens when the user clicks Save in the create-signature modal
    // (see placeSignature). A click on the page surface while
    // tool === 'signature' is just a no-op now.
  };

  // ── Inline edit save / cancel ─────────────────────────────────────────
  const saveEdit = useCallback(() => {
    if (!editing) return;
    const draft = editing.draftValue.trim();
    if (!draft) {
      // Empty value on save → remove (no point in an empty placement).
      removeElement(editing.id);
    } else {
      updateElement(editing.id, { value: draft } as Partial<FsElement>);
    }
    setEditing(null);
  }, [editing, removeElement, updateElement]);

  const cancelEdit = useCallback(() => {
    if (!editing) return;
    if (editing.originalValue === '') {
      // New placement that was never filled → remove.
      removeElement(editing.id);
    }
    // else: element stays untouched (we never updated it on keystroke).
    setEditing(null);
  }, [editing, removeElement]);

  // Click anywhere outside the popup commits the current draft.
  useEffect(() => {
    if (!editing) return;
    const onDocClick = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement | null;
      if (target && target.closest('.fse-popup')) return;
      if (target && target.closest('.fse-text-wrap')) return;
      saveEdit();
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [editing, saveEdit]);

  // Open the editor for any placed element. Text/date opens the inline
  // popup; signature pops the SignatureCanvas modal in re-draw mode so
  // the user can replace the existing dataUrl without going through the
  // place-on-click pendingSig workflow.
  const openEditFor = (el: FsElement) => {
    if (el.type === 'text' || el.type === 'date') {
      setEditing({ id: el.id, originalValue: el.value, draftValue: el.value });
      return;
    }
    if (el.type === 'signature') {
      // Open the same create-signature modal in "edit" mode. Both the
      // editingSig flag AND a fresh creatingSig must be set — the
      // modal JSX is gated on `sigModal === 'create' && creatingSig`,
      // so without the second call the modal would silently fail to
      // render (the bug that made the ✏️ button do nothing). drawData
      // is pre-seeded to the existing dataUrl so Save without further
      // edits keeps the signature intact (canSave reads drawData).
      setEditingSig({ id: el.id });
      setCreatingSig(initCreatingSig({ drawData: el.dataUrl }));
      setSigModal('create');
    }
  };

  // ── Drag (handle / signature body) + signature resize ────────────────
  // All of these handlers share the same shape:
  //   1. Track movement from mousedown.
  //   2. Only flip into "dragging" mode once the cursor has moved
  //      DRAG_THRESHOLD_PX. A pure click below threshold → no drag,
  //      no spurious move-to-new-position from sub-pixel jitter.
  //   3. On mouseup, if we were dragging, call markJustDragged() so
  //      the synthetic click that follows is swallowed by onPageClick.
  // Pure clicks on the drag-handle / signature body do nothing
  // intentional — those surfaces are for dragging, not editing. Pure
  // clicks on the text body (handled in onTextBodyMouseDown) still
  // open the inline editor.
  type DragRefState = {
    id: string;
    startX: number; startY: number;
    startEl: FsElement;
    pageRect: DOMRect;
  };
  const dragRef = useRef<DragRefState | null>(null);

  const onDragMouseDown = (e: React.MouseEvent, el: FsElement) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const pageEl = (e.currentTarget as HTMLElement).closest('.fse-page') as HTMLElement | null;
    if (!pageEl) return;
    const pageRect = pageEl.getBoundingClientRect();
    let hasDragged = false;

    const onMove = (ev: MouseEvent) => {
      if (!hasDragged) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > DRAG_THRESHOLD_PX) {
          hasDragged = true;
          dragRef.current = { id: el.id, startX, startY, startEl: { ...el }, pageRect };
          setDraggingId(el.id);
          document.body.style.userSelect = 'none';
        }
      }
      if (hasDragged) {
        const ds = dragRef.current;
        if (!ds) return;
        const dxPct = ((ev.clientX - ds.startX) / ds.pageRect.width)  * 100;
        const dyPct = ((ev.clientY - ds.startY) / ds.pageRect.height) * 100;
        const newX = Math.max(0, Math.min(100, ds.startEl.x + dxPct));
        const newY = Math.max(0, Math.min(100, ds.startEl.y + dyPct));
        updateElement(ds.id, { x: newX, y: newY } as Partial<FsElement>);
      }
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (hasDragged) {
        dragRef.current = null;
        setDraggingId(null);
        document.body.style.userSelect = '';
        markJustDragged();
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const onDragTouchStart = (e: React.TouchEvent, el: FsElement) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    e.stopPropagation();
    const startX = t.clientX, startY = t.clientY;
    const pageEl = (e.currentTarget as HTMLElement).closest('.fse-page') as HTMLElement | null;
    if (!pageEl) return;
    const pageRect = pageEl.getBoundingClientRect();
    let hasDragged = false;

    const onMove = (ev: TouchEvent) => {
      const tt = ev.touches[0];
      if (!hasDragged) {
        if (Math.hypot(tt.clientX - startX, tt.clientY - startY) > DRAG_THRESHOLD_PX) {
          hasDragged = true;
          dragRef.current = { id: el.id, startX, startY, startEl: { ...el }, pageRect };
          setDraggingId(el.id);
        }
      }
      if (hasDragged) {
        ev.preventDefault();
        const ds = dragRef.current;
        if (!ds) return;
        const dxPct = ((tt.clientX - ds.startX) / ds.pageRect.width)  * 100;
        const dyPct = ((tt.clientY - ds.startY) / ds.pageRect.height) * 100;
        const newX = Math.max(0, Math.min(100, ds.startEl.x + dxPct));
        const newY = Math.max(0, Math.min(100, ds.startEl.y + dyPct));
        updateElement(ds.id, { x: newX, y: newY } as Partial<FsElement>);
      }
    };
    const onUp = () => {
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
      if (hasDragged) {
        dragRef.current = null;
        setDraggingId(null);
        markJustDragged();
      }
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
    let hasDragged = false;

    const onMove = (ev: MouseEvent) => {
      if (!hasDragged) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > DRAG_THRESHOLD_PX) {
          hasDragged = true;
          setDraggingId(el.id);
        } else {
          return;
        }
      }
      const dxPct = ((ev.clientX - startX) / pageRect.width)  * 100;
      const dyPct = ((ev.clientY - startY) / pageRect.height) * 100;
      let newW = startW, newH = startH;
      let newXel = startElX, newYel = startElY;
      if (corner === 'se') { newW = startW + dxPct; newH = startH + dyPct; }
      else if (corner === 'sw') { newW = startW - dxPct; newXel = startElX + dxPct; newH = startH + dyPct; }
      else if (corner === 'ne') { newW = startW + dxPct; newH = startH - dyPct; newYel = startElY + dyPct; }
      else if (corner === 'nw') { newW = startW - dxPct; newXel = startElX + dxPct; newH = startH - dyPct; newYel = startElY + dyPct; }

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
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (hasDragged) {
        setDraggingId(null);
        markJustDragged();
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // ── Page selection — derived from signature placements ──────────────
  // The thumbnail-strip ticks reflect "which pages currently hold a
  // signature placement". Recomputed whenever the elements list
  // changes (signature added → page ticked, all sigs deleted on a
  // page → page un-ticked, signature duplicated to another page →
  // that page also ticked). Pure derived state, no user toggles.
  useEffect(() => {
    const next = Array.from(new Set(
      elements.filter(e => e.type === 'signature').map(e => e.page),
    )).sort((a, b) => a - b);
    setSelectedPages(prev => {
      if (prev.length === next.length && prev.every((p, i) => p === next[i])) return prev;
      return next;
    });
  }, [elements]);

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
      const effectiveWatermark = unlimited ? false : addWatermark;
      const blob = await applyFillSign({ pdfFile: file, elements, addWatermark: effectiveWatermark });
      onDone?.(blob);
    } catch (e) {
      console.error('FillSign done:', e);
      setError(e instanceof Error ? e.message : 'Could not generate PDF.');
    } finally {
      setProcessing(false);
    }
  };

  // ── Click-or-drag on the text body ────────────────────────────────────
  // Mousedown sets up listeners; if the cursor moves more than
  // DRAG_THRESHOLD_PX before mouseup, it's a drag — otherwise it's a
  // click and we open the editor. Excludes handle / action targets so
  // those buttons keep their own behaviour.
  const onTextBodyMouseDown = (e: React.MouseEvent, el: FsElement) => {
    const target = e.target as HTMLElement;
    if (target.closest('.fse-handle') || target.closest('.fse-action')) return;
    if (editing?.id === el.id) return;
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX, startY = e.clientY;
    const pageEl = (e.currentTarget as HTMLElement).closest('.fse-page') as HTMLElement | null;
    if (!pageEl) return;
    const pageRect = pageEl.getBoundingClientRect();
    let dragging = false;

    const onMove = (ev: MouseEvent) => {
      if (!dragging) {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
          dragging = true;
          setDraggingId(el.id);
          document.body.style.userSelect = 'none';
          dragRef.current = {
            id: el.id,
            startX, startY,
            startEl: { ...el },
            pageRect,
          };
        }
      }
      if (dragging) {
        const ds = dragRef.current;
        if (!ds) return;
        const dxPct = ((ev.clientX - ds.startX) / ds.pageRect.width)  * 100;
        const dyPct = ((ev.clientY - ds.startY) / ds.pageRect.height) * 100;
        const newX = Math.max(0, Math.min(100, ds.startEl.x + dxPct));
        const newY = Math.max(0, Math.min(100, ds.startEl.y + dyPct));
        updateElement(ds.id, { x: newX, y: newY } as Partial<FsElement>);
      }
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
      if (dragging) {
        dragRef.current = null;
        setDraggingId(null);
        markJustDragged();
      } else {
        openEditFor(el);
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Same click-or-drag for touch.
  const onTextBodyTouchStart = (e: React.TouchEvent, el: FsElement) => {
    const target = e.target as HTMLElement;
    if (target.closest('.fse-handle') || target.closest('.fse-action')) return;
    if (editing?.id === el.id) return;
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    e.stopPropagation();

    const startX = t.clientX, startY = t.clientY;
    const pageEl = (e.currentTarget as HTMLElement).closest('.fse-page') as HTMLElement | null;
    if (!pageEl) return;
    const pageRect = pageEl.getBoundingClientRect();
    let dragging = false;

    const onMove = (ev: TouchEvent) => {
      const tt = ev.touches[0];
      if (!dragging) {
        const dx = tt.clientX - startX;
        const dy = tt.clientY - startY;
        if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
          dragging = true;
          setDraggingId(el.id);
          dragRef.current = {
            id: el.id,
            startX, startY,
            startEl: { ...el },
            pageRect,
          };
        }
      }
      if (dragging) {
        ev.preventDefault();
        const ds = dragRef.current;
        if (!ds) return;
        const dxPct = ((tt.clientX - ds.startX) / ds.pageRect.width)  * 100;
        const dyPct = ((tt.clientY - ds.startY) / ds.pageRect.height) * 100;
        const newX = Math.max(0, Math.min(100, ds.startEl.x + dxPct));
        const newY = Math.max(0, Math.min(100, ds.startEl.y + dyPct));
        updateElement(ds.id, { x: newX, y: newY } as Partial<FsElement>);
      }
    };
    const onUp = () => {
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
      if (dragging) {
        dragRef.current = null;
        setDraggingId(null);
        markJustDragged();
      } else {
        openEditFor(el);
      }
    };
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  };

  // ── Render helpers ────────────────────────────────────────────────────
  const renderTextOrDate = (el: FsElement) => {
    if (el.type !== 'text' && el.type !== 'date') return null;
    const isEditing = editing?.id === el.id;
    const isDragging = draggingId === el.id;
    if (isEditing) return null; // popup replaces the element while editing
    const wrapClass = `fse-text-wrap${isDragging ? ' fse-text-wrap-dragging' : ''}`;
    const placeholder = el.type === 'date' ? 'date' : 'text';
    return (
      <div
        key={el.id}
        className={wrapClass}
        style={{ left: `${el.x}%`, top: `${el.y}%` }}
        onMouseDown={(e) => onTextBodyMouseDown(e, el)}
        onTouchStart={(e) => onTextBodyTouchStart(e, el)}
      >
        <span
          className="fse-text-value"
          style={{ fontSize: `${el.fontSize}px`, color: el.color }}
        >
          {el.value || <em className="fse-text-placeholder">{placeholder}</em>}
        </span>
        <span
          className="fse-handle"
          aria-label="Drag to move"
          title="Drag to move"
          onMouseDown={(e) => onDragMouseDown(e, el)}
          onTouchStart={(e) => onDragTouchStart(e, el)}
        >
          <GripVertical size={12} strokeWidth={2.2} />
        </span>
        <span
          className="fse-action fse-action-edit"
          aria-label="Edit"
          title="Edit"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); openEditFor(el); }}
        >
          <Pencil size={11} strokeWidth={2.2} />
        </span>
        <span
          className="fse-action fse-action-dup"
          aria-label="Duplicate"
          title="Duplicate"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); duplicateElement(el.id); }}
        >
          <CopyPlus size={11} strokeWidth={2.2} />
        </span>
        <span
          className="fse-action fse-action-del"
          aria-label="Delete"
          title="Delete"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); removeElement(el.id); }}
        >
          <X size={12} strokeWidth={2.4} />
        </span>
      </div>
    );
  };

  const renderSignature = (el: FsElement) => {
    if (el.type !== 'signature') return null;
    const isDragging = draggingId === el.id;
    return (
      <div
        key={el.id}
        className={`fse-element fse-element-image${isDragging ? ' fse-element-dragging' : ''}`}
        style={{ left: `${el.x}%`, top: `${el.y}%`, width: `${el.w}%`, height: `${el.h}%` }}
        onMouseDown={(e) => onDragMouseDown(e, el)}
        onTouchStart={(e) => onDragTouchStart(e, el)}
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={el.dataUrl} alt="signature" className="fse-element-img" draggable={false} />
        <button
          type="button"
          className="fse-element-edit"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); openEditFor(el); }}
          aria-label="Edit"
          title="Edit"
        >
          <Pencil size={11} />
        </button>
        <button
          type="button"
          className="fse-element-dup"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); duplicateElement(el.id); }}
          aria-label="Duplicate"
          title="Duplicate"
        >
          <CopyPlus size={11} />
        </button>
        <button
          type="button"
          className="fse-element-x"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); removeElement(el.id); }}
          aria-label="Delete"
          title="Delete"
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

  // Inline-edit popup positioned over the page, with edge-aware clamping.
  const renderEditPopup = () => {
    if (!editing || !currentInfo) return null;
    const el = elements.find(e => e.id === editing.id);
    if (!el || el.page !== currentPage) return null;
    if (el.type !== 'text' && el.type !== 'date') return null;

    const pageW = currentInfo.width;
    const pageH = currentInfo.height;
    const elPx = (el.x / 100) * pageW;
    const elPy = (el.y / 100) * pageH;
    let left = elPx;
    let top  = elPy;
    const margin = 8;
    if (left + POPUP_WIDTH_PX > pageW - margin) {
      left = Math.max(margin, pageW - POPUP_WIDTH_PX - margin);
    }
    if (top + POPUP_HEIGHT_PX > pageH - margin) {
      top = Math.max(margin, top - POPUP_HEIGHT_PX - 4);
    }

    const placeholder = el.type === 'date' ? 'MM/DD/YYYY' : 'Type text…';
    // Auto-grow the textarea to fit its content. Resets to auto first so
    // the scrollHeight reflects current rather than previous height.
    const autoResize = (node: HTMLTextAreaElement | null) => {
      if (!node) return;
      node.style.height = 'auto';
      node.style.height = `${node.scrollHeight}px`;
    };
    return (
      <div
        className="fse-popup"
        style={{ left: `${left}px`, top: `${top}px`, width: POPUP_WIDTH_PX }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <textarea
          ref={(node) => {
            if (!node) return;
            if (document.activeElement !== node) {
              try { node.focus({ preventScroll: true }); }
              catch { node.focus(); }
              node.select();
            }
            autoResize(node);
          }}
          rows={1}
          value={editing.draftValue}
          onChange={(e) => {
            setEditing({ ...editing, draftValue: e.target.value });
            autoResize(e.currentTarget);
          }}
          onKeyDown={(e) => {
            // Enter saves, Shift+Enter inserts a newline (default
            // textarea behavior), Esc cancels.
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              saveEdit();
            } else if (e.key === 'Escape') {
              cancelEdit();
            }
          }}
          placeholder={placeholder}
          className="fse-popup-input"
          style={{ fontSize: `${el.fontSize}px` }}
        />
        <div className="fse-popup-bar">
          <div className="fse-popup-sizes" role="group" aria-label="Font size">
            {FONT_SIZES.map(s => {
              const active = el.fontSize === s.pt;
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`fse-popup-size${active ? ' active' : ''}`}
                  onClick={() => updateElement(el.id, { fontSize: s.pt } as Partial<FsElement>)}
                  aria-label={`${s.label === 'S' ? 'Small' : s.label === 'M' ? 'Medium' : 'Large'} (${s.pt}pt)`}
                  title={`${s.label === 'S' ? 'Small' : s.label === 'M' ? 'Medium' : 'Large'} (${s.pt}pt)`}
                  aria-pressed={active}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
          <div className="fse-popup-actions">
            <button
              type="button"
              className="fse-popup-confirm"
              onClick={saveEdit}
              aria-label="Save"
              title="Save"
            >
              <Check size={14} />
            </button>
            <button
              type="button"
              className="fse-popup-cancel"
              onClick={cancelEdit}
              aria-label="Cancel"
              title="Cancel"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const visibleElements = elements.filter(e => e.page === currentPage);
  const currentInfo = pageInfos.find(p => p.index === currentPage);
  const canDone = elements.length > 0 && !processing;
  // Show signed-page ticks whenever any signature is placed; pure
  // visual indicator (no longer tied to a placement workflow).
  const showThumbTicks = selectedPages.length > 0;
  const totalPages = pageInfos.length;

  return (
    <div className="fse" ref={editorRootRef}>
      <div className="fse-main">
        {/* Layout order per spec: thumbnails on top, toolbar right above
            the document, PDF below — tools are physically next to the
            surface they apply to. */}
        {totalPages > 1 && (
          <div className="fse-thumb-strip-wrap">
            <div className="fse-thumb-strip-label">
              <FileText size={14} /> Pages:
            </div>
            <div className="fse-thumb-strip">
              {pageInfos.map(p => {
                const isCurrent = currentPage === p.index;
                const isSelected = selectedPages.includes(p.index);
                return (
                  <div
                    key={p.index}
                    className={`fse-thumb${isCurrent ? ' fse-thumb-current' : ''}${isSelected && showThumbTicks ? ' fse-thumb-selected' : ''}`}
                    onClick={() => setCurrentPage(p.index)}
                  >
                    <div className="fse-thumb-img-wrap">
                      {thumbnails[p.index] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumbnails[p.index]} alt={`Page ${p.index}`} />
                      ) : (
                        <span className="fse-thumb-placeholder">Page {p.index}</span>
                      )}
                      {isSelected && showThumbTicks && (
                        <span className="fse-thumb-tick" aria-hidden="true" title="Signature placed on this page">✓</span>
                      )}
                    </div>
                    <div className="fse-thumb-foot">
                      <span className="fse-thumb-num">{p.index}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="fse-thumb-strip-hint">
              <CheckSquare size={11} /> Click a thumbnail to switch page
              {showThumbTicks ? ' · ✓ marks pages with signatures' : ''}
            </div>
            {showThumbTicks && (
              <div className="fse-selected-summary">
                <strong>✓ Signed on {selectedPages.length} page{selectedPages.length > 1 ? 's' : ''}:</strong>{' '}
                {selectedPages.join(', ')}
              </div>
            )}
          </div>
        )}

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
        </div>

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
              className={`fse-page tool-${tool}`}
              style={{ width: currentInfo.width, height: currentInfo.height }}
              onClick={onPageClick}
            >
              <canvas ref={canvasRef} />
              <div className="fse-page-overlay">
                {visibleElements.map(el => el.type === 'signature' ? renderSignature(el) : renderTextOrDate(el))}
                {renderEditPopup()}
              </div>
              <span className="fse-page-label">Page {currentPage} of {totalPages}</span>
            </div>
          )}
        </div>
      </div>

      <aside className="fse-sidebar">
        {/* Tip — prominent header banner instead of footnote text. */}
        <div className="fse-tip-card" role="note">
          <Lightbulb size={18} strokeWidth={2.2} />
          <span>Click text to edit, drag to move, drag corners to resize signatures.</span>
        </div>

        {/* Placed elements grouped by page. Each row is clickable —
            switches to the row's page and opens the inline editor for
            that text/date element. Per-row 📋 copies the value. */}
        <div className="fse-sidebar-card">
          <div className="fse-sidebar-title">
            <Check size={14} /> Placed elements ({elements.length})
          </div>
          {elements.length === 0 ? (
            <p className="fse-sidebar-empty">Pick a tool below, then click on the PDF to place it.</p>
          ) : (
            <div className="fse-list-groups">
              {pageInfos.map(p => {
                const els = elements.filter(e => e.page === p.index);
                if (els.length === 0 && p.index !== currentPage) return null;
                return (
                  <div key={p.index} className="fse-list-group">
                    <div className="fse-list-group-title">Page {p.index}</div>
                    {els.length === 0 ? (
                      <div className="fse-list-group-empty">(no elements yet)</div>
                    ) : (
                      <ul className="fse-list">
                        {els.map(el => {
                          let preview: React.ReactNode;
                          if (el.type === 'signature') preview = 'Signature';
                          else if (el.value) preview = previewLine(el.value);
                          else preview = <em className="fse-list-empty">(empty)</em>;
                          const Icon = typeIconFor(el.type);
                          const onRowClick = () => {
                            if (el.page !== currentPage) {
                              setCurrentPage(el.page);
                              setTimeout(() => openEditFor(el), 30);
                            } else {
                              openEditFor(el);
                            }
                          };
                          return (
                            <li
                              key={el.id}
                              className="fse-list-item"
                              onClick={onRowClick}
                              role="button"
                              tabIndex={0}
                            >
                              <span className="fse-list-icon" aria-hidden="true">
                                <Icon size={16} strokeWidth={2} />
                              </span>
                              <div className="fse-list-main">
                                <div className="fse-list-preview">{preview}</div>
                              </div>
                              <div className="fse-list-actions">
                                <button
                                  type="button"
                                  className="fse-list-edit"
                                  onClick={(e) => { e.stopPropagation(); onRowClick(); }}
                                  aria-label="Edit"
                                  title="Edit"
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  type="button"
                                  className="fse-list-dup"
                                  onClick={(e) => { e.stopPropagation(); duplicateElement(el.id); }}
                                  aria-label="Duplicate"
                                  title="Duplicate"
                                >
                                  <CopyPlus size={12} />
                                </button>
                                <button
                                  type="button"
                                  className="fse-list-remove"
                                  onClick={(e) => { e.stopPropagation(); removeElement(el.id); }}
                                  aria-label="Delete"
                                  title="Delete"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          className="fse-sidebar-cta"
          disabled={!canDone}
          onClick={handleDone}
        >
          {processing ? <Loader2 className="fse-spin" size={16} /> : <Download size={16} />}
          <span>{processing ? 'Generating…' : 'Sign & Download'}</span>
        </button>

        {/* Watermark/plan warning hidden when `unlimited` (NDA flow). */}
        {!unlimited && !hasSubscription && (
          <div className="fse-sidebar-card fse-sidebar-card-info">
            <div className="fse-sidebar-plan">
              Free plan — output gets a small <strong>SignMyPDF.io</strong> watermark after the daily limit.
            </div>
          </div>
        )}
      </aside>

      <button
        type="button"
        className="fse-fab"
        disabled={!canDone}
        onClick={handleDone}
      >
        {processing ? <Loader2 className="fse-spin" size={18} /> : <Download size={18} />}
        <span>{processing ? 'Generating…' : 'Sign & Download'}</span>
      </button>

      {sigModal === 'create' && creatingSig && (() => {
        const headTitle = editingSig
          ? 'Edit signature'
          : creatingSig.mode === 'draw' ? 'Draw your signature' : 'Type your signature';
        const canSave = creatingSig.mode === 'draw'
          ? !!creatingSig.drawData
          : !!creatingSig.typedName.trim() && !!typedSigDataUrl;
        // Pre-load the existing signature into the canvas when editing
        // a placed sig — lets the user extend or redraw it instead of
        // starting from a blank surface.
        const editingSigEl = editingSig ? elements.find(e => e.id === editingSig.id) : null;
        const editingSigDataUrl = editingSigEl && editingSigEl.type === 'signature'
          ? editingSigEl.dataUrl
          : undefined;
        return (
          <div className="fse-modal" role="dialog" aria-modal="true" onClick={onSigCancel}>
            <div className="fse-modal-card fse-modal-card-wide" onClick={e => e.stopPropagation()}>
              <div className="fse-modal-head">
                <h3>{headTitle}</h3>
                <button type="button" className="fse-modal-close" onClick={onSigCancel} aria-label="Close">
                  <X size={18} />
                </button>
              </div>

              <div className="fse-sig-tabs" role="tablist" aria-label="Signature mode">
                <button
                  type="button"
                  role="tab"
                  aria-selected={creatingSig.mode === 'draw'}
                  className={`fse-sig-tab${creatingSig.mode === 'draw' ? ' active' : ''}`}
                  onClick={() => setCreatingSig(s => s ? { ...s, mode: 'draw' } : s)}
                >
                  <Pencil size={14} /> Draw
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={creatingSig.mode === 'type'}
                  className={`fse-sig-tab${creatingSig.mode === 'type' ? ' active' : ''}`}
                  onClick={() => setCreatingSig(s => s ? { ...s, mode: 'type' } : s)}
                >
                  <Keyboard size={14} /> Type
                </button>
              </div>

              {creatingSig.mode === 'draw' && (
                <SignatureCanvas onSave={onDrawData} initialDataUrl={editingSigDataUrl} />
              )}

              {creatingSig.mode === 'type' && (
                <div className="fse-sig-type">
                  <div className="fse-sig-fonts" role="group" aria-label="Font">
                    {SIG_FONTS.map(f => {
                      const active = creatingSig.typedFont === f.value;
                      return (
                        <button
                          key={f.value}
                          type="button"
                          className={`fse-sig-font${active ? ' active' : ''}`}
                          style={{ fontFamily: f.value }}
                          onClick={() => setCreatingSig(s => s ? { ...s, typedFont: f.value } : s)}
                        >
                          {f.name}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="text"
                    className="fse-sig-name"
                    placeholder="Your full name"
                    value={creatingSig.typedName}
                    onChange={(e) => setCreatingSig(s => s ? { ...s, typedName: e.target.value } : s)}
                    style={{ fontFamily: creatingSig.typedFont }}
                    autoFocus
                  />
                  {creatingSig.typedName.trim() && typedSigDataUrl && (
                    <div className="fse-sig-type-preview">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={typedSigDataUrl} alt="Signature preview" />
                    </div>
                  )}
                </div>
              )}

              <div className="fse-sig-modal-foot">
                {!editingSig && totalPages > 1 && (
                  <label className="fse-sig-applyall">
                    <input
                      type="checkbox"
                      checked={creatingSig.applyToAll}
                      onChange={(e) => setCreatingSig(s => s ? { ...s, applyToAll: e.target.checked } : s)}
                    />
                    <Layers size={13} />
                    <span>Apply to all pages</span>
                  </label>
                )}
                <div className="fse-sig-modal-actions">
                  <button type="button" className="fse-sig-modal-cancel" onClick={onSigCancel}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="fse-sig-modal-save"
                    onClick={onSaveCreatingSig}
                    disabled={!canSave}
                  >
                    {editingSig ? 'Update' : 'Save & place'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {sigModal === 'choose' && savedSig && (
        <div className="fse-modal" role="dialog" aria-modal="true" onClick={onSigCancel}>
          <div className="fse-modal-card" onClick={e => e.stopPropagation()}>
            <div className="fse-modal-head">
              <h3>Use your saved signature?</h3>
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
