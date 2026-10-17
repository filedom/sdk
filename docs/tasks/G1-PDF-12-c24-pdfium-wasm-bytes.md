# G1-PDF-12-c24-pdfium-wasm-bytes

```yaml
id: G1-PDF-12
goal: Obtain C24 domdoc-pdfium-wasm production bytes; green PDFIUM_WASM_CI_WORKER P01–P05 when possible
requirements: [F29]
acceptance: [D-subset]
depends_on: [G1-PDF-11]
write_paths:
  - vendor/domdoc-pdfium-wasm/
  - scripts/fetch-pdfium-wasm.mjs
  - evidence/gates/G1-feasibility/pdfium-wasm-fetch-stub.json
commands:
  - cd domdoc-web && pnpm fetch:pdfium-wasm
  - cd domdoc-web && PDFIUM_WASM_CI_WORKER=1 pnpm proof:p01-p05
deliverables: [vendored WASM module, worker proofs green when bytes present]
status: review
```

C24 production WASM **not obtained** in this workspace; proofs remain **stub-not-run**; gate **G1 not-run**.
