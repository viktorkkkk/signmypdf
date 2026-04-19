import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface TextFieldData {
  id: string;
  page: number;   // 1-indexed
  x: number;      // % from left (0-100)
  y: number;      // % from top (0-100)
  text: string;
  fontSize: number;
  color: string;
  width?: number; // px (UI only)
}

interface FillPdfOptions {
  pdfFile: File;
  textFields: TextFieldData[];
  addWatermark: boolean;
}

/**
 * Render a text field to a PNG data URL via canvas.
 * Supports any unicode (Cyrillic, CJK, etc.) — no WinAnsi limitation.
 */
function renderFieldToPng(
  lines: string[],
  fontSize: number,       // in PDF points
  color: string,
  lineHeightPts: number,  // in PDF points
): { dataUrl: string; widthPts: number; heightPts: number } {
  const SCALE = 3; // retina quality
  const fsPx = fontSize * SCALE;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // Measure widest line
  ctx.font = `${fsPx}px -apple-system, "Helvetica Neue", Arial, sans-serif`;
  const maxWidth = Math.max(...lines.map(l => ctx.measureText(l || ' ').width));

  const PAD = 4 * SCALE; // small padding so glyphs aren't clipped
  canvas.width  = Math.ceil(maxWidth) + PAD;
  canvas.height = Math.ceil(lineHeightPts * SCALE * lines.length) + PAD;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `${fsPx}px -apple-system, "Helvetica Neue", Arial, sans-serif`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'top';

  lines.forEach((line, i) => {
    ctx.fillText(line, PAD / 2, PAD / 2 + i * lineHeightPts * SCALE);
  });

  return {
    dataUrl:   canvas.toDataURL('image/png'),
    widthPts:  canvas.width  / SCALE,
    heightPts: canvas.height / SCALE,
  };
}

export async function fillPdfInBrowser({ pdfFile, textFields, addWatermark }: FillPdfOptions): Promise<Blob> {
  const arrayBuffer = await pdfFile.arrayBuffer();

  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  } catch (e: any) {
    throw new Error('Cannot parse PDF: ' + (e?.message || 'unknown'));
  }

  const pages = pdfDoc.getPages();

  for (const field of textFields) {
    if (!field.text.trim()) continue;
    const pageIndex = field.page - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;

    const page = pages[pageIndex];
    const { width: pw, height: ph } = page.getSize();

    const lines = field.text.split('\n');
    const lineHeightPts = field.fontSize * 1.35; // matches CSS line-height

    // Parse hex color
    const hex = (field.color || '#000000').replace('#', '');
    const colorStr = `#${hex}`;

    // Render text to PNG via canvas — unicode safe
    const { dataUrl, widthPts, heightPts } = renderFieldToPng(lines, field.fontSize, colorStr, lineHeightPts);

    // Embed PNG
    const base64 = dataUrl.split(',')[1];
    const imgBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const img = await pdfDoc.embedPng(imgBytes);

    // Position:
    // field.x / field.y are % from top-left of page (CSS origin).
    // PDF origin is bottom-left; drawImage places from bottom-left of the image upward.
    const pdfX = (field.x / 100) * pw;
    const topYpdf = (field.y / 100) * ph;           // distance from top in PDF units
    const pdfY = ph - topYpdf - heightPts;           // bottom-left corner in PDF coords

    page.drawImage(img, {
      x: Math.max(0, pdfX),
      y: Math.max(0, pdfY),
      width:  widthPts,
      height: heightPts,
    });
  }

  // Watermark — ASCII only, Helvetica is fine
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
