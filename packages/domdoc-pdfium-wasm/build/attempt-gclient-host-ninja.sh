#!/usr/bin/env bash
# Bounded host `ninja pdfium` attempt under PDFIUM_GCLIENT_TREE — records linkable artifact paths.
set -euo pipefail
unset DOMDOC_NINJA_STATUS DOMDOC_NINJA_SKIP_REASON || true
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB_ROOT="$(cd "$ROOT/../.." && pwd)"
EVIDENCE="$WEB_ROOT/evidence/gates/G1-feasibility/g1-emscripten-gclient-host-ninja-attempt.json"
TREE="${PDFIUM_GCLIENT_TREE:-}"
TIMEOUT_SEC="${PDFIUM_GCLIENT_NINJA_TIMEOUT_SEC:-120}"
LOCAL_DEPOT_TOOLS="$WEB_ROOT/tools/depot_tools"

mkdir -p "$(dirname "$EVIDENCE")"

if [[ -d "$LOCAL_DEPOT_TOOLS" ]]; then
  export PATH="$LOCAL_DEPOT_TOOLS:$PATH"
fi

write_evidence() {
  node -e '
const fs = require("fs");
const out = process.argv[1];
const payload = {
  recordedAt: new Date().toISOString(),
  status: process.env.DOMDOC_NINJA_STATUS ?? "skipped",
  pdfiumGclientTree: process.env.DOMDOC_GCLIENT_TREE || null,
  outDir: process.env.DOMDOC_GCLIENT_OUT || null,
  gnExit: Number(process.env.DOMDOC_GN_EXIT ?? "-1"),
  ninjaExit: Number(process.env.DOMDOC_NINJA_EXIT ?? "-1"),
  ninjaTimeoutSec: Number(process.env.DOMDOC_NINJA_TIMEOUT ?? "120"),
  hostStaticLibs: (process.env.DOMDOC_HOST_LIBS ?? "").split("\n").filter(Boolean),
  primaryHostStaticLib: process.env.DOMDOC_PRIMARY_LIB || null,
  hostPdfiumLinkableFound: process.env.DOMDOC_HOST_PDFIUM_LINKABLE === "true",
  hostArchiveSearchRoots: (process.env.DOMDOC_HOST_SEARCH_ROOTS ?? "").split("\n").filter(Boolean),
  hostDependencyArchiveSample: (process.env.DOMDOC_HOST_DEP_SAMPLE ?? "").split("\n").filter(Boolean),
  hostDependencyArchiveCount: Number(process.env.DOMDOC_HOST_DEP_COUNT ?? "0"),
  gnLogTail: process.env.DOMDOC_GN_LOG ?? null,
  ninjaLogTail: process.env.DOMDOC_NINJA_LOG ?? null,
  reason: process.env.DOMDOC_NINJA_SKIP_REASON ?? null,
  note: "Host ninja pdfium for artifact discovery only; production writer uses pdfium-lib Emscripten static lib (build/LINK_PLAN.md).",
};
fs.writeFileSync(out, JSON.stringify(payload, null, 2) + "\n");
' "$EVIDENCE"
}

if [[ -z "$TREE" || ! -f "$TREE/BUILD.gn" ]]; then
  export DOMDOC_NINJA_STATUS="skipped"
  export DOMDOC_GCLIENT_TREE=""
  export DOMDOC_HOST_LIBS=""
  export DOMDOC_NINJA_SKIP_REASON="PDFIUM_GCLIENT_TREE unset or missing BUILD.gn in local checkout"
  write_evidence
  echo "[attempt-gclient-host-ninja] skipped — no gclient tree" >&2
  exit 0
fi

OUT="${PDFIUM_GCLIENT_OUT_DIR:-$TREE/out/Release}"
mkdir -p "$OUT"
GN_ARGS="${PDFIUM_GCLIENT_GN_ARGS:-is_debug=false pdf_enable_v8=false pdf_enable_xfa=false}"

GN_EXIT=127
NINJA_EXIT=127
GN_LOG=""
NINJA_LOG=""
HOST_LIBS=""
PRIMARY_LIB=""

