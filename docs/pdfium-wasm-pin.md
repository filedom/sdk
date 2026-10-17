# PDFium WASM evaluation pin (G1-PDF-02)

Domdoc evaluates a **separate** PDFium WASM module for native PDF writing (blueprint §3, §12.3). Display engine WASM (`domdoc-wasm`) and writer WASM must not share heaps or handles.

## Licence pins (inspected reading snapshots)

| Ref | Component | Pin | Licence |
| --- | --- | --- | --- |
| C24 | PDFium sources | [`7c55203ed66b0461378323e3fcf2efaf76755241`](https://pdfium.googlesource.com/pdfium/+/7c55203ed66b0461378323e3fcf2efaf76755241/LICENSE) | BSD-style |
| C25 | pdfium-render bridge | [`ea2961cb8ac777bb1a06dddb8efd272d34d74f18`](https://github.com/ajrcarey/pdfium-render/blob/ea2961cb8ac777bb1a06dddb8efd272d34d74f18/LICENSE.md) | MIT / Apache-2.0 |
| C12 | pdf-lib overlay helpers | [`93dd36e85aa659a3bca09867d2d8fac172501fbe`](https://github.com/Hopding/pdf-lib/blob/93dd36e85aa659a3bca09867d2d8fac172501fbe/LICENSE.md) | MIT |

Constants: `packages/core/src/formats/pdf/pdfium-pin.ts`.

## G1 path decision (2026-10-17)

| Track | Role | Status |
| --- | --- | --- |
| **A — C24 domdoc-pdfium-wasm writer** | Production `DomdocPdfiumApi` + P01–P05 native proofs | **Blocked upstream:** Chromium PDFium `gclient` checkout succeeds for desktop `gn gen`, but `target_os="wasm"` fails with `Unsupported target_os: wasm` (see `pdfium-c24-gclient-checkout-attempt.json`). In-repo **emcc contract stub** only (`writerExportsReady=false`). |
| **B — pdfium-lib prebuild probe** | Render-only WASM experiments (`PDFIUM_WASM_CI_PROBE_FETCH=1`) | **Automated** in CI; vendored probe adapter; **not** C24 writer; no G1 pass. |
| **C — pdfium-render (C25)** | Future display bridge / Rust-side bind to same C24 object files | **Documented pin**; optional `domdoc-wasm` feature `pdfium-display-bridge-stub` records boundary only (no PDFium link in render crate). |
| **D — @domdoc/pdfium-bridge** | Web display-first re-export of probe render + page bitmap worker hooks | **Implemented** (`packages/domdoc-pdfium-bridge/`). |
| **E — pdf-lib (C12)** | Overlay/page helpers for non–gate-pass drawing demos | **Implemented** (`pdf-lib-overlay-helpers.ts`); explicitly `gatePass: false`. |

Evidence: `evidence/gates/G1-feasibility/g1-pdfium-wasm-path-decision.json`.

Native P01–P05 without C24 writer bytes report **`nativeProof: blocked`** with  
`blockedReason: pdfium-wasm-target-unsupported-in-upstream-gn` (classification test double + `pnpm proof:p01-p05`). **Not a fake pass.**

## Integration status (W1 → W2)

- **Writer adapter:** `PdfiumWasmWriterBackend` (`pdfium-wasm`) resolves an optional module spec; without a vendored artifact it returns `backend-not-configured`. When a module loads but edit paths are unimplemented, preflight/apply report `partial-run-not-implemented` (tests cover both branches; gate still **not-run**).
- **Feasibility proofs P01–P05:** **blocked** or **not-run** until C24 writer WASM loads; CI runs **classification hooks** with `DomdocPdfiumApi` test double when writer exports absent.
- **CI stub:** `pnpm fetch:pdfium-wasm-stub` or `pnpm fetch:pdfium-wasm` writes `evidence/gates/G1-feasibility/pdfium-wasm-fetch-stub.json` (optional `PDFIUM_WASM_ARTIFACT_DIR` for local vendoring).
- **G1 unblock (G1-PDF-19):** explicit user steps to drop C24 production bytes — [g1-pdfium-c24-unblock-runbook.md](./g1-pdfium-c24-unblock-runbook.md).

Worker isolation (separate heaps): [pdfium-wasm-worker-isolation.md](./pdfium-wasm-worker-isolation.md).

## Fetch / build path (G1-PDF-03/04, not-run in CI)

1. **Sources:** clone PDFium at C24 (`7c55203e…`) into a sibling build tree (not inside `domdoc-wasm` render crate).
2. **Emscripten / WASM:** build PDFium with domdoc-specific export list and LTO flags recorded in the future `domdoc-pdfium-wasm` repo README (worker-isolated from `domdoc_engine` heap). **Do not rely on upstream `target_os=wasm` gn** until a custom GN/emscripten toolchain is wired (pdfium-lib / bespoke domdoc GN).
3. **Bridge:** compile pdfium-render (C25) against the same C24 object files for **display** experiments; writer remains domdoc-owned export list.
4. **Web link:** set `PDFIUM_WASM_MODULE_SPEC` resolution (package dependency or dynamic import path) and re-run P01–P05 fixtures; do **not** claim G1 pass until proofs succeed on the vendored artifact.

Do not mix symbols from one PDFium revision with binaries from another.
