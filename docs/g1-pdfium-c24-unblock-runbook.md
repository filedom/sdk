# G1 PDFium C24 production WASM — unblock runbook (G1-PDF-21)

Gate **G1 not-run** until `moduleLoaded=true` and native **P01–P05** pass on the vendored artifact.

## User action: drop C24 artifact

1. Obtain or build production **`domdoc-pdfium-wasm`** at PDFium pin **C24** (`7c55203e…`, see [pdfium-wasm-pin.md](./pdfium-wasm-pin.md)).
2. Copy WASM + JS glue into **`domdoc-web/vendor/domdoc-pdfium-wasm/`** (or set **`PDFIUM_WASM_ARTIFACT_DIR`** to that directory).
3. Required files (names must match resolver expectations):
   - `domdoc_pdfium_wasm_bg.wasm` (or project-specific name documented in vendor README)
   - accompanying JS init module consumed by `resolvePdfiumWasmModule`
4. Re-run ingest and proofs:

```bash
cd domdoc-web
pnpm fetch:pdfium-wasm
PDFIUM_WASM_CI_WORKER=1 pnpm proof:p01-p05
# G1-PDF-21 auto-detect (artifact dir, module path, sibling search paths → fetch + proofs):
pnpm proof:pdfium-artifact-drop
```

Optional discovery env (when vendor drop empty):

| Variable | Purpose |
| --- | --- |
| `PDFIUM_WASM_MODULE_PATH` | JS entry; parent dir must include package.json + `.wasm` |
| `PDFIUM_WASM_SIBLING_SEARCH_PATHS` | Comma-separated build roots scanned like `PDFIUM_WASM_BUILD_ROOT` |

5. Confirm **`evidence/gates/G1-feasibility/pdfium-wasm-bytes-attempt.json`** reports:
   - `productionWasmObtained: true`
   - `moduleLoaded: true`
   - `ciWorkerGreen: true` only when **all** P01–P05 `nativeProof: pass`

## When fetch/build stays stub

| Command | Expected |
| --- | --- |
| `pnpm fetch:pdfium-wasm` | `stub-not-run` + bytes attempt updated |
| `pnpm build:pdfium-wasm` | `not-configured` without `PDFIUM_WASM_BUILD_ROOT` |
| `pnpm proof:p01-p05` | `moduleLoaded=false`, proofs **stub-not-run** |

Optional: clone/build tree via `PDFIUM_WASM_BUILD_ROOT` + `PDFIUM_WASM_RUN_BUILD=1` (local only; not CI).

## Local Emscripten (automated install)

```bash
cd domdoc-web
git clone https://github.com/emscripten-core/emsdk.git tools/emsdk
cd tools/emsdk && ./emsdk install latest && ./emsdk activate latest
source ./emsdk_env.sh
```

`pnpm ci:build-pdfium-wasm` auto-sources `tools/emsdk/emsdk_env.sh` when present (see `pdfium-wasm-ci-build-record.json`).

**Third-party prebuild:** `PDFIUM_WASM_CI_PROBE_FETCH=1 pnpm ci:build-pdfium-wasm` downloads **pdfium-lib** `wasm.zip` into **`vendor/pdfium-lib-probe/`** (gitignored) with `domdoc-probe-adapter.mjs` for **render-only** experiments via `tryLoadPdfiumLibProbeRenderNode()` — **not** C24 writer exports; do not use for G1 pass or `resolvePdfiumWasmModule`.

**C24 PDFium source attempt:** same CI worker records `evidence/gates/G1-feasibility/pdfium-c24-source-build-attempt.json` after cloning `tools/pdfium-src` (gitignored). Expect **`gn-missing`** without depot_tools; full Emscripten PDFium build is not wired in-tree.

## CI worker (automated readiness)

```bash
cd domdoc-web
pnpm ci:build-pdfium-wasm
# optional upstream size probe (non-C24, does not vend):
PDFIUM_WASM_CI_PROBE_FETCH=1 pnpm ci:build-pdfium-wasm
```

Writes `evidence/gates/G1-feasibility/pdfium-wasm-ci-build-record.json` (Emscripten presence + documented steps). Gate **G1** stays **not-run** until C24 production bytes load and P01–P05 pass.

## Do not claim

- G1 pass without independent native inspection of P01–P05 outputs
- Shared heap between `domdoc_engine` render WASM and PDFium writer WASM
