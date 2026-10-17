import type { DomdocPdfiumApi, PdfiumNativeInspection } from "./pdfium-native-api.js";
import { PDFIUM_SOURCE_COMMIT } from "./pdfium-pin.js";
import { PDFIUM_WASM_TARGET_UNSUPPORTED_BLOCKED_REASON } from "./pdfium-g1-blocked-reason.js";
import type { PdfProofFixtureId } from "./pdfium-proof-hooks.js";
import { classifyPdfProofOperation } from "./pdfium-proof-hooks.js";
import type { PdfEditOperation } from "./types.js";
const P01_P05_FIXTURE_ORDER: readonly PdfProofFixtureId[] = ["P01", "P02", "P03", "P04", "P05"];

/** In-memory DomdocPdfiumApi for CI classification only — not a G1 pass substitute. */
export function createDomdocPdfiumClassificationTestDouble(): DomdocPdfiumApi {
  let nextDoc = 1;
  const emptyInspection = (): PdfiumNativeInspection => ({ pageCount: 0, pages: [] });

  return {
    pdfiumSourceCommit: PDFIUM_SOURCE_COMMIT,
    createDocument: () => nextDoc++,
    loadDocument: () => nextDoc++,
    pageCount: () => 0,
    addPage: () => 0,
    extractPageText: () => "",
    listObjects: () => [],
    addTextObject: () => 0,
    setText: () => false,
    deleteObject: () => false,
    addImageRgb: () => 0,
    replaceImageRgb: () => false,
    movePage: () => false,
    inspect: emptyInspection,
    save: () => new Uint8Array([0x25, 0x50, 0x44, 0x46]),
    close: () => undefined,
  };
}

export interface PdfiumClassificationFixtureRecord {
  fixtureId: PdfProofFixtureId;
  hookReady: boolean;
  classificationSummary: string;
  /** Native proof intentionally blocked — upstream gn wasm / no C24 writer. */
  nativeProof: "blocked";
  blockedReason: typeof PDFIUM_WASM_TARGET_UNSUPPORTED_BLOCKED_REASON;
}

const SAMPLE_OPS: Record<PdfProofFixtureId, PdfEditOperation> = {
  P01: {
    kind: "replaceTextRun",
    pageIndex: 0,
    objectId: "run-1",
    newText: "hello",
    expectedRevision: 0,
  },
  P02: {
    kind: "replaceTextRun",
    pageIndex: 0,
    objectId: "run-long-id",
    newText: "ab",
    expectedRevision: 0,
  },
  P03: {
    kind: "replaceTextRun",
    pageIndex: 0,
    objectId: "multi-run:1",
    newText: "long replacement text",
    expectedRevision: 0,
  },
  P04: {
    kind: "deleteTextObject",
    pageIndex: 0,
    objectId: "text-1",
    expectedRevision: 0,
  },
  P05: {
    kind: "replaceImage",
    pageIndex: 0,
    objectId: "image:1",
    imageWidth: 16,
    imageHeight: 16,
    expectedRevision: 0,
  },
};

/** Exercise P01–P05 classification hooks against a test double; native proofs stay blocked. */
export function runP01P05ClassificationWithTestDouble(options?: {
  moduleLoadedForHooks?: boolean;
}): PdfiumClassificationFixtureRecord[] {
  const api = createDomdocPdfiumClassificationTestDouble();
  void api;
  const hookReady = options?.moduleLoadedForHooks ?? true;
  return P01_P05_FIXTURE_ORDER.map((fixtureId) => {
    const proof = classifyPdfProofOperation(SAMPLE_OPS[fixtureId], hookReady);
    return {
      fixtureId,
      hookReady: proof.hookReady,
      classificationSummary: proof.summary,
      nativeProof: "blocked" as const,
      blockedReason: PDFIUM_WASM_TARGET_UNSUPPORTED_BLOCKED_REASON,
    };
  });
}
