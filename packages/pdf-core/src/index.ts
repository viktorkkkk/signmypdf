/**
 * Public API of `@signmypdf/pdf-core`.
 *
 * Browser-side PDF signing engine, framework-agnostic. Used by:
 *   - apps/web (Next.js site)
 *   - apps/extension (Chrome extension, planned)
 */

export { signPdfInBrowser } from './signPdf';
export { addWatermarkToBlob, blobToDataUrl } from './watermark';
export { setupPdfjs } from './pdfjs';
export type { SignaturePlacement, SignOptions } from './types';
