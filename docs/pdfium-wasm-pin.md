# PDFium WASM evaluation pin (G1-PDF-02)

Domdoc evaluates a **separate** PDFium WASM module for native PDF writing (blueprint §3, §12.3). Display engine WASM (`domdoc-wasm`) and writer WASM must not share heaps or handles.

## Licence pins (inspected reading snapshots)

| Ref | Component | Pin | Licence |
| --- | --- | --- | --- |
| C24 | PDFium sources | [`7c55203ed66b0461378323e3fcf2efaf76755241`](https://pdfium.googlesource.com/pdfium/+/7c55203ed66b0461378323e3fcf2efaf76755241/LICENSE) | BSD-style |
| C25 | pdfium-render bridge | [`ea2961cb8ac777bb1a06dddb8efd272d34d74f18`](https://github.com/ajrcarey/pdfium-render/blob/ea2961cb8ac777bb1a06dddb8efd272d34d74f18/LICENSE.md) | MIT / Apache-2.0 |

Constants: `packages/core/src/formats/pdf/pdfium-pin.ts`.

## Integration status (W1 → W2)

- **Writer adapter:** `PdfiumWasmWriterBackend` (`pdfium-wasm`) resolves an optional module spec; without a vendored artifact it returns `backend-not-configured`. When a module loads but edit paths are unimplemented, preflight/apply report `partial-run-not-implemented` (tests cover both branches; gate still **not-run**).
- **Feasibility proofs P01–P05:** remain **not-run** until a pinned WASM binary is loaded in CI; tests assert classification only.
- **CI stub:** `pnpm fetch:pdfium-wasm-stub` or `pnpm fetch:pdfium-wasm` writes `evidence/gates/G1-feasibility/pdfium-wasm-fetch-stub.json` (optional `PDFIUM_WASM_ARTIFACT_DIR` for local vendoring).
- **G1 unblock (G1-PDF-19):** explicit user steps to drop C24 production bytes — [g1-pdfium-c24-unblock-runbook.md](./g1-pdfium-c24-unblock-runbook.md).

Worker isolation (separate heaps): [pdfium-wasm-worker-isolation.md](./pdfium-wasm-worker-isolation.md).

## Fetch / build path (G1-PDF-03/04, not-run in CI)

1. **Sources:** clone PDFium at C24 (`7c55203e…`) into a sibling build tree (not inside `domdoc-wasm` render crate).
2. **Emscripten / WASM:** build PDFium with domdoc-specific export list and LTO flags recorded in the future `domdoc-pdfium-wasm` repo README (worker-isolated from `domdoc_engine` heap).
3. **Bridge:** compile pdfium-render (C25) against the same C24 object files; publish vendored npm spec `domdoc-pdfium-wasm@0.0.0-not-published` → pinned semver once Origin hosting exists.
4. **Web link:** set `PDFIUM_WASM_MODULE_SPEC` resolution (package dependency or dynamic import path) and re-run P01–P05 fixtures; do **not** claim G1 pass until proofs succeed on the vendored artifact.

Do not mix symbols from one PDFium revision with binaries from another.
