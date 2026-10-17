#!/usr/bin/env node
/**
 * G1 automated CI worker: record toolchain readiness and optional bootstrap fetch.
 * Does NOT claim G1 pass — production bytes must match C24 domdoc-pdfium-wasm exports.
 */
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join, dirname, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "evidence", "gates", "G1-feasibility");
mkdirSync(outDir, { recursive: true });

const C24_PIN = "7c55203ed66b0461378323e3fcf2efaf76755241";
const PROBE_VENDOR_DIR = join(root, "vendor", "pdfium-lib-probe");
const PDFIUM_SRC_DIR = join(root, "tools", "pdfium-src");
const PDFIUM_GCLIENT_ROOT = join(root, "tools", "pdfium-checkout");
const DOMDOC_PDFIUM_VENDOR = join(root, "vendor", "domdoc-pdfium-wasm");
const DOMDOC_PDFIUM_PKG = join(root, "packages", "domdoc-pdfium-wasm");

/** Upstream prebuilt WASM (pdfium-render docs) — not C24 domdoc writer exports. */
const PDFIUM_LIB_RELEASE_API =
  "https://api.github.com/repos/paulocoutinhox/pdfium-lib/releases/latest";

function sha256Buffer(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

const LOCAL_EMSDK = join(root, "tools", "emsdk");
const LOCAL_EMSDK_ENV = join(LOCAL_EMSDK, "emsdk_env.sh");
const LOCAL_DEPOT_TOOLS = join(root, "tools", "depot_tools");
const PROBE_ADAPTER_TEMPLATE = join(root, "packages", "domdoc-pdfium-wasm-probe-adapter");

function toolchainShellPrefix() {
  const parts = [];
  if (existsSync(LOCAL_DEPOT_TOOLS)) {
    parts.push(`export PATH="${LOCAL_DEPOT_TOOLS}:$PATH"`);
  }
  if (existsSync(LOCAL_EMSDK_ENV)) {
    parts.push(`source "${LOCAL_EMSDK_ENV}" >/dev/null 2>&1`);
  }
  return parts.length ? `${parts.join("; ")}; ` : "";
}

function emscriptenShellPrefix() {
  return toolchainShellPrefix();
}

function ensureDepotTools() {
  const gclientPy = join(LOCAL_DEPOT_TOOLS, "gclient.py");
  if (existsSync(gclientPy)) {
    return { present: true, cloneAttempted: false, path: LOCAL_DEPOT_TOOLS };
  }
  if (process.env.PDFIUM_WASM_CI_SKIP_DEPOT_TOOLS === "1") {
    return { present: false, cloneAttempted: false, skipped: true, path: LOCAL_DEPOT_TOOLS };
  }
  mkdirSync(join(root, "tools"), { recursive: true });
  const clone = spawnSync(
    "git",
    [
      "clone",
      "--depth",
      "1",
      "https://chromium.googlesource.com/chromium/tools/depot_tools.git",
      LOCAL_DEPOT_TOOLS,
    ],
    { encoding: "utf8", timeout: 300_000 },
  );
  return {
    present: existsSync(gclientPy),
    cloneAttempted: true,
    cloneExitCode: clone.status,
    path: LOCAL_DEPOT_TOOLS,
    detail: clone.status === 0 ? null : (clone.stderr ?? clone.stdout ?? "").slice(-800),
  };
}

function probeEmscripten() {
  const emsdk = process.env.EMSDK?.trim();
  const localEmsdkPresent = existsSync(LOCAL_EMSDK_ENV);
  const shellProbe = `${emscriptenShellPrefix()}command -v emcc && emcc --version | head -1`;
  const emcc = spawnSync("bash", ["-lc", shellProbe], {
    encoding: "utf8",
  });
  return {
    emccInPath: emcc.status === 0 && Boolean(emcc.stdout?.trim()),
    emccVersionLine: (emcc.stdout ?? "").trim() || null,
    emsdkEnv: emsdk ?? null,
    emsdkExists: emsdk ? existsSync(emsdk) : localEmsdkPresent,
    localEmsdkPath: localEmsdkPresent ? LOCAL_EMSDK : null,
  };
}

function listFilesRecursive(dir, base = dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...listFilesRecursive(full, base));
      continue;
    }
    out.push(relative(base, full));
  }
  return out.sort();
}

