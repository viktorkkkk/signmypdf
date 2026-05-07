import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Coordinate system on every element: (x, y) is the top-left of the
// element's bounding box, expressed as a percentage of the page's
// width and height. (w, h) for image-like elements is also a % of
// page width/height. This matches the PDFViewer/PDFTextEditor convention
// and the existing signPdf/fillPdf utilities so we can later unify them.

export type FsElement =
  | {
      id: string;
      type: 'text' | 'date';
      page: number;            // 1-indexed
      x: number; y: number;    // % of page (top-left)
      value: string;
      fontSize: number;        // PDF points
      color: string;           // CSS hex, e.g. '#000000'
    }
  | {
      id: string;
      type: 'signature';
      page: number;
      x: number; y: number;    // % of page (top-left)
      w: number; h: number;    // % of page
      dataUrl: string;         // PNG data URL
    };

export interface FillSignOptions {
  pdfFile: File;
  elements: FsElement[];
  addWatermark?: boolean;
}

/**
 * Render a single line of text (or a single glyph for checkboxes) to a
 * transparent-background PNG via canvas. Re-used by every text-shaped
 * element type because pdf-lib's StandardFonts don't cover most of
 * Unicode. Embedding a PNG is the universally-safe path.
 */
function renderTextToPng(
  text: string,
  fontSizePts: number,
  color: string,
  fontFamily = '-apple-system, "Helvetica Neue", Arial, sans-serif',
): { dataUrl: string; widthPts: number; heightPts: number } {
  const SCALE = 3;
  const fsPx = fontSizePts * SCALE;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  ctx.font = `${fsPx}px ${fontFamily}`;
  const lines = text.split('\n');
  const widest = Math.max(...lines.map(l => ctx.measureText(l || ' ').width));
  const lineHeightPx = fsPx * 1.35;
  const padding = 4 * SCALE;
  canvas.width  = Math.ceil(widest) + padding;
  canvas.height = Math.ceil(lineHeightPx * lines.length) + padding;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `${fsPx}px ${fontFamily}`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'top';
  lines.forEach((line, i) => {
    ctx.fillText(line, padding / 2, padding / 2 + i * lineHeightPx);
  });

  return {
    dataUrl: canvas.toDataURL('image/png'),
    widthPts: canvas.width / SCALE,
    heightPts: canvas.height / SCALE,
  };
}

async function embedDataUrl(pdf: PDFDocument, dataUrl: string) {
  const base64 = dataUrl.split(',')[1];
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  return pdf.embedPng(bytes);
}

export async function applyFillSign(opts: FillSignOptions): Promise<Blob> {
  const { pdfFile, elements, addWatermark } = opts;

  const arrayBuffer = await pdfFile.arrayBuffer();
  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown';
    throw new Error('Cannot parse PDF: ' + msg);
  }

  const pages = pdfDoc.getPages();

  for (const el of elements) {
    const pageIdx = el.page - 1;
    if (pageIdx < 0 || pageIdx >= pages.length) continue;
    const page = pages[pageIdx];
    const { width: pw, height: ph } = page.getSize();

    if (el.type === 'text' || el.type === 'date') {
      const value = (el.value || '').trim();
      if (!value) continue;
      const { dataUrl, widthPts, heightPts } = renderTextToPng(value, el.fontSize, el.color || '#000000');
      const img = await embedDataUrl(pdfDoc, dataUrl);
      const pdfX = (el.x / 100) * pw;
      const topY = (el.y / 100) * ph;
      const pdfY = ph - topY - heightPts;
      page.drawImage(img, {
        x: Math.max(0, pdfX),
        y: Math.max(0, pdfY),
        width: widthPts,
        height: heightPts,
      });
      continue;
    }

    if (el.type === 'signature') {
      if (!el.dataUrl) continue;
      const img = await embedDataUrl(pdfDoc, el.dataUrl);
      // Container in % → PDF points
      const containerW = (el.w / 100) * pw;
      const containerH = (el.h / 100) * ph;
      // Preserve aspect ratio inside the container
      const imgAspect = img.width / img.height;
      const containerAspect = containerW / containerH;
      let drawW: number, drawH: number;
      if (imgAspect > containerAspect) {
        drawW = containerW;
        drawH = containerW / imgAspect;
      } else {
        drawH = containerH;
        drawW = containerH * imgAspect;
      }
      // Top-left of container → PDF coords
      const pdfX = (el.x / 100) * pw;
      const topY = (el.y / 100) * ph;
      const pdfY = ph - topY - containerH;
      // Center within container
      const offsetX = (containerW - drawW) / 2;
      const offsetY = (containerH - drawH) / 2;
      // No `opacity` — the embedded PNG already carries its own alpha
      // channel from canvas.toDataURL, and stamping a 0.95 multiplier on
      // top would lighten the stroke and produce a faint ghost-like
      // signature on the PDF.
      page.drawImage(img, {
        x: Math.max(0, Math.min(pw - drawW, pdfX + offsetX)),
        y: Math.max(0, Math.min(ph - drawH, pdfY + offsetY)),
        width: drawW,
        height: drawH,
      });
      continue;
    }
  }

  if (addWatermark) {
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const watermarkText = 'SignMyPDF.io';
    const fontSize = 8;
    for (const page of pages) {
      const { width: pw } = page.getSize();
      const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
      page.drawText(watermarkText, {
        x: (pw - textWidth) / 2,
        y: 14,
        size: fontSize,
        font,
        color: rgb(0.5, 0.5, 0.5),
        opacity: 0.4,
      });
    }
  }

  pdfDoc.setModificationDate(new Date());
  const bytes = await pdfDoc.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}
