#!/usr/bin/env node
/**
 * G1-PDF-05/06/10: honest build placeholder + exhaustive build-root script discovery.
 * Emscripten pipeline lives in domdoc-pdfium-wasm; this records evidence and may
 * invoke a checkout build when PDFIUM_WASM_RUN_BUILD=1.
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "evidence", "gates", "G1-feasibility");
mkdirSync(outDir, { recursive: true });

const workspaceRoot = join(root, "..");
const siblingCandidates = [
  join(workspaceRoot, "domdoc-pdfium-wasm"),
  join(workspaceRoot, "..", "domdoc-pdfium-wasm"),
  join(workspaceRoot, "..", "..", "domdoc-pdfium-wasm"),
  join(process.env.HOME ?? "", "projects", "domdoc-pdfium-wasm"),
  join(process.env.HOME ?? "", "Desktop", "projects", "domdoc-pdfium-wasm"),
  ...(process.env.PDFIUM_WASM_SIBLING_SEARCH_PATHS?.split(",").map((s) => s.trim()).filter(Boolean) ??
    []),
];
const envBuildRoot = process.env.PDFIUM_WASM_BUILD_ROOT?.trim();
const buildRoot =
  envBuildRoot && existsSync(envBuildRoot)
    ? envBuildRoot
    : siblingCandidates.find((p) => existsSync(p)) ?? envBuildRoot;
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

const outputDirCandidates = ["", "dist", "pkg", "build", "out", "artifacts/wasm"];
const discoveredOutputs = buildRoot
  ? outputDirCandidates
      .map((sub) => (sub ? join(buildRoot, sub) : buildRoot))
      .filter((dir) => existsSync(dir))
      .map((dir) => ({
        dir,
        hasWasm: existsSync(dir) && readdirSync(dir).some((f) => f.endsWith(".wasm")),
      }))
  : [];

const record = {
  builtAt: new Date().toISOString(),
  status: "not-configured",
  buildRoot: buildRoot ?? null,
  buildRootSource: envBuildRoot ? "env" : buildRoot ? "sibling-discovery" : null,
  siblingCandidates,
  discoveredScript,
  discoveredOutputs,
  runBuildRequested: runBuild,
  c24PdfiumPin: "7c55203ed66b0461378323e3fcf2efaf76755241",
  note: "G1-PDF-10: exhaustive build-root discovery; set PDFIUM_WASM_BUILD_ROOT or clone domdoc-pdfium-wasm at C24. Optional PDFIUM_WASM_RUN_BUILD=1. Ingest via pnpm fetch:pdfium-wasm.",
  discoveryRecord: "pdfium-wasm-discovery-record.json (fetch script)",
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
