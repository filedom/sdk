#!/usr/bin/env node
/**
 * G1-PDF-05/06: honest build placeholder + optional build-root script discovery.
 * Emscripten pipeline lives in domdoc-pdfium-wasm; this records evidence and may
 * invoke a checkout build when PDFIUM_WASM_RUN_BUILD=1.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "evidence", "gates", "G1-feasibility");
mkdirSync(outDir, { recursive: true });

const buildRoot = process.env.PDFIUM_WASM_BUILD_ROOT?.trim();
const runBuild = process.env.PDFIUM_WASM_RUN_BUILD === "1";

const scriptCandidates = [
  "build-wasm.sh",
  "build.sh",
  "scripts/build-wasm.sh",
  "scripts/build.sh",
  "embuild.sh",
];

let discoveredScript = null;
if (buildRoot && existsSync(buildRoot)) {
  for (const name of scriptCandidates) {
    const candidate = join(buildRoot, name);
    if (existsSync(candidate)) {
      discoveredScript = candidate;
      break;
    }
  }
}

const record = {
  builtAt: new Date().toISOString(),
  status: "not-configured",
  buildRoot: buildRoot ?? null,
  discoveredScript,
  runBuildRequested: runBuild,
  note: "Set PDFIUM_WASM_BUILD_ROOT to a domdoc-pdfium-wasm checkout. Optional PDFIUM_WASM_RUN_BUILD=1 runs discovered script. Ingest output via PDFIUM_WASM_ARTIFACT_DIR + pnpm fetch:pdfium-wasm.",
};

if (!buildRoot || !existsSync(buildRoot)) {
  record.status = "not-configured";
} else if (runBuild && discoveredScript) {
  const result = spawnSync("bash", [discoveredScript], {
    cwd: buildRoot,
    encoding: "utf8",
    timeout: 120_000,
  });
  record.buildExitCode = result.status;
  record.buildSignal = result.signal;
  record.status =
    result.status === 0 ? "build-script-exited-zero-not-ingested" : "build-script-failed";
  record.stdoutTail = (result.stdout ?? "").slice(-2000);
  record.stderrTail = (result.stderr ?? "").slice(-2000);
} else if (discoveredScript) {
  record.status = "build-script-found-not-run";
} else {
  record.status = "build-root-present-no-script";
}

writeFileSync(join(outDir, "pdfium-wasm-build-record.json"), `${JSON.stringify(record, null, 2)}\n`);
console.log(`[build-pdfium-wasm] ${record.status}`);
