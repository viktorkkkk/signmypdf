import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function POST(req: NextRequest) {
  try {
    const fd          = await req.formData();
    const pdfFile     = fd.get('pdf') as File;
    const sigData     = fd.get('signatureData') as string;
    const typedName   = fd.get('typedName') as string;
    const signMode    = fd.get('signMode') as string;
    const signPage    = parseInt(fd.get('signPage') as string) || 1;

    // Position as % of page (from top-left of rendered view)
    const xPct = parseFloat(fd.get('placementXPct') as string) || 5;
    const yPct = parseFloat(fd.get('placementYPct') as string) || 75;
    const wPct = parseFloat(fd.get('placementWPct') as string) || 30;
    const hPct = parseFloat(fd.get('placementHPct') as string) || 12;

    if (!pdfFile) return NextResponse.json({ error: 'No PDF' }, { status: 400 });

    const pdfDoc = await PDFDocument.load(await pdfFile.arrayBuffer());
    const pages  = pdfDoc.getPages();
    const pageIdx = Math.min(Math.max(signPage - 1, 0), pages.length - 1);
    const page   = pages[pageIdx];
    const { width: pw, height: ph } = page.getSize();

    // Convert: xPct/yPct are from top-left of page (CSS coords)
    // PDF coords: origin bottom-left
    const sigW = (wPct / 100) * pw;
    const sigH = (hPct / 100) * ph;
    const pdfX = (xPct / 100) * pw;
    const pdfY = ph - ((yPct / 100) * ph) - sigH; // flip Y

    if (signMode === 'draw' && sigData?.startsWith('data:image/png')) {
      const base64   = sigData.split(',')[1];
      const imgBytes = Buffer.from(base64, 'base64');
      const img      = await pdfDoc.embedPng(imgBytes);
      page.drawImage(img, {
        x: Math.max(0, pdfX),
        y: Math.max(0, pdfY),
        width:  Math.min(sigW, pw),
        height: Math.min(sigH, ph),
        opacity: 0.95,
      });
    } else if (signMode === 'type' && typedName) {
      const font = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
      const fontSize = Math.max(10, Math.min(40, sigH * 0.6));
      page.drawText(typedName, {
        x: Math.max(0, pdfX),
        y: Math.max(0, pdfY + sigH * 0.2),
        size: fontSize, font,
        color: rgb(0.07, 0.22, 0.55),
        opacity: 0.92,
      });
    }

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
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
