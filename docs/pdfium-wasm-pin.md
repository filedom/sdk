# PDFium WASM evaluation pin (G1-PDF-02)

Domdoc evaluates a **separate** PDFium WASM module for native PDF writing (blueprint §3, §12.3). Display engine WASM (`domdoc-wasm`) and writer WASM must not share heaps or handles.

## Licence pins (inspected reading snapshots)

| Ref | Component | Pin | Licence |
| --- | --- | --- | --- |
| C24 | PDFium sources | [`7c55203ed66b0461378323e3fcf2efaf76755241`](https://pdfium.googlesource.com/pdfium/+/7c55203ed66b0461378323e3fcf2efaf76755241/LICENSE) | BSD-style |
| C25 | pdfium-render bridge | [`ea2961cb8ac777bb1a06dddb8efd272d34d74f18`](https://github.com/ajrcarey/pdfium-render/blob/ea2961cb8ac777bb1a06dddb8efd272d34d74f18/LICENSE.md) | MIT / Apache-2.0 |

Constants: `packages/core/src/formats/pdf/pdfium-pin.ts`.

## Integration status (W1 → W2)

- **Writer adapter:** `PdfiumWasmWriterBackend` (`pdfium-wasm`) resolves an optional module spec; without a vendored artifact it returns `backend-not-configured` (same honesty as stub for native edits).
- **Feasibility proofs P01–P05:** remain **not-run** until a pinned WASM binary is loaded in CI; tests assert classification only.
- **Next:** vendored `domdoc-pdfium-wasm` build from C24 + worker isolation proof; then P01–P05 against production WASM.

Do not mix symbols from one PDFium revision with binaries from another.
