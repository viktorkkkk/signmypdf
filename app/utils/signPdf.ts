import { PDFDocument } from 'pdf-lib';

// Render text to PNG image (supports any Unicode including Cyrillic)
function renderTextToDataUrl(text: string, width: number, height: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(400, Math.round(width * 2));
  canvas.height = Math.max(100, Math.round(height * 2));
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const fontSize = Math.min(canvas.height * 0.6, canvas.width / text.length * 1.5);
  ctx.font = `italic ${fontSize}px "Brush Script MT", "Dancing Script", "Pacifico", cursive`;
  ctx.fillStyle = '#1e3a8a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  return canvas.toDataURL('image/png');
}

export interface SignaturePlacement {
  page: number;
  x: number;      // % from left (as seen by viewer)
  y: number;      // % from top (as seen by viewer)
  w: number;      // % width
  h: number;      // % height
}

export interface SignOptions {
  pdfFile: File;
  signatureDataUrl: string;
  typedName: string;
  signMode: 'draw' | 'type';
  placements: SignaturePlacement[];
}

function fitImageToContainer(
  imgWidth: number, imgHeight: number,
  containerWidth: number, containerHeight: number
): { width: number; height: number } {
  const imgAspect = imgWidth / imgHeight;
  const containerAspect = containerWidth / containerHeight;
  if (imgAspect > containerAspect) {
    return { width: containerWidth, height: containerWidth / imgAspect };
  } else {
    return { width: containerHeight * imgAspect, height: containerHeight };
  }
}

export async function signPdfInBrowser(opts: SignOptions): Promise<Blob> {
  const { pdfFile, signatureDataUrl, typedName, signMode, placements } = opts;

  const arrayBuffer = await pdfFile.arrayBuffer();
  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  } catch (e: any) {
    throw new Error('Cannot parse PDF: ' + (e?.message || 'unknown'));
  }

  const pages = pdfDoc.getPages();

  for (const placement of placements) {
    const { page, x, y, w, h } = placement;
    if (page < 1 || page > pages.length) continue;

    const pg = pages[page - 1];
    const { width: pw, height: ph } = pg.getSize();

    // Get page rotation so we can place signature in viewer coordinates
    const rotation = pg.getRotation().angle; // 0, 90, 180, 270

    const containerW = (w / 100) * pw;
    const containerH = (h / 100) * ph;

    // Convert viewer % coords → raw PDF coords accounting for rotation.
    // PDF origin is always bottom-left of raw page; rotation changes which corner
    // the viewer treats as "top-left".
    let pdfX: number, pdfY: number;
    if (rotation === 90) {
      // Viewer top-left = PDF bottom-left corner. Axes swapped.
      pdfX = (y / 100) * pw;
      pdfY = (x / 100) * ph;
    } else if (rotation === 180) {
      // Viewer top-left = PDF top-right corner.
      pdfX = pw - (x / 100) * pw - containerW;
      pdfY = (y / 100) * ph;
    } else if (rotation === 270) {
      // Viewer top-left = PDF top-right corner. Axes swapped.
      pdfX = pw - (y / 100) * pw - containerW;
      pdfY = ph - (x / 100) * ph - containerH;
    } else {
      // rotation === 0 (normal)
      pdfX = (x / 100) * pw;
      pdfY = ph - (y / 100) * ph - containerH;
    }

    let dataUrl: string;
    if (signMode === 'draw' && signatureDataUrl?.startsWith('data:image/png')) {
      dataUrl = signatureDataUrl;
    } else if (signMode === 'type' && typedName.trim()) {
      dataUrl = renderTextToDataUrl(typedName.trim(), containerW, containerH);
    } else {
      continue;
    }

    const base64 = dataUrl.split(',')[1];
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const img = await pdfDoc.embedPng(bytes);

    const fitted = fitImageToContainer(img.width, img.height, containerW, containerH);
    const offsetX = (containerW - fitted.width) / 2;
    const offsetY = (containerH - fitted.height) / 2;

    const safeX = Math.max(0, Math.min(pw - fitted.width,  pdfX + offsetX));
    const safeY = Math.max(0, Math.min(ph - fitted.height, pdfY + offsetY));

    pg.drawImage(img, {
      x: safeX,
      y: safeY,
      width: fitted.width,
      height: fitted.height,
      opacity: 0.95,
    });
  }

  pdfDoc.setModificationDate(new Date());
  const signedBytes = await pdfDoc.save();
  return new Blob([signedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}
