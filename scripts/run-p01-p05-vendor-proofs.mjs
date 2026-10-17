#!/usr/bin/env node
/**
 * G1-PDF-07: record P01–P05 vendor hook evidence; exercise pdf-writer worker when artifact vendored.
 * Set PDFIUM_WASM_ARTIFACT_DIR + pnpm fetch:pdfium-wasm first, or drop files under vendor/domdoc-pdfium-wasm.
 */
import { mkdirSync, writeFileSync } from "node:fs";
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

const hooks = {
  recordedAt: evidence.recordedAt,
  status: evidence.status === "artifact-worker-hooks-not-run" ? "vendor-local-hooks-ready" : "stub-not-run",
  fixtures: evidence.fixtures.map((f) => ({
    fixtureId: f.fixtureId,
    nativeProof: f.nativeProof,
    classificationHook: "pdfium-proof-hooks.ts",
    workerLoad: f.workerCiPath === "exercised" ? "pdf-writer-worker.ts exercised" : "pdf-writer-worker.ts via resolvePdfiumWasmModule",
    hookReady: f.hookReady,
  })),
  note: "Native P01–P05 proofs remain not-run until PDFium WASM executes fixture bytes.",
};
writeFileSync(join(outDir, "p01-p05-vendor-hooks.json"), `${JSON.stringify(hooks, null, 2)}\n`);

console.log(`[run-p01-p05-vendor-proofs] ${evidence.status} (moduleLoaded=${evidence.moduleLoaded})`);
process.exit(0);
