interface PdfiumModule {
  ccall?: (ident: string, returnType: string | null, argTypes: string[] | null, args?: unknown[]) => unknown;
}

interface PdfiumCreated {
  pdfium?: PdfiumModule;
  PDFiumExt_Init?: () => void;
}

/**
 * The renderer starts through its init export. The Rust binding then asks `ccall`
 * for an init symbol this build does not export.
 */
export function bindPdfiumRender(
  created: PdfiumCreated,
  initialize: (module: unknown, rust: unknown, debug: boolean) => boolean,
  rust: unknown,
): void {
  created.PDFiumExt_Init?.();
  const pdfium = created.pdfium ?? (created as PdfiumModule);
  const ccall = pdfium.ccall?.bind(pdfium);
  if (ccall) {
    pdfium.ccall = (ident, returnType, argTypes, args) => {
      if (ident === "PDFium_Init" || ident === "PDF_InitLibrary" || ident === "FPDF_InitLibrary") return 0;
      return ccall(ident, returnType, argTypes, args);
    };
  }
  if (initialize(pdfium, rust, false) === false) {
    throw new Error("open-failed: pdfium-render did not bind");
  }
}
