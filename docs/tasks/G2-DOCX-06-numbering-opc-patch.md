# G2-DOCX-06-numbering-opc-patch

```yaml
id: G2-DOCX-06
goal: Session list renumber transaction → OPC numbering.xml patch slice
requirements: [F07]
acceptance: [W-subset]
depends_on: [G2-DOCX-05]
write_paths:
  - packages/core/src/formats/docx/docx-numbering-opc-patch.ts
  - packages/core/src/session/document-session.ts
forbidden_paths:
  - domdoc-wasm/**
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test docx-numbering
deliverables: [applyListRenumberToOpcPackage, DocumentSession.applyDocxListRenumberOpcPatch]
status: review
```

Full Word-compatible numbering.xml **not implemented**; gate **G2** **not-run**.
