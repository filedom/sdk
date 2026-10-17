# G1-PDF-21-artifact-drop-auto-proof-hardening

```yaml
id: G1-PDF-21
goal: Harden artifact-drop auto proof (module path + sibling search paths)
requirements: [F29]
acceptance: [D-subset]
depends_on: [G1-PDF-20]
write_paths:
  - scripts/proof-pdfium-artifact-drop.mjs
commands:
  - cd domdoc-web && pnpm proof:pdfium-artifact-drop
deliverables: [PDFIUM_WASM_MODULE_PATH + PDFIUM_WASM_SIBLING_SEARCH_PATHS discovery; auto proof when bytes present]
status: review
```

C24 production WASM **not obtained** on CI; gate **G1 not-run**.
