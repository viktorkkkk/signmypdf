import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function addWatermarkToBlob(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const watermarkText = 'SignMyPDF.io';
  const fontSize = 8;
  for (const page of pdfDoc.getPages()) {
    const { width: pw } = page.getSize();
    const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
    page.drawText(watermarkText, {
      x: (pw - textWidth) / 2, y: 14, size: fontSize, font,
      color: rgb(0.5, 0.5, 0.5), opacity: 0.4,
    });
  }
  const bytes = await pdfDoc.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}
