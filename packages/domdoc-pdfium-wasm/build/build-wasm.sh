#!/usr/bin/env bash
# In-repo skeleton: pdfium-lib fetch (sibling) + partial emcc link — not a G1 pass claim.
# Full production drop: ../domdoc-pdfium-wasm/build-wasm.sh (see EMSCRIPTEN_SIBLING_BUILD.md).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB_ROOT="$(cd "$ROOT/../.." && pwd)"
SIBLING_PDFIUM="$WEB_ROOT/../domdoc-pdfium-wasm"
SIBLING_BUILD="$SIBLING_PDFIUM/build-wasm.sh"
EVIDENCE_DIR="$WEB_ROOT/evidence/gates/G1-feasibility"
EVIDENCE_JSON="$EVIDENCE_DIR/g1-in-repo-build-wasm-skeleton-attempt.json"
PDFIUM_GIT_REVISION="${PDFIUM_GIT_REVISION:-7c55203ed66b0461378323e3fcf2efaf76755241}"

mkdir -p "$EVIDENCE_DIR"

record_evidence() {
  local phase="$1"
  local result="$2"
  local note="$3"
  node -e "
const fs=require('fs');
const out=process.argv[1];
const body={
  recordedAt: new Date().toISOString(),
  script: 'packages/domdoc-pdfium-wasm/build/build-wasm.sh',
  phase: process.argv[2],
  result: process.argv[3],
  pdfiumGitRevision: process.argv[4],
  siblingBuildScript: process.argv[5],
  emccLinkScript: 'packages/domdoc-pdfium-wasm/build/emcc-link-writer.sh',
  c24WriterExports: false,
  note: process.argv[6],
};
fs.writeFileSync(out, JSON.stringify(body, null, 2)+'\n');
" "$EVIDENCE_JSON" "$phase" "$result" "$PDFIUM_GIT_REVISION" "$SIBLING_BUILD" "$note"
}

echo "[build-wasm.sh] domdoc-web in-repo skeleton (no G1 pass claim)" >&2

if [[ -x "$SIBLING_BUILD" ]]; then
  echo "[build-wasm.sh] delegating to sibling $SIBLING_BUILD" >&2
  set +e
  (cd "$SIBLING_PDFIUM" && PDFIUM_GIT_REVISION="$PDFIUM_GIT_REVISION" ./build-wasm.sh)
  SIBLING_EXIT=$?
  set -e
  if [[ $SIBLING_EXIT -ne 0 ]]; then
    record_evidence "sibling-build-wasm" "failed-exit-$SIBLING_EXIT" \
      "Sibling build-wasm.sh failed; partial emcc link may still run in-repo."
  else
    record_evidence "sibling-build-wasm" "ok" \
      "Sibling dist produced; ingest via pnpm fetch:pdfium-wasm before P01–P05."
  fi
else
  echo "[build-wasm.sh] sibling script missing — skip pdfium-lib fetch/build" >&2
  record_evidence "sibling-build-wasm" "skipped-missing-sibling" \
    "Clone/build ../domdoc-pdfium-wasm or run pdfium-lib make.py build-wasm locally."
fi

set +e
bash "$ROOT/build/emcc-link-writer.sh"
EMCC_EXIT=$?
set -e

LINK_MODE="unknown"
if [[ -f "$ROOT/dist/emcc-link-record.json" ]]; then
  LINK_MODE="$(node -e "const j=require(process.argv[1]); process.stdout.write(j.linkMode||'unknown')" "$ROOT/dist/emcc-link-record.json")"
fi

if [[ $EMCC_EXIT -eq 0 || $EMCC_EXIT -eq 2 ]]; then
  record_evidence "emcc-partial-link" "$LINK_MODE" \
    "Partial fpdf_edit link recorded in dist/emcc-link-record.json; c24WriterExports remains false."
else
  record_evidence "emcc-partial-link" "failed-exit-$EMCC_EXIT" \
    "emcc-link-writer.sh failed; see stderr."
  exit "$EMCC_EXIT"
fi

echo "[build-wasm.sh] evidence → $EVIDENCE_JSON linkMode=$LINK_MODE" >&2
