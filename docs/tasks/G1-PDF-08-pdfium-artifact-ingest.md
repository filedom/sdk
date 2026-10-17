# G1-PDF-08-pdfium-artifact-ingest

```yaml
id: G1-PDF-08
goal: Attempt PDFium WASM artifact ingest (local dir, optional URL, build-root discovery); run proof:p01-p05 when vendored
requirements: [F29]
acceptance: [D-subset]
depends_on: [G1-PDF-07]
write_paths:
  - scripts/fetch-pdfium-wasm.mjs
  - scripts/build-pdfium-wasm.mjs
  - evidence/gates/G1-feasibility/pdfium-wasm-fetch-stub.json
commands:
  - cd domdoc-web && pnpm build:pdfium-wasm
  - cd domdoc-web && pnpm fetch:pdfium-wasm
  - cd domdoc-web && PDFIUM_WASM_CI_WORKER=1 pnpm proof:p01-p05
deliverables: [PDFIUM_WASM_ARTIFACT_URL ingest attempt, honest fetch stub record]
status: review
```

C24 binary **not published**; native P01–P05 proofs **not-run**; gate **G1** **not-run**.
