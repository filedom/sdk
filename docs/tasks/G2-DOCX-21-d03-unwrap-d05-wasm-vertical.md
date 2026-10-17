# G2-DOCX-21-d03-unwrap-d05-wasm-vertical

```yaml
id: G2-DOCX-21
goal: Native w:ins/w:del unwrap plus D05 numbering into WASM flow
requirements: [F25, F26, F34]
acceptance: [W-subset]
depends_on: [G2-DOCX-20]
write_paths:
  - packages/core/src/formats/docx/review-suggestion-opc-patch-stub.ts
  - packages/core/src/formats/docx/docx-flow-projection.ts
  - packages/core/src/formats/docx/docx-flow-vertical.test.ts
  - packages/core/src/formats/docx/docx-store.test.ts
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test docx-flow-vertical
  - cd domdoc-web && pnpm --filter @domdoc/core test docx-store
deliverables: [D03 unwrap keep-inner; D01 unknown part; D13 oversized; D05 WASM marker prefix]
status: review
```

Gate **G2 not-run** (no Word/LibreOffice independent inspect).
