#!/usr/bin/env bash
# Optional: when PDFium static libs exist under gclient out/, extend this script to link
# domdoc writer glue. Default path remains build-stub-wasm.sh for CI bounded builds.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TREE="${PDFIUM_GCLIENT_TREE:-}"
if [[ -z "$TREE" || ! -f "$TREE/BUILD.gn" ]]; then
  echo "[build-from-gclient] PDFIUM_GCLIENT_TREE unset or missing BUILD.gn — fallback stub" >&2
  exec "$ROOT/scripts/build-stub-wasm.sh"
fi
echo "[build-from-gclient] no in-tree domdoc GN target yet at $TREE — stub only" >&2
exec "$ROOT/scripts/build-stub-wasm.sh"
