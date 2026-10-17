# G1-PDF-10-pdfium-wasm-exhaustive-discovery

```yaml
id: G1-PDF-10
goal: Production C24 PDFium WASM bytes — exhaustive fetch/build discovery (siblings, env vars, documented URLs)
requirements: [F29]
acceptance: [D-subset]
depends_on: [G1-PDF-09]
write_paths:
  - scripts/fetch-pdfium-wasm.mjs
  - scripts/build-pdfium-wasm.mjs
  - evidence/gates/G1-feasibility/pdfium-wasm-discovery-record.json
commands:
  - cd domdoc-web && pnpm build:pdfium-wasm
  - cd domdoc-web && pnpm fetch:pdfium-wasm
  - cd domdoc-web && PDFIUM_WASM_CI_WORKER=1 pnpm proof:p01-p05
deliverables: [pdfium-wasm-discovery-record.json, expanded sibling/env URL scan]
status: review
```

C24 **domdoc-pdfium-wasm** production bytes **not obtained** in CI; native P01–P05 proofs **not-run**; gate **G1** **not-run**.
