import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function POST(req: NextRequest) {
  try {
    const fd        = await req.formData();
    const pdfFile   = fd.get('pdf') as File | null;
    const sigData   = (fd.get('signatureData') as string) || '';
    const typedName = (fd.get('typedName') as string) || '';
    const signMode  = (fd.get('signMode') as string) || 'draw';
    const signPage  = parseInt((fd.get('signPage') as string) || '1') || 1;

    const xPct = parseFloat((fd.get('placementXPct') as string) || '5');
    const yPct = parseFloat((fd.get('placementYPct') as string) || '75');
    const wPct = parseFloat((fd.get('placementWPct') as string) || '30');
    const hPct = parseFloat((fd.get('placementHPct') as string) || '12');

    if (!pdfFile) {
      return NextResponse.json({ error: 'No PDF file received' }, { status: 400 });
    }

    const pdfBytes = await pdfFile.arrayBuffer();
    if (!pdfBytes || pdfBytes.byteLength < 10) {
      return NextResponse.json({ error: 'PDF file is empty' }, { status: 400 });
    }

    let pdfDoc: PDFDocument;
    try {
      pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    } catch (loadErr: any) {
      console.error('PDF load error:', loadErr);
      return NextResponse.json({ error: 'Cannot parse PDF: ' + loadErr?.message }, { status: 422 });
    }

    const pages   = pdfDoc.getPages();
    const pageIdx = Math.min(Math.max(signPage - 1, 0), pages.length - 1);
    const page    = pages[pageIdx];
    const { width: pw, height: ph } = page.getSize();

    // Convert % to PDF points (origin: bottom-left)
    const sigW = (wPct / 100) * pw;
    const sigH = (hPct / 100) * ph;
    const pdfX = (xPct / 100) * pw;
    const pdfY = ph - ((yPct / 100) * ph) - sigH;

    const safeX = Math.max(0, Math.min(pw - sigW, pdfX));
    const safeY = Math.max(0, pdfY);

    if (signMode === 'draw' && sigData.startsWith('data:image/png')) {
      const base64   = sigData.split(',')[1];
      const imgBytes = Buffer.from(base64, 'base64');
      try {
        const img = await pdfDoc.embedPng(imgBytes);
        page.drawImage(img, { x: safeX, y: safeY, width: sigW, height: Math.min(sigH, ph - safeY), opacity: 0.95 });
      } catch (imgErr: any) {
        console.error('Image embed error:', imgErr);
        return NextResponse.json({ error: 'Cannot embed signature image: ' + imgErr?.message }, { status: 422 });
      }
    } else if (signMode === 'type' && typedName.trim()) {
      const font = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
      const fontSize = Math.max(12, Math.min(48, sigH * 0.55));
      page.drawText(typedName.trim(), {
        x: safeX, y: Math.max(10, safeY + sigH * 0.15),
        size: fontSize, font,
        color: rgb(0.07, 0.22, 0.55),
        opacity: 0.92,
      });
    } else {
      // Neither draw nor type — just return the original with a stamp
      console.warn('No signature content, signMode:', signMode, 'sigData len:', sigData.length, 'typedName:', typedName);
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
  } catch (err: any) {
    console.error('Sign route error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to sign PDF' }, { status: 500 });
  }
}