function materializePdfiumLibProbe(zipBytes, meta) {
  mkdirSync(PROBE_VENDOR_DIR, { recursive: true });
  const zipPath = join(PROBE_VENDOR_DIR, "wasm.zip");
  writeFileSync(zipPath, zipBytes);
  const extractDir = join(PROBE_VENDOR_DIR, "extracted");
  mkdirSync(extractDir, { recursive: true });
  const unzip = spawnSync("unzip", ["-o", "-q", zipPath, "-d", extractDir], {
    encoding: "utf8",
  });
  const extractedFiles = listFilesRecursive(extractDir);
  const wasmFiles = extractedFiles.filter((f) => f.endsWith(".wasm"));
  const jsFiles = extractedFiles.filter((f) => f.endsWith(".js") || f.endsWith(".mjs"));
  const primaryWasm = wasmFiles[0] ?? null;
  const primaryJs =
    jsFiles.find((f) => /pdfium/i.test(f)) ?? jsFiles.find((f) => !f.includes(".map")) ?? null;

  writeFileSync(
    join(PROBE_VENDOR_DIR, "README.md"),
    `# pdfium-lib probe (non-C24)

Display/render binding experiments only. **Do not** use for G1 writer gate or \`resolvePdfiumWasmModule\` production path.

- Upstream: pdfium-lib release ${meta.releaseTag ?? "unknown"}
- Label: non-C24 / render-only probe
- Adapter: \`domdoc-probe-adapter.mjs\`
`,
  );

  writeFileSync(
    join(PROBE_VENDOR_DIR, "domdoc-probe-adapter.mjs"),
    `/** Auto-generated render-only probe adapter — not domdoc-pdfium-wasm writer exports. */
export default {
  __domdocPdfiumLibProbeRender: true,
  nonProduction: true,
  c24WriterExports: false,
  wasmFile: ${JSON.stringify(primaryWasm)},
  jsGlueFile: ${JSON.stringify(primaryJs)},
};
`,
  );

  writeFileSync(
    join(PROBE_VENDOR_DIR, "probe-manifest.json"),
    `${JSON.stringify(
      {
        label: "non-C24-pdfium-lib-probe",
        releaseTag: meta.releaseTag ?? null,
        assetName: meta.assetName ?? null,
        zipSha256: meta.zipSha256 ?? null,
        wasmFiles,
        jsGlueFiles: jsFiles,
        primaryWasm,
        primaryJs,
        resolvePdfiumWasmModuleNote:
          "Production resolver expects vendor/domdoc-pdfium-wasm package.json main + domdoc writer exports; probe uses pdfium-lib-probe-render-stub.ts",
      },
      null,
      2,
    )}\n`,
  );

  writeFileSync(
    join(PROBE_VENDOR_DIR, "package.json"),
    `${JSON.stringify(
      {
        name: "domdoc-pdfium-lib-probe",
        private: true,
        type: "module",
        main: "domdoc-probe-adapter.mjs",
        domdoc: { role: "pdfium-lib-probe-render-only", nonC24: true },
      },
      null,
      2,
    )}\n`,
  );

  const vendored = {
    vendorDir: PROBE_VENDOR_DIR,
    zipPath,
    unzipExitCode: unzip.status,
    wasmFiles,
    jsGlueFiles: jsFiles,
    adapterWritten: true,
  };
  if (unzip.status === 0 && process.env.PDFIUM_WASM_CI_PROBE_ADAPTER !== "0") {
    vendored.domdocPdfiumWasmProbeAdapter = materializeDomdocPdfiumWasmProbeAdapter();
  }
  return vendored;
}

