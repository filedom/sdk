# G2-DOCX-15-d05-restart-indents-expansion

```yaml
id: G2-DOCX-15
goal: Word numbering restart + indents on expanded D05 document round-trip corpus
requirements: [F07]
acceptance: [D05-subset]
depends_on: [G2-DOCX-14]
write_paths:
  - packages/core/src/formats/docx/docx-numbering-ooxml-roundtrip.ts
  - packages/core/src/formats/docx/docx-numbering-d05-document-roundtrip.test.ts
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test docx-numbering-d05-document
deliverables: [D05-DRT-06 restart + indents chain]
status: review
```

Word-complete numbering **not claimed**; gate **G2 not-run**.
