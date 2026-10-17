import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { PdfiumLibProbeLayout, PdfiumLibProbeRenderStatus } from "./pdfium-lib-probe-render-stub.js";
import { PDFIUM_LIB_PROBE_RENDER_FEATURE_ID } from "./pdfium-lib-probe-render-stub.js";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "..");
const defaultProbeDir = join(webRoot, "vendor", "pdfium-lib-probe");

export function resolvePdfiumLibProbeDir(): string {
  const env = process.env.PDFIUM_LIB_PROBE_DIR?.trim();
  if (env && existsSync(env)) return env;
  return defaultProbeDir;
}

export function describePdfiumLibProbeLayoutNode(probeDir = resolvePdfiumLibProbeDir()): PdfiumLibProbeLayout {
  const adapterEntry = join(probeDir, "domdoc-probe-adapter.mjs");
  const packageJsonPresent = existsSync(join(probeDir, "package.json"));
  const wasmFiles: string[] = [];
  const jsGlueFiles: string[] = [];
  if (existsSync(probeDir)) {
    const walk = (dir: string, prefix = ""): void => {
      for (const name of readdirSync(dir, { withFileTypes: true })) {
        const rel = prefix ? `${prefix}/${name.name}` : name.name;
        const full = join(dir, name.name);
        if (name.isDirectory()) {
          walk(full, rel);
          continue;
        }
        if (name.name.endsWith(".wasm")) wasmFiles.push(rel);
        if (name.name.endsWith(".js") || name.name.endsWith(".mjs")) jsGlueFiles.push(rel);
      }
    };
    walk(probeDir);
  }
  return {
    probeDir,
    wasmFiles: wasmFiles.sort(),
    jsGlueFiles: jsGlueFiles.sort(),
    adapterEntry: existsSync(adapterEntry) ? adapterEntry : null,
    packageJsonPresent,
  };
}

export async function tryLoadPdfiumLibProbeRenderNode(): Promise<PdfiumLibProbeRenderStatus> {
  const layout = describePdfiumLibProbeLayoutNode();
  const base: PdfiumLibProbeRenderStatus = {
    featureId: PDFIUM_LIB_PROBE_RENDER_FEATURE_ID,
    renderOnly: true,
    nonProduction: true,
    probePresent: layout.wasmFiles.length > 0,
    moduleLoaded: false,
    layout,
  };
  if (!layout.adapterEntry) {
    return {
      ...base,
      error: layout.wasmFiles.length > 0
        ? "probe bytes present but domdoc-probe-adapter.mjs missing (run ci:build-pdfium-wasm with probe fetch)"
        : "pdfium-lib probe vendor empty",
    };
  }
  try {
    const mod = (await import(/* webpackIgnore: true */ pathToFileURL(layout.adapterEntry).href)) as {
      default?: { __domdocPdfiumLibProbeRender?: boolean };
    };
    if (!mod.default?.__domdocPdfiumLibProbeRender) {
      return { ...base, error: "probe adapter missing __domdocPdfiumLibProbeRender marker" };
    }
    return { ...base, moduleLoaded: true };
  } catch (err) {
    return {
      ...base,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export interface PdfiumLibProbePageBitmapResult {
  available: boolean;
  renderOnly: true;
  synthetic: boolean;
  width: number;
  height: number;
  byteLength: number;
  error?: string;
}

/** Render-only page bitmap stub when probe adapter loads (worker/demo path; not G1 writer). */
function resolveProbePdfiumEsmEntry(probeDir: string): string | null {
  const manifest = readPdfiumLibProbeManifestNode();
  const fromManifest = manifest?.primaryJs;
  if (typeof fromManifest === "string") {
    const direct = join(probeDir, "extracted", fromManifest);
    if (existsSync(direct)) return direct;
  }
  const esm = join(probeDir, "extracted", "release", "node", "pdfium.esm.js");
  return existsSync(esm) ? esm : null;
}

/** Render page 0 of an in-memory doc via pdfium-lib wasm (non-synthetic when module loads). */
export async function tryRenderPdfiumLibProbePageBitmapNode(): Promise<PdfiumLibProbePageBitmapResult> {
  const status = await tryLoadPdfiumLibProbeRenderNode();
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
  const probeDir = resolvePdfiumLibProbeDir();
  const esmEntry = resolveProbePdfiumEsmEntry(probeDir);
  if (!esmEntry) {
    return {
      available: false,
      renderOnly: true,
      synthetic: false,
      width: 0,
      height: 0,
      byteLength: 0,
      error: "probe wasm glue (pdfium.esm.js) missing under extracted/",
    };
  }
  try {
    const PDFiumModule = (await import(/* webpackIgnore: true */ pathToFileURL(esmEntry).href))
      .default as () => Promise<{
      cwrap: (
        name: string,
        returnType: string | null,
        argTypes: string[],
      ) => (...args: number[]) => number;
      _malloc: (size: number) => number;
      _free: (ptr: number) => void;
      HEAPU8: Uint8Array;
    }>;
    const Module = await PDFiumModule();
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
      synthetic: false,
      width: 0,
      height: 0,
      byteLength: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function readPdfiumLibProbeManifestNode(): Record<string, unknown> | null {
  const path = join(resolvePdfiumLibProbeDir(), "probe-manifest.json");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}
