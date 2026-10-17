# G2-DOCX-10-word-numbering-restart-indents

```yaml
id: G2-DOCX-10
goal: Word numbering restart, indents, abstract-num list chains (runtime markers)
requirements: [F07]
acceptance: [W-subset, D05]
depends_on: [G2-DOCX-09]
write_paths:
  - packages/core/src/formats/docx/docx-numbering-runtime.ts
  - packages/core/src/formats/docx/docx-numbering-runtime.test.ts
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test docx-numbering-runtime
deliverables: [lvlRestart counter reset, w:ind prefix, multi-paragraph chains]
status: review
```

Full Word numbering compat **not implemented**; gate **G2** **not-run**.
