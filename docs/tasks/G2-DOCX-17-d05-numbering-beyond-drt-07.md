# G2-DOCX-17-d05-numbering-beyond-drt-07

```yaml
id: G2-DOCX-17
goal: Word-complete numbering on remaining D05 document fixtures beyond DRT-07
requirements: [F07]
acceptance: [D05-subset]
depends_on: [G2-DOCX-16]
write_paths:
  - packages/core/src/formats/docx/docx-numbering-d05-document-roundtrip.test.ts
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test docx-numbering-d05-document
deliverables: [D05-DRT-08 upperRoman/decimal/bullet three-level document chain]
status: review
```

Full Word numbering compat **not claimed**; gate **G2 not-run**.
