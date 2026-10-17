# G2-DOCX-14-d05-restart-indents-document

```yaml
id: G2-DOCX-14
goal: Word numbering restart/indents on full D05 document.xml corpus slice
requirements: [F07]
acceptance: [D05-subset]
depends_on: [G2-DOCX-13]
write_paths:
  - packages/core/src/formats/docx/docx-numbering-d05-document-roundtrip.test.ts
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test docx-numbering-d05-document
deliverables: [D05-DRT-05 multi-level restart chain in document round-trip]
status: review
```

Word-complete numbering **not claimed**; gate **G2 not-run**.
