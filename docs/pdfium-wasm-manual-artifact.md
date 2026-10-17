# PDFium WASM manual artifact drop (G1-PDF-06)

Use this when a **domdoc-pdfium-wasm** Emscripten build exists locally but is not published to npm.

## Steps

1. Build or obtain a directory containing `package.json` and at least one `.wasm` module entry (see [pdfium-wasm-pin.md](./pdfium-wasm-pin.md)).
2. Either:
   - **Ingest:** `PDFIUM_WASM_ARTIFACT_DIR=/path/to/built/pkg pnpm fetch:pdfium-wasm`  
     Copies into `vendor/domdoc-pdfium-wasm/` and writes `evidence/gates/G1-feasibility/p01-p05-vendor-hooks.json`.
   - **Direct entry:** `PDFIUM_WASM_MODULE_PATH=/path/to/entry.js` (skips copy; worker/backend resolve via file URL).
3. Run `pnpm --filter @domdoc/core test pdf-writer-worker` — worker init reports `moduleLoaded` when import succeeds.
4. Gate **G1** stays **not-run** until P01–P05 native proofs pass in CI on the pinned artifact.

## Build root (optional)

```bash
export PDFIUM_WASM_BUILD_ROOT=/path/to/domdoc-pdfium-wasm
pnpm build:pdfium-wasm   # records discovered build scripts
# PDFIUM_WASM_RUN_BUILD=1 pnpm build:pdfium-wasm  # attempts bash build-wasm.sh when present
```

See [pdfium-wasm-worker-isolation.md](./pdfium-wasm-worker-isolation.md) for worker message contract.
