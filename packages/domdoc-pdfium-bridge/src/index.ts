/**
 * Display-first bridge: re-exports probe render surfaces from @domdoc/core.
 * C24 writer remains `domdoc-pdfium-wasm` vendor path (G1 not-run until P01–P05 pass).
 */
export {
  PDFIUM_LIB_PROBE_RENDER_FEATURE_ID,
  describePdfiumLibProbeLayoutNode,
  tryLoadPdfiumLibProbeRenderNode,
  tryRenderPdfiumLibProbePageBitmapNode,
  type PdfiumLibProbePageBitmapResult,
} from "@domdoc/core";

export const DOMDOC_PDFIUM_BRIDGE_ROLE = "display-probe-bridge" as const;
