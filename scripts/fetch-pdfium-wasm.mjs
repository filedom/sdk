#!/usr/bin/env node
/**
 * G1-PDF-04/05: optional local PDFium WASM artifact ingest + honest stub fallback.
 * Set PDFIUM_WASM_ARTIFACT_DIR to a built domdoc-pdfium-wasm package directory.
 */
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "evidence", "gates", "G1-feasibility");
const vendorDir = join(root, "vendor", "domdoc-pdfium-wasm");
mkdirSync(outDir, { recursive: true });

const artifactDir = process.env.PDFIUM_WASM_ARTIFACT_DIR?.trim();
const baseRecord = {
  fetchedAt: new Date().toISOString(),
  moduleSpec: "domdoc-pdfium-wasm@0.0.0-not-published",
};

function hasWasmArtifact(dir) {
  if (!existsSync(join(dir, "package.json"))) return false;
  return readdirSync(dir).some((f) => f.endsWith(".wasm"));
}

function sha256File(path) {
  const bytes = readFileSync(path);
  return createHash("sha256").update(bytes).digest("hex");
}

if (artifactDir && existsSync(artifactDir) && hasWasmArtifact(artifactDir)) {
  mkdirSync(vendorDir, { recursive: true });
  const wasmFiles = [];
  for (const name of readdirSync(artifactDir)) {
    if (name === "node_modules") continue;
    copyFileSync(join(artifactDir, name), join(vendorDir, name));
    if (name.endsWith(".wasm")) {
      wasmFiles.push({ name, sha256: sha256File(join(vendorDir, name)) });
    }
  }
  const record = {
    ...baseRecord,
    status: "artifact-local",
    artifactDir,
    vendorPath: vendorDir,
    wasmArtifacts: wasmFiles,
    note: "Vendored copy for local P01–P05 proofs; gate remains not-run until CI runs fixtures.",
  };
  writeFileSync(join(outDir, "pdfium-wasm-fetch-stub.json"), `${JSON.stringify(record, null, 2)}\n`);
  const hooks = {
    recordedAt: new Date().toISOString(),
    status: "vendor-local-hooks-ready",
    fixtures: ["P01", "P02", "P03", "P04", "P05"].map((id) => ({
      fixtureId: id,
      nativeProof: "not-run",
      classificationHook: "pdfium-proof-hooks.ts",
      workerLoad: "pdf-writer-worker.ts via resolvePdfiumWasmModule",
    })),
    note: "Positive P01–P05 proofs remain not-run until CI executes fixtures on vendored WASM.",
  };
  writeFileSync(join(outDir, "p01-p05-vendor-hooks.json"), `${JSON.stringify(hooks, null, 2)}\n`);
  console.log("[fetch-pdfium-wasm] copied artifact into vendor/domdoc-pdfium-wasm");
  console.log("[fetch-pdfium-wasm] run: PDFIUM_WASM_CI_WORKER=1 pnpm proof:p01-p05");
  process.exit(0);
}

const stub = {
  ...baseRecord,
  status: "stub-not-run",
  note: "No PDFIUM_WASM_ARTIFACT_DIR with package.json + .wasm. Run pnpm build:pdfium-wasm then build per docs/pdfium-wasm-pin.md and docs/pdfium-wasm-worker-isolation.md.",
};
writeFileSync(join(outDir, "pdfium-wasm-fetch-stub.json"), `${JSON.stringify(stub, null, 2)}\n`);
console.log("[fetch-pdfium-wasm] stub only (no artifact directory)");
process.exit(0);
