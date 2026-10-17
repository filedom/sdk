# G1-PDF-17-c24-bytes-ci-worker-p01-p05

```yaml
id: G1-PDF-17
goal: C24 domdoc-pdfium-wasm production bytes + green PDFIUM_WASM_CI_WORKER P01–P05
requirements: [F29]
acceptance: [D-subset]
depends_on: [G1-PDF-16]
write_paths:
  - vendor/domdoc-pdfium-wasm/
  - scripts/fetch-pdfium-wasm.mjs
  - evidence/gates/G1-feasibility/pdfium-wasm-bytes-attempt.json
commands:
  - cd domdoc-web && pnpm fetch:pdfium-wasm
  - cd domdoc-web && PDFIUM_WASM_CI_WORKER=1 pnpm proof:p01-p05
deliverables: [bytes attempt card bump + ciWorkerProofSteps P01–P05; worker proofs when module loads]
status: review
```

C24 production WASM **not obtained**; proofs **stub-not-run** (`moduleLoaded=false`); gate **G1 not-run**.