function materializeDomdocPdfiumWasmProbeAdapter() {
  const manifestPath = join(PROBE_VENDOR_DIR, "probe-manifest.json");
  if (!existsSync(manifestPath)) {
    return { ok: false, reason: "probe-manifest-missing" };
  }
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    return { ok: false, reason: "probe-manifest-invalid" };
  }
  const primaryWasm = manifest.primaryWasm ?? null;
  const primaryJs = manifest.primaryJs ?? null;
  if (!primaryWasm) {
    return { ok: false, reason: "probe-wasm-missing" };
  }
  mkdirSync(DOMDOC_PDFIUM_VENDOR, { recursive: true });
  const wasmSrc = join(PROBE_VENDOR_DIR, "extracted", primaryWasm);
  const wasmDestName = "domdoc_pdfium_wasm_bg.wasm";
  const wasmDest = join(DOMDOC_PDFIUM_VENDOR, wasmDestName);
  if (existsSync(wasmSrc)) {
    copyFileSync(wasmSrc, wasmDest);
  }
  if (primaryJs) {
    const jsSrc = join(PROBE_VENDOR_DIR, "extracted", primaryJs);
    const jsDest = join(DOMDOC_PDFIUM_VENDOR, "pdfium-lib-probe-glue.js");
    if (existsSync(jsSrc)) copyFileSync(jsSrc, jsDest);
  }
  writeFileSync(
    join(DOMDOC_PDFIUM_VENDOR, "README.md"),
    readFileSync(join(PROBE_ADAPTER_TEMPLATE, "README.md"), "utf8"),
  );
  writeFileSync(
    join(DOMDOC_PDFIUM_VENDOR, "package.json"),
    `${JSON.stringify(
      {
        name: "domdoc-pdfium-wasm",
        version: "0.0.0-probe-adapter",
        private: true,
        type: "module",
        main: "index.mjs",
        domdoc: { role: "pdfium-lib-probe-vendor-adapter", c24WriterExports: false },
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(DOMDOC_PDFIUM_VENDOR, "index.mjs"),
    `/** Materialized probe adapter — render-only; writer exports absent (G1 honest). */
export default {
  __domdocPdfiumLibProbeAdapter: true,
  c24WriterExports: false,
  renderOnly: true,
  wasmFile: ${JSON.stringify(wasmDestName)},
  probeGlue: ${JSON.stringify(primaryJs ? "pdfium-lib-probe-glue.js" : null)},
  upstreamLabel: ${JSON.stringify(manifest.label ?? "non-C24-pdfium-lib-probe")},
};
`,
  );
  return {
    ok: true,
    vendorDir: DOMDOC_PDFIUM_VENDOR,
    wasmCopied: existsSync(wasmDest),
    resolvePdfiumWasmModule: "vendor-artifact via index.mjs",
    writerExports: false,
  };
}

function describeDomdocPdfiumWasmLayoutExpectation() {
  const expected = {
    vendorDir: DOMDOC_PDFIUM_VENDOR,
    packageJsonMain: "index.js",
    wasmBasenames: ["domdoc_pdfium_wasm_bg.wasm", "pdfium.wasm"],
    resolver: "resolvePdfiumWasmModule()",
  };
  const present = existsSync(DOMDOC_PDFIUM_VENDOR);
  const files = present ? listFilesRecursive(DOMDOC_PDFIUM_VENDOR) : [];
  return {
    expected,
    present,
    files,
    adapterNeeded: present && !files.some((f) => f === "package.json"),
  };
}

function copyDomdocPdfiumPkgDistToVendor(record) {
  const dist = join(DOMDOC_PDFIUM_PKG, "dist");
  if (!existsSync(join(dist, "index.mjs"))) {
    return { ok: false, reason: "package-dist-missing" };
  }
  mkdirSync(DOMDOC_PDFIUM_VENDOR, { recursive: true });
  const files = listFilesRecursive(dist);
  for (const rel of files) {
    const src = join(dist, rel);
    const dest = join(DOMDOC_PDFIUM_VENDOR, rel);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
  }
  return {
    ok: true,
    vendorDir: DOMDOC_PDFIUM_VENDOR,
    filesCopied: files.length,
    writerExports: false,
    note: "contract-scaffold-only",
    ...record,
  };
}

function attemptDomdocPdfiumWasmPackageBuild(emscripten) {
  const result = {
    packageDir: DOMDOC_PDFIUM_PKG,
    manifestAttempted: false,
    stubWasmAttempted: false,
    stubWasmExitCode: null,
    vendorCopy: null,
    status: "not-started",
    detail: null,
  };
  if (!existsSync(DOMDOC_PDFIUM_PKG)) {
    result.status = "package-missing";
    return result;
  }
  result.manifestAttempted = true;
  const manifest = spawnSync("node", [join(DOMDOC_PDFIUM_PKG, "scripts", "build-manifest.mjs")], {
    encoding: "utf8",
    cwd: DOMDOC_PDFIUM_PKG,
  });
  if (manifest.status !== 0) {
    result.status = "manifest-failed";
    result.detail = (manifest.stderr ?? manifest.stdout ?? "").slice(-800);
    return result;
  }
  const stubScript = join(DOMDOC_PDFIUM_PKG, "scripts", "build-stub-wasm.sh");
  if (emscripten.emccInPath && existsSync(stubScript)) {
    result.stubWasmAttempted = true;
    const stub = spawnSync("bash", [stubScript], {
      encoding: "utf8",
      cwd: DOMDOC_PDFIUM_PKG,
      timeout: 120_000,
    });
    result.stubWasmExitCode = stub.status;
    if (stub.status === 2) {
      result.detail = "emcc missing at stub script runtime";
    } else if (stub.status !== 0) {
      result.detail = (stub.stderr ?? stub.stdout ?? "").slice(-800);
    }
  }
  if (process.env.PDFIUM_WASM_CI_VENDOR_CONTRACT !== "0") {
    result.vendorCopy = copyDomdocPdfiumPkgDistToVendor({
      stubWasmBuilt: result.stubWasmExitCode === 0,
    });
  }
  result.status =
    result.stubWasmExitCode === 0
      ? "contract-stub-wasm-built"
      : result.manifestAttempted
        ? "contract-manifest-only"
        : "failed";
  if (!result.detail) {
    result.detail =
      "domdoc-pdfium-wasm in-repo scaffold; c24WriterExports=false until production link";
  }
  return result;
}

function findPdfiumTreeRoot(baseDir) {
  const direct = join(baseDir, "pdfium");
  if (existsSync(join(direct, "BUILD.gn"))) return direct;
  const nested = join(baseDir, "src", "pdfium");
  if (existsSync(join(nested, "BUILD.gn"))) return nested;
  if (existsSync(join(baseDir, "BUILD.gn"))) return baseDir;
  return null;
}

function attemptPdfiumC24GclientCheckout(depotTools, emscripten) {
  if (process.env.PDFIUM_WASM_CI_SKIP_GCLIENT_CHECKOUT === "1") {
    return { skipped: true, reason: "PDFIUM_WASM_CI_SKIP_GCLIENT_CHECKOUT=1" };
  }
  const result = {
    skipped: false,
    card: "G1-PDF-GCLIENT-01",
    c24Pin: C24_PIN,
    gclientRoot: PDFIUM_GCLIENT_ROOT,
    depotTools,
    gclientConfigAttempted: false,
    gclientSyncAttempted: false,
    checkoutPin: null,
    pdfiumTreeDir: null,
    depsPresent: false,
    gnGenAttempted: false,
    ninjaAttempted: false,
    emscriptenGnGenAttempted: false,
    emscriptenNinjaAttempted: false,
    emscriptenGnHints: [],
    status: "not-started",
    detail: null,
  };

  if (!depotTools.present) {
    result.status = "depot-tools-missing";
    result.detail = "tools/depot_tools required for gclient checkout";
    return result;
  }

  mkdirSync(PDFIUM_GCLIENT_ROOT, { recursive: true });
  const gclientFile = join(PDFIUM_GCLIENT_ROOT, ".gclient");
  if (!existsSync(gclientFile)) {
    result.gclientConfigAttempted = true;
    const config = spawnSync(
      "bash",
      [
        "-lc",
        `${emscriptenShellPrefix()}cd "${PDFIUM_GCLIENT_ROOT}" && gclient config --unmanaged https://pdfium.googlesource.com/pdfium.git 2>&1`,
      ],
      { encoding: "utf8", timeout: 120_000 },
    );
    if (config.status !== 0) {
      result.status = "gclient-config-failed";
      result.detail = (config.stderr ?? config.stdout ?? "").slice(-1200);
      return result;
    }
  }

  result.gclientSyncAttempted = true;
  const sync = spawnSync(
    "bash",
    [
      "-lc",
      `${emscriptenShellPrefix()}cd "${PDFIUM_GCLIENT_ROOT}" && gclient sync --nohooks -D --jobs=4 2>&1 | tail -20`,
    ],
    { encoding: "utf8", timeout: 900_000 },
  );
  const syncTail = (sync.stdout ?? sync.stderr ?? "").trim();

  const pdfiumTree = findPdfiumTreeRoot(PDFIUM_GCLIENT_ROOT);
  result.pdfiumTreeDir = pdfiumTree;
  if (!pdfiumTree) {
    result.status = sync.status === 0 ? "gclient-sync-ok-tree-missing" : "gclient-sync-failed";
    result.detail = syncTail || "BUILD.gn not found under pdfium-checkout";
    return result;
  }

  result.depsPresent = existsSync(join(pdfiumTree, "DEPS"));
  const fetchPin = spawnSync("git", ["fetch", "--depth", "1", "origin", C24_PIN], {
    cwd: pdfiumTree,
    encoding: "utf8",
    timeout: 180_000,
  });
  const checkout = spawnSync("git", ["checkout", "--detach", C24_PIN], {
    cwd: pdfiumTree,
    encoding: "utf8",
    timeout: 60_000,
  });
  result.checkoutPin =
    checkout.status === 0 ? C24_PIN : fetchPin.status === 0 ? "fetch-ok-checkout-failed" : "fetch-failed";

  const buildGn = join(pdfiumTree, "BUILD.gn");
  if (!existsSync(buildGn)) {
    result.status = "checkout-no-build-gn";
    result.detail = syncTail;
    return result;
  }

  const emscriptenHints = [];
  for (const candidate of ["BUILD.gn", "pdfium.gni", "gn/pdfium.gni"]) {
    const path = join(pdfiumTree, candidate);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    if (/emscripten|wasm|EMSCRIPTEN/i.test(text)) {
      emscriptenHints.push(candidate);
    }
  }
  result.emscriptenGnHints = emscriptenHints;

  if (!emscripten.emccInPath) {
    result.status = "gclient-checkout-ok-emscripten-missing";
    result.detail = `gclient exit ${sync.status}; pin ${result.checkoutPin}; emscripten hints: ${emscriptenHints.join(", ") || "none in scanned gni"}`;
    return result;
  }

  const gnCheck = spawnSync("bash", ["-lc", `${emscriptenShellPrefix()}command -v gn || true`], {
    encoding: "utf8",
  });
  if (!gnCheck.stdout?.trim()) {
    result.status = "gclient-checkout-ok-gn-missing";
    result.detail = syncTail;
    return result;
  }

  result.gnGenAttempted = true;
  const outDir = join(pdfiumTree, "out", "domdoc-gclient-wasm-smoke");
  const gnGen = spawnSync(
    "bash",
    [
      "-lc",
      `${emscriptenShellPrefix()}cd "${pdfiumTree}" && gn gen "${outDir}" --args='is_debug=false is_component_build=false pdf_is_complete=true use_custom_libcxx=false v8_enable_sandbox=false' 2>&1 | tail -10`,
    ],
    { encoding: "utf8", timeout: 180_000 },
  );
  const gnTail = (gnGen.stdout ?? gnGen.stderr ?? "").trim();

  result.ninjaAttempted = true;
  const ninja = spawnSync(
    "bash",
    [
      "-lc",
      `${emscriptenShellPrefix()}cd "${pdfiumTree}" && ninja -C "${outDir}" -n pdfium 2>&1 | tail -8`,
    ],
    { encoding: "utf8", timeout: 120_000,
    },
  );
  const ninjaTail = (ninja.stdout ?? ninja.stderr ?? "").trim();

  const buildNinja = join(outDir, "build.ninja");
  if (gnGen.status !== 0 || !existsSync(buildNinja)) {
    result.status = "gclient-gn-gen-failed";
    result.detail = `sync exit ${sync.status}; gn exit ${gnGen.status}; build.ninja present=${existsSync(buildNinja)}; ${gnTail}; hints: ${emscriptenHints.join(", ") || "none"}`;
    return result;
  }

  const ninjaOk =
    ninja.status === 0 && !/ninja: error:/i.test(ninjaTail) && !/fatal:/i.test(ninjaTail);

  result.emscriptenGnGenAttempted = true;
  const wasmOutDir = join(pdfiumTree, "out", "wasm");
  const wasmGnLog = join(pdfiumTree, "out", "domdoc-wasm-gn-smoke.log");
  const wasmGn = spawnSync(
    "bash",
    [
      "-lc",
      `${emscriptenShellPrefix()}cd "${pdfiumTree}" && gn gen "${wasmOutDir}" --args='target_os="wasm" target_cpu="wasm" is_debug=false is_component_build=false pdf_is_complete=true use_custom_libcxx=false v8_enable_sandbox=false' >"${wasmGnLog}" 2>&1; echo $?`,
    ],
    { encoding: "utf8", timeout: 180_000 },
  );
  const wasmGnExit = Number((wasmGn.stdout ?? "").trim()) || wasmGn.status || 1;
  const wasmGnTail = existsSync(wasmGnLog)
    ? readFileSync(wasmGnLog, "utf8").trim().slice(-1200)
    : (wasmGn.stderr ?? "").trim();
  result.emscriptenNinjaAttempted = true;
  const wasmBuildNinja = join(wasmOutDir, "build.ninja");
  let wasmNinjaTail = "";
  let wasmNinjaExit = null;
  if (existsSync(wasmBuildNinja)) {
    const wasmNinja = spawnSync(
      "bash",
      [
        "-lc",
        `${emscriptenShellPrefix()}cd "${pdfiumTree}" && ninja -C "${wasmOutDir}" -n pdfium 2>&1 | tail -8`,
      ],
      { encoding: "utf8", timeout: 120_000,
      },
    );
    wasmNinjaExit = wasmNinja.status;
    wasmNinjaTail = (wasmNinja.stdout ?? wasmNinja.stderr ?? "").trim();
  }
  result.emscriptenGnWasmBuildNinja = existsSync(wasmBuildNinja);
  result.emscriptenGnWasmGenExit = wasmGnExit;
  result.emscriptenGnWasmNinjaExit = wasmNinjaExit;
  result.emscriptenGnWasmTail = wasmGnTail || wasmNinjaTail || null;

  const wasmGnOk = wasmGnExit === 0 && existsSync(wasmBuildNinja);
  const wasmNinjaOk =
    wasmNinjaExit === null ||
    (wasmNinjaExit === 0 &&
      !/ninja: error:/i.test(wasmNinjaTail) &&
      !/fatal:/i.test(wasmNinjaTail));

  result.status = ninjaOk
    ? wasmGnOk && wasmNinjaOk
      ? "gclient-gn-ninja-dry-run-ok-emscripten-gn-ok"
      : "gclient-gn-ninja-dry-run-ok"
    : "gclient-gn-ok-ninja-dry-run-blocked";
  result.detail = `gclient exit ${sync.status}; pin ${result.checkoutPin}; gn exit ${gnGen.status}; ninja -n exit ${ninja.status}; wasm gn exit ${wasmGnExit}; wasm build.ninja=${existsSync(wasmBuildNinja)}; wasm ninja -n exit ${wasmNinjaExit ?? "skipped"}; ${(wasmGnTail || wasmNinjaTail || ninjaTail || gnTail).slice(-400)}; domdoc-pdfium-wasm emscripten writer target not wired in-tree`;
  return result;
}

