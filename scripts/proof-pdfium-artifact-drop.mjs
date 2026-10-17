#!/usr/bin/env node
/**
 * G1-PDF-21: auto-detect C24 PDFium WASM drop path → fetch vendoring + P01–P05 proofs.
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = join(root, "..");
const outDir = join(root, "evidence", "gates", "G1-feasibility");
const vendorDir = join(root, "vendor", "domdoc-pdfium-wasm");

const RUNBOOK_VENDOR = vendorDir;
const BUILD_OUTPUT_CANDIDATES = ["", "dist", "pkg", "build", "out", "artifacts/wasm"];

const DOCUMENTED_ENV_VARS = [
  "PDFIUM_WASM_ARTIFACT_DIR",
  "PDFIUM_WASM_MODULE_PATH",
  "PDFIUM_WASM_BUILD_ROOT",
  "PDFIUM_WASM_SIBLING_SEARCH_PATHS",
  "PDFIUM_WASM_CI_WORKER",
  "PDFIUM_WASM_ARTIFACT_DROP",
];

function hasWasmArtifact(dir) {
  if (!dir || !existsSync(dir)) return false;
  if (!existsSync(join(dir, "package.json"))) return false;
  return readdirSync(dir).some((f) => f.endsWith(".wasm"));
}

function discoverFromBuildRoot(buildRoot) {
  if (!buildRoot || !existsSync(buildRoot)) return null;
  for (const sub of BUILD_OUTPUT_CANDIDATES) {
    const candidate = sub ? join(buildRoot, sub) : buildRoot;
    if (hasWasmArtifact(candidate)) return candidate;
  }
  return null;
}

function modulePathArtifactDir() {
  const modulePath = process.env.PDFIUM_WASM_MODULE_PATH?.trim();
  if (!modulePath || !existsSync(modulePath)) return null;
  const dir = dirname(modulePath);
  return hasWasmArtifact(dir) ? dir : null;
}

function detectArtifactDir() {
  const envDir = process.env.PDFIUM_WASM_ARTIFACT_DIR?.trim();
  if (hasWasmArtifact(envDir)) {
    return { dir: envDir, source: "PDFIUM_WASM_ARTIFACT_DIR" };
  }
  const fromModule = modulePathArtifactDir();
  if (fromModule) {
    return { dir: fromModule, source: "PDFIUM_WASM_MODULE_PATH" };
  }
  if (hasWasmArtifact(RUNBOOK_VENDOR)) {
    return { dir: RUNBOOK_VENDOR, source: "vendor/domdoc-pdfium-wasm-runbook" };
  }
  const siblingExtra = (process.env.PDFIUM_WASM_SIBLING_SEARCH_PATHS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const siblingRoots = [
    process.env.PDFIUM_WASM_BUILD_ROOT?.trim(),
    ...siblingExtra,
    join(workspaceRoot, "domdoc-pdfium-wasm"),
    join(process.env.HOME ?? "", "Desktop", "projects", "domdoc-pdfium-wasm"),
  ].filter(Boolean);
  for (const buildRoot of siblingRoots) {
    const discovered = discoverFromBuildRoot(buildRoot);
    if (discovered) {
      return { dir: discovered, source: "build-root-discovery" };
    }
  }
  return null;
}

mkdirSync(outDir, { recursive: true });
const detected = detectArtifactDir();
const dropRecordPath = join(outDir, "pdfium-wasm-artifact-drop-path.json");

if (!detected) {
  const record = {
    recordedAt: new Date().toISOString(),
    card: "G1-PDF-21",
    artifactDetected: false,
    autoProofAttempted: false,
    requiredEnvVars: DOCUMENTED_ENV_VARS,
    runbook: "docs/g1-pdfium-c24-unblock-runbook.md",
    vendorDropPath: "domdoc-web/vendor/domdoc-pdfium-wasm/",
    note: "G1-PDF-21 no production WASM detected; drop C24 bytes per runbook or set PDFIUM_WASM_ARTIFACT_DIR / SIBLING_SEARCH_PATHS.",
  };
  writeFileSync(dropRecordPath, `${JSON.stringify(record, null, 2)}\n`);
  console.log("[proof-pdfium-artifact-drop] no wasm artifact — documented env vars in pdfium-wasm-artifact-drop-path.json");
  process.exit(0);
}

process.env.PDFIUM_WASM_ARTIFACT_DIR = detected.dir;
process.env.PDFIUM_WASM_ARTIFACT_DROP = "1";

const fetch = spawnSync("node", ["./scripts/fetch-pdfium-wasm.mjs"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
if (fetch.status !== 0) {
  process.exit(fetch.status ?? 1);
}

process.env.PDFIUM_WASM_CI_WORKER = process.env.PDFIUM_WASM_CI_WORKER ?? "1";
const proof = spawnSync("pnpm", ["proof:p01-p05"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
  shell: true,
});

const record = {
  recordedAt: new Date().toISOString(),
  card: "G1-PDF-21",
  artifactDetected: true,
  autoProofAttempted: true,
  detectionSource: detected.source,
  artifactDir: detected.dir,
  ciWorker: process.env.PDFIUM_WASM_CI_WORKER === "1",
  proofExitCode: proof.status ?? 1,
  note: "G1-PDF-21 auto-detect path exercised fetch + proof:p01-p05; G1 gate remains not-run until native P01–P05 pass.",
};
writeFileSync(dropRecordPath, `${JSON.stringify(record, null, 2)}\n`);
console.log(`[proof-pdfium-artifact-drop] detection=${detected.source} proof exit=${proof.status}`);
process.exit(proof.status ?? 0);
