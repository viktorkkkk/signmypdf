import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Render text to PNG image (supports any Unicode including Cyrillic)
function renderTextToDataUrl(text: string, width: number, height: number): string {
  const canvas = document.createElement('canvas');
  const H = Math.max(100, Math.round(height * 2));
  const maxW = Math.max(600, Math.round(width * 2));
  canvas.height = H;

  const ctx = canvas.getContext('2d')!;
  const fontFamily = '"Brush Script MT", "Dancing Script", "Pacifico", cursive';

  // Auto-scale font so text always fits within maxW
  let fontSize = Math.round(H * 0.6);
  ctx.font = `italic ${fontSize}px ${fontFamily}`;
  let textW = ctx.measureText(text).width;
  const padding = 24;
  while (textW > maxW - padding && fontSize > 16) {
    fontSize -= 2;
    ctx.font = `italic ${fontSize}px ${fontFamily}`;
    textW = ctx.measureText(text).width;
  }

  // Set canvas width exactly to text width (no clipping)
  canvas.width = Math.min(maxW, textW + padding);

  ctx.clearRect(0, 0, canvas.width, H);
  ctx.font = `italic ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = '#1e3a8a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, H / 2);

  return canvas.toDataURL('image/png');
}

export interface SignaturePlacement {
  page: number;
  x: number;      // % from left
  y: number;      // % from top
  w: number;      // % width
  h: number;      // % height
}

export interface SignOptions {
  pdfFile: File;
  signatureDataUrl: string;
  typedName: string;
  signMode: 'draw' | 'type';
  placements: SignaturePlacement[];
  addWatermark?: boolean;
}

/**
 * Calculate image dimensions that fit within container while preserving aspect ratio.
 * Returns dimensions that fit entirely within the container (contain mode).
 */
function fitImageToContainer(
  imgWidth: number,
  imgHeight: number,
  containerWidth: number,
  containerHeight: number
): { width: number; height: number } {
  const imgAspect = imgWidth / imgHeight;
  const containerAspect = containerWidth / containerHeight;

  if (imgAspect > containerAspect) {
    // Image is wider than container (relative to height)
    // Fit to width
    return {
      width: containerWidth,
      height: containerWidth / imgAspect,
    };
  } else {
    // Image is taller than container (relative to width)
    // Fit to height
    return {
      width: containerHeight * imgAspect,
      height: containerHeight,
    };
  }
}

export async function signPdfInBrowser(opts: SignOptions): Promise<Blob> {
  const { pdfFile, signatureDataUrl, typedName, signMode, placements, addWatermark } = opts;

  const arrayBuffer = await pdfFile.arrayBuffer();

  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  } catch (e: any) {
    throw new Error('Cannot parse PDF: ' + (e?.message || 'unknown'));
  }

  const pages = pdfDoc.getPages();

  // Apply each signature placement
  for (const placement of placements) {
    const { page, x, y, w, h } = placement;
    
    // Validate page number
    if (page < 1 || page > pages.length) {
      console.warn(`Skipping invalid page number: ${page}`);
      continue;
    }

    const pageIdx = page - 1; // Convert to 0-indexed
    const pg = pages[pageIdx];
    const { width: pw, height: ph } = pg.getSize();

    // Container size from placement (in PDF points)
    const containerW = (w / 100) * pw;
    const containerH = (h / 100) * ph;
    
    // Position (top-left in CSS % to bottom-left in PDF coordinates)
    // PDF coords: origin at bottom-left, Y increases upward
    // CSS coords: origin at top-left, Y increases downward
    // pdf-lib draws image from bottom-left corner UPWARD
    // So we place bottom-left of image at: y-from-bottom = ph - topY
    const pdfX = (x / 100) * pw;
    const topY = (y / 100) * ph;  // Distance from top of page
    const pdfY = ph - topY - containerH;  // Bottom-left corner of container

    let img: any;
    
    if (signMode === 'draw' && signatureDataUrl?.startsWith('data:image/png')) {
      const base64 = signatureDataUrl.split(',')[1];
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      img = await pdfDoc.embedPng(bytes);
    } else if (signMode === 'type' && typedName.trim()) {
      // Generate image from text to support any characters (including Cyrillic)
      const textDataUrl = await renderTextToDataUrl(typedName.trim(), containerW, containerH);
      const base64 = textDataUrl.split(',')[1];
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      img = await pdfDoc.embedPng(bytes);
    } else {
      continue;
    }

    // Get original image dimensions
    const imgWidth = img.width;
    const imgHeight = img.height;

    // Calculate dimensions that preserve aspect ratio
    const fitted = fitImageToContainer(imgWidth, imgHeight, containerW, containerH);

    // Center the image within the container
    const offsetX = (containerW - fitted.width) / 2;
    const offsetY = (containerH - fitted.height) / 2;

    const finalX = pdfX + offsetX;
    const finalY = pdfY + offsetY;

    // Ensure we don't go outside page bounds
    const safeX = Math.max(0, Math.min(pw - fitted.width, finalX));
    const safeY = Math.max(0, Math.min(ph - fitted.height, finalY));

    // Draw image at calculated position
    // Canvas and PDF both use Y=0 at bottom for images, no flip needed
    pg.drawImage(img, {
      x: safeX,
      y: safeY,
      width: fitted.width,
      height: fitted.height,
      opacity: 0.95,
    });
  }

  // Add watermark on free plan — bottom center of every page, small grey text
  if (addWatermark) {
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const watermarkText = 'SignMyPDF.io';
    const fontSize = 8;

    for (const pg of pages) {
      const { width: pw, height: ph } = pg.getSize();
      const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
      pg.drawText(watermarkText, {
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
  const signedBytes = await pdfDoc.save();
  return new Blob([signedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}
