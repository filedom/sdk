# G2-DOCX-13-d05-document-roundtrip

```yaml
id: G2-DOCX-13
goal: Word-complete numbering + full D05 document.xml round-trip on writer matrix
requirements: [F07]
acceptance: [D05-subset]
depends_on: [G2-DOCX-12]
write_paths:
  - packages/core/src/formats/docx/docx-numbering-d05-document-roundtrip.test.ts
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test docx-numbering-d05-document
deliverables: [D05-DRT document.xml + numbering.xml OPC round-trip matrix]
status: review
```

Word-complete numbering **not claimed**; gate **G2 not-run**.
