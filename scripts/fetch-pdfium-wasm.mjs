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
const artifactUrl = process.env.PDFIUM_WASM_ARTIFACT_URL?.trim();
const baseRecord = {
  fetchedAt: new Date().toISOString(),
  moduleSpec: "domdoc-pdfium-wasm@0.0.0-not-published",
};

async function tryDownloadArtifactUrl(url) {
  const downloadDir = join(root, "vendor", "_pdfium-download");
  mkdirSync(downloadDir, { recursive: true });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      return { ok: false, reason: `http-${response.status}`, downloadDir };
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 16) {
      return { ok: false, reason: "payload-too-small", downloadDir };
    }
    const pkgPath = join(downloadDir, "package.json");
    writeFileSync(
      pkgPath,
      `${JSON.stringify({ name: "domdoc-pdfium-wasm", version: "0.0.0-download", type: "module" }, null, 2)}\n`,
    );
    writeFileSync(join(downloadDir, "domdoc_pdfium.wasm"), bytes);
    return { ok: true, downloadDir, wasmSha256: sha256File(join(downloadDir, "domdoc_pdfium.wasm")) };
  } catch (error) {
    return {
      ok: false,
      reason: error?.name === "AbortError" ? "timeout" : "network-error",
      downloadDir,
      detail: String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

function hasWasmArtifact(dir) {
  if (!existsSync(join(dir, "package.json"))) return false;
  return readdirSync(dir).some((f) => f.endsWith(".wasm"));
}

function sha256File(path) {
  const bytes = readFileSync(path);
  return createHash("sha256").update(bytes).digest("hex");
}

let effectiveArtifactDir = artifactDir;
let ingestNote = null;

if (!effectiveArtifactDir && artifactUrl) {
  const attempt = await tryDownloadArtifactUrl(artifactUrl);
  const attemptRecord = {
    ...baseRecord,
    status: attempt.ok ? "artifact-url-downloaded-not-vendored" : "artifact-url-not-run",
    artifactUrl,
    attempt,
    note: "G1-PDF-08: optional URL ingest; set PDFIUM_WASM_ARTIFACT_DIR to downloaded dir or re-run with local build.",
  };
  writeFileSync(
    join(outDir, "pdfium-wasm-fetch-stub.json"),
    `${JSON.stringify(attemptRecord, null, 2)}\n`,
  );
  if (attempt.ok) {
    effectiveArtifactDir = attempt.downloadDir;
    ingestNote = "downloaded-from-url";
  } else {
    console.log(`[fetch-pdfium-wasm] URL ingest failed (${attempt.reason})`);
  }
}

if (effectiveArtifactDir && existsSync(effectiveArtifactDir) && hasWasmArtifact(effectiveArtifactDir)) {
  mkdirSync(vendorDir, { recursive: true });
  const wasmFiles = [];
  for (const name of readdirSync(effectiveArtifactDir)) {
    if (name === "node_modules") continue;
    copyFileSync(join(effectiveArtifactDir, name), join(vendorDir, name));
    if (name.endsWith(".wasm")) {
      wasmFiles.push({ name, sha256: sha256File(join(vendorDir, name)) });
    }
  }
  const record = {
    ...baseRecord,
    status: "artifact-local",
    artifactDir: effectiveArtifactDir,
    ingestNote,
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
