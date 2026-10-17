#!/usr/bin/env node
/**
 * G1 automated CI worker: record toolchain readiness and optional bootstrap fetch.
 * Does NOT claim G1 pass — production bytes must match C24 domdoc-pdfium-wasm exports.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "evidence", "gates", "G1-feasibility");
mkdirSync(outDir, { recursive: true });

const C24_PIN = "7c55203ed66b0461378323e3fcf2efaf76755241";

/** Upstream prebuilt WASM (pdfium-render docs) — not C24 domdoc writer exports. */
const PDFIUM_LIB_RELEASE_API =
  "https://api.github.com/repos/paulocoutinhox/pdfium-lib/releases/latest";

function sha256Buffer(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function probeEmscripten() {
  const emcc = spawnSync("bash", ["-lc", "command -v emcc && emcc --version | head -1"], {
    encoding: "utf8",
  });
  const emsdk = process.env.EMSDK?.trim();
  return {
    emccInPath: emcc.status === 0 && Boolean(emcc.stdout?.trim()),
    emccVersionLine: (emcc.stdout ?? "").trim() || null,
    emsdkEnv: emsdk ?? null,
    emsdkExists: emsdk ? existsSync(emsdk) : false,
  };
}

async function probePdfiumLibRelease() {
  if (process.env.PDFIUM_WASM_CI_PROBE_FETCH !== "1") {
    return { attempted: false, reason: "set PDFIUM_WASM_CI_PROBE_FETCH=1 to probe upstream WASM size" };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const metaRes = await fetch(PDFIUM_LIB_RELEASE_API, {
      signal: controller.signal,
      headers: { Accept: "application/vnd.github+json", "User-Agent": "domdoc-ci-build-pdfium-wasm" },
    });
    if (!metaRes.ok) {
      return { attempted: true, ok: false, reason: `github-meta-${metaRes.status}` };
    }
    const meta = await metaRes.json();
    const asset =
      meta.assets?.find((a) => a.name?.includes("wasm") && a.name?.endsWith(".zip")) ??
      meta.assets?.find((a) => a.name?.endsWith(".zip"));
    if (!asset?.browser_download_url) {
      return { attempted: true, ok: false, reason: "no-wasm-zip-asset" };
    }
    const zipRes = await fetch(asset.browser_download_url, { signal: controller.signal });
    if (!zipRes.ok) {
      return { attempted: true, ok: false, reason: `zip-http-${zipRes.status}` };
    }
    const bytes = Buffer.from(await zipRes.arrayBuffer());
    return {
      attempted: true,
      ok: true,
      releaseTag: meta.tag_name ?? null,
      assetName: asset.name,
      zipBytes: bytes.length,
      zipSha256: sha256Buffer(bytes),
      nonProduction: true,
      note: "pdfium-lib prebuild ≠ C24 domdoc-pdfium-wasm writer; probe only",
    };
  } catch (error) {
    return {
      attempted: true,
      ok: false,
      reason: error?.name === "AbortError" ? "timeout" : "network-error",
      detail: String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

const emscripten = probeEmscripten();
const buildRecordPath = join(outDir, "pdfium-wasm-build-record.json");
let priorBuild = null;
if (existsSync(buildRecordPath)) {
  try {
    priorBuild = JSON.parse(readFileSync(buildRecordPath, "utf8"));
  } catch {
    priorBuild = null;
  }
}

const probeFetch = await probePdfiumLibRelease();

const record = {
  builtAt: new Date().toISOString(),
  card: "G1-PDF-CI-01",
  status: emscripten.emccInPath ? "toolchain-emscripten-present" : "toolchain-emscripten-missing",
  c24PdfiumPin: C24_PIN,
  productionArtifactExpected: "vendor/domdoc-pdfium-wasm (domdoc-pdfium-wasm repo)",
  emscripten,
  priorBuildStatus: priorBuild?.status ?? null,
  upstreamProbe: probeFetch,
  ciSteps: [
    "Install emsdk; source emsdk_env.sh",
    "Clone domdoc-pdfium-wasm at C24 pin; run build-wasm.sh",
    "Copy dist to vendor/domdoc-pdfium-wasm or set PDFIUM_WASM_ARTIFACT_DIR",
    "pnpm fetch:pdfium-wasm && PDFIUM_WASM_CI_WORKER=1 pnpm proof:p01-p05",
  ],
  localCommands: {
    discover: "pnpm build:pdfium-wasm",
    ingest: "pnpm fetch:pdfium-wasm",
    autoDrop: "pnpm proof:pdfium-artifact-drop",
    runBuild: "PDFIUM_WASM_RUN_BUILD=1 PDFIUM_WASM_BUILD_ROOT=/path/to/domdoc-pdfium-wasm pnpm build:pdfium-wasm",
  },
  note: "CI worker records readiness; G1 gate stays not-run until C24 production module loads and P01–P05 nativeProof=pass.",
};

writeFileSync(join(outDir, "pdfium-wasm-ci-build-record.json"), `${JSON.stringify(record, null, 2)}\n`);
console.log(`[ci-build-pdfium-wasm] ${record.status}`);
if (probeFetch.attempted) {
  console.log(
    `[ci-build-pdfium-wasm] upstream probe: ${probeFetch.ok ? "ok" : probeFetch.reason ?? "failed"}`,
  );
}
