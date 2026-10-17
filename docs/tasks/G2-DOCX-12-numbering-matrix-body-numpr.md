# G2-DOCX-12-numbering-matrix-body-numpr

```yaml
id: G2-DOCX-12
goal: D05 writer matrix + body w:numPr write-back with numbering.xml OPC
requirements: [F07]
acceptance: [D05-subset]
depends_on: [G2-DOCX-11]
write_paths:
  - packages/core/src/formats/docx/docx-numbering-body-writeback.ts
  - packages/core/src/formats/docx/docx-numbering-d05-writer-matrix.test.ts
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test docx-numbering-d05-writer
deliverables: [applyDocxNumberingWriteBackFromSession, D05 writer matrix]
status: review
```

Word-complete numbering **not claimed**; gate **G2 not-run**.
