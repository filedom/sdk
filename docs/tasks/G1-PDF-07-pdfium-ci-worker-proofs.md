# G1-PDF-07-pdfium-ci-worker-proofs

```yaml
id: G1-PDF-07
goal: Best-effort vendored PDFium WASM + CI worker path; run P01–P05 hook runner when artifact present; evidence JSON updates
requirements: [F29]
acceptance: [D-subset]
depends_on: [G1-PDF-06]
write_paths:
  - scripts/run-p01-p05-vendor-proofs.mjs
  - packages/core/src/formats/pdf/pdfium-p01-p05-runner.ts
  - evidence/gates/G1-feasibility/p01-p05-vendor-proofs.json
commands:
  - cd domdoc-web && pnpm fetch:pdfium-wasm
  - cd domdoc-web && PDFIUM_WASM_CI_WORKER=1 pnpm proof:p01-p05
  - cd domdoc-web && pnpm --filter @domdoc/core test pdfium-p01-p05
deliverables: [collectP01P05VendorProofEvidence, worker CI path when PDFIUM_WASM_CI_WORKER=1]
status: review
```

C24 binary **not vendored** in repo; native P01–P05 proofs **not-run**; gate **G1** **not-run**.
