#!/usr/bin/env bash
# Record an honest Emscripten link attempt against a macOS/host libpdfium.a (expected fail).
# Does not mutate dist output; prints one JSON object to stdout for emcc-link-record merge.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB_ROOT="$(cd "$ROOT/../.." && pwd)"
GLUE="$ROOT/build/domdoc_pdfium_writer_glue.c"
OUT_JS="$ROOT/dist/.host-static-emcc-smoke.js"

HOST_LIB="${PDFIUM_HOST_STATIC_LIB:-}"
if [[ -z "$HOST_LIB" ]]; then
  for candidate in \
    "$WEB_ROOT/tools/pdfium-checkout/pdfium/out/ReleaseComplete/obj/libpdfium.a" \
    "$WEB_ROOT/tools/pdfium-checkout/pdfium/out/Release/obj/libpdfium.a"; do
    if [[ -f "$candidate" ]]; then
      HOST_LIB="$candidate"
      break
    fi
  done
fi

HOST_INCLUDE="${PDFIUM_HOST_INCLUDE_DIR:-}"
if [[ -z "$HOST_INCLUDE" && -n "$HOST_LIB" ]]; then
  for candidate in \
    "$(dirname "$(dirname "$(dirname "$HOST_LIB")")")/public" \
    "$WEB_ROOT/tools/pdfium-checkout/pdfium/public"; do
    if [[ -f "$candidate/fpdf_edit.h" ]]; then
      HOST_INCLUDE="$candidate"
      break
    fi
  done
fi

EMSENV="$WEB_ROOT/tools/emsdk/emsdk_env.sh"
if [[ -f "$EMSENV" ]]; then
  # shellcheck disable=SC1090
  source "$EMSENV" >/dev/null 2>&1
fi

node -e '
const fs = require("fs");
const { spawnSync } = require("child_process");
const hostLib = process.argv[1] || null;
const hostInclude = process.argv[2] || null;
const glue = process.argv[3];
const outJs = process.argv[4];

const base = {
  attempted: false,
  hostStaticLib: hostLib,
  hostIncludeDir: hostInclude,
  targetTriple: "wasm32-unknown-emscripten",
  result: "skipped",
  exitCode: null,
  logTail: null,
  policy:
    "macOS/host Mach-O libpdfium.a cannot produce browser WASM; writer requires pdfium-lib Emscripten rebuild (sibling domdoc-pdfium-wasm).",
};

if (!hostLib || !fs.existsSync(hostLib)) {
  base.result = "skipped-no-host-archive";
  process.stdout.write(JSON.stringify(base));
  process.exit(0);
}

if (!hostInclude || !fs.existsSync(hostInclude + "/fpdf_edit.h")) {
  base.result = "skipped-no-host-headers";
  process.stdout.write(JSON.stringify(base));
  process.exit(0);
}

if (!fs.existsSync(glue)) {
  base.result = "skipped-no-glue";
  process.stdout.write(JSON.stringify(base));
  process.exit(0);
}

const emcc = spawnSync(
  "emcc",
  [
    glue,
    "-O1",
    "-target",
    "wasm32-unknown-emscripten",
    "-s",
    "WASM=1",
    "-DDOMDOC_LINK_PDFIUM=1",
    "-I" + hostInclude,
    hostLib,
    "-s",
    "ERROR_ON_UNDEFINED_SYMBOLS=0",
    "-sDEFAULT_TO_CXX=1",
    "-s",
    "EXPORTED_FUNCTIONS=[_domdoc_pdfium_writer_smoke]",
    "-o",
    outJs,
  ],
  { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
);

base.attempted = true;
base.exitCode = emcc.status;
const combined = (emcc.stderr || "") + (emcc.stdout || "");
base.logTail = combined.slice(-1200) || null;

const wasmPath = outJs.replace(/\.js$/, ".wasm");
const machORejected =
  /neither Wasm object file nor LLVM bitcode/i.test(combined) ||
  /file is not an object file/i.test(combined);
const pdfiumSymbolsMissing = /undefined symbol: FPDF/i.test(combined);
let wasmBytes = 0;
if (fs.existsSync(wasmPath)) {
  wasmBytes = fs.statSync(wasmPath).size;
}
base.hostArchiveLinkedIntoWasm = !(machORejected || pdfiumSymbolsMissing || wasmBytes < 256 * 1024);

if (emcc.status === 0 && fs.existsSync(wasmPath) && base.hostArchiveLinkedIntoWasm) {
  base.result = "unexpected-success";
} else {
  base.result = machORejected
    ? "failed-as-expected-host-mach-o"
    : pdfiumSymbolsMissing
      ? "failed-as-expected-undefined-fpdf"
      : emcc.status === 0
        ? "failed-as-expected-glue-only"
        : "failed-as-expected";
  try {
    fs.unlinkSync(outJs);
  } catch {}
  try {
    fs.unlinkSync(wasmPath);
  } catch {}
}

process.stdout.write(JSON.stringify(base));
' "${HOST_LIB:-}" "${HOST_INCLUDE:-}" "$GLUE" "$OUT_JS"
