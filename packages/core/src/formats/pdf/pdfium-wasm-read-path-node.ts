import { tryLoadPdfiumWasmModule } from "./backends/pdfium-wasm-backend.js";
import { resolvePdfiumWasmModule } from "./pdfium-module-resolve.js";
import type { PdfiumWasmReadPathStatus } from "./pdfium-wasm-read-path-stub.js";
import { PDFIUM_WASM_READ_PATH_FEATURE_ID } from "./pdfium-wasm-read-path-stub.js";

/** Node/CI: resolve vendor adapter and report read vs writer readiness. */
export async function describePdfiumWasmReadPathNode(): Promise<PdfiumWasmReadPathStatus> {
  const resolution = resolvePdfiumWasmModule();
  const load = await tryLoadPdfiumWasmModule();
  return {
    featureId: PDFIUM_WASM_READ_PATH_FEATURE_ID,
    pdfiumSourceCommit: load.pdfiumSourceCommit,
    moduleLoaded: load.loaded,
    writerExportsReady: load.writerExportsReady,
    resolutionSource: resolution.source,
    error: load.error,
  };
}
