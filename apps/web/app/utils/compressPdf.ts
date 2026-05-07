import {
  PDFDocument,
  PDFRawStream,
  PDFName,
  PDFNumber,
  PDFArray,
  PDFRef,
} from 'pdf-lib';

export type CompressionLevel = 'light' | 'recommended' | 'maximum';

interface LevelParams {
  /** Largest allowed dimension on either axis. Anything bigger is downsampled. */
  maxDimension: number;
  /** JPEG re-encode quality, 0..1. */
  jpegQuality: number;
}

const LEVEL_PARAMS: Record<CompressionLevel, LevelParams> = {
  light:       { maxDimension: 2000, jpegQuality: 0.85 },
  recommended: { maxDimension: 1500, jpegQuality: 0.75 },
  maximum:     { maxDimension: 1000, jpegQuality: 0.6  },
};

export interface CompressResult {
  bytes: Uint8Array;
  originalSize: number;
  compressedSize: number;
  /** Integer percent (0..100). Always non-negative — equal-or-larger results return 0. */
  reductionPercent: number;
  /**
   * True if the source had real raster image content worth re-encoding.
   * Used by the UI to drive the "already optimized" copy when low reduction
   * comes from a text-only PDF (where compression is naturally limited).
   */
  hasImages: boolean;
}

/**
 * Thrown for known failure modes so the UI can surface a useful copy
 * instead of a generic "Error: ...".
 */
export class CompressPdfError extends Error {
  constructor(public reason: 'encrypted' | 'corrupted', message?: string) {
    super(message ?? (
      reason === 'encrypted'
        ? 'This PDF is password-protected.'
        : 'This PDF could not be parsed.'
    ));
    this.name = 'CompressPdfError';
  }
}

/** A re-encodable image candidate found in the document. */
interface ImageEntry {
  ref: PDFRef;
  stream: PDFRawStream;
  width: number;
  height: number;
  /** Single Filter name like "/DCTDecode" or "/FlateDecode". Composite filters skipped. */
  filter: string;
  /** True if the image carries a soft mask or stencil mask we shouldn't disturb. */
  hasMask: boolean;
  /** Original encoded bytes — the budget we need to beat. */
  bytesSize: number;
}

function readFilterName(filterObj: unknown): string | null {
  if (filterObj instanceof PDFName) return filterObj.asString();
  if (filterObj instanceof PDFArray && filterObj.size() === 1) {
    const inner = filterObj.get(0);
    if (inner instanceof PDFName) return inner.asString();
  }
  return null;
}

function findImageStreams(pdfDoc: PDFDocument): ImageEntry[] {
  const result: ImageEntry[] = [];
  for (const [ref, obj] of pdfDoc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    const dict = obj.dict;
    const subtype = dict.get(PDFName.of('Subtype'));
    if (!(subtype instanceof PDFName) || subtype.asString() !== '/Image') continue;

    const widthObj = dict.get(PDFName.of('Width'));
    const heightObj = dict.get(PDFName.of('Height'));
    if (!(widthObj instanceof PDFNumber) || !(heightObj instanceof PDFNumber)) continue;

    const filterStr = readFilterName(dict.get(PDFName.of('Filter')));
    if (!filterStr) continue;

    // Skip masked images entirely. Stripping a soft mask while re-encoding
    // the base image produces visible artifacts (haloes, white box around
    // transparent content). Better to leave them alone than corrupt the
    // visual result.
    const hasSMask = !!dict.get(PDFName.of('SMask'));
    const hasMask = hasSMask || !!dict.get(PDFName.of('Mask'));

    result.push({
      ref,
      stream: obj,
      width: widthObj.asNumber(),
      height: heightObj.asNumber(),
      filter: filterStr,
      hasMask,
      bytesSize: obj.contents.length,
    });
  }
  return result;
}

export interface AnalyzeResult {
  hasImages: boolean;
  pageCount: number;
  /**
   * Number of distinct image XObjects found in the document.
   */
  imageCount: number;
  /**
   * How much of the document is raster imagery, 0..1.
   *
   * Real area would require walking each page's content stream to
   * honour the CTM applied to every `Do` operator — expensive and
   * error-prone. We use a much closer proxy than the v1 count-based
   * heuristic: total native pixel area of all distinct image XObjects
   * (`Width × Height` from each stream's dict), divided by what a
   * 150-DPI raster of every page would total.
   *
   * For a PDF with two small figures across 12 letter-size pages the
   * ratio comes out around 0.01-0.03 → "mostly text" branch. For a
   * scan-PDF where every page is a 1500×2000 JPEG, the ratio is 1.0+
   * → "image-heavy". The old heuristic flagged the first case as
   * image-heavy and over-promised compression by 20-40%, which the
   * actual compressor couldn't deliver — that was the user-visible
   * "obman".
   */
  imageAreaRatio: number;
}

