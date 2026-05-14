import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CopyPlus,
  Download,
  FileSignature,
  FileText,
  GripVertical,
  Keyboard,
  Layers,
  Loader2,
  Minus,
  PenLine,
  Pencil,
  Plus,
  RotateCcw,
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

/** Default font size for new text/date elements (in PDF points).
 *  14pt is the sweet spot for typical form fields — large enough to
 *  read without leaning in, small enough to fit in tight cells.
 *  Per-element size is editable via the floating font-size bar. */
const DEFAULT_FONT = 14;
/** Available sizes in the floating font-size bar dropdown. */
const FONT_SIZE_OPTIONS = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48] as const;
const FONT_SIZE_MIN = 6;
const FONT_SIZE_MAX = 72;
const FONT_SIZE_STEP = 2;
const TEXT_DEFAULT_COLOR = '#0f172a';
/** New signatures land roughly in the visible centre of the page with
 *  enough size to read at a glance. We aim for 25% of page width and
 *  match the typed-/drawn-signature aspect ratio (~2.5:1) for the
 *  bounding box — the embedded PNG fits inside preserving its own
 *  aspect via fillSignPdf. Min 200x80 CSS-px so signatures on small
 *  pages don't render as a sliver. */
const SIG_DEFAULT_W_PCT = 25;
const SIG_DEFAULT_H_PCT = 10;
const SIG_MIN_W_CSS_PX = 200;
const SIG_MIN_H_CSS_PX = 80;
/** Vertical placement: ~30% from the top puts the box squarely in
 *  the visible viewport on the first page render. */
const SIG_AUTOPLACE_Y = 30;
/** Anti-overlap offset when there's already an element on the page
 *  (20 CSS px shifted into percent at place time). */
const ANTI_OVERLAP_OFFSET_PX = 20;

/** Type-tab signature font — single locally-bundled Dancing Script
 *  woff2 (loaded via @font-face in editor.css). Industry convention
 *  is one handwriting style, so we don't offer alternates. */
const SIG_TYPED_FONT = '"Dancing Script", cursive';
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

/** Strip all non-digits and insert `/` after positions 2 and 4 so the
 *  user can type plain digits and the slashes appear automatically.
 *  Limits the digit count to 8 (MM/DD/YYYY = 8 digits). Backspace
 *  removes characters left to right; an auto-inserted `/` is removed
 *  by the next backspace as soon as the digit count drops below the
 *  threshold that justified it. */
const applyDateMask = (input: string): string => {
  const digits = input.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};
/** Format check + calendar sanity (month 01-12, day 01-31 plus
 *  Date roll-over check so 02/30/2026 is rejected). */
const isValidDate = (s: string): boolean => {
  const m = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/(\d{4})$/.exec(s);
  if (!m) return false;
  const mm = parseInt(m[1], 10);
  const dd = parseInt(m[2], 10);
  const yyyy = parseInt(m[3], 10);
  const d = new Date(yyyy, mm - 1, dd);
  return d.getMonth() === mm - 1 && d.getDate() === dd && d.getFullYear() === yyyy;
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

/** Per-page geometry used by the renderer. `baseWidth` and `baseHeight`
 *  are the intrinsic page dimensions at `scale = 1` (kept so a resize
 *  can recompute scale without re-asking pdf.js). `width` and `height`
 *  are the current scaled CSS px the canvas is rendered at. */
interface PageInfo {
  index: number;
  baseWidth: number;
  baseHeight: number;
  scale: number;
  width: number;
  height: number;
}
/** Horizontal padding inside `.fse-page-area` that the page must
 *  subtract from the container's `clientWidth` to find its render
 *  width. Kept in sync with the CSS rule for `.fse-page-area`. */
const PAGE_AREA_PADDING_PX = 32;
/** Floor for the page render width — guards against transient
 *  resize observations where the column is briefly 0 px (e.g. when
 *  the right rail is mid-collapse). */
const PAGE_MIN_WIDTH_PX = 320;
/** Debounce window for rescale during continuous resize (window
 *  drag). Internal toggles (collapse/expand) bypass this for
 *  immediate feedback. */
const RESIZE_DEBOUNCE_MS = 150;
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
  /** Optional — when provided, renders a "Change PDF" secondary
   *  button in the tools-bar that calls this handler. The host shell
   *  is expected to confirm the discard before unmounting us. */
  onRequestNewPdf?: () => void;
}

