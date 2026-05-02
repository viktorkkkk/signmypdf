import { PDFDocument } from 'pdf-lib';

export type SplitMode = 'extract' | 'parts';

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

/**
 * Strip a trailing `.pdf` (case-insensitive) so callers can append
 * suffixes without producing `something.pdf-part-1.pdf`.
 */
export function stripPdfExt(name: string): string {
  return name.replace(/\.pdf$/i, '');
}

function buildExtractFilename(originalName: string): string {
  return `extracted-${stripPdfExt(originalName)}.pdf`;
}

function buildPartFilename(originalName: string, index1: number): string {
  return `${stripPdfExt(originalName)}-part-${index1}.pdf`;
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

/**
 * Split or extract pages from a PDF, fully in the browser.
 *
 * `extract` mode produces one output PDF containing the selected page
 * indices in input order.
 *
 * `parts` mode produces one output PDF per range, optionally bundled
 * into a ZIP via `jszip`.
 *
 * Encrypted inputs are rejected (we deliberately do NOT pass
 * `ignoreEncryption: true` — copying pages from a protected source
 * would silently emit unreadable output). Page-range validation lives
 * in the UI; we still defensively skip out-of-range indices here.
 */
export async function splitPdf(
  file: File,
  options: ExtractOptions | PartsOptions,
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
    return {
      mode: 'extract',
      bytes,
      filename: buildExtractFilename(file.name),
    };
  }

  // ── Parts mode ────────────────────────────────────────────────
  const ranges = options.ranges
    .map(r => ({ from: Math.max(1, Math.floor(r.from)), to: Math.min(totalPages, Math.floor(r.to)) }))
    .filter(r => r.from <= r.to);
  if (ranges.length === 0) {
    throw new SplitPdfError('invalid-options', 'No valid ranges.');
  }

  const files: Array<{ bytes: Uint8Array; filename: string }> = [];
  for (let idx = 0; idx < ranges.length; idx++) {
    const r = ranges[idx];
    // copyPages takes 0-indexed indices; ranges are 1-indexed inclusive.
    const indices: number[] = [];
    for (let p = r.from - 1; p <= r.to - 1; p++) indices.push(p);

    const dest = await PDFDocument.create();
    const copied = await dest.copyPages(src, indices);
    for (const page of copied) dest.addPage(page);
    dest.setModificationDate(new Date());
    const bytes = await dest.save();

    files.push({
      bytes,
      filename: buildPartFilename(file.name, idx + 1),
    });
    onProgress?.(((idx + 1) / ranges.length) * 100);
  }

  if (!options.asZip) {
    return { mode: 'parts', files };
  }

  // Bundle into ZIP. Loaded lazily so the bundle for users that don't
  // pick the zip option doesn't drag jszip in.
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  for (const f of files) {
    // jszip accepts Uint8Array directly
    zip.file(f.filename, f.bytes);
  }
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
