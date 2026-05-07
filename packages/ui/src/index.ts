/**
 * Public API of `@signmypdf/ui`.
 *
 * Shared React components for PDF sign UI, framework-agnostic. Used by:
 *   - apps/web (Next.js site)
 *   - apps/extension (Chrome extension, planned)
 *
 * Styles ship in `./styles/signature.css` — host imports it once.
 */

export { default as SignatureCanvas } from './SignatureCanvas';
export { default as PdfSignViewer } from './PdfSignViewer';
