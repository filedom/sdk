# G2-DOCX-07-numbering-ooxml-roundtrip

```yaml
id: G2-DOCX-07
goal: Minimal OOXML numbering.xml definitions + OPC round-trip; D05 list slice test
requirements: [F07]
acceptance: [W-subset, D05-partial]
depends_on: [G2-DOCX-06]
write_paths:
  - packages/core/src/formats/docx/docx-numbering-ooxml-roundtrip.ts
  - packages/core/src/formats/docx/docx-prosemirror-d05-corpus.test.ts
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test docx-numbering-ooxml
  - cd domdoc-web && pnpm --filter @domdoc/core test docx-prosemirror-d05
deliverables: [applyListRenumberWithOoxmlDefinitions, parseNumberingNumIds]
status: review
```

Word-compatible full numbering **not implemented**; gate **G2** **not-run**.
