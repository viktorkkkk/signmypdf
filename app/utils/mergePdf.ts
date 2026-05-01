import { PDFDocument } from 'pdf-lib';

/**
 * Custom error thrown when a single file in the merge queue can't be loaded.
 * Carries the offending filename so the UI can show "Could not merge X.pdf"
 * without inspecting message strings.
 */
export class MergePdfError extends Error {
  constructor(
    public fileName: string,
    public reason: 'encrypted' | 'corrupted',
    message?: string,
  ) {
    super(message ?? (
      reason === 'encrypted'
        ? `${fileName} is password-protected.`
        : `${fileName} could not be parsed.`
    ));
    this.name = 'MergePdfError';
  }
}

export interface MergeOptions {
  /** Called after each source file is copied. `done` and `total` are file counts. */
  onProgress?: (done: number, total: number) => void;
}

/**
 * Combine multiple PDFs into one by copying every page from every input
 * document, in input order, into a fresh PDFDocument.
 *
 * Encrypted inputs are rejected with `MergePdfError(reason: 'encrypted')`.
 * We deliberately do NOT pass `ignoreEncryption: true` here — copying pages
 * from a password-protected PDF would silently produce an unreadable output.
 */
export async function mergePdf(files: File[], opts: MergeOptions = {}): Promise<Uint8Array> {
  if (!files || files.length < 2) {
    throw new Error('Need at least 2 PDFs to merge.');
  }

  const merged = await PDFDocument.create();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    let src: PDFDocument;
    try {
      const bytes = await file.arrayBuffer();
      src = await PDFDocument.load(bytes, { ignoreEncryption: false });
    } catch (e) {
      const msg = (e as Error)?.message ?? '';
      const isEncrypted = /encrypt|password/i.test(msg);
      throw new MergePdfError(file.name, isEncrypted ? 'encrypted' : 'corrupted');
    }

    const pageIndices = src.getPageIndices();
    const copied = await merged.copyPages(src, pageIndices);
    for (const page of copied) merged.addPage(page);

    opts.onProgress?.(i + 1, files.length);
  }

  merged.setModificationDate(new Date());
  return merged.save();
}
