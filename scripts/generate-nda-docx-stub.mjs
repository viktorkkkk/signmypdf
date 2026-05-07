#!/usr/bin/env node
/**
 * One-shot generator for a placeholder NDA template DOCX.
 * Minimal valid Office Open XML so Word/Pages/Google Docs open it
 * cleanly. The user replaces this file with the real legal text.
 *
 * Usage: node scripts/generate-nda-docx-stub.mjs
 * Output: apps/web/public/templates/nda-template.docx
 */

import JSZip from 'jszip';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir    = resolve(__dirname, '..', 'apps', 'web', 'public', 'templates');
mkdirSync(outDir, { recursive: true });

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

// Each <w:p> is a paragraph; <w:r> is a run; <w:t> is the text.
const para = (txt, bold = false) => `<w:p><w:r>${bold ? '<w:rPr><w:b/></w:rPr>' : ''}<w:t xml:space="preserve">${txt}</w:t></w:r></w:p>`;

const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${para('Mutual Non-Disclosure Agreement', true)}
    ${para('(Placeholder template — replace with the final legal text.)')}
    ${para('')}
    ${para('This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of _________________ ("Effective Date") between:')}
    ${para('')}
    ${para('Party A: ___________________________________________________')}
    ${para('Party B: ___________________________________________________')}
    ${para('')}
    ${para('1. Confidential Information.', true)}
    ${para('   Each party may disclose information considered confidential.')}
    ${para('')}
    ${para('2. Use of Confidential Information.', true)}
    ${para('   The receiving party shall use the information only for evaluating a potential business relationship.')}
    ${para('')}
    ${para('3. Term.', true)}
    ${para('   This Agreement shall remain in effect for ___ years from the Effective Date.')}
    ${para('')}
    ${para('4. Governing Law.', true)}
    ${para('   This Agreement shall be governed by the laws of _______________.')}
    ${para('')}
    ${para('Signed by Party A: __________________________   Date: ______________')}
    ${para('Signed by Party B: __________________________   Date: ______________')}
  </w:body>
</w:document>`;

const zip = new JSZip();
zip.file('[Content_Types].xml', contentTypes);
zip.folder('_rels').file('.rels', rootRels);
zip.folder('word').file('document.xml', document);

const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
writeFileSync(resolve(outDir, 'nda-template.docx'), buf);
console.log(`Wrote ${buf.length} bytes → public/templates/nda-template.docx`);