function attemptPdfiumC24SourceBuild(emscripten, depotTools) {
  if (process.env.PDFIUM_WASM_CI_SKIP_PDFIUM_SRC === "1") {
    return { skipped: true, reason: "PDFIUM_WASM_CI_SKIP_PDFIUM_SRC=1" };
  }
  const result = {
    skipped: false,
    c24Pin: C24_PIN,
    pdfiumSrcDir: PDFIUM_SRC_DIR,
    depotTools,
    cloneAttempted: false,
    checkoutPin: null,
    buildAttempted: false,
    gclientAttempted: false,
    gnGenAttempted: false,
    ninjaAttempted: false,
    status: "not-started",
    detail: null,
  };

  if (!existsSync(PDFIUM_SRC_DIR)) {
    result.cloneAttempted = true;
    const clone = spawnSync(
      "git",
      [
        "clone",
        "--filter=blob:none",
        "--depth",
        "1",
        `https://github.com/chromium/pdfium.git`,
        PDFIUM_SRC_DIR,
      ],
      { encoding: "utf8", timeout: 300_000 },
    );
    if (clone.status !== 0) {
      result.status = "clone-failed";
      result.detail = (clone.stderr ?? clone.stdout ?? "").slice(-1500);
      return result;
    }
  }

  const fetchPin = spawnSync(
    "git",
    ["fetch", "--depth", "1", "origin", C24_PIN],
    { cwd: PDFIUM_SRC_DIR, encoding: "utf8", timeout: 120_000 },
  );
  const checkout = spawnSync("git", ["checkout", "--detach", C24_PIN], {
    cwd: PDFIUM_SRC_DIR,
    encoding: "utf8",
    timeout: 60_000,
  });
  result.checkoutPin =
    checkout.status === 0 ? C24_PIN : fetchPin.status === 0 ? "fetch-ok-checkout-failed" : "fetch-failed";

  const buildGn = join(PDFIUM_SRC_DIR, "BUILD.gn");
  const hasBuildGn = existsSync(buildGn);
  result.buildAttempted = true;

  if (!emscripten.emccInPath) {
    result.status = "emscripten-missing";
    result.detail = "Cannot attempt PDFium emscripten build without emcc";
    return result;
  }

  if (!hasBuildGn) {
    result.status = "no-build-gn";
    result.detail = "PDFium tree missing BUILD.gn";
    return result;
  }

  const gnCheck = spawnSync("bash", ["-lc", `${emscriptenShellPrefix()}command -v gn || true`], {
    encoding: "utf8",
  });
  const hasGn = gnCheck.stdout?.trim().length > 0;
  if (!hasGn) {
    result.status = "gn-missing";
    result.detail =
      "PDFium C24 source present but depot_tools gn not in PATH; install tools/depot_tools or set PDFIUM_WASM_CI_SKIP_DEPOT_TOOLS=1";
    return result;
  }

  result.gclientAttempted = true;
  const gclientSync = spawnSync(
    "bash",
    ["-lc", `${emscriptenShellPrefix()}cd "${PDFIUM_SRC_DIR}" && gclient sync --nohooks --shallow 2>&1 | tail -5`],
    { encoding: "utf8", timeout: 600_000 },
  );
  const gclientTail = (gclientSync.stdout ?? gclientSync.stderr ?? "").trim();

  result.gnGenAttempted = true;
  const outDir = join(PDFIUM_SRC_DIR, "out", "domdoc-wasm-ci-smoke");
  const gnGen = spawnSync(
    "bash",
    [
      "-lc",
      `${emscriptenShellPrefix()}cd "${PDFIUM_SRC_DIR}" && gn gen "${outDir}" --args='is_debug=false is_component_build=false pdf_is_complete=true use_custom_libcxx=false v8_enable_sandbox=false' 2>&1 | tail -8`,
    ],
    { encoding: "utf8", timeout: 120_000 },
  );
  const gnTail = (gnGen.stdout ?? gnGen.stderr ?? "").trim();

  result.ninjaAttempted = true;
  const ninja = spawnSync(
    "bash",
    [
      "-lc",
      `${emscriptenShellPrefix()}cd "${PDFIUM_SRC_DIR}" && ninja -C "${outDir}" -n pdfium 2>&1 | tail -5`,
    ],
    { encoding: "utf8", timeout: 120_000 },
  );
  const ninjaTail = (ninja.stdout ?? ninja.stderr ?? "").trim();

  const smoke = spawnSync(
    "bash",
    ["-lc", `${emscriptenShellPrefix()}emcc -v 2>&1 | head -1`],
    { encoding: "utf8" },
  );

  const buildNinja = join(outDir, "build.ninja");
  if (gnGen.status !== 0 || !existsSync(buildNinja)) {
    result.status = "gn-gen-failed";
    result.detail = `gclient tail: ${gclientTail || "n/a"}; gn gen exit ${gnGen.status}; build.ninja present=${existsSync(buildNinja)}; ${gnTail || "failed"}; emcc: ${(smoke.stdout ?? "").trim()}`;
    return result;
  }

  const ninjaOk =
    ninja.status === 0 && !/ninja: error:/i.test(ninjaTail) && !/fatal:/i.test(ninjaTail);
  result.status = ninjaOk ? "ninja-dry-run-ok-no-emscripten-target" : "ninja-dry-run-blocked";
  result.detail = `gclient: exit ${gclientSync.status}; gn gen: exit ${gnGen.status}; ninja -n: exit ${ninja.status}; ${ninjaTail || gnTail}; domdoc-pdfium-wasm emscripten target not wired in-tree`;
  return result;
}

