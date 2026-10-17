# G2-DOCX-19-abstractnum-numid-remap

```yaml
id: G2-DOCX-19
goal: abstractNum sharing + numId remap edges on D05 write-back
requirements: [F07]
acceptance: [D05-subset]
depends_on: [G2-DOCX-18]
write_paths:
  - packages/core/src/formats/docx/docx-numbering-ooxml-roundtrip.ts
  - packages/core/src/formats/docx/docx-numbering-session-writeback.ts
  - packages/core/src/formats/docx/docx-numbering-d05-document-roundtrip.test.ts
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test docx-numbering-d05-document docx-numbering-ooxml-roundtrip
deliverables: [D05-DRT-10 shared abstractNum; D05-DRT-11 numId remap]
status: review
```

Full Word numbering compat **not claimed**; gate **G2 not-run**.
