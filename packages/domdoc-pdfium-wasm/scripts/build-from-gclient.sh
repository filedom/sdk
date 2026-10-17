#!/usr/bin/env bash
# G1 emscripten writer path: optional gclient host ninja discovery + emcc glue link.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TREE="${PDFIUM_GCLIENT_TREE:-${PDFIUM_GCLIENT_ROOT:-}}"

if [[ -z "$TREE" ]]; then
  WEB_ROOT="$(cd "$ROOT/../.." && pwd)"
  for candidate in \
    "$WEB_ROOT/tools/pdfium-checkout/pdfium" \
    "$WEB_ROOT/tools/pdfium-checkout/src/pdfium" \
    "$WEB_ROOT/tools/pdfium-src/pdfium"; do
    if [[ -f "$candidate/BUILD.gn" ]]; then
      TREE="$candidate"
      break
    fi
  done
fi

export PDFIUM_GCLIENT_TREE="${TREE:-}"
if [[ -n "${PDFIUM_GCLIENT_TREE:-}" && -f "$PDFIUM_GCLIENT_TREE/BUILD.gn" ]]; then
  bash "$ROOT/build/attempt-gclient-host-ninja.sh" || true
fi

exec bash "$ROOT/build/emcc-link-writer.sh"
