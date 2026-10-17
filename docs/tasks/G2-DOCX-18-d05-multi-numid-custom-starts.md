# G2-DOCX-18-d05-multi-numid-custom-starts

```yaml
id: G2-DOCX-18
goal: D05 multi-numId + custom start values toward Word numbering matrix
requirements: [F07]
acceptance: [D05-subset]
depends_on: [G2-DOCX-17]
write_paths:
  - packages/core/src/formats/docx/docx-numbering-ooxml-roundtrip.ts
  - packages/core/src/formats/docx/docx-numbering-d05-document-roundtrip.test.ts
  - packages/core/src/formats/docx/docx-prosemirror-session-numbering.test.ts
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test docx-numbering-d05-document docx-prosemirror-session-numbering
deliverables: [D05-DRT-09 multi-numId custom starts + session listNumId binding]
status: review
```

Full Word numbering compat **not claimed**; gate **G2 not-run**.
