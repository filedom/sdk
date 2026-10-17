/** Render-only pdfium-lib probe (non-C24; separate from G1 writer gate). Browser-safe surface. */
export const PDFIUM_LIB_PROBE_RENDER_FEATURE_ID = "G1-PDF-PROBE-RENDER" as const;

export interface PdfiumLibProbeLayout {
  probeDir: string | null;
  wasmFiles: string[];
  jsGlueFiles: string[];
  adapterEntry: string | null;
  packageJsonPresent: boolean;
}

export interface PdfiumLibProbeRenderStatus {
  featureId: typeof PDFIUM_LIB_PROBE_RENDER_FEATURE_ID;
  renderOnly: true;
  nonProduction: true;
  probePresent: boolean;
  moduleLoaded: boolean;
  layout: PdfiumLibProbeLayout;
  error?: string;
}

const emptyLayout = (): PdfiumLibProbeLayout => ({
  probeDir: null,
  wasmFiles: [],
  jsGlueFiles: [],
  adapterEntry: null,
  packageJsonPresent: false,
});

/** Browser/demo host: probe vendor is not bundled; CI worker loads via node helper. */
export function describePdfiumLibProbeLayout(): PdfiumLibProbeLayout {
  return emptyLayout();
}

export async function tryLoadPdfiumLibProbeRender(): Promise<PdfiumLibProbeRenderStatus> {
  return {
    featureId: PDFIUM_LIB_PROBE_RENDER_FEATURE_ID,
    renderOnly: true,
    nonProduction: true,
    probePresent: false,
    moduleLoaded: false,
    layout: emptyLayout(),
    error: "browser-host: use pdfium-lib-probe-render-node in CI; serve vendor/pdfium-lib-probe for future render bind",
  };
}

export function readPdfiumLibProbeManifest(): Record<string, unknown> | null {
  return null;
}
