#!/usr/bin/env node
/**
 * G1-PDF-07: record P01–P05 vendor hook evidence; exercise pdf-writer worker when artifact vendored.
 * Set PDFIUM_WASM_ARTIFACT_DIR + pnpm fetch:pdfium-wasm first, or drop files under vendor/domdoc-pdfium-wasm.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "evidence", "gates", "G1-feasibility");

const { collectP01P05VendorProofEvidence } = await import(
  "../packages/core/src/formats/pdf/pdfium-p01-p05-runner.ts"
);

const exerciseWorker = process.env.PDFIUM_WASM_CI_WORKER === "1";
const workerScript = new URL("../packages/core/src/formats/pdf/pdf-writer-worker.ts", import.meta.url);

const evidence = await collectP01P05VendorProofEvidence({
  exerciseWorker,
  workerScript: exerciseWorker ? workerScript : undefined,
});

mkdirSync(outDir, { recursive: true });
writeFileSync(
  join(outDir, "p01-p05-vendor-proofs.json"),
  `${JSON.stringify(evidence, null, 2)}\n`,
);

const coreFixturesForHooks = evidence.fixtures.filter((f) =>
  ["P01", "P02", "P03", "P04", "P05"].includes(f.fixtureId),
);
const nativeGreen = coreFixturesForHooks.every((f) => f.nativeProof === "pass");
const nativeFailed = coreFixturesForHooks.some((f) => f.nativeProof === "fail");
const nativeBlocked = coreFixturesForHooks.every((f) => f.nativeProof === "blocked");
const hooks = {
  recordedAt: evidence.recordedAt,
  status:
    evidence.status === "native-proofs-run"
      ? nativeGreen
        ? "native-proofs-pass"
        : "native-proofs-fail"
      : evidence.status === "classification-blocked-upstream-gn" || nativeBlocked
        ? "native-proofs-blocked"
        : evidence.status === "artifact-worker-hooks-not-run"
          ? "vendor-local-hooks-ready"
          : evidence.status === "probe-adapter-load-only"
            ? "probe-adapter-load-only"
            : "stub-not-run",
  fixtures: evidence.fixtures.map((f) => ({
    fixtureId: f.fixtureId,
    nativeProof: f.nativeProof,
    blockedReason: f.blockedReason ?? null,
    classificationHook: "pdfium-proof-hooks.ts",
    workerLoad: f.workerCiPath === "exercised" ? "pdf-writer-worker.ts exercised" : "pdf-writer-worker.ts via resolvePdfiumWasmModule",
    hookReady: f.hookReady,
    detail: f.detail,
  })),
  note: nativeGreen
    ? "Native P01–P05 executed against C24 writer WASM; coordinator still reviews independent inspection artifacts."
    : nativeFailed
      ? "Native P01–P05 failed on vendored writer — gate not-run until fixed."
      : nativeBlocked
        ? "P01–P05 classification exercised; native proofs blocked (pdfium-wasm-target-unsupported-in-upstream-gn) — not a pass."
        : "Native P01–P05 proofs remain not-run until C24 PDFium WASM executes fixture bytes.",
};
writeFileSync(join(outDir, "p01-p05-vendor-hooks.json"), `${JSON.stringify(hooks, null, 2)}\n`);

const bytesAttemptPath = join(outDir, "pdfium-wasm-bytes-attempt.json");
const ciWorkerProofStepResults = evidence.fixtures.map((f) => ({
  step: f.fixtureId,
  moduleLoaded: evidence.moduleLoaded,
  nativeProof: f.nativeProof,
  workerCiPath: f.workerCiPath,
  hookReady: f.hookReady,
}));
const coreFixtures = evidence.fixtures.filter((f) =>
  ["P01", "P02", "P03", "P04", "P05"].includes(f.fixtureId),
);
const allNativePass =
  evidence.writerExportsReady &&
  coreFixtures.length === 5 &&
  coreFixtures.every((f) => f.nativeProof === "pass");
const extraPass = ["P11", "P12"].every(
  (id) => evidence.fixtures.find((f) => f.fixtureId === id)?.nativeProof === "pass",
);
const bytesAttempt = {
  recordedAt: evidence.recordedAt,
  card: process.env.PDFIUM_WASM_ARTIFACT_DROP === "1" ? "G1-PDF-20" : "G1-PDF-19",
  phase: evidence.writerExportsReady ? "post-proof-native" : evidence.moduleLoaded ? "post-proof-worker" : "post-proof-stub",
  productionWasmObtained: evidence.writerExportsReady,
  productionModuleLoaded: evidence.writerExportsReady,
  ciWorkerProofTarget: "PDFIUM_WASM_CI_WORKER=1 pnpm proof:p01-p05",
  ciWorkerGreenCriteria: "moduleLoaded=true and P01–P05 nativeProof=pass",
  ciWorkerProofSteps: ["P01", "P02", "P03", "P04", "P05", "P11", "P12"],
  ciWorkerProofStepResults,
  ciWorkerGreen: allNativePass,
  feasibilityExtrasPass: extraPass,
  unblockRunbook: "docs/g1-pdfium-c24-unblock-runbook.md",
  note: allNativePass
    ? extraPass
      ? "C24 writer WASM loaded; P01–P05 and P11–P12 native proofs passed — coordinator may set G1 feasibility after independent inspection."
      : "C24 writer WASM loaded; P01–P05 passed, P11/P12 incomplete."
    : evidence.writerExportsReady
      ? "C24 writer loaded; one or more native P01–P05 proofs failed or did not pass."
      : evidence.status === "classification-blocked-upstream-gn"
        ? "Classification hooks recorded; native P01–P05 blocked (upstream gn wasm / no C24 writer) — gate not-run."
      : evidence.moduleLoaded
        ? "Module imported without C24 writer exports; native P01–P05 blocked or not-run."
        : "G1-PDF-19 proof recorded with moduleLoaded=false; drop C24 artifact per g1-pdfium-c24-unblock-runbook.md.",
};
if (existsSync(bytesAttemptPath)) {
  try {
    const prior = JSON.parse(readFileSync(bytesAttemptPath, "utf8"));
    if (prior.phase === "pre-ingest") {
      bytesAttempt.phase = evidence.moduleLoaded ? "post-proof-worker" : "post-proof-stub";
    }
  } catch {
    /* overwrite corrupt prior */
  }
}
writeFileSync(bytesAttemptPath, `${JSON.stringify(bytesAttempt, null, 2)}\n`);

console.log(`[run-p01-p05-vendor-proofs] ${evidence.status} (moduleLoaded=${evidence.moduleLoaded})`);
process.exit(0);
