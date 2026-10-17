#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB_ROOT="$(cd "$ROOT/../.." && pwd)"
DIST="$ROOT/dist"
NATIVE="$ROOT/native/domdoc_pdfium_contract_stub.c"
mkdir -p "$DIST"

EMSENV="$WEB_ROOT/tools/emsdk/emsdk_env.sh"
if [[ -f "$EMSENV" ]]; then
  # shellcheck disable=SC1090
  source "$EMSENV" >/dev/null 2>&1
fi

if ! command -v emcc >/dev/null 2>&1; then
  echo "[build-stub-wasm] emcc missing — skip native compile" >&2
  exit 2
fi

emcc "$NATIVE" \
  -O1 \
  -s WASM=1 \
  -s EXPORTED_FUNCTIONS='["_domdoc_pdfium_contract_stub"]' \
  -s EXPORTED_RUNTIME_METHODS='[]' \
  -o "$DIST/domdoc_pdfium_contract_stub.js"

node "$ROOT/scripts/build-manifest.mjs"
