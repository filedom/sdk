# G2-DOCX-16-d05-word-complete-numbering

```yaml
id: G2-DOCX-16
goal: Word-complete numbering chain on expanded D05 document corpus beyond DRT matrix subset
requirements: [F07]
acceptance: [D05-subset]
depends_on: [G2-DOCX-15]
write_paths:
  - packages/core/src/formats/docx/docx-numbering-d05-document-roundtrip.test.ts
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test docx-numbering-d05-document
deliverables: [D05-DRT-07 three-level upperRoman + restart + indents document chain]
status: review
```

Full Word numbering compat **not claimed**; gate **G2 not-run**.
