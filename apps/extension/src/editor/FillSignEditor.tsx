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
  Upload as UploadIcon,
  X,
} from 'lucide-react';
import { SignatureCanvas } from '@signmypdf/ui';
import { setupPdfjs } from '@signmypdf/pdf-core';
import { applyFillSign, type FsElement } from './fillSignPdf';

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

/** Type-tab font choices for the signature modal. "Script" uses the
 *  locally-bundled Dancing Script woff2 (loaded via @font-face in
 *  editor.css) so the rendered signature looks identical on every OS.
 *  The others lean on cross-platform system fonts. */
const SIG_FONTS = [
  { name: 'Script',      value: '"Dancing Script", "Brush Script MT", cursive' },
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
  mode: 'draw' | 'type' | 'upload';
  drawData: string;
  drawW: number;
  drawH: number;
  typedName: string;
  typedFont: string;
  /** Uploaded signature image (PNG/JPG → dataUrl). Same shape as drawn
   *  signatures — a single dataUrl + intrinsic pixel dimensions. */
  uploadData: string;
  uploadW: number;
  uploadH: number;
  applyToAll: boolean;
}
/** Accepted MIME types for Upload mode. PNG (with alpha) is the
 *  expected format; JPG is allowed but discouraged in the hint. */
const UPLOAD_ACCEPT = 'image/png,image/jpeg';
/** Cap on the raw uploaded image size (10 MB). Larger images
 *  cause obvious lag both for the dataUrl encode and for the
 *  pdf-lib embedPng step. */
const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
/** Active inline-edit state. Tracks the original value so Esc / ✕ can
 *  revert; if the original was empty the element is removed instead. */
interface EditingState {
  id: string;
  originalValue: string;
  draftValue: string;
}

interface Props {
  file: File;
  onDone?: (blob: Blob) => void;
}

