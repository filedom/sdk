#!/usr/bin/env node
/**
 * G1-PDF-04/05/10: optional local PDFium WASM artifact ingest + exhaustive discovery record.
 * Set PDFIUM_WASM_ARTIFACT_DIR to a built domdoc-pdfium-wasm package directory.
 */
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = join(root, "..");

const BUILD_OUTPUT_CANDIDATES = [
  "",
  "dist",
  "pkg",
  "build",
  "out",
  "artifacts/wasm",
  "packages/domdoc-pdfium-wasm",
];

/** Documented URLs — none published for C24 domdoc-pdfium-wasm (see pdfium-wasm-pin.md). */
const DOCUMENTED_ARTIFACT_URLS = [];

const DEFAULT_SIBLING_BUILD_ROOTS = [
  join(workspaceRoot, "domdoc-pdfium-wasm"),
  join(workspaceRoot, "..", "domdoc-pdfium-wasm"),
  join(workspaceRoot, "..", "..", "domdoc-pdfium-wasm"),
  join(process.env.HOME ?? "", "projects", "domdoc-pdfium-wasm"),
  join(process.env.HOME ?? "", "src", "domdoc-pdfium-wasm"),
  join(process.env.HOME ?? "", "Desktop", "projects", "domdoc-pdfium-wasm"),
];

function siblingBuildRoots() {
  const envList = process.env.PDFIUM_WASM_SIBLING_SEARCH_PATHS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const envRoot = process.env.PDFIUM_WASM_BUILD_ROOT?.trim();
  const roots = [];
  if (envRoot) roots.push(envRoot);
  if (envList?.length) roots.push(...envList);
  for (const sibling of DEFAULT_SIBLING_BUILD_ROOTS) {
    if (existsSync(sibling)) roots.push(sibling);
  }
  return [...new Set(roots)];
}

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

function discoverArtifactDirFromBuildRoot(buildRoot) {
  if (!buildRoot || !existsSync(buildRoot)) return null;
  for (const sub of BUILD_OUTPUT_CANDIDATES) {
    const candidate = sub ? join(buildRoot, sub) : buildRoot;
    if (hasWasmArtifact(candidate)) return candidate;
  }
  return null;
}

function discoverSiblingBuildRoots() {
  return siblingBuildRoots();
}

function writeDiscoveryRecord(extra) {
  const roots = siblingBuildRoots();
  const rootScan = roots.map((buildRoot) => ({
    buildRoot,
    exists: existsSync(buildRoot),
    discoveredArtifactDir: discoverArtifactDirFromBuildRoot(buildRoot),
  }));
  const urlCandidates = [
    ...(process.env.PDFIUM_WASM_ARTIFACT_URL?.trim() ? [process.env.PDFIUM_WASM_ARTIFACT_URL.trim()] : []),
    ...(process.env.PDFIUM_WASM_ARTIFACT_URLS?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? []),
    ...DOCUMENTED_ARTIFACT_URLS,
  ];
  const record = {
    recordedAt: new Date().toISOString(),
    card: "G1-PDF-14",
    envVarsChecked: [
      "PDFIUM_WASM_ARTIFACT_DIR",
      "PDFIUM_WASM_ARTIFACT_URL",
      "PDFIUM_WASM_ARTIFACT_URLS",
      "PDFIUM_WASM_BUILD_ROOT",
      "PDFIUM_WASM_SIBLING_SEARCH_PATHS",
      "PDFIUM_WASM_ALLOW_NONPRODUCTION_STUB",
    ],
    documentedArtifactUrls: DOCUMENTED_ARTIFACT_URLS,
    urlCandidates: [...new Set(urlCandidates)],
    siblingBuildRootScan: rootScan,
    buildOutputCandidates: BUILD_OUTPUT_CANDIDATES,
    c24PdfiumPin: "7c55203ed66b0461378323e3fcf2efaf76755241",
    ...extra,
  };
  writeFileSync(join(outDir, "pdfium-wasm-discovery-record.json"), `${JSON.stringify(record, null, 2)}\n`);
  return record;
}

function writeNonProductionVendorStub() {
  mkdirSync(vendorDir, { recursive: true });
  writeFileSync(
    join(vendorDir, "NONPRODUCTION-PLACEHOLDER.md"),
    `# domdoc-pdfium-wasm — non-production placeholder (G1-PDF-09)

This directory was created with \`PDFIUM_WASM_ALLOW_NONPRODUCTION_STUB=1\`.
It is **not** a C24 PDFium build. \`tryLoadPdfiumWasmModule\` rejects this stub for gate evidence.
Obtain a real artifact via C24 \`domdoc-pdfium-wasm\` build per docs/pdfium-wasm-pin.md.
`,
  );
  writeFileSync(
    join(vendorDir, "package.json"),
    `${JSON.stringify({ name: "domdoc-pdfium-wasm", version: "0.0.0-nonproduction-stub", type: "module", main: "index.js" }, null, 2)}\n`,
  );
  writeFileSync(
    join(vendorDir, "index.js"),
    `/** @type {{ __domdocNonProductionPdfiumStub: true }} */
export default { __domdocNonProductionPdfiumStub: true };
`,
  );
  writeFileSync(join(vendorDir, "domdoc_pdfium.wasm"), Buffer.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]));
}

