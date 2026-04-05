import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface SignOptions {
  pdfFile: File;
  signatureDataUrl: string;
  typedName: string;
  signMode: 'draw' | 'type';
  page: number;       // 1-indexed
  xPct: number;       // % from left
  yPct: number;       // % from top
  wPct: number;       // % width
  hPct: number;       // % height
}

export async function signPdfInBrowser(opts: SignOptions): Promise<Blob> {
  const { pdfFile, signatureDataUrl, typedName, signMode, page, xPct, yPct, wPct, hPct } = opts;

  const arrayBuffer = await pdfFile.arrayBuffer();

  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  } catch (e: any) {
    throw new Error('Cannot parse PDF: ' + (e?.message || 'unknown'));
  }

  const pages   = pdfDoc.getPages();
  const pageIdx = Math.min(Math.max(page - 1, 0), pages.length - 1);
  const pg      = pages[pageIdx];
  const { width: pw, height: ph } = pg.getSize();

  const sigW  = (wPct / 100) * pw;
  const sigH  = (hPct / 100) * ph;
  const pdfX  = (xPct / 100) * pw;
  const pdfY  = ph - ((yPct / 100) * ph) - sigH;
  const safeX = Math.max(0, Math.min(pw - sigW, pdfX));
  const safeY = Math.max(0, pdfY);

  if (signMode === 'draw' && signatureDataUrl?.startsWith('data:image/png')) {
    const base64   = signatureDataUrl.split(',')[1];
    const bytes    = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const img      = await pdfDoc.embedPng(bytes);
    pg.drawImage(img, {
      x: safeX, y: safeY,
      width: sigW, height: Math.min(sigH, ph - safeY),
      opacity: 0.95,
    });
  } else if (signMode === 'type' && typedName.trim()) {
    const font     = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
    const fontSize = Math.max(12, Math.min(48, sigH * 0.55));
    pg.drawText(typedName.trim(), {
      x: safeX, y: Math.max(10, safeY + sigH * 0.15),
      size: fontSize, font,
      color: rgb(0.07, 0.22, 0.55),
      opacity: 0.92,
    });
  }

  pdfDoc.setModificationDate(new Date());
  const signedBytes = await pdfDoc.save();
  return new Blob([signedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}
