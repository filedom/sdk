# G1-PDF-11-vendored-c24-pdfium-wasm

```yaml
id: G1-PDF-11
goal: Vendored C24 domdoc-pdfium-wasm production bytes when any fetch/build path succeeds
requirements: [F29]
acceptance: [D-subset]
depends_on: [G1-PDF-10]
write_paths:
  - scripts/fetch-pdfium-wasm.mjs
  - vendor/domdoc-pdfium-wasm/
  - evidence/gates/G1-feasibility/pdfium-wasm-fetch-stub.json
commands:
  - cd domdoc-web && pnpm fetch:pdfium-wasm
  - cd domdoc-web && PDFIUM_WASM_CI_WORKER=1 pnpm proof:p01-p05
deliverables: [vendor ingest when artifact found, green worker proofs only with real module]
status: review
```

C24 production WASM **not vendored** in this workspace; P01–P05 proofs **stub-not-run**; gate **G1** **not-run**.
