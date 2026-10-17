# domdoc-pdfium-wasm (C24 contract package)

In-repo **G1 C24 contract scaffold** for the PDFium writer WASM module. Production bytes are copied to `vendor/domdoc-pdfium-wasm/` after build (CI worker or manual drop).

## Pin

PDFium source commit: `7c55203ed66b0461378323e3fcf2efaf76755241` (C24).

## Writer export surface

The vendored default export must match `packages/core/src/formats/pdf/pdfium-native-api.ts` (`DomdocPdfiumApi`).

P01–P05 classification (web-owned, pre-native) is in `packages/core/src/formats/pdf/pdfium-proof-hooks.ts`:

| Fixture | Operation mapping |
| --- | --- |
| P01 | replace whole text run |
| P02 | partial run insert/delete |
| P03 | multi-run kerning replace |
| P04 | delete native text object |
| P05 | image replace and page reorder |

Native proofs run only when `writerExportsReady=true` (default export is an async factory returning `DomdocPdfiumApi`, with `c24WriterExports !== false`).

## Build paths

| Path | Role |
| --- | --- |
| `scripts/build-stub-wasm.sh` | Minimal Emscripten stub (`emcc`) — compiles without gclient PDFium link |
| `scripts/build-from-gclient.sh` | Optional glue when `PDFIUM_GCLIENT_TREE` points at `tools/pdfium-checkout/pdfium` |
| `pnpm ci:build-pdfium-wasm` | Records gclient gn/ninja smoke + may invoke stub build and copy to `vendor/` |

Scaffold artifact sets `c24WriterExports: false` — **not** G1 pass. Probe adapter fallback in `packages/domdoc-pdfium-wasm-probe-adapter/` is unchanged.

## Local stub build

```bash
source domdoc-web/tools/emsdk/emsdk_env.sh
cd domdoc-web/packages/domdoc-pdfium-wasm
./scripts/build-stub-wasm.sh
```
