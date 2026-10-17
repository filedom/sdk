# G1-PDF-04-pdfium-worker-integration

```yaml
id: G1-PDF-04
goal: Real PDFium WASM integration path — worker isolation design, fetch/build improvements, P01–P05 backend hooks when binary available
requirements: [F29]
acceptance: [D-subset]
depends_on: [G1-PDF-03]
base_pair: { wasm_commit: ee8ddb0c1173e9f97d13c618bca8fde376343d04, web_commit: TBD }
contract_hash: d37ee9aabf1f9468851ed78961716531ed86d616faf80232f1db31998eb9b2a3
write_paths:
  - docs/pdfium-wasm-worker-isolation.md
  - docs/pdfium-wasm-pin.md
  - scripts/fetch-pdfium-wasm.mjs
  - packages/core/src/formats/pdf/pdfium-proof-hooks.ts
  - packages/core/src/formats/pdf/backends/pdfium-wasm-backend.ts
  - evidence/gates/G1-feasibility/**
forbidden_paths:
  - domdoc-wasm/**
fixtures: [P01-P05-classification-not-run]
commands:
  - cd domdoc-web && pnpm fetch:pdfium-wasm
  - cd domdoc-web && pnpm --filter @domdoc/core test src/formats/pdf
deliverables: [worker isolation doc, fetch script with PDFIUM_WASM_ARTIFACT_DIR, proof classification hooks]
status: review
```

C24 PDFium WASM binary **not vendored in this session**; gate **G1** remains **not-run** until P01–P05 pass on the artifact in CI.
