import {
  PDFDocument,
  PDFDict,
  PDFArray,
  PDFName,
  PDFRef,
  PDFString,
  PDFHexString,
  type PDFObject,
} from 'pdf-lib';

export type SplitMode = 'extract' | 'parts' | 'everyN' | 'bookmarks';

export interface ExtractOptions {
  mode: 'extract';
  /** 0-indexed page indices to copy into the output. Order is preserved. */
  pageIndices: number[];
}

export interface PartsOptions {
  mode: 'parts';
  /** 1-indexed inclusive ranges. Each range becomes one output PDF. */
  ranges: Array<{ from: number; to: number }>;
  /** When true, the result includes a single ZIP with all parts. */
  asZip: boolean;
}

export interface EveryNOptions {
  mode: 'everyN';
  /** Pages per output file. Last file may be shorter. Min 1. */
  n: number;
  asZip: boolean;
}

export interface BookmarksOptions {
  mode: 'bookmarks';
  asZip: boolean;
}

export type SplitOptions = ExtractOptions | PartsOptions | EveryNOptions | BookmarksOptions;

export interface ExtractResult {
  mode: 'extract';
  bytes: Uint8Array;
  filename: string;
}

export interface PartsResult {
  mode: 'parts';
  files: Array<{ bytes: Uint8Array; filename: string }>;
  /** Present when `asZip` was true on input. */
  zipBytes?: Uint8Array;
  zipFilename?: string;
}

export class SplitPdfError extends Error {
  constructor(public reason: 'encrypted' | 'corrupted' | 'invalid-options', message?: string) {
    super(message ?? (
      reason === 'encrypted'
        ? 'This PDF is password-protected.'
        : reason === 'corrupted'
          ? 'This PDF could not be parsed.'
          : 'Invalid split options.'
    ));
    this.name = 'SplitPdfError';
  }
}

export interface PdfBookmark {
  title: string;
  /** 0-indexed page within the source PDF where this bookmark begins. */
  pageIndex: number;
}

/**
 * Strip a trailing `.pdf` (case-insensitive) so callers can append
 * suffixes without producing `something.pdf-part-1.pdf`.
 */
export function stripPdfExt(name: string): string {
  return name.replace(/\.pdf$/i, '');
}

/**
 * Make a bookmark title safe to use as a filename:
 *  - drop characters illegal on Windows / macOS / Linux
 *  - collapse internal whitespace to a single dash
 *  - trim leading/trailing dots & dashes (Windows refuses dot-only names)
 *  - cap at 80 chars to leave room for the `.pdf` extension
 *
 * Returns an empty string if nothing useful is left — the caller falls
 * back to `bookmark-{i}` so we never write a file with no name.
 */
