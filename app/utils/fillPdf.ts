import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface TextFieldData {
  id: string;
  page: number;   // 1-indexed
  x: number;      // % from left (0-100)
  y: number;      // % from top (0-100)
  text: string;
  fontSize: number;
  color: string;
  width?: number; // px (UI only, not needed for PDF output)
}

interface FillPdfOptions {
  pdfFile: File;
  textFields: TextFieldData[];
  addWatermark: boolean;
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
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const field of textFields) {
    if (!field.text.trim()) continue;
    const pageIndex = field.page - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;

    const page = pages[pageIndex];
    const { width, height } = page.getSize();

    // Convert % from top-left (CSS) to PDF coordinates (bottom-left origin).
    // field.y marks the visual TOP of the text. In PDF, drawText y = baseline.
    // For Helvetica, cap-height ≈ 0.72×em, so baseline = top + 0.72×fontSize.
    const pdfX = (field.x / 100) * width;
    const pdfY = height - (field.y / 100) * height - field.fontSize * 0.72;

    // Parse hex color → rgb
    const hex = (field.color || '#000000').replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;

    // Handle multi-line text (newlines from textarea)
    const lines = field.text.split('\n');
    const lineHeight = field.fontSize * 1.3;
    lines.forEach((line, i) => {
      const lineY = Math.max(0, pdfY - i * lineHeight);
      if (lineY < 0) return;
      page.drawText(line, {
        x: Math.max(0, pdfX),
        y: lineY,
        size: field.fontSize,
        font,
        color: rgb(r, g, b),
      });
    });
  }

  if (addWatermark) {
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