function sha256File(path) {
  const bytes = readFileSync(path);
  return createHash("sha256").update(bytes).digest("hex");
}

let effectiveArtifactDir = artifactDir;
let ingestNote = null;
const buildRootAttempts = [];
const vendoringAttemptPath = join(outDir, "pdfium-wasm-vendoring-attempt.json");
writeFileSync(
  vendoringAttemptPath,
  `${JSON.stringify(
    {
      recordedAt: new Date().toISOString(),
      card: "G1-PDF-13",
      phase: "pre-ingest",
      siblingRoots: siblingBuildRoots(),
      note: "C24 domdoc-pdfium-wasm vendoring attempt; production bytes required for module load.",
    },
    null,
    2,
  )}\n`,
);
writeDiscoveryRecord({ phase: "pre-ingest" });
writeFileSync(
  join(outDir, "pdfium-wasm-bytes-attempt.json"),
  `${JSON.stringify(
    {
      recordedAt: new Date().toISOString(),
      card: "G1-PDF-15",
      phase: "pre-ingest",
      productionWasmObtained: false,
      ciWorkerProofTarget: "PDFIUM_WASM_CI_WORKER=1 pnpm proof:p01-p05",
      note: "C24 domdoc-pdfium-wasm bytes ingest attempt; updated post-fetch outcome.",
    },
    null,
    2,
  )}\n`,
);

if (!effectiveArtifactDir) {
  for (const buildRoot of discoverSiblingBuildRoots()) {
    const discovered = discoverArtifactDirFromBuildRoot(buildRoot);
    buildRootAttempts.push({ buildRoot, discoveredDir: discovered });
    if (discovered) {
      effectiveArtifactDir = discovered;
      ingestNote = "discovered-from-build-root";
      break;
    }
  }
}

const urlQueue = [
  ...(artifactUrl ? [artifactUrl] : []),
  ...(process.env.PDFIUM_WASM_ARTIFACT_URLS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? []),
];

for (const url of urlQueue) {
  if (effectiveArtifactDir) break;
  const attempt = await tryDownloadArtifactUrl(url);
  if (attempt.ok) {
    effectiveArtifactDir = attempt.downloadDir;
    ingestNote = "downloaded-from-url";
    console.log(`[fetch-pdfium-wasm] URL ingest ok (${url})`);
  } else {
    console.log(`[fetch-pdfium-wasm] URL ingest failed (${url}: ${attempt.reason})`);
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
  writeDiscoveryRecord({ phase: "post-vendor", ingestStatus: "artifact-local" });
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

if (process.env.PDFIUM_WASM_ALLOW_NONPRODUCTION_STUB === "1") {
  writeNonProductionVendorStub();
  const stubRecord = {
    ...baseRecord,
    status: "nonproduction-vendor-stub-written",
    buildRootAttempts,
    artifactUrl: artifactUrl ?? null,
    vendorPath: vendorDir,
    note: "G1-PDF-09: documented non-production placeholder only; module load rejected for gates. Prefer C24 domdoc-pdfium-wasm build.",
  };
  writeFileSync(join(outDir, "pdfium-wasm-fetch-stub.json"), `${JSON.stringify(stubRecord, null, 2)}\n`);
  writeDiscoveryRecord({ phase: "post-nonproduction-stub" });
  console.log("[fetch-pdfium-wasm] non-production vendor stub written (module load will stay false for gates)");
  process.exit(0);
}

const stub = {
  ...baseRecord,
  status: "stub-not-run",
  buildRootAttempts,
  artifactUrl: artifactUrl ?? null,
  urlCandidatesAttempted: urlQueue,
  c24PdfiumPin: "7c55203ed66b0461378323e3fcf2efaf76755241",
  note: "G1-PDF-10: exhaustive discovery recorded in pdfium-wasm-discovery-record.json; no production C24 WASM bytes. Run pnpm build:pdfium-wasm with PDFIUM_WASM_BUILD_ROOT or set PDFIUM_WASM_ARTIFACT_DIR.",
};
writeDiscoveryRecord({ phase: "post-stub-not-run", fetchStatus: stub.status });
writeFileSync(join(outDir, "pdfium-wasm-fetch-stub.json"), `${JSON.stringify(stub, null, 2)}\n`);
console.log("[fetch-pdfium-wasm] stub only (no artifact directory)");
process.exit(0);