export function sanitizeForFilename(title: string): string {
  return title
    .replace(/[/\\:*?"<>|\x00-\x1f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^[.\-]+|[.\-]+$/g, '')
    .slice(0, 80);
}

function buildExtractFilename(originalName: string): string {
  return `extracted-${stripPdfExt(originalName)}.pdf`;
}

function buildZipFilename(originalName: string): string {
  return `split-${stripPdfExt(originalName)}.zip`;
}

/**
 * Parse an entry like "1-3, 5, 8-10" into a sorted, deduplicated list of
 * 1-indexed page numbers, clamped to `pageCount`. Designed for the
 * "Or type page ranges" advanced input on the Extract tab.
 *
 * Returns `null` when the input is unparseable in a way the user can't
 * fix by hand (random words, only commas, etc.); the UI should keep the
 * existing selection in that case rather than silently clearing it.
 */
export function parsePageRanges(input: string, pageCount: number): number[] | null {
  if (!input.trim()) return [];
  const tokens = input.split(/[,;]/).map(t => t.trim()).filter(Boolean);
  if (tokens.length === 0) return null;
  const out = new Set<number>();
  for (const tok of tokens) {
    const m = tok.match(/^(\d+)\s*(?:-\s*(\d+))?$/);
    if (!m) return null;
    const a = parseInt(m[1], 10);
    const b = m[2] !== undefined ? parseInt(m[2], 10) : a;
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    for (let p = lo; p <= hi; p++) {
      if (p >= 1 && p <= pageCount) out.add(p);
    }
  }
  return Array.from(out).sort((x, y) => x - y);
}

// ── Outline (bookmark) reader ───────────────────────────────────

function decodePdfText(obj: PDFObject | undefined): string {
  if (!obj) return '';
  if (obj instanceof PDFString || obj instanceof PDFHexString) {
    try { return obj.decodeText(); } catch { return ''; }
  }
  return '';
}

/**
 * Resolve a destination object to the 0-indexed page within `pdfDoc`.
 *
 * Handles:
 *  - Direct destination array `[pageRef /Fit ...]`
 *  - Indirect reference to such an array
 *
 * Named destinations (string or Name pointing into Catalog/Names/Dests
 * or Catalog/Dests) are NOT resolved — too rare in modern PDFs to be
 * worth the extra code path for v1. Returns null in that case so the
 * caller skips the bookmark instead of pointing it at the wrong page.
 */
function resolveDestPageIndex(rawDest: PDFObject | undefined, pdfDoc: PDFDocument, pageRefs: PDFRef[]): number | null {
  if (!rawDest) return null;
  let dest: PDFObject = rawDest;
  if (dest instanceof PDFRef) {
    const looked = pdfDoc.context.lookup(dest);
    if (!looked) return null;
    dest = looked;
  }
  if (dest instanceof PDFArray) {
    const first = dest.get(0);
    if (first instanceof PDFRef) {
      const idx = pageRefs.indexOf(first);
      return idx >= 0 ? idx : null;
    }
  }
  return null;
}

/**
 * Walk the PDF's outline tree and collect top-level bookmarks (depth 0).
 * Nested children are intentionally ignored — splitting on every nested
 * heading typically produces dozens of one-page files no one wants.
 *
 * Returns bookmarks in document order. `pageIndex` is 0-indexed against
 * `pdfDoc.getPages()`.
 */
function collectTopLevelBookmarks(pdfDoc: PDFDocument): PdfBookmark[] {
  const catalog = pdfDoc.catalog;
  const outlinesEntry = catalog.get(PDFName.of('Outlines'));
  if (!outlinesEntry) return [];

  let outlinesNode: PDFObject = outlinesEntry;
  if (outlinesEntry instanceof PDFRef) {
    const looked = pdfDoc.context.lookup(outlinesEntry);
    if (!looked) return [];
    outlinesNode = looked;
  }
  if (!(outlinesNode instanceof PDFDict)) return [];

  const pages = pdfDoc.getPages();
  const pageRefs = pages.map(p => p.ref);

  const items: PdfBookmark[] = [];
  let nextRef = outlinesNode.get(PDFName.of('First'));
  let safety = 0;
  while (nextRef && safety < 5000) {
    safety++;
    if (!(nextRef instanceof PDFRef)) break;
    const node = pdfDoc.context.lookup(nextRef);
    if (!(node instanceof PDFDict)) break;

    const title = decodePdfText(node.get(PDFName.of('Title')));
    let pageIndex: number | null = resolveDestPageIndex(node.get(PDFName.of('Dest')), pdfDoc, pageRefs);
    if (pageIndex === null) {
      // Try the action form: { A: { S: /GoTo, D: <dest> } }
      const action = node.get(PDFName.of('A'));
      if (action instanceof PDFDict) {
        const sub = action.get(PDFName.of('S'));
        if (sub instanceof PDFName && sub.asString() === '/GoTo') {
          pageIndex = resolveDestPageIndex(action.get(PDFName.of('D')), pdfDoc, pageRefs);
        }
      }
    }
    if (pageIndex !== null && pageIndex >= 0) {
      items.push({
        title: title.trim() || `Bookmark ${items.length + 1}`,
        pageIndex,
      });
    }

    nextRef = node.get(PDFName.of('Next'));
  }
  return items;
}

/**
 * Public API: read a PDF's top-level outline so the UI can list the
 * bookmarks BEFORE the user commits to splitting. Returns an empty
 * array on encrypted, corrupted, or no-bookmarks PDFs.
 */
export async function readPdfBookmarks(file: File): Promise<PdfBookmark[]> {
  try {
    const buf = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
    return collectTopLevelBookmarks(pdfDoc);
  } catch {
    return [];
  }
}

// ── Splitting helpers ────────────────────────────────────────────

interface NamedRange {
  /** 0-indexed inclusive start */
  startIdx: number;
  /** 0-indexed inclusive end */
  endIdx: number;
  /** Filename WITHOUT extension. Extension is added in the helper. */
  baseName: string;
}

/**
 * Run the parts-style split: one output PDF per `NamedRange`, optionally
 * bundled into a single ZIP. Filename, range, and progress reporting are
 * driven by the caller — this helper is shared by `parts`, `everyN`, and
 * `bookmarks`.
 */
async function runRangedSplit(
  src: PDFDocument,
  file: File,
  ranges: NamedRange[],
  asZip: boolean,
  onProgress?: (percent: number) => void,
): Promise<PartsResult> {
  if (ranges.length === 0) {
    throw new SplitPdfError('invalid-options', 'No valid ranges.');
  }

  const files: Array<{ bytes: Uint8Array; filename: string }> = [];
  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    const indices: number[] = [];
    for (let p = r.startIdx; p <= r.endIdx; p++) indices.push(p);

    const dest = await PDFDocument.create();
    const copied = await dest.copyPages(src, indices);
    for (const page of copied) dest.addPage(page);
    dest.setModificationDate(new Date());
    const bytes = await dest.save();

    files.push({ bytes, filename: `${r.baseName}.pdf` });
    onProgress?.(((i + 1) / ranges.length) * 100);
  }

  if (!asZip) return { mode: 'parts', files };

  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  for (const f of files) zip.file(f.filename, f.bytes);
  const zipBlob = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  return {
    mode: 'parts',
    files,
    zipBytes: zipBlob,
    zipFilename: buildZipFilename(file.name),
  };
}

/**
 * Compute (startIdx, endIdx, baseName) tuples for every-N mode.
 * Last range may be shorter than N.
 */
function buildEveryNRanges(originalName: string, totalPages: number, n: number): NamedRange[] {
  const out: NamedRange[] = [];
  let part = 1;
  for (let start = 0; start < totalPages; start += n) {
    const end = Math.min(totalPages - 1, start + n - 1);
    out.push({
      startIdx: start,
      endIdx: end,
      baseName: `${stripPdfExt(originalName)}-part-${part}`,
    });
    part++;
  }
  return out;
}

/**
 * Compute ranges from a sorted list of bookmarks. Each bookmark spans
 * from its own page through the page before the next bookmark (or the
 * last page for the final bookmark).
 *
 * Bookmarks pointing at the same page produce a 1-page output for the
 * earlier one — that's the same behaviour Acrobat and most splitters
 * use, and it's what users expect when chapters share a title page.
 */
function buildBookmarkRanges(bookmarks: PdfBookmark[], totalPages: number): NamedRange[] {
  const sorted = [...bookmarks].sort((a, b) => a.pageIndex - b.pageIndex);
  const out: NamedRange[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const startIdx = sorted[i].pageIndex;
    const endIdx = i + 1 < sorted.length
      ? Math.max(startIdx, sorted[i + 1].pageIndex - 1)
      : totalPages - 1;
    if (startIdx < 0 || startIdx >= totalPages) continue;
    if (endIdx < startIdx) continue;
    const safe = sanitizeForFilename(sorted[i].title);
    const baseName = safe || `bookmark-${i + 1}`;
    out.push({ startIdx, endIdx, baseName });
  }
  return out;
}

/**
 * Split or extract pages from a PDF, fully in the browser.
 *
 * Modes:
 *  - `extract` — one output PDF with the chosen page indices in input order.
 *  - `parts`   — one output PDF per user-defined range (UI uses 1-indexed).
 *  - `everyN`  — one output PDF per chunk of N consecutive pages.
 *  - `bookmarks` — one output PDF per top-level outline entry.
 *
 * `parts` / `everyN` / `bookmarks` may bundle outputs into a single ZIP
 * via `jszip` (loaded lazily).
 *
 * Encrypted inputs are rejected (we deliberately do NOT pass
 * `ignoreEncryption: true` — copying pages from a protected source
 * would silently emit unreadable output).
 */
export async function splitPdf(
  file: File,
  options: SplitOptions,
  onProgress?: (percent: number) => void,
): Promise<ExtractResult | PartsResult> {
  const buf = await file.arrayBuffer();

  let src: PDFDocument;
  try {
    src = await PDFDocument.load(buf, { ignoreEncryption: false });
  } catch (e) {
    const msg = (e as Error)?.message ?? '';
    if (/encrypt|password/i.test(msg)) throw new SplitPdfError('encrypted');
    throw new SplitPdfError('corrupted');
  }
  const totalPages = src.getPageCount();

  if (options.mode === 'extract') {
    const valid = options.pageIndices.filter(i => i >= 0 && i < totalPages);
    if (valid.length === 0) throw new SplitPdfError('invalid-options', 'No valid pages selected.');

    const dest = await PDFDocument.create();
    const copied = await dest.copyPages(src, valid);
    let processed = 0;
    for (const p of copied) {
      dest.addPage(p);
      processed++;
      onProgress?.((processed / valid.length) * 100);
    }
    dest.setModificationDate(new Date());
    const bytes = await dest.save();
    return { mode: 'extract', bytes, filename: buildExtractFilename(file.name) };
  }

  if (options.mode === 'parts') {
    const cleaned = options.ranges
      .map(r => ({ from: Math.max(1, Math.floor(r.from)), to: Math.min(totalPages, Math.floor(r.to)) }))
      .filter(r => r.from <= r.to);
    const ranges: NamedRange[] = cleaned.map((r, i) => ({
      startIdx: r.from - 1,
      endIdx: r.to - 1,
      baseName: `${stripPdfExt(file.name)}-part-${i + 1}`,
    }));
    return runRangedSplit(src, file, ranges, options.asZip, onProgress);
  }

  if (options.mode === 'everyN') {
    const n = Math.max(1, Math.floor(options.n));
    if (n >= totalPages) {
      // N covers everything — nothing to split. Fall through to a single-file
      // "split" rather than blocking, since the UI guards against this case
      // anyway.
      const ranges: NamedRange[] = [{
        startIdx: 0,
        endIdx: totalPages - 1,
        baseName: `${stripPdfExt(file.name)}-part-1`,
      }];
      return runRangedSplit(src, file, ranges, options.asZip, onProgress);
    }
    const ranges = buildEveryNRanges(file.name, totalPages, n);
    return runRangedSplit(src, file, ranges, options.asZip, onProgress);
  }

  // ── bookmarks ──────────────────────────────────────────────
  const bookmarks = collectTopLevelBookmarks(src);
  if (bookmarks.length === 0) {
    throw new SplitPdfError('invalid-options', 'No bookmarks found in this PDF.');
  }
  const ranges = buildBookmarkRanges(bookmarks, totalPages);
  if (ranges.length === 0) {
    throw new SplitPdfError('invalid-options', 'Bookmarks could not be resolved to page ranges.');
  }
  return runRangedSplit(src, file, ranges, options.asZip, onProgress);
}
