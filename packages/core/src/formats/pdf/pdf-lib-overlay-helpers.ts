/**
 * Blueprint C12 (pdf-lib MIT): selective overlay/page helpers only.
 * Does not satisfy G1 native text replacement — overlays do not remove existing PDF text.
 */
export const PDF_LIB_OVERLAY_HELPERS_FEATURE_ID = "C12-PDF-LIB-OVERLAY" as const;

export interface PdfLibOverlayPageDescriptor {
  featureId: typeof PDF_LIB_OVERLAY_HELPERS_FEATURE_ID;
  pageCount: number;
  /** True when bytes came from pdf-lib, not PDFium writer. */
  overlayOnly: true;
  gatePass: false;
  byteLength: number;
}

/** Create a minimal single-page PDF with an optional text overlay (display/export helper path). */
export async function createPdfLibOverlayPageBytes(options?: {
  overlayText?: string;
}): Promise<PdfLibOverlayPageDescriptor & { bytes: Uint8Array }> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  if (options?.overlayText) {
    const font = await doc.embedFont(StandardFonts.Helvetica);
    page.drawText(options.overlayText, { x: 72, y: 720, size: 12, font, color: rgb(0.1, 0.1, 0.1) });
  }
  const bytes = await doc.save();
  return {
    featureId: PDF_LIB_OVERLAY_HELPERS_FEATURE_ID,
    pageCount: doc.getPageCount(),
    overlayOnly: true,
    gatePass: false,
    byteLength: bytes.byteLength,
    bytes: new Uint8Array(bytes),
  };
}
