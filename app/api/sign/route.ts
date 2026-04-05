import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb } from 'pdf-lib';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const pdfFile = formData.get('pdf') as File;
    const signatureData = formData.get('signatureData') as string;
    const typedName = formData.get('typedName') as string;
    const signMode = formData.get('signMode') as string;
    const signX = parseFloat(formData.get('signX') as string) || 100;
    const signY = parseFloat(formData.get('signY') as string) || 100;

    if (!pdfFile) {
      return NextResponse.json({ error: 'No PDF provided' }, { status: 400 });
    }

    const pdfBytes = await pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    const { width, height } = lastPage.getSize();

    if (signMode === 'draw' && signatureData && signatureData.startsWith('data:image/png')) {
      // Embed drawn signature image
      const base64Data = signatureData.split(',')[1];
      const imageBytes = Buffer.from(base64Data, 'base64');
      const signImage = await pdfDoc.embedPng(imageBytes);
      const sigWidth = 180;
      const sigHeight = 60;
      lastPage.drawImage(signImage, {
        x: signX,
        y: height - signY - sigHeight,
        width: sigWidth,
        height: sigHeight,
        opacity: 0.95,
      });
    } else if (signMode === 'type' && typedName) {
      // Embed typed name as text
      const { StandardFonts } = await import('pdf-lib');
      const font = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
      lastPage.drawText(typedName, {
        x: signX,
        y: height - signY,
        size: 28,
        font,
        color: rgb(0.1, 0.1, 0.5),
        opacity: 0.9,
      });
    }

    // Add signed metadata
    pdfDoc.setModificationDate(new Date());

    const signedBytes = await pdfDoc.save();
    const buffer = Buffer.from(signedBytes);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="signed.pdf"',
      },
    });
  } catch (error) {
    console.error('Sign error:', error);
    return NextResponse.json({ error: 'Failed to sign PDF' }, { status: 500 });
  }
}

