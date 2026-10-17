# G1-PDF-19-production-moduleloaded-p01-p05

```yaml
id: G1-PDF-19
goal: Production C24 domdoc-pdfium-wasm → moduleLoaded=true and native P01–P05
requirements: [F29]
acceptance: [D-subset]
depends_on: [G1-PDF-18]
write_paths:
  - vendor/domdoc-pdfium-wasm/
  - docs/g1-pdfium-c24-unblock-runbook.md
  - scripts/run-p01-p05-vendor-proofs.mjs
  - evidence/gates/G1-feasibility/pdfium-wasm-bytes-attempt.json
commands:
  - cd domdoc-web && pnpm fetch:pdfium-wasm
  - cd domdoc-web && PDFIUM_WASM_CI_WORKER=1 pnpm proof:p01-p05
deliverables: [G1 unblock runbook + productionModuleLoaded + ciWorkerGreen when proofs pass]
status: review
```

C24 production WASM **not obtained**; proofs **stub-not-run** (`moduleLoaded=false`); gate **G1 not-run**.
