# domdoc-pdfium-wasm probe adapter (non-C24)

Render-only bridge from **pdfium-lib** probe bytes under `vendor/pdfium-lib-probe/`.
Materialized into gitignored `vendor/domdoc-pdfium-wasm/` by `pnpm ci:build-pdfium-wasm`
when `PDFIUM_WASM_CI_PROBE_FETCH=1`.

- **Not** a C24 writer build — `c24WriterExports: false`
- `tryLoadPdfiumWasmModule` may report `loaded: true` for load-path tests
- G1 **P01–P05** stay **not-run** until real domdoc-pdfium-wasm writer exports exist