export default function FillSignEditor({ file, onDone, onRequestNewPdf }: Props) {
  const [tool, setTool] = useState<ToolId>('text');
  const [elements, setElements] = useState<FsElement[]>([]);
  const [pageInfos, setPageInfos] = useState<PageInfo[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<EditingState | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  /** Currently-selected element id. Single-click on a placed element
   *  selects it; clicking outside any element clears the selection.
   *  When non-null and the element is text/date, the floating font-
   *  size bar renders above it. */
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  /** Right-sidebar collapse state. Initially collapsed on narrow
   *  viewports where 280 px on the right would crowd the document.
   *  Does NOT auto-react to subsequent resizes — once the user has
   *  expressed a preference (toggled), we stop second-guessing. */
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 1024;
  });

  const [processing, setProcessing] = useState(false);
  const [autoScrolled, setAutoScrolled] = useState(false);

  const editorRootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfRef = useRef<any>(null);

  /** Build page-geometry records sized to fill the current container
   *  width. Shared between the initial PDF load and the ResizeObserver
   *  rescale path so the math stays in one place. The container width
   *  is the column's `clientWidth` minus the page-area's own padding;
   *  we floor at PAGE_MIN_WIDTH_PX to survive transient 0-px reads
   *  during collapse animations. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const computePageInfos = useCallback(async (pdf: any, containerWidth: number): Promise<PageInfo[]> => {
    const targetWidth = Math.max(PAGE_MIN_WIDTH_PX, containerWidth - PAGE_AREA_PADDING_PX);
    const infos: PageInfo[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const p = await pdf.getPage(i);
      const baseViewport = p.getViewport({ scale: 1 });
      const scale = targetWidth / baseViewport.width;
      const viewport = p.getViewport({ scale });
      infos.push({
        index: i,
        baseWidth: baseViewport.width,
        baseHeight: baseViewport.height,
        scale,
        width: viewport.width,
        height: viewport.height,
      });
    }
    return infos;
  }, []);

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
        const infos = await computePageInfos(pdf, containerWidth);
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
  }, [file, computePageInfos]);

  /** Imperative recompute, reused by both the debounced ResizeObserver
   *  path (window edge drag) and the instant collapse/expand path
   *  (user toggles the right rail). Bails out while a drag is in
   *  flight so pageRect doesn't shift under the cursor mid-gesture. */
  const recomputeFromContainer = useCallback(async () => {
    if (draggingId) return;
    const containerEl = editorRootRef.current?.querySelector('.fse-page-area') as HTMLElement | null;
    if (!containerEl) return;
    const pdf = pdfRef.current;
    if (!pdf) return;
    const w = containerEl.clientWidth;
    if (w <= 0) return;
    try {
      const next = await computePageInfos(pdf, w);
      setPageInfos(prev => {
        // No-op if dimensions match — saves a canvas re-render.
        if (prev.length === next.length && prev.every((p, i) =>
          p.width === next[i].width && p.height === next[i].height
        )) return prev;
        return next;
      });
    } catch (e) {
      console.warn('[FillSignEditor] rescale failed:', e);
    }
  }, [draggingId, computePageInfos]);

  /** Debounced ResizeObserver — handles continuous resizes (window
   *  edge drag) so the PDF only re-renders once the user stops
   *  dragging. Placed elements survive the rescale automatically
   *  because x/y/w/h are stored as % of page; fontSize × scale is
   *  applied at render time so overlay text tracks the page. */
  useEffect(() => {
    if (loading || !editorRootRef.current) return;
    const containerEl = editorRootRef.current.querySelector('.fse-page-area') as HTMLElement | null;
    if (!containerEl) return;
    let debounceId: ReturnType<typeof setTimeout> | null = null;
    const observer = new ResizeObserver(() => {
      if (debounceId) clearTimeout(debounceId);
      debounceId = setTimeout(() => { void recomputeFromContainer(); }, RESIZE_DEBOUNCE_MS);
    });
    observer.observe(containerEl);
    return () => {
      observer.disconnect();
      if (debounceId) clearTimeout(debounceId);
    };
  }, [loading, recomputeFromContainer]);

  /** Instant rescale on right-rail toggle. ResizeObserver also fires
   *  for the same width change, but its debounce makes the PDF lag
   *  ~150 ms behind the column snap — perceived as a flash of the
   *  old scale. Reading clientWidth on the next animation frame
   *  guarantees the grid track has resolved to its new width before
   *  we measure. */
  useEffect(() => {
    if (loading) return;
    const rafId = requestAnimationFrame(() => { void recomputeFromContainer(); });
    return () => cancelAnimationFrame(rafId);
  }, [sidebarCollapsed, loading, recomputeFromContainer]);

  // ── Render the active page ────────────────────────────────────────────
  useEffect(() => {
    if (loading || !pdfRef.current || !canvasRef.current) return;
    const info = pageInfos.find(p => p.index === currentPage);
    if (!info) return;
    let cancelled = false;
    (async () => {
      try {
        const page = await pdfRef.current.getPage(currentPage);
        const viewport = page.getViewport({ scale: info.scale });
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
    setSelectedId(curr => (curr === id ? null : curr));
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
   *  modal. Auto-places at the centre of the page in a readably-large
   *  bounding box, anti-overlaps any existing element on the page,
   *  and selects the new signature so its resize handles are visible
   *  immediately. After placing, switches tool back to 'text'. */
  const placeSignature = useCallback((dataUrl: string, w: number, h: number, applyToAll: boolean) => {
    if (!dataUrl) return;
    const targetPages = applyToAll && pageInfos.length > 0
      ? pageInfos.map(p => p.index)
      : [currentPage];
    // Compute (x%, y%, w%, h%) per page so the bounding box is at
    // least 200×80 CSS-px and at least 25% × 10% of the page —
    // whichever is larger wins. Same shape for every page when
    // apply-to-all is on.
    const computePlacement = (page: number, existingElementsByPage: Record<number, FsElement[]>) => {
      const info = pageInfos.find(p => p.index === page);
      const pageW = info?.width ?? 800;
      const pageH = info?.height ?? 1040;
      const minWPct = Math.min(60, (SIG_MIN_W_CSS_PX / pageW) * 100);
      const minHPct = Math.min(40, (SIG_MIN_H_CSS_PX / pageH) * 100);
      const boxWPct = Math.max(SIG_DEFAULT_W_PCT, minWPct);
      const boxHPct = Math.max(SIG_DEFAULT_H_PCT, minHPct);
      let xPct = Math.max(0, 50 - boxWPct / 2);
      let yPct = Math.max(0, Math.min(100 - boxHPct, SIG_AUTOPLACE_Y));
      // Anti-overlap: if anything is already on this page, shift the
      // new sig 20 CSS-px down and right of the most recently-added
      // element on that page. Clamp to page bounds.
      const existing = existingElementsByPage[page] ?? [];
      const last = existing.length > 0 ? existing[existing.length - 1] : null;
      if (last) {
        const dxPct = (ANTI_OVERLAP_OFFSET_PX / pageW) * 100;
        const dyPct = (ANTI_OVERLAP_OFFSET_PX / pageH) * 100;
        xPct = Math.min(100 - boxWPct, last.x + dxPct);
        yPct = Math.min(100 - boxHPct, last.y + dyPct);
      }
      return { x: xPct, y: yPct, w: boxWPct, h: boxHPct };
    };
    const newSigs: FsElement[] = [];
    setElements(prev => {
      const byPage: Record<number, FsElement[]> = {};
      for (const e of prev) (byPage[e.page] ||= []).push(e);
      const additions = targetPages.map<FsElement>(p => {
        const { x, y, w: bw, h: bh } = computePlacement(p, byPage);
        const el: FsElement = {
          id: newId(),
          type: 'signature',
          page: p,
          x, y, w: bw, h: bh,
          dataUrl,
        };
        newSigs.push(el);
        return el;
      });
      return [...prev, ...additions];
    });
    // Select the newly-placed signature on the current page so the
    // user sees its resize handles immediately. With apply-to-all
    // we still only "live" on the current page, so prefer that one.
    const focused = newSigs.find(s => s.page === currentPage) ?? newSigs[0];
    if (focused) setSelectedId(focused.id);
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
    ctx.font = `italic ${fontSize}px ${SIG_TYPED_FONT}`;
    let textW = ctx.measureText(name).width;
    const padding = 24;
    while (textW > maxW - padding && fontSize > 18) {
      fontSize -= 2;
      ctx.font = `italic ${fontSize}px ${SIG_TYPED_FONT}`;
      textW = ctx.measureText(name).width;
    }
    canvas.width = Math.min(maxW, textW + padding);
    ctx.clearRect(0, 0, canvas.width, H);
    ctx.font = `italic ${fontSize}px ${SIG_TYPED_FONT}`;
    ctx.fillStyle = '#1e3a8a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, canvas.width / 2, H / 2);
    setTypedSigDataUrl(canvas.toDataURL('image/png'));
    typedSigSizeRef.current = { w: canvas.width, h: canvas.height };
  }, [creatingSig?.mode, creatingSig?.typedName, creatingSig]);

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
      e.target.closest('.fse-popup') ||
      e.target.closest('.fse-fontbar')
    )) return;
    // Click on PDF background deselects any previously-selected
    // element. New placements below set their own selection.
    setSelectedId(null);
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top)  / rect.height) * 100;

    if (tool === 'text') {
      const id = newId();
      addElement({
        id, type: 'text', page: currentPage, x: xPct, y: yPct,
        value: '', fontSize: DEFAULT_FONT, color: TEXT_DEFAULT_COLOR,
      });
      // New text: open the editor immediately AND mark it selected so
      // when the user dismisses the editor (Enter / blur) the font-
      // size bar appears above the freshly-placed value.
      setEditing({ id, originalValue: '', draftValue: '' });
      setSelectedId(id);
      return;
    }

    if (tool === 'date') {
      const id = newId();
      // todayDisplay() is recomputed at place time so a long-running
      // editor session never stamps yesterday's date.
      const today = todayDisplay();
      addElement({
        id, type: 'date', page: currentPage, x: xPct, y: yPct,
        value: today, fontSize: DEFAULT_FONT, color: TEXT_DEFAULT_COLOR,
      });
      // No auto-edit: today's date is correct by default. The user
      // single-clicks the placed element to select / re-size, or
      // double-clicks to enter masked edit-mode.
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
      } else {
        // Click without drag → select. The font-size bar (for text /
        // date) or the resize handles (for signature) become visible.
        setSelectedId(el.id);
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
      } else {
        setSelectedId(el.id);
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
        // Single click on a placed text/date element now SELECTS it
        // (shows the floating font-size bar) instead of opening the
        // editor. Edit-mode is reached via double-click or the
        // pencil button. This split keeps single-click instant and
        // separates the "tweak size" path from the "tweak content"
        // path.
        setSelectedId(el.id);
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
        // Tap (no drag) → select. Same rationale as the mouse path.
        setSelectedId(el.id);
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
    const isSelected = selectedId === el.id;
    if (isEditing) return null; // popup replaces the element while editing
    const wrapClass = `fse-text-wrap${isDragging ? ' fse-text-wrap-dragging' : ''}${isSelected ? ' fse-text-wrap-selected' : ''}`;
    const placeholder = el.type === 'date' ? 'date' : 'text';
    // PDF-points → CSS px conversion. fontSize is stored in PDF points
    // (semantic, scale-invariant). At any given page scale, 1 pt =
    // `scale` CSS px on the rendered canvas, so we multiply for the
    // overlay text to track the page as the user resizes the window
    // or toggles the right panel.
    const pageScale = currentInfo?.scale ?? 1;
    const displayPx = el.fontSize * pageScale;
    return (
      <div
        key={el.id}
        className={wrapClass}
        style={{ left: `${el.x}%`, top: `${el.y}%` }}
        onMouseDown={(e) => onTextBodyMouseDown(e, el)}
        onTouchStart={(e) => onTextBodyTouchStart(e, el)}
        onDoubleClick={(e) => { e.stopPropagation(); openEditFor(el); }}
      >
        <span
          className="fse-text-value"
          style={{ fontSize: `${displayPx}px`, color: el.color }}
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
    const isSelected = selectedId === el.id;
    return (
      <div
        key={el.id}
        className={`fse-element fse-element-image${isDragging ? ' fse-element-dragging' : ''}${isSelected ? ' fse-element-selected' : ''}`}
        style={{ left: `${el.x}%`, top: `${el.y}%`, width: `${el.w}%`, height: `${el.h}%` }}
        onMouseDown={(e) => onDragMouseDown(e, el)}
        onTouchStart={(e) => onDragTouchStart(e, el)}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => { e.stopPropagation(); openEditFor(el); }}
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

  /** Floating font-size bar — anchored above (or below, if no room)
   *  the currently-selected text/date element. Carries a dropdown
   *  with stock sizes plus −2pt / +2pt fine-tune buttons clamped to
   *  the global font-size limits. Hidden while the element is being
   *  edited or dragged so it doesn't fight for focus. */
  const FONT_BAR_W = 168;
  const FONT_BAR_H = 36;
  const renderFontSizeBar = () => {
    if (!selectedId || !currentInfo) return null;
    const el = elements.find(e => e.id === selectedId);
    if (!el || el.page !== currentPage) return null;
    if (el.type !== 'text' && el.type !== 'date') return null;
    if (editing?.id === el.id) return null;
    if (draggingId === el.id) return null;

    const pageW = currentInfo.width;
    const pageH = currentInfo.height;
    const elTopPx = (el.y / 100) * pageH;
    const elLeftPx = (el.x / 100) * pageW;
    // Anchor above the element when there's room; below otherwise.
    // 14px is the rough single-line height we assume for the element
    // below-anchored case — close enough since the bar is small.
    const placeAbove = elTopPx > FONT_BAR_H + 8;
    const top = placeAbove
      ? Math.max(4, elTopPx - FONT_BAR_H - 6)
      : elTopPx + 22;
    const margin = 4;
    let left = elLeftPx;
    if (left + FONT_BAR_W > pageW - margin) {
      left = Math.max(margin, pageW - FONT_BAR_W - margin);
    }
    const setSize = (size: number) => {
      const clamped = Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, size));
      updateElement(el.id, { fontSize: clamped } as Partial<FsElement>);
    };
    const hasStandard = (FONT_SIZE_OPTIONS as readonly number[]).includes(el.fontSize);
    return (
      <div
        className={`fse-fontbar${placeAbove ? ' fse-fontbar-above' : ' fse-fontbar-below'}`}
        style={{ left, top, width: FONT_BAR_W }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <select
          className="fse-fontbar-size"
          value={el.fontSize}
          onChange={(e) => setSize(parseInt(e.target.value, 10))}
          aria-label="Font size"
        >
          {!hasStandard && <option value={el.fontSize}>{el.fontSize}pt</option>}
          {FONT_SIZE_OPTIONS.map(s => (
            <option key={s} value={s}>{s}pt</option>
          ))}
        </select>
        <button
          type="button"
          className="fse-fontbar-btn"
          onClick={() => setSize(el.fontSize - FONT_SIZE_STEP)}
          aria-label="Decrease font size"
          title="Decrease font size"
          disabled={el.fontSize <= FONT_SIZE_MIN}
        >
          <Minus size={12} strokeWidth={2.4} />
        </button>
        <button
          type="button"
          className="fse-fontbar-btn"
          onClick={() => setSize(el.fontSize + FONT_SIZE_STEP)}
          aria-label="Increase font size"
          title="Increase font size"
          disabled={el.fontSize >= FONT_SIZE_MAX}
        >
          <Plus size={12} strokeWidth={2.4} />
        </button>
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
    const dateInvalid = el.type === 'date'
      && editing.draftValue.length > 0
      && !isValidDate(editing.draftValue);
    // Match the overlay's pt→px conversion so the field renders at
    // the same visual size as the rendered placement underneath.
    const popupDisplayPx = el.fontSize * (currentInfo.scale ?? 1);
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
        {el.type === 'date' ? (
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            ref={(node) => {
              if (!node) return;
              if (document.activeElement !== node) {
                try { node.focus({ preventScroll: true }); }
                catch { node.focus(); }
                node.select();
              }
            }}
            value={editing.draftValue}
            onChange={(e) => {
              setEditing({ ...editing, draftValue: applyDateMask(e.target.value) });
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                saveEdit();
              } else if (e.key === 'Escape') {
                cancelEdit();
              }
            }}
            placeholder={placeholder}
            className={`fse-popup-input${dateInvalid ? ' fse-popup-input-invalid' : ''}`}
            style={{ fontSize: `${popupDisplayPx}px` }}
            maxLength={10}
          />
        ) : (
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
            style={{ fontSize: `${popupDisplayPx}px` }}
          />
        )}
        <div className="fse-popup-bar">
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
    <div
      className={`fse fse-three-col${sidebarCollapsed ? ' fse-sidebar-collapsed' : ''}${totalPages <= 1 ? ' fse-no-thumbs' : ''}`}
      ref={editorRootRef}
    >
      {/* Left column — vertical thumbnails. Hidden for single-page docs
          so the grid collapses to two columns. */}
      {totalPages > 1 && (
        <aside className="fse-thumbs-col">
          <div className="fse-thumbs-label">
            <FileText size={13} /> Pages
          </div>
          <div className="fse-thumbs-list">
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
                      <span className="fse-thumb-tick" aria-hidden="true" title="Page has placed elements">✓</span>
                    )}
                  </div>
                  <div className="fse-thumb-foot">
                    <span className="fse-thumb-num">{p.index}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      )}

      {/* Middle column — tools + document. The page area scrolls so
          tall PDFs don't push the whole layout. */}
      <div className="fse-main">
        <div className="fse-topbar">
          <div className="fse-toolbar" role="toolbar" aria-label="Editor tools">
            <div className="fse-tools-group">
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
            {onRequestNewPdf && (
              <>
                {/* Visible 1-px vertical rule separating the placement
                   tools from the secondary action. The spacer next to
                   it consumes free horizontal space so Change PDF
                   actually lands on the right edge regardless of how
                   wide the toolbar is. */}
                <span className="fse-tool-divider" aria-hidden="true" />
                <div className="fse-toolbar-spacer" aria-hidden="true" />
                <button
                  type="button"
                  className="fse-tool-btn fse-tool-btn-secondary"
                  onClick={onRequestNewPdf}
                  title="Discard changes and load a different PDF"
                >
                  <RotateCcw size={14} strokeWidth={2} />
                  <span>Change PDF</span>
                </button>
              </>
            )}
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
                {renderFontSizeBar()}
                {renderEditPopup()}
              </div>
              <span className="fse-page-label">Page {currentPage} of {totalPages}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right column — placed elements + Download. Collapsible to a
          40 px-wide rail on narrow viewports; only the count badge and
          the expand toggle remain visible when collapsed. */}
      <aside className="fse-sidebar">
        <div className="fse-sidebar-head">
          {!sidebarCollapsed && (
            <span className="fse-sidebar-title">
              Placed elements ({elements.length})
            </span>
          )}
          <button
            type="button"
            className="fse-sidebar-toggle"
            onClick={() => setSidebarCollapsed(c => !c)}
            aria-label={sidebarCollapsed ? 'Show panel' : 'Hide panel'}
            title={sidebarCollapsed ? 'Show panel' : 'Hide panel'}
          >
            {sidebarCollapsed
              ? <ChevronLeft size={14} strokeWidth={2.4} />
              : <ChevronRight size={14} strokeWidth={2.4} />}
          </button>
        </div>

        {sidebarCollapsed && elements.length > 0 && (
          <span className="fse-sidebar-badge">{elements.length}</span>
        )}

        {!sidebarCollapsed && (
        <div className="fse-sidebar-body">
        {/* Placed elements grouped by page. The header lives in the
           sidebar-head above; this card is just the list. */}
        <div className="fse-sidebar-card">
          {elements.length === 0 ? (
            <p className="fse-sidebar-empty">Add text, date or signature to begin.</p>
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

        {/* Download is always present so the user knows it exists; it
           just sits disabled until there's something to sign. The
           empty-state hint above the button explains what to do. */}
        <button
          type="button"
          className="fse-sidebar-cta"
          disabled={!canDone}
          onClick={handleDone}
        >
          {processing ? <Loader2 className="fse-spin" size={16} /> : <Download size={16} />}
          <span>{processing ? 'Generating…' : 'Download Signed PDF'}</span>
        </button>
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
                  <input
                    type="text"
                    className="fse-sig-name"
                    placeholder="Your full name"
                    value={creatingSig.typedName}
                    onChange={(e) => setCreatingSig(s => s ? { ...s, typedName: e.target.value } : s)}
                    style={{ fontFamily: SIG_TYPED_FONT }}
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