/**
 * Total raster area, in pixels at 150 DPI, that a full re-rasterization
 * of every page would produce. The constant is chosen to roughly match
 * the resolution of a typical embedded-image PDF (scanned documents
 * land 100-300 DPI) so the resulting ratio doesn't flip on subtle
 * MediaBox differences.
 */
function totalPageAreaPxAt150Dpi(pdfDoc: PDFDocument): number {
  const DPI = 150;
  const PT_PER_INCH = 72;
  let total = 0;
  for (const page of pdfDoc.getPages()) {
    const { width: w, height: h } = page.getSize();
    const wPx = w * DPI / PT_PER_INCH;
    const hPx = h * DPI / PT_PER_INCH;
    total += wPx * hPx;
  }
  return total;
}

/**
 * Predict whether `compressPdf` can do meaningful work on this file, and
 * return the page count so the configure-step card can read
 * "report.pdf · 12.4 MB · 8 pages" without parsing the file twice.
 */
export async function analyzePdf(file: File): Promise<AnalyzeResult> {
  try {
    const buf = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
    const images = findImageStreams(pdfDoc);
    const totalImageBytes = images.reduce((sum, i) => sum + i.bytesSize, 0);
    const pageCount = pdfDoc.getPageCount();
    const imageCount = images.length;

    const totalImagePx = images.reduce((s, i) => s + i.width * i.height, 0);
    const totalPagePx = totalPageAreaPxAt150Dpi(pdfDoc);
    const imageAreaRatio = totalPagePx > 0
      ? Math.min(1, totalImagePx / totalPagePx)
      : 0;

    const classification =
      imageAreaRatio < 0.1 ? 'mostly-text'
      : imageAreaRatio < 0.5 ? 'mixed'
      : 'image-heavy';

    // Temporary debug log so the team can sanity-check the heuristic
    // on real-world files. Remove once the new ratio has settled in
    // production for a couple of weeks.
    console.log(
      '[compressPdf.analyze] Total image area:', Math.round(totalImagePx),
      'Total page area:', Math.round(totalPagePx),
      'Ratio:', imageAreaRatio.toFixed(3),
      'Classification:', classification,
      'Image count:', imageCount,
      'Page count:', pageCount,
    );

    return {
      hasImages: totalImageBytes > 100 * 1024,
      pageCount,
      imageCount,
      imageAreaRatio,
    };
  } catch {
    return { hasImages: false, pageCount: 0, imageCount: 0, imageAreaRatio: 0 };
  }
}

export interface CompressionPrediction {
  light: number;
  recommended: number;
  maximum: number;
}

/**
 * Predict the size of each level's output BEFORE running the compressor,
 * so the configure step can show "~2.0 MB · −38%" on each level card.
 * These are rough heuristics, not guarantees — UI must surface them with
 * a tilde so the user knows the real result on the done screen may
 * differ. The compressor itself returns the original bytes verbatim if
 * it would have made the file larger, so the user is never punished
 * by an over-optimistic prediction.
 */
export function predictCompression(
  originalSize: number,
  analysis: Pick<AnalyzeResult, 'hasImages' | 'imageAreaRatio'>,
): CompressionPrediction {
  let m: { light: number; recommended: number; maximum: number };
  if (!analysis.hasImages || analysis.imageAreaRatio < 0.1) {
    // Text-only PDF — only object-stream packing helps, very small win.
    // Tightened from 0.98 / 0.95 / 0.92 after a 12-page text PDF with
    // two figures predicted −34% but the actual compressor delivered
    // −12%. The old multipliers also relied on a count-based ratio
    // that over-classified into the "mixed" bucket — that's fixed in
    // analyzePdf above; these are now the realistic ceiling for a
    // text-only doc.
    m = { light: 0.97, recommended: 0.93, maximum: 0.88 };
  } else if (analysis.imageAreaRatio < 0.5) {
    // Mixed text/images.
    m = { light: 0.85, recommended: 0.65, maximum: 0.45 };
  } else {
    // Mostly images (scans, photo decks, image-heavy reports).
    m = { light: 0.75, recommended: 0.50, maximum: 0.30 };
  }
  return {
    light:       Math.round(originalSize * m.light),
    recommended: Math.round(originalSize * m.recommended),
    maximum:     Math.round(originalSize * m.maximum),
  };
}

interface ReencodedImage {
  bytes: Uint8Array;
  width: number;
  height: number;
}

/**
 * Decode → resample → JPEG-re-encode an image stream.
 *
 * Returns null on any failure (decode error, canvas blocked, blob creation
 * failed). The caller treats null as "skip this image, keep the original".
 *
 * Skips images whose pixel count exceeds 64 MP — they tend to OOM the
 * canvas on 32-bit browsers and produce no useful saving anyway.
 */