export default function FillSignEditor({ file, onDone }: Props) {
  const [tool, setTool] = useState<ToolId>('text');
  const [elements, setElements] = useState<FsElement[]>([]);
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

  // In-memory only — dropped on tab close. The extension has zero
  // cross-session persistence by design.
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
        const pdfjsLib = await setupPdfjs(chrome.runtime.getURL('pdf.worker.min.mjs'));
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
   *  the element's own width/height). */
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
    uploadData: '',
    uploadW: 0,
    uploadH: 0,
    applyToAll: false,
    ...overrides,
  });

  /** Upload-mode file picker handler. Reads the chosen image into a
   *  dataUrl, measures its intrinsic dimensions with an offscreen
   *  Image, and stashes the result in creatingSig.upload*. Same
   *  shape as drawn signatures so placeSignature() can consume both
   *  uniformly. Rejects oversize files via UPLOAD_MAX_BYTES. */
  const onUploadFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset input so picking the same file again still fires onChange.
    e.target.value = '';
    if (!file) return;
    if (file.size > UPLOAD_MAX_BYTES) {
      alert('Image is too large. Please choose a file under 10 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) return;
      const img = new Image();
      img.onload = () => {
        setCreatingSig(prev =>
          prev ? { ...prev, uploadData: dataUrl, uploadW: img.naturalWidth, uploadH: img.naturalHeight } : prev,
        );
      };
      img.onerror = () => {
        alert('Could not read this image. Try a different PNG or JPG.');
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      alert('Could not read this image. Try a different PNG or JPG.');
    };
    reader.readAsDataURL(file);
  }, []);

  const onToolClick = (t: ToolId) => {
    setTool(t);
    if (t === 'signature') {
      // In-session saved signature → offer "Use saved / Create new"
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
   *  modal. Auto-places at the page bottom-third. After placing,
   *  switches tool back to 'text' so the follow-up click on the PDF
   *  doesn't accidentally request another signature workflow. */
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
    setSavedSig({ dataUrl, w: w || 0, h: h || 0 });
    setSigModal(null);
    setCreatingSig(null);
    setEditingSig(null);
    setTool('text');
  }, [currentPage, pageInfos]);

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
    } else if (creatingSig.mode === 'type') {
      if (!creatingSig.typedName.trim() || !typedSigDataUrl) return;
      dataUrl = typedSigDataUrl;
      w = typedSigSizeRef.current.w;
      h = typedSigSizeRef.current.h;
    } else {
      // 'upload'
      if (!creatingSig.uploadData) return;
      dataUrl = creatingSig.uploadData;
      w = creatingSig.uploadW;
      h = creatingSig.uploadH;
    }
    if (editingSig) {
      updateElement(editingSig.id, { dataUrl } as Partial<FsElement>);
      setSavedSig({ dataUrl, w, h });
      setEditingSig(null);
      setSigModal(null);
      setCreatingSig(null);
      return;
    }
    placeSignature(dataUrl, w, h, creatingSig.applyToAll);
  };

  // ── Type-tab signature → PNG dataUrl. Mirrors the canvas-render
  // pipeline so the on-screen preview and the embedded PNG match
  // pixel-for-pixel. Recomputes whenever the typed name or font
  // changes; clears when the input is empty.
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
      // render. drawData is pre-seeded to the existing dataUrl so Save
      // without further edits keeps the signature intact.
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
    setProcessing(true);
    try {
      const blob = await applyFillSign({ pdfFile: file, elements });
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

        {/* Placed elements grouped by page. */}
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
          <span>{processing ? 'Generating…' : 'Download Signed PDF'}</span>
        </button>
      </aside>

      <button
        type="button"
        className="fse-fab"
        disabled={!canDone}
        onClick={handleDone}
      >
        {processing ? <Loader2 className="fse-spin" size={18} /> : <Download size={18} />}
        <span>{processing ? 'Generating…' : 'Download Signed PDF'}</span>
      </button>

      {sigModal === 'create' && creatingSig && (() => {
        const headTitle = editingSig
          ? 'Edit signature'
          : creatingSig.mode === 'draw' ? 'Draw your signature'
          : creatingSig.mode === 'type' ? 'Type your signature'
          : 'Upload your signature';
        const canSave = creatingSig.mode === 'draw'
          ? !!creatingSig.drawData
          : creatingSig.mode === 'type'
          ? (!!creatingSig.typedName.trim() && !!typedSigDataUrl)
          : !!creatingSig.uploadData;
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
                <button
                  type="button"
                  role="tab"
                  aria-selected={creatingSig.mode === 'upload'}
                  className={`fse-sig-tab${creatingSig.mode === 'upload' ? ' active' : ''}`}
                  onClick={() => setCreatingSig(s => s ? { ...s, mode: 'upload' } : s)}
                >
                  <UploadIcon size={14} /> Upload
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
                      <img src={typedSigDataUrl} alt="Signature preview" />
                    </div>
                  )}
                </div>
              )}

              {creatingSig.mode === 'upload' && (
                <div className="fse-sig-upload">
                  <label className={`fse-sig-upload-drop${creatingSig.uploadData ? ' has-image' : ''}`}>
                    <input
                      type="file"
                      accept={UPLOAD_ACCEPT}
                      onChange={onUploadFile}
                      className="fse-sig-upload-input"
                    />
                    {creatingSig.uploadData ? (
                      <>
                        <img
                          src={creatingSig.uploadData}
                          alt="Uploaded signature"
                          className="fse-sig-upload-preview"
                        />
                        <span className="fse-sig-upload-replace">Click to replace</span>
                      </>
                    ) : (
                      <>
                        <UploadIcon size={32} strokeWidth={1.6} />
                        <span className="fse-sig-upload-title">Click to choose an image</span>
                        <span className="fse-sig-upload-hint">PNG or JPG · transparent PNG recommended</span>
                      </>
                    )}
                  </label>
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
