import { createPdfWriterWorkerClient } from "./pdf-writer-worker-client.js";
import {
  classifyPdfProofOperation,
  type PdfProofFixtureId,
} from "./pdfium-proof-hooks.js";
import { resolvePdfiumWasmModule } from "./pdfium-module-resolve.js";
import { tryLoadPdfiumWasmModule } from "./backends/pdfium-wasm-backend.js";
import type { PdfEditOperation } from "./types.js";
import { sha256 } from "./writer.js";

export const P01_P05_FIXTURE_ORDER: readonly PdfProofFixtureId[] = [
  "P01",
  "P02",
  "P03",
  "P04",
  "P05",
];

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
    kind: "replaceTextRun",
    pageIndex: 0,
    objectId: "image:1",
    newText: "|img|",
    expectedRevision: 0,
  },
};

export interface P01P05FixtureEvidence {
  fixtureId: PdfProofFixtureId;
  nativeProof: "not-run";
  hookReady: boolean;
  workerCiPath: "exercised" | "skipped";
  classificationSummary: string;
}

export interface P01P05VendorProofEvidence {
  recordedAt: string;
  status: "stub-not-run" | "probe-adapter-load-only" | "artifact-worker-hooks-not-run";
  resolutionSource: ReturnType<typeof resolvePdfiumWasmModule>["source"];
  moduleLoaded: boolean;
  writerExportsReady: boolean;
  fixtures: readonly P01P05FixtureEvidence[];
}

/** G1-PDF-07: classify P01–P05 and optionally exercise pdf-writer worker when artifact present. */
export async function collectP01P05VendorProofEvidence(options?: {
  exerciseWorker?: boolean;
  workerScript?: URL;
}): Promise<P01P05VendorProofEvidence> {
  const resolved = resolvePdfiumWasmModule();
  const load = await tryLoadPdfiumWasmModule();
  const moduleLoaded = load.loaded;
  const writerExportsReady = load.writerExportsReady;
  const exerciseWorker =
    options?.exerciseWorker === true &&
    writerExportsReady &&
    resolved.source !== "npm-placeholder";

  let workerCiPath: P01P05FixtureEvidence["workerCiPath"] = "skipped";

  if (exerciseWorker && options?.workerScript) {
    const minimalPdf = new TextEncoder().encode("%PDF-1.4\n%%EOF\n");
    const client = await createPdfWriterWorkerClient({
      workerScript: options.workerScript,
      workerOptions: { execArgv: ["--import", "tsx/esm"] },
    });
    const contextId = "p01-p05-ci";
    const checkpoint = {
      revision: 1,
      sourceSha256: sha256(minimalPdf),
      byteLength: minimalPdf.byteLength,
    };
    await client.preflight(contextId, minimalPdf, checkpoint);
    for (const fixtureId of P01_P05_FIXTURE_ORDER) {
      await client.apply(contextId, [SAMPLE_OPS[fixtureId]], SAMPLE_OPS[fixtureId].expectedRevision);
    }
    await client.dispose(contextId);
    await client.terminate();
    workerCiPath = "exercised";
  }

  const fixtures = P01_P05_FIXTURE_ORDER.map((fixtureId) => {
    const proof = classifyPdfProofOperation(SAMPLE_OPS[fixtureId], writerExportsReady);
    return {
      fixtureId,
      nativeProof: "not-run" as const,
      hookReady: proof.hookReady,
      workerCiPath: writerExportsReady ? workerCiPath : "skipped",
      classificationSummary: proof.summary,
    };
  });

  const status = writerExportsReady
    ? "artifact-worker-hooks-not-run"
    : moduleLoaded
      ? "probe-adapter-load-only"
      : "stub-not-run";

  return {
    recordedAt: new Date().toISOString(),
    status,
    resolutionSource: resolved.source,
    moduleLoaded,
    writerExportsReady,
    fixtures,
  };
}
