import { createPdfWriterWorkerClient } from "./pdf-writer-worker-client.js";
import {
  classifyPdfProofOperation,
  type PdfProofFixtureId,
} from "./pdfium-proof-hooks.js";
import { resolvePdfiumWasmModule } from "./pdfium-module-resolve.js";
import { tryLoadPdfiumWasmModule } from "./backends/pdfium-wasm-backend.js";
import { runNativeFeasibilityProofs, type NativeProofStatus } from "./pdfium-native-proofs.js";
import {
  PDFIUM_WASM_TARGET_UNSUPPORTED_BLOCKED_REASON,
  isPdfiumNativeProofBlockedByUpstreamGn,
} from "./pdfium-g1-blocked-reason.js";
import { runP01P05ClassificationWithTestDouble } from "./pdfium-classification-test-double.js";
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
    kind: "replaceImage",
    pageIndex: 0,
    objectId: "image:1",
    imageWidth: 16,
    imageHeight: 16,
    expectedRevision: 0,
  },
};

export interface P01P05FixtureEvidence {
  fixtureId: PdfProofFixtureId | "P11" | "P12";
  nativeProof: NativeProofStatus;
  hookReady: boolean;
  workerCiPath: "exercised" | "skipped";
  classificationSummary: string;
  detail?: string;
  blockedReason?: typeof PDFIUM_WASM_TARGET_UNSUPPORTED_BLOCKED_REASON;
}

export interface P01P05VendorProofEvidence {
  recordedAt: string;
  status:
    | "stub-not-run"
    | "probe-adapter-load-only"
    | "classification-blocked-upstream-gn"
    | "artifact-worker-hooks-not-run"
    | "native-proofs-run";
  resolutionSource: ReturnType<typeof resolvePdfiumWasmModule>["source"];
  moduleLoaded: boolean;
  writerExportsReady: boolean;
  fixtures: readonly P01P05FixtureEvidence[];
}

/** G1-PDF-07: classify P01–P05 and run native proofs when C24 writer exports load. */
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
    const client = await createPdfWriterWorkerClient({
      workerScript: options.workerScript,
      workerOptions: { execArgv: ["--import", "tsx/esm"] },
    });
    const contextId = "p01-p05-ci";
    let workerBytes = new TextEncoder().encode("%PDF-1.4\n%%EOF\n");
    if (load.api) {
      const doc = load.api.createDocument();
      load.api.addPage(doc, 0);
      load.api.addTextObject(doc, 0, "WORKER");
      workerBytes = Uint8Array.from(load.api.save(doc));
      load.api.close(doc);
    }
    const checkpoint = {
      revision: 1,
      sourceSha256: sha256(workerBytes),
      byteLength: workerBytes.byteLength,
    };
    await client.preflight(contextId, workerBytes, checkpoint);
    for (const fixtureId of P01_P05_FIXTURE_ORDER) {
      await client.apply(contextId, [SAMPLE_OPS[fixtureId]], SAMPLE_OPS[fixtureId].expectedRevision);
    }
    await client.dispose(contextId);
    await client.terminate();
    workerCiPath = "exercised";
  }

  const classificationStubEnabled =
    process.env.PDFIUM_WASM_P01_P05_CLASSIFICATION_STUB === "1" ||
    isPdfiumNativeProofBlockedByUpstreamGn({ writerExportsReady });

  const native = writerExportsReady
    ? await runNativeFeasibilityProofs(load)
    : [];
  const nativeById = new Map(native.map((p) => [p.fixtureId, p]));
  const classificationBlocked = !writerExportsReady
    ? runP01P05ClassificationWithTestDouble({ moduleLoadedForHooks: moduleLoaded })
    : [];
  const classificationById = new Map(classificationBlocked.map((c) => [c.fixtureId, c]));

  const fixtures: P01P05FixtureEvidence[] = [
    ...P01_P05_FIXTURE_ORDER.map((fixtureId) => {
      const proof = classifyPdfProofOperation(SAMPLE_OPS[fixtureId], writerExportsReady || moduleLoaded);
      const nativeProof = nativeById.get(fixtureId);
      const blocked = classificationById.get(fixtureId);
      const nativeStatus: NativeProofStatus = nativeProof?.nativeProof
        ?? (blocked && classificationStubEnabled ? "blocked" : "not-run");
      return {
        fixtureId,
        nativeProof: nativeStatus,
        hookReady: blocked?.hookReady ?? proof.hookReady,
        workerCiPath: writerExportsReady ? workerCiPath : "skipped",
        classificationSummary: blocked?.classificationSummary ?? proof.summary,
        detail: nativeProof?.detail,
        blockedReason:
          nativeStatus === "blocked" ? PDFIUM_WASM_TARGET_UNSUPPORTED_BLOCKED_REASON : undefined,
      };
    }),
    {
      fixtureId: "P11",
      nativeProof:
        nativeById.get("P11")?.nativeProof
        ?? (classificationStubEnabled && !writerExportsReady ? "blocked" : "not-run"),
      hookReady: writerExportsReady,
      workerCiPath: writerExportsReady ? workerCiPath : "skipped",
      classificationSummary: "before-commit failure rolls back scratch",
      detail: nativeById.get("P11")?.detail,
      blockedReason:
        classificationStubEnabled && !writerExportsReady
          ? PDFIUM_WASM_TARGET_UNSUPPORTED_BLOCKED_REASON
          : undefined,
    },
    {
      fixtureId: "P12",
      nativeProof:
        nativeById.get("P12")?.nativeProof
        ?? (classificationStubEnabled && !writerExportsReady ? "blocked" : "not-run"),
      hookReady: writerExportsReady,
      workerCiPath: writerExportsReady ? workerCiPath : "skipped",
      classificationSummary: "save/reopen lifecycle cycles",
      detail: nativeById.get("P12")?.detail,
      blockedReason:
        classificationStubEnabled && !writerExportsReady
          ? PDFIUM_WASM_TARGET_UNSUPPORTED_BLOCKED_REASON
          : undefined,
    },
  ];

  const nativeRan =
    writerExportsReady && fixtures.some((f) => f.nativeProof === "pass" || f.nativeProof === "fail");
  const coreBlocked =
    !writerExportsReady
    && classificationStubEnabled
    && P01_P05_FIXTURE_ORDER.every(
      (id) => fixtures.find((f) => f.fixtureId === id)?.nativeProof === "blocked",
    );
  const status = nativeRan
    ? "native-proofs-run"
    : coreBlocked
      ? "classification-blocked-upstream-gn"
      : writerExportsReady
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
