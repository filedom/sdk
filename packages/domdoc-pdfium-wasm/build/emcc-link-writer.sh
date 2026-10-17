#!/usr/bin/env bash
# Emscripten glue: contract stub, or partial fpdf_edit smoke when PDFIUM_STATIC_LIB is linkable.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB_ROOT="$(cd "$ROOT/../.." && pwd)"
DIST="$ROOT/dist"
GLUE="$ROOT/build/domdoc_pdfium_writer_glue.c"
WORKSPACE_PDFIUM_LIB="$WEB_ROOT/../domdoc-pdfium-wasm/third_party/pdfium-lib/build/emscripten/wasm/release/lib/libpdfium.a"
mkdir -p "$DIST"

EMSENV="$WEB_ROOT/tools/emsdk/emsdk_env.sh"
if [[ -f "$EMSENV" ]]; then
  # shellcheck disable=SC1090
  source "$EMSENV" >/dev/null 2>&1
fi

if ! command -v emcc >/dev/null 2>&1; then
  echo "[emcc-link-writer] emcc missing — skip" >&2
  exit 2
fi

STATIC_LIB="${PDFIUM_STATIC_LIB:-${PDFIUM_HOST_STATIC_LIB:-}}"
if [[ -z "$STATIC_LIB" && -f "$WORKSPACE_PDFIUM_LIB" ]]; then
  STATIC_LIB="$WORKSPACE_PDFIUM_LIB"
fi

INCLUDE_DIR="${PDFIUM_INCLUDE_DIR:-}"
if [[ -z "$INCLUDE_DIR" && -f "$WORKSPACE_PDFIUM_LIB" ]]; then
  INCLUDE_DIR="$(dirname "$(dirname "$WORKSPACE_PDFIUM_LIB")")/include"
fi

LINK_MODE="stub"
EXPORT_FN="_domdoc_pdfium_contract_stub"
EMCC_ARGS=(-O1 -s WASM=1 -s "EXPORTED_RUNTIME_METHODS=[]")

if [[ -n "$STATIC_LIB" && -f "$STATIC_LIB" && -n "$INCLUDE_DIR" && -f "$INCLUDE_DIR/fpdf_edit.h" ]]; then
  LINK_MODE="partial-fpdf-edit"
  EXPORT_FN="_domdoc_pdfium_writer_smoke,_domdoc_pdfium_writer_glue_kind"
  EMCC_ARGS+=(-DDOMDOC_LINK_PDFIUM=1 "-I$INCLUDE_DIR" "$STATIC_LIB" -s ERROR_ON_UNDEFINED_SYMBOLS=0 -sDEFAULT_TO_CXX=1)
  echo "[emcc-link-writer] linking partial fpdf_edit smoke against $STATIC_LIB" >&2
else
  echo "[emcc-link-writer] no linkable PDFium static lib — contract stub only" >&2
fi

COMPILER=emcc
if [[ "$LINK_MODE" == "partial-fpdf-edit" ]] && command -v em++ >/dev/null 2>&1; then
  COMPILER=em++
fi

set +e
"$COMPILER" "$GLUE" \
  "${EMCC_ARGS[@]}" \
  -s "EXPORTED_FUNCTIONS=[$EXPORT_FN]" \
  -o "$DIST/domdoc_pdfium_contract_stub.js"
LINK_EXIT=$?
set -e

if [[ $LINK_EXIT -ne 0 && "$LINK_MODE" == "partial-fpdf-edit" ]]; then
  echo "[emcc-link-writer] partial link failed (exit $LINK_EXIT) — contract stub fallback" >&2
  LINK_MODE="partial-link-failed-stub-fallback"
  EXPORT_FN="_domdoc_pdfium_contract_stub,_domdoc_pdfium_writer_glue_kind"
  emcc "$GLUE" \
    -O1 -s WASM=1 -s "EXPORTED_RUNTIME_METHODS=[]" \
    -s "EXPORTED_FUNCTIONS=[$EXPORT_FN]" \
    -o "$DIST/domdoc_pdfium_contract_stub.js"
fi

HOST_STATIC_LIB="${PDFIUM_HOST_STATIC_LIB:-}"
if [[ -z "$HOST_STATIC_LIB" ]]; then
  for candidate in \
    "$WEB_ROOT/tools/pdfium-checkout/pdfium/out/ReleaseComplete/obj/libpdfium.a" \
    "$WEB_ROOT/tools/pdfium-checkout/pdfium/out/Release/obj/libpdfium.a"; do
    if [[ -f "$candidate" ]]; then
      HOST_STATIC_LIB="$candidate"
      break
    fi
  done
fi

HOST_STATIC_ATTEMPT_JSON="{}"
if [[ -x "$ROOT/build/attempt-host-static-emcc-link.sh" ]] || [[ -f "$ROOT/build/attempt-host-static-emcc-link.sh" ]]; then
  set +e
  HOST_STATIC_ATTEMPT_JSON="$(bash "$ROOT/build/attempt-host-static-emcc-link.sh" 2>/dev/null || echo '{}')"
  set -e
fi

VENDOR_PROBE=false
if command -v node >/dev/null 2>&1; then
  PROBE_OUT="$(node --import tsx/esm "$ROOT/scripts/probe-writer-exports.mjs" 2>/dev/null || echo false)"
  if [[ "$PROBE_OUT" == "true" ]]; then
    VENDOR_PROBE=true
  fi
fi
node "$ROOT/scripts/build-manifest.mjs"
node -e "
const fs=require('fs');
const path=require('path');
const out=path.join(process.argv[1],'dist','emcc-link-record.json');
const vendorProbe=process.argv[5]==='true';
const linkMode=process.argv[2];
const hostStaticLib=process.argv[6]||null;
let hostStaticLibWasmLinkAttempt={};
try { hostStaticLibWasmLinkAttempt=JSON.parse(process.argv[7]||'{}'); } catch {}
const partialExportsDetected=
  linkMode.startsWith('partial-') || (vendorProbe && linkMode.includes('stub'));
const note = vendorProbe
  ? 'vendorWriterExportsProbe true is not production c24WriterExports; G1 remains not-run until P01–P05 on production drop.'
  : partialExportsDetected
    ? 'Partial em++ fpdf_edit link only (Emscripten pdfium-lib .a); macOS host .a is not WASM-capable.'
    : 'No production writer exports; contract stub only.';
fs.writeFileSync(out, JSON.stringify({
  recordedAt: new Date().toISOString(),
  linkMode,
  staticLib: process.argv[3] || null,
  includeDir: process.argv[4] || null,
  hostStaticLib,
  hostStaticLibWasmLinkAttempt,
  emscriptenSiblingBuildDoc: 'packages/domdoc-pdfium-wasm/build/EMSCRIPTEN_SIBLING_BUILD.md',
  c24WriterExports: false,
  vendorWriterExportsProbe: vendorProbe,
  partialExportsDetected,
  note,
}, null, 2)+'\n');
" "$ROOT" "$LINK_MODE" "${STATIC_LIB:-}" "${INCLUDE_DIR:-}" "$VENDOR_PROBE" "${HOST_STATIC_LIB:-}" "$HOST_STATIC_ATTEMPT_JSON"

echo "[emcc-link-writer] done linkMode=$LINK_MODE" >&2
