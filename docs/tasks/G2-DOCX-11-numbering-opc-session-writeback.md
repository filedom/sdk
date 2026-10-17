# G2-DOCX-11-numbering-opc-session-writeback

```yaml
id: G2-DOCX-11
goal: Full numbering subset + OPC write-back from DocumentSession list state
requirements: [F07]
acceptance: [D05-subset]
depends_on: [G2-DOCX-10]
write_paths:
  - packages/core/src/formats/docx/docx-numbering-session-writeback.ts
  - packages/core/src/session/document-session.ts
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test docx-numbering-session-writeback
deliverables: [writeNumberingOpcFromSessionListState, session applyDocxNumberingOpcWriteBackFromSession]
status: review
```

Word-complete numbering **not claimed**; gate **G2 not-run**.
