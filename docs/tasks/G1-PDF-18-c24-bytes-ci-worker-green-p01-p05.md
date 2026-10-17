# G1-PDF-18-c24-bytes-ci-worker-green-p01-p05

```yaml
id: G1-PDF-18
goal: C24 domdoc-pdfium-wasm production bytes → green PDFIUM_WASM_CI_WORKER P01–P05
requirements: [F29]
acceptance: [D-subset]
depends_on: [G1-PDF-17]
write_paths:
  - vendor/domdoc-pdfium-wasm/
  - scripts/fetch-pdfium-wasm.mjs
  - scripts/run-p01-p05-vendor-proofs.mjs
  - evidence/gates/G1-feasibility/pdfium-wasm-bytes-attempt.json
commands:
  - cd domdoc-web && pnpm fetch:pdfium-wasm
  - cd domdoc-web && PDFIUM_WASM_CI_WORKER=1 pnpm proof:p01-p05
deliverables: [bytes attempt G1-PDF-18 + ciWorkerProofStepResults from proof runner]
status: review
```

C24 production WASM **not obtained**; proofs **stub-not-run** (`moduleLoaded=false`, `ciWorkerGreen=false`); gate **G1 not-run**.