async function probePdfiumLibRelease() {
  if (process.env.PDFIUM_WASM_CI_PROBE_FETCH !== "1") {
    return { attempted: false, reason: "set PDFIUM_WASM_CI_PROBE_FETCH=1 to probe upstream WASM size" };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
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
    const zipSha256 = sha256Buffer(bytes);
    const vendored =
      process.env.PDFIUM_WASM_CI_PROBE_VENDOR !== "0"
        ? materializePdfiumLibProbe(bytes, {
            releaseTag: meta.tag_name,
            assetName: asset.name,
            zipSha256,
          })
        : null;
    return {
      attempted: true,
      ok: true,
      releaseTag: meta.tag_name ?? null,
      assetName: asset.name,
      zipBytes: bytes.length,
      zipSha256,
      nonProduction: true,
      note: "pdfium-lib prebuild ≠ C24 domdoc-pdfium-wasm writer; probe only",
      vendored,
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

const depotTools = ensureDepotTools();
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
const pdfiumGclientCheckout = attemptPdfiumC24GclientCheckout(depotTools, emscripten);
const pdfiumSourceAttempt = attemptPdfiumC24SourceBuild(emscripten, depotTools);
const domdocPdfiumPackageBuild = attemptDomdocPdfiumWasmPackageBuild(emscripten);
const domdocLayout = describeDomdocPdfiumWasmLayoutExpectation();

writeFileSync(
  join(outDir, "pdfium-c24-gclient-checkout-attempt.json"),
  `${JSON.stringify(
    {
      builtAt: new Date().toISOString(),
      ...pdfiumGclientCheckout,
    },
    null,
    2,
  )}\n`,
);

writeFileSync(
  join(outDir, "pdfium-c24-source-build-attempt.json"),
  `${JSON.stringify(
    {
      builtAt: new Date().toISOString(),
      card: "G1-PDF-CI-02",
      ...pdfiumSourceAttempt,
    },
    null,
    2,
  )}\n`,
);

const record = {
  builtAt: new Date().toISOString(),
  card: "G1-PDF-CI-01",
  status: emscripten.emccInPath ? "toolchain-emscripten-present" : "toolchain-emscripten-missing",
  c24PdfiumPin: C24_PIN,
  productionArtifactExpected: "vendor/domdoc-pdfium-wasm (domdoc-pdfium-wasm repo)",
  emscripten,
  depotTools,
  priorBuildStatus: priorBuild?.status ?? null,
  upstreamProbe: probeFetch,
  pdfiumC24GclientCheckout: pdfiumGclientCheckout,
  pdfiumC24SourceAttempt: pdfiumSourceAttempt,
  domdocPdfiumPackageBuild,
  domdocPdfiumWasmLayout: domdocLayout,
  ciSteps: [
    "Install tools/depot_tools (gitignored) + tools/emsdk; PATH includes depot_tools",
    "Optional PDFIUM_WASM_CI_PROBE_FETCH=1 vendors pdfium-lib probe + domdoc-pdfium-wasm probe adapter",
    "gclient full checkout under tools/pdfium-checkout (see pdfium-c24-gclient-checkout-attempt.json)",
    "packages/domdoc-pdfium-wasm contract scaffold (stub emcc + vendor copy when PDFIUM_WASM_CI_VENDOR_CONTRACT≠0)",
    "Clone domdoc-pdfium-wasm at C24 pin; run build-wasm.sh",
    "Copy dist to vendor/domdoc-pdfium-wasm or set PDFIUM_WASM_ARTIFACT_DIR",
    "pnpm fetch:pdfium-wasm && PDFIUM_WASM_CI_WORKER=1 pnpm proof:p01-p05",
  ],
  localCommands: {
    discover: "pnpm build:pdfium-wasm",
    ingest: "pnpm fetch:pdfium-wasm",
    autoDrop: "pnpm proof:pdfium-artifact-drop",
    runBuild: "PDFIUM_WASM_RUN_BUILD=1 PDFIUM_WASM_BUILD_ROOT=/path/to/domdoc-pdfium-wasm pnpm build:pdfium-wasm",
    probeFetch: "PDFIUM_WASM_CI_PROBE_FETCH=1 pnpm ci:build-pdfium-wasm",
  },
  note: "CI worker records readiness; G1 gate stays not-run until C24 production module loads and P01–P05 nativeProof=pass.",
};

writeFileSync(join(outDir, "pdfium-wasm-ci-build-record.json"), `${JSON.stringify(record, null, 2)}\n`);
console.log(`[ci-build-pdfium-wasm] ${record.status}`);
if (probeFetch.attempted) {
  console.log(
    `[ci-build-pdfium-wasm] upstream probe: ${probeFetch.ok ? "ok" : probeFetch.reason ?? "failed"}`,
  );
  if (probeFetch.vendored?.wasmFiles?.length) {
    console.log(
      `[ci-build-pdfium-wasm] probe vendored: ${probeFetch.vendored.wasmFiles.length} wasm file(s) under vendor/pdfium-lib-probe`,
    );
  }
}
if (pdfiumGclientCheckout.status) {
  console.log(`[ci-build-pdfium-wasm] pdfium C24 gclient: ${pdfiumGclientCheckout.status}`);
}
if (pdfiumSourceAttempt.status) {
  console.log(`[ci-build-pdfium-wasm] pdfium C24 source: ${pdfiumSourceAttempt.status}`);
}
if (domdocPdfiumPackageBuild.status) {
  console.log(`[ci-build-pdfium-wasm] domdoc-pdfium-wasm pkg: ${domdocPdfiumPackageBuild.status}`);
}
