import type { PdfEditOperation } from "./types.js";

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
