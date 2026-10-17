import type { DomdocPdfiumApi, PdfiumModuleDefault } from "./pdfium-native-api.js";
import type { PdfEditOperation } from "./types.js";

/** DomdocPdfiumApi methods required before manifest may set c24WriterExports=true. */
export const DOMDOC_PDFIUM_WRITER_EXPORT_METHODS = [
  "createDocument",
  "loadDocument",
  "pageCount",
  "addPage",
  "extractPageText",
  "listObjects",
  "addTextObject",
  "setText",
  "deleteObject",
  "addImageRgb",
  "replaceImageRgb",
  "movePage",
  "inspect",
  "save",
  "close",
] as const satisfies readonly (keyof DomdocPdfiumApi)[];

export function moduleDeclaresC24WriterExports(mod: PdfiumModuleDefault | undefined): boolean {
  if (!mod) return false;
  if (typeof mod === "function") {
    if (mod.c24WriterExports === false) return false;
    if ("__domdocPdfiumContractScaffold" in mod && mod.__domdocPdfiumContractScaffold) return false;
    if ("__domdocPdfiumLibProbeAdapter" in mod && mod.__domdocPdfiumLibProbeAdapter) return false;
    if ("__domdocNonProductionPdfiumStub" in mod && mod.__domdocNonProductionPdfiumStub) return false;
    return mod.c24WriterExports === true;
  }
  if ("__domdocPdfiumContractScaffold" in mod && mod.__domdocPdfiumContractScaffold) return false;
  if ("c24WriterExports" in mod && mod.c24WriterExports === false) return false;
  return false;
}

export function domdocPdfiumApiHasRequiredWriterExports(api: DomdocPdfiumApi | null | undefined): boolean {
  if (!api) return false;
  return DOMDOC_PDFIUM_WRITER_EXPORT_METHODS.every(
    (name) => typeof api[name as keyof DomdocPdfiumApi] === "function",
  );
}

/** Runtime probe used by contract manifest + Node tests (honest — partial em++ link is not pass). */
export async function detectC24WriterExportsAtRuntime(
  mod: PdfiumModuleDefault | undefined,
): Promise<boolean> {
  if (!moduleDeclaresC24WriterExports(mod)) return false;
  if (typeof mod !== "function") return false;
  const api = await mod();
  return domdocPdfiumApiHasRequiredWriterExports(api);
}

/** Blueprint P01–P05 fixture ids (classification only until vendored WASM proofs). */
export type PdfProofFixtureId = "P01" | "P02" | "P03" | "P04" | "P05";

export interface PdfProofClassification {
  fixtureId: PdfProofFixtureId;
  summary: string;
  /** True when a loaded PDFium module could run native proof (still not-run in M0). */
  hookReady: boolean;
}

/** Map writer operations to feasibility fixture buckets for backend hooks (G1-PDF-04). */
export function classifyPdfProofOperation(
  operation: PdfEditOperation,
  moduleLoaded: boolean,
): PdfProofClassification {
  if (operation.kind === "deleteTextObject") {
    return {
      fixtureId: "P04",
      summary: "delete native text object",
      hookReady: moduleLoaded,
    };
  }
  if (operation.kind === "replaceImage" || operation.kind === "movePage") {
    return {
      fixtureId: "P05",
      summary: "image replace and page reorder",
      hookReady: moduleLoaded,
    };
  }
  const text = operation.newText ?? "";
  if (text.includes("|img|") || operation.objectId.startsWith("image:")) {
    return {
      fixtureId: "P05",
      summary: "image replace and page reorder",
      hookReady: moduleLoaded,
    };
  }
  if (text.length > 12 || operation.objectId.includes("multi-run")) {
    return {
      fixtureId: "P03",
      summary: "multi-run kerning replace",
      hookReady: moduleLoaded,
    };
  }
  if (text.length > 0 && text.length < operation.objectId.length) {
    return {
      fixtureId: "P02",
      summary: "partial run insert/delete",
      hookReady: moduleLoaded,
    };
  }
  return {
    fixtureId: "P01",
    summary: "replace whole text run",
    hookReady: moduleLoaded,
  };
}