if command -v gn >/dev/null 2>&1; then
  set +e
  GN_LOG="$(cd "$TREE" && gn gen "$OUT" --args="$GN_ARGS" 2>&1)"
  GN_EXIT=$?
  set -e
else
  GN_LOG="gn not found on PATH (expected domdoc-web/tools/depot_tools or system install)"
  GN_EXIT=127
fi

if [[ $GN_EXIT -eq 0 ]] && command -v ninja >/dev/null 2>&1; then
  set +e
  if command -v timeout >/dev/null 2>&1; then
    NINJA_LOG="$(timeout "$TIMEOUT_SEC" ninja -C "$OUT" pdfium 2>&1)"
  else
    NINJA_LOG="$(ninja -C "$OUT" pdfium 2>&1)"
  fi
  NINJA_EXIT=$?
  set -e
fi

SEARCH_ROOTS=("$TREE/out")
if [[ -d "$OUT" ]]; then
  SEARCH_ROOTS=("$OUT" "$TREE/out")
fi
HOST_DEP_COUNT=0
HOST_DEP_SAMPLE=""
while IFS= read -r line; do
  HOST_DEP_COUNT=$((HOST_DEP_COUNT + 1))
  if [[ $HOST_DEP_COUNT -le 8 ]]; then
    HOST_DEP_SAMPLE="${HOST_DEP_SAMPLE}${line}"$'\n'
  fi
done < <(
  for root in "${SEARCH_ROOTS[@]}"; do
    find "$root" -type f \( -name '*.a' -o -name '*.dylib' -o -name '*.so' \) 2>/dev/null
  done | sort -u
)

while IFS= read -r line; do
  HOST_LIBS="${HOST_LIBS}${line}"$'\n'
  if [[ -z "$PRIMARY_LIB" ]]; then
    PRIMARY_LIB="$line"
  fi
done < <(
  for root in "${SEARCH_ROOTS[@]}"; do
    find "$root" -type f \( \
      -name 'libpdfium.a' -o -name 'libpdfium.so' -o -name 'libpdfium.dylib' -o \
      -path '*/obj/libpdfium.a' -o -path '*/Release/obj/libpdfium.a' \
    \) 2>/dev/null
  done | sort -u | head -20
)

if [[ $NINJA_EXIT -eq 0 ]]; then
  DOMDOC_NINJA_STATUS="host-ninja-pdfium-ok"
elif [[ $GN_EXIT -eq 0 ]]; then
  DOMDOC_NINJA_STATUS="host-ninja-pdfium-failed-or-timed-out"
else
  DOMDOC_NINJA_STATUS="host-gn-gen-failed"
fi

export DOMDOC_GCLIENT_TREE="$TREE"
export DOMDOC_GCLIENT_OUT="$OUT"
export DOMDOC_GN_EXIT="$GN_EXIT"
export DOMDOC_NINJA_EXIT="$NINJA_EXIT"
export DOMDOC_NINJA_TIMEOUT="$TIMEOUT_SEC"
export DOMDOC_HOST_LIBS="$HOST_LIBS"
export DOMDOC_PRIMARY_LIB="${PRIMARY_LIB:-}"
export DOMDOC_HOST_PDFIUM_LINKABLE="$([[ -n "${PRIMARY_LIB:-}" ]] && echo true || echo false)"
export DOMDOC_HOST_SEARCH_ROOTS="$(printf '%s\n' "${SEARCH_ROOTS[@]}")"
export DOMDOC_HOST_DEP_SAMPLE="$HOST_DEP_SAMPLE"
export DOMDOC_HOST_DEP_COUNT="$HOST_DEP_COUNT"
export DOMDOC_GN_LOG="${GN_LOG: -800}"
export DOMDOC_NINJA_LOG="${NINJA_LOG: -800}"
export DOMDOC_NINJA_STATUS="$DOMDOC_NINJA_STATUS"

write_evidence
echo "[attempt-gclient-host-ninja] status=$DOMDOC_NINJA_STATUS primary=${PRIMARY_LIB:-none}" >&2
if [[ -n "$PRIMARY_LIB" ]]; then
  export PDFIUM_HOST_STATIC_LIB="$PRIMARY_LIB"
fi
