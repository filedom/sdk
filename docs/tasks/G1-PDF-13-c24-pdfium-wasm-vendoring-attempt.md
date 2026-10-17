# G1-PDF-13-c24-pdfium-wasm-vendoring-attempt

```yaml
id: G1-PDF-13
goal: C24 domdoc-pdfium-wasm vendoring attempt; run P01–P05 when module loads
requirements: [F29]
acceptance: [D-subset]
depends_on: [G1-PDF-12]
write_paths:
  - vendor/domdoc-pdfium-wasm/
  - scripts/fetch-pdfium-wasm.mjs
  - evidence/gates/G1-feasibility/pdfium-wasm-vendoring-attempt.json
commands:
  - cd domdoc-web && pnpm fetch:pdfium-wasm
  - cd domdoc-web && pnpm build:pdfium-wasm
  - cd domdoc-web && PDFIUM_WASM_CI_WORKER=1 pnpm proof:p01-p05
deliverables: [vendoring attempt record, worker proofs when bytes present]
status: review
```

C24 production WASM **not obtained**; proofs **stub-not-run** (`moduleLoaded=false`); gate **G1 not-run**.
