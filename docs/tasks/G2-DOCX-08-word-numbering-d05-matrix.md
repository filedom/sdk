# G2-DOCX-08-word-numbering-d05-matrix

```yaml
id: G2-DOCX-08
goal: Word-oriented numbering.xml level defs + external D05 reader matrix tests
requirements: [F07]
acceptance: [W-subset, D05-partial]
depends_on: [G2-DOCX-07]
write_paths:
  - packages/core/src/formats/docx/docx-numbering-ooxml-roundtrip.ts
  - packages/core/src/formats/docx/docx-numbering-d05-reader-matrix.test.ts
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test docx-numbering
  - cd domdoc-web && pnpm --filter @domdoc/core test docx-numbering-d05
deliverables: [buildWordCompatibleNumberingXml, D05 reader matrix]
status: review
```

Full Word numbering runtime **not implemented**; gate **G2** **not-run**.
