# G1-PDF-05-pdfium-worker-vendored-path

```yaml
id: G1-PDF-05
goal: PDF writer worker module + vendored PDFium path scripts (PDFIUM_WASM_ARTIFACT_DIR, build record); P01–P05 when artifact obtainable
requirements: [F29]
acceptance: [D-subset]
depends_on: [G1-PDF-04]
base_pair: { wasm_commit: 230369647ff0d78c9b48e7287134c1947b755693, web_commit: TBD }
contract_hash: d37ee9aabf1f9468851ed78961716531ed86d616faf80232f1db31998eb9b2a3
write_paths:
  - scripts/fetch-pdfium-wasm.mjs
  - scripts/build-pdfium-wasm.mjs
  - packages/core/src/formats/pdf/pdf-writer-worker.ts
  - packages/core/src/formats/pdf/pdf-writer-worker-client.ts
  - evidence/gates/G1-feasibility/**
forbidden_paths:
  - domdoc-wasm/**
fixtures: [P01-P05-classification-not-run]
commands:
  - cd domdoc-web && pnpm build:pdfium-wasm
  - cd domdoc-web && pnpm fetch:pdfium-wasm
  - cd domdoc-web && pnpm --filter @domdoc/core test pdf-writer-worker
deliverables: [writer worker thread, fetch SHA ingest, build record JSON]
status: review
```

C24 PDFium WASM binary **not vendored in this session**; gate **G1** remains **not-run** until P01–P05 pass on the artifact in CI.
