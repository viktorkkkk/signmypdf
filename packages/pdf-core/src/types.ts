/**
 * Shared type contracts for the PDF signing pipeline.
 *
 * `SignaturePlacement` is the single source of truth for "where on a
 * page does this signature go" across both the signing engine
 * (`signPdf.ts` calls `pdf-lib`) and the placement-picker UI
 * (`PdfSignViewer` in `@signmypdf/ui`). Coordinates are percent of
 * page dimensions, anchored top-left in CSS terms — `signPdf.ts`
 * translates to PDF's bottom-left origin internally.
 */

export interface SignaturePlacement {
  /** 1-indexed page number. */
  page: number;
  /** Percent from left (0-100). */
  x: number;
  /** Percent from top (0-100). */
  y: number;
  /** Width as percent of page width (0-100). */
  w: number;
  /** Height as percent of page height (0-100). */
  h: number;
}

export interface SignOptions {
  pdfFile: File;
  signatureDataUrl: string;
  typedName: string;
  signMode: 'draw' | 'type';
  placements: SignaturePlacement[];
  addWatermark?: boolean;
}
