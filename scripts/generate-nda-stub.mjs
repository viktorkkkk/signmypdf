#!/usr/bin/env node
/**
 * One-shot generator for a placeholder NDA template PDF.
 * The real legal text will replace this file by hand. This stub exists
 * so the /sign-nda page's pdfjs thumbnail and Download PDF button have
 * something valid to show in preview and tests.
 *
 * Usage: node scripts/generate-nda-stub.mjs
 * Output: apps/web/public/templates/nda-template.pdf
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir    = resolve(__dirname, '..', 'apps', 'web', 'public', 'templates');
mkdirSync(outDir, { recursive: true });

const pdf = await PDFDocument.create();
const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
const body = await pdf.embedFont(StandardFonts.Helvetica);

// Page 1
const p1 = pdf.addPage([595, 842]); // A4
let y = 780;
p1.drawText('Mutual Non-Disclosure Agreement', { x: 70, y, size: 20, font: bold, color: rgb(0.1, 0.1, 0.1) });
y -= 28;
p1.drawText('(Placeholder template — replace with the final legal text.)', {
  x: 70, y, size: 11, font: body, color: rgb(0.4, 0.4, 0.4),
});
y -= 36;

const lines = [
  'This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of',
  '_________________ ("Effective Date") between:',
  '',
  'Party A:  ___________________________________________________',
  'Party B:  ___________________________________________________',
  '',
  '1. Confidential Information.',
  '   Each party may disclose information considered confidential.',
  '',
  '2. Use of Confidential Information.',
  '   The receiving party shall use the information only for evaluating',
  '   a potential business relationship.',
  '',
  '3. Term.',
  '   This Agreement shall remain in effect for ___ years from the',
  '   Effective Date.',
  '',
  '4. Governing Law.',
  '   This Agreement shall be governed by the laws of _______________.',
  '',
  '',
  'Signed by Party A: __________________________   Date: ______________',
  '',
  'Signed by Party B: __________________________   Date: ______________',
];
for (const line of lines) {
  p1.drawText(line, { x: 70, y, size: 11, font: body, color: rgb(0.15, 0.15, 0.15) });
  y -= 18;
}

// Page 2 (so multi-page selectors work)
const p2 = pdf.addPage([595, 842]);
p2.drawText('Schedule A — Confidential Materials', { x: 70, y: 780, size: 16, font: bold, color: rgb(0.1, 0.1, 0.1) });
p2.drawText('(List specific materials covered by this Agreement.)', {
  x: 70, y: 752, size: 11, font: body, color: rgb(0.4, 0.4, 0.4),
});

const bytes = await pdf.save();
writeFileSync(resolve(outDir, 'nda-template.pdf'), bytes);
console.log(`Wrote ${bytes.length} bytes → public/templates/nda-template.pdf`);
