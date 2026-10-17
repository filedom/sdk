import type { PdfiumLibProbeLayout, PdfiumLibProbeRenderStatus } from "./pdfium-lib-probe-render-stub.js";
import { PDFIUM_LIB_PROBE_RENDER_FEATURE_ID } from "./pdfium-lib-probe-render-stub.js";
import type { PdfiumLibProbePageBitmapResult } from "./pdfium-lib-probe-render-node.js";

/** Demo/vite static mount for vendor/pdfium-lib-probe (see packages/demo/vite.config.ts). */
export const PDFIUM_LIB_PROBE_BROWSER_BASE = "/pdfium-lib-probe" as const;

const emptyLayout = (): PdfiumLibProbeLayout => ({
  probeDir: null,
  wasmFiles: [],
  jsGlueFiles: [],
  adapterEntry: null,
  packageJsonPresent: false,
});

export function describePdfiumLibProbeLayoutBrowser(): PdfiumLibProbeLayout {
  return {
    ...emptyLayout(),
    probeDir: PDFIUM_LIB_PROBE_BROWSER_BASE,
    adapterEntry: `${PDFIUM_LIB_PROBE_BROWSER_BASE}/domdoc-probe-adapter.mjs`,
    wasmFiles: ["extracted/release/node/pdfium.esm.wasm"],
    jsGlueFiles: ["extracted/release/node/pdfium.esm.js", "domdoc-probe-adapter.mjs"],
  };
}

export async function tryLoadPdfiumLibProbeRenderBrowser(): Promise<PdfiumLibProbeRenderStatus> {
  const layout = describePdfiumLibProbeLayoutBrowser();
  const base: PdfiumLibProbeRenderStatus = {
    featureId: PDFIUM_LIB_PROBE_RENDER_FEATURE_ID,
    renderOnly: true,
    nonProduction: true,
    probePresent: false,
    moduleLoaded: false,
    layout,
  };
  if (typeof fetch !== "function") {
    return { ...base, error: "browser-host: fetch unavailable" };
  }
  try {
    const head = await fetch(`${PDFIUM_LIB_PROBE_BROWSER_BASE}/domdoc-probe-adapter.mjs`, {
      method: "HEAD",
    });
    if (!head.ok) {
      return { ...base, error: "probe adapter not served (missing vendor/pdfium-lib-probe mount)" };
    }
  } catch (err) {
    return {
      ...base,
      error: err instanceof Error ? err.message : String(err),
    };
  }
  try {
    const mod = (await import(
      /* @vite-ignore */
      `${PDFIUM_LIB_PROBE_BROWSER_BASE}/domdoc-probe-adapter.mjs`
    )) as {
      default?: { __domdocPdfiumLibProbeRender?: boolean };
    };
    if (!mod.default?.__domdocPdfiumLibProbeRender) {
      return { ...base, probePresent: true, error: "probe adapter missing __domdocPdfiumLibProbeRender" };
    }
    return { ...base, probePresent: true, moduleLoaded: true };
  } catch (err) {
    return {
      ...base,
      probePresent: true,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Render-only page bitmap when demo serves pdfium-lib probe bytes (not G1 writer). */
export async function tryRenderPdfiumLibProbePageBitmapBrowser(): Promise<PdfiumLibProbePageBitmapResult> {
  const status = await tryLoadPdfiumLibProbeRenderBrowser();
  if (!status.moduleLoaded) {
    return {
      available: false,
      renderOnly: true,
      synthetic: false,
      width: 0,
      height: 0,
      byteLength: 0,
      error: status.error ?? "probe not loaded",
    };
  }
  const esmUrl = `${PDFIUM_LIB_PROBE_BROWSER_BASE}/extracted/release/node/pdfium.esm.js`;
  try {
    const PDFiumModule = (await import(/* @vite-ignore */ esmUrl)).default as () => Promise<{
      cwrap: (
        name: string,
        returnType: string | null,
        argTypes: string[],
      ) => (...args: number[]) => number;
      _malloc: (size: number) => number;
      _free: (ptr: number) => void;
      HEAPU8: Uint8Array;
      locateFile?: (path: string) => string;
    }>;
    const Module = await PDFiumModule();
    if (typeof Module.locateFile !== "function") {
      Module.locateFile = (file: string) =>
        `${PDFIUM_LIB_PROBE_BROWSER_BASE}/extracted/release/node/${file}`;
    }
    const cwrap = Module.cwrap.bind(Module);
    cwrap("PDFium_Init", null, [])();
    const CreateNew = cwrap("FPDF_CreateNewDocument", "number", []);
    const PageNew = cwrap("FPDFPage_New", "number", ["number", "number", "number", "number"]);
    const LoadPage = cwrap("FPDF_LoadPage", "number", ["number", "number"]);
    const GetPageWidth = cwrap("FPDF_GetPageWidthF", "number", ["number"]);
    const GetPageHeight = cwrap("FPDF_GetPageHeightF", "number", ["number"]);
    const CreateBitmap = cwrap("FPDFBitmap_Create", "number", ["number", "number", "number"]);
    const RenderPageBitmap = cwrap("FPDF_RenderPageBitmap", null, [
      "number",
      "number",
      "number",
      "number",
      "number",
      "number",
      "number",
      "number",
    ]);
    const GetStride = cwrap("FPDFBitmap_GetStride", "number", ["number"]);
    const GetHeight = cwrap("FPDFBitmap_GetHeight", "number", ["number"]);
    const ClosePage = cwrap("FPDF_ClosePage", null, ["number"]);
    const CloseDoc = cwrap("FPDF_CloseDocument", null, ["number"]);
    const DestroyBitmap = cwrap("FPDFBitmap_Destroy", null, ["number"]);
    const doc = CreateNew();
    PageNew(doc, 0, 612, 792);
    const page = LoadPage(doc, 0);
    const width = Math.max(1, Math.ceil(GetPageWidth(page)));
    const height = Math.max(1, Math.ceil(GetPageHeight(page)));
    const bitmap = CreateBitmap(width, height, 3);
    RenderPageBitmap(bitmap, page, 0, 0, width, height, 0, 0);
    const byteLength = GetStride(bitmap) * GetHeight(bitmap);
    DestroyBitmap(bitmap);
    ClosePage(page);
    CloseDoc(doc);
    return {
      available: true,
      renderOnly: true,
      synthetic: false,
      width,
      height,
      byteLength,
    };
  } catch (err) {
    return {
      available: false,
      renderOnly: true,
      synthetic: true,
      width: 1,
      height: 1,
      byteLength: 4,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
