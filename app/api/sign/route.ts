import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const pdfFile   = formData.get('pdf') as File;
    const signatureData = formData.get('signatureData') as string;
    const typedName     = formData.get('typedName') as string;
    const signMode      = formData.get('signMode') as string;
    const signPage      = parseInt(formData.get('signPage') as string) || 1;
    const signX         = parseFloat(formData.get('signX') as string) || 80;
    const signY         = parseFloat(formData.get('signY') as string) || 80;

    if (!pdfFile) return NextResponse.json({ error: 'No PDF' }, { status: 400 });

    const pdfBytes = await pdfFile.arrayBuffer();
    const pdfDoc   = await PDFDocument.load(pdfBytes);
    const pages    = pdfDoc.getPages();

    // Use specified page (1-indexed), fallback to last
    const pageIndex = Math.min(Math.max(signPage - 1, 0), pages.length - 1);
    const page = pages[pageIndex];
    const { height } = page.getSize();

    if (signMode === 'draw' && signatureData?.startsWith('data:image/png')) {
      const base64 = signatureData.split(',')[1];
      const imgBytes = Buffer.from(base64, 'base64');
      const img = await pdfDoc.embedPng(imgBytes);
      const sigW = 160;
      const sigH = 50;
      // signY is already in PDF coords (origin bottom-left)
      const drawY = Math.max(10, Math.min(height - sigH - 10, signY));
      page.drawImage(img, { x: signX, y: drawY, width: sigW, height: sigH, opacity: 0.95 });
    } else if (signMode === 'type' && typedName) {
      const font = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
      const drawY = Math.max(10, Math.min(height - 40, signY));
      page.drawText(typedName, { x: signX, y: drawY, size: 26, font, color: rgb(0.07, 0.22, 0.55), opacity: 0.92 });
    }

    pdfDoc.setModificationDate(new Date());
    const signed = await pdfDoc.save();
    return new NextResponse(Buffer.from(signed), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="signed.pdf"',
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to sign PDF' }, { status: 500 });
  }
}
