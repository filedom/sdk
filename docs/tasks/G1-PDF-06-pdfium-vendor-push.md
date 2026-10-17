# G1-PDF-06-pdfium-vendor-push

```yaml
id: G1-PDF-06
goal: Push PDFium vendoring paths — build script discovery, manual artifact drop, worker load when PDFIUM_WASM_ARTIFACT_DIR set; extend P01–P05 evidence
requirements: [F29]
acceptance: [D-subset]
depends_on: [G1-PDF-05]
write_paths:
  - scripts/build-pdfium-wasm.mjs
  - scripts/fetch-pdfium-wasm.mjs
  - packages/core/src/formats/pdf/pdfium-module-resolve.ts
  - docs/pdfium-wasm-manual-artifact.md
  - evidence/gates/G1-feasibility/**
commands:
  - cd domdoc-web && pnpm build:pdfium-wasm
  - cd domdoc-web && pnpm fetch:pdfium-wasm
  - cd domdoc-web && pnpm --filter @domdoc/core test pdfium
deliverables: [resolvePdfiumWasmModule, p01-p05-vendor-hooks.json on ingest]
status: review
```

C24 binary **not vendored**; gate **G1** **not-run** until P01–P05 native proofs on artifact.
