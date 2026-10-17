/** G1/M4: read-path status for vendored PDFium WASM (browser-safe; no Node fs). */

import { PDFIUM_SOURCE_COMMIT } from "./pdfium-pin.js";

export const PDFIUM_WASM_READ_PATH_FEATURE_ID = "F29" as const;

export interface PdfiumWasmReadPathStatus {
  featureId: typeof PDFIUM_WASM_READ_PATH_FEATURE_ID;
  pdfiumSourceCommit: string;
  /** Dynamic import / resolver succeeded (includes probe adapter). */
  moduleLoaded: boolean;
  /** C24 domdoc-pdfium-wasm writer factory ready. */
  writerExportsReady: boolean;
  resolutionSource: "browser-stub" | "vendor-artifact" | "npm-placeholder" | "env-module-path";
  error?: string;
}

/** Demo/browser: defer to probe render stub; CI worker uses node resolve + tryLoadPdfiumWasmModule. */
export async function describePdfiumWasmReadPathBrowser(): Promise<PdfiumWasmReadPathStatus> {
  return {
    featureId: PDFIUM_WASM_READ_PATH_FEATURE_ID,
    pdfiumSourceCommit: PDFIUM_SOURCE_COMMIT,
    moduleLoaded: false,
    writerExportsReady: false,
    resolutionSource: "browser-stub",
    error: "browser-host: serve vendor/domdoc-pdfium-wasm or use g1PdfiumProbeWorker=1",
  };
}
