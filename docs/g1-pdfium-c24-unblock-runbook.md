# G1 PDFium C24 production WASM — unblock runbook (G1-PDF-19)

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
# G1-PDF-20 auto-detect (artifact dir, vendor drop, sibling build roots → fetch + proofs):
pnpm proof:pdfium-artifact-drop
```

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

## Do not claim

- G1 pass without independent native inspection of P01–P05 outputs
- Shared heap between `domdoc_engine` render WASM and PDFium writer WASM
