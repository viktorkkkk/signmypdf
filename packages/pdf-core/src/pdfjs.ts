/**
 * Worker-init helper for `pdfjs-dist`.
 *
 * pdfjs runs the parsing/rendering pipeline in a Web Worker, which it
 * loads from `GlobalWorkerOptions.workerSrc`. The worker URL differs
 * by host:
 *
 *   - Next.js web app:   `'/pdf.worker.min.mjs'` (served from public/)
 *   - Chrome extension:  `chrome.runtime.getURL('pdf.worker.min.mjs')`
 *
 * Each host calls `setupPdfjs(workerSrc)` once on boot. Subsequent
 * `await import('pdfjs-dist')` calls in components see the worker
 * configured correctly.
 *
 * Returns the resolved pdfjs module so the caller can also do
 * `const pdfjs = await setupPdfjs(...)` and skip a second import.
 *
 * Idempotent — safe to call multiple times with the same source.
 */
export async function setupPdfjs(workerSrc: string) {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  return pdfjs;
}