async function reencodeJpeg(
  jpegBytes: Uint8Array,
  origWidth: number,
  origHeight: number,
  params: LevelParams,
): Promise<ReencodedImage | null> {
  if (origWidth * origHeight > 64_000_000) return null;

  const longest = Math.max(origWidth, origHeight);
  const scale = longest > params.maxDimension ? params.maxDimension / longest : 1;
  const targetW = Math.max(1, Math.round(origWidth * scale));
  const targetH = Math.max(1, Math.round(origHeight * scale));

  // The Uint8Array view we got from pdf-lib may be a sub-array of a larger
  // backing buffer. Slice into a tight buffer so the Blob holds only the
  // JPEG bytes.
  const view = new Uint8Array(jpegBytes.byteLength);
  view.set(jpegBytes);
  const blob = new Blob([view], { type: 'image/jpeg' });
  const url = URL.createObjectURL(blob);

  let img: HTMLImageElement;
  try {
    img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Image decode failed'));
      i.src = url;
    });
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    URL.revokeObjectURL(url);
    return null;
  }
  // Flatten any decoded transparency to white. JPEG can't carry alpha;
  // without this, the encoded result has black where the source was clear.
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(img, 0, 0, targetW, targetH);
  URL.revokeObjectURL(url);

  const newBlob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, 'image/jpeg', params.jpegQuality),
  );
  if (!newBlob) return null;
  const newBytes = new Uint8Array(await newBlob.arrayBuffer());
  return { bytes: newBytes, width: targetW, height: targetH };
}

/**
 * Compress a PDF in the browser by re-encoding embedded JPEG images at
 * a lower resolution / quality and rewriting the document with object
 * streams enabled.
 *
 * V1 scope:
 * - Touches DCTDecode (JPEG) image streams only — see TODO blocks for
 *   FlateDecode raw images (rare in real-world PDFs), CMYK images,
 *   and PNG-with-alpha (skipped to preserve transparency).
 * - No image is replaced unless the new encoding is actually smaller
 *   than the original (per-image guard).
 * - If the whole-document save somehow produces a LARGER file (small
 *   text PDFs where object streams add overhead), we return the
 *   original bytes verbatim — the user is never punished by our work.
 */
export async function compressPdf(
  file: File,
  level: CompressionLevel = 'recommended',
  onProgress?: (percent: number) => void,
): Promise<CompressResult> {
  const originalSize = file.size;
  const buf = await file.arrayBuffer();

  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: false });
  } catch (e) {
    const msg = (e as Error)?.message ?? '';
    if (/encrypt|password/i.test(msg)) throw new CompressPdfError('encrypted');
    throw new CompressPdfError('corrupted');
  }

  const params = LEVEL_PARAMS[level];
  const allImages = findImageStreams(pdfDoc);
  const totalImageBytes = allImages.reduce((sum, i) => sum + i.bytesSize, 0);

  // Eligible = JPEG, no mask, sane dimensions. CMYK and PNG-with-alpha
  // fail this gate naturally (their Filter is /FlateDecode). FlateDecode
  // raw rasters could be re-encoded too, but that requires manual
  // colorspace handling — TODO for v2.
  const eligible = allImages.filter(img =>
    img.filter === '/DCTDecode'
    && !img.hasMask
    && img.width > 0
    && img.height > 0,
  );

  let processed = 0;
  const totalSteps = Math.max(eligible.length, 1);

  for (const entry of eligible) {
    try {
      const result = await reencodeJpeg(entry.stream.contents, entry.width, entry.height, params);
      if (result && result.bytes.length < entry.bytesSize) {
        // Replace in place: mutate the existing dict (Length is updated
        // automatically by PDFStream.updateDict on serialize) and assign
        // a fresh PDFRawStream at the same ref. Anything still pointing
        // at this ref (page resources, content streams) is unaffected.
        const dict = entry.stream.dict;
        dict.set(PDFName.of('Width'),  PDFNumber.of(result.width));
        dict.set(PDFName.of('Height'), PDFNumber.of(result.height));
        // Bits/colorspace stay correct — JPEG always decodes to 8-bit
        // RGB on canvas, which matches the typical /DeviceRGB + /BitsPerComponent 8.
        const newStream = PDFRawStream.of(dict, result.bytes);
        pdfDoc.context.assign(entry.ref, newStream);
      }
    } catch (e) {
      // Per-image failure is non-fatal — caller still gets a slightly
      // less compressed PDF.
      console.warn('compressPdf: image re-encode failed', e);
    }
    processed++;
    onProgress?.((processed / totalSteps) * 100);
  }

  const saved = await pdfDoc.save({ useObjectStreams: true });

  let finalBytes: Uint8Array;
  if (saved.length >= originalSize) {
    // Compression made the file bigger (or no change). Return the
    // original to keep our promise to the user that we'll never produce
    // a worse result than they uploaded.
    finalBytes = new Uint8Array(buf);
  } else {
    finalBytes = saved;
  }

  const compressedSize = finalBytes.length;
  const reductionPercent = compressedSize >= originalSize
    ? 0
    : Math.round(((originalSize - compressedSize) / originalSize) * 100);

  return {
    bytes: finalBytes,
    originalSize,
    compressedSize,
    reductionPercent,
    hasImages: totalImageBytes > 100 * 1024,
  };
}
