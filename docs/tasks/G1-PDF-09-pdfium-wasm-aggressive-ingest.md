# G1-PDF-09-pdfium-wasm-aggressive-ingest

```yaml
id: G1-PDF-09
goal: Aggressive PDFium WASM obtain path (URL, build-root/sibling discovery, optional non-production stub); proof:p01-p05 when real module loads
requirements: [F29]
acceptance: [D-subset]
depends_on: [G1-PDF-08]
write_paths:
  - scripts/fetch-pdfium-wasm.mjs
  - scripts/build-pdfium-wasm.mjs
  - packages/core/src/formats/pdf/backends/pdfium-wasm-backend.ts
  - evidence/gates/G1-feasibility/pdfium-wasm-fetch-stub.json
commands:
  - cd domdoc-web && pnpm build:pdfium-wasm
  - cd domdoc-web && pnpm fetch:pdfium-wasm
  - cd domdoc-web && PDFIUM_WASM_CI_WORKER=1 pnpm proof:p01-p05
deliverables: [sibling build-root discovery, C24 pin in records, non-production stub gated by env]
status: review
```

C24 **domdoc-pdfium-wasm** binary **not published**; native P01–P05 proofs **not-run**; gate **G1** **not-run**.
