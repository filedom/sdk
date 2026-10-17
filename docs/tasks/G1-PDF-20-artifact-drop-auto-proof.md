# G1-PDF-20-artifact-drop-auto-proof

```yaml
id: G1-PDF-20
goal: Auto-detect PDFium WASM drop path and run P01–P05 proofs
requirements: [F29]
acceptance: [D-subset]
depends_on: [G1-PDF-19]
write_paths:
  - scripts/proof-pdfium-artifact-drop.mjs
  - evidence/gates/G1-feasibility/pdfium-wasm-artifact-drop-path.json
commands:
  - cd domdoc-web && pnpm proof:pdfium-artifact-drop
  - cd domdoc-web && PDFIUM_WASM_ARTIFACT_DIR=… pnpm proof:pdfium-artifact-drop
deliverables: [artifact auto-detect + fetch + proof chain; env vars documented when missing]
status: review
```

C24 production WASM **not obtained** on CI; gate **G1 not-run**.
