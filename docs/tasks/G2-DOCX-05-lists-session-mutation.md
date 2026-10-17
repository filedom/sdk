# G2-DOCX-05-lists-session-mutation

```yaml
id: G2-DOCX-05
goal: Lists/numbering stub + DocumentSession mutation slice; expand D05 fixtures
requirements: [F07]
acceptance: [W-subset]
depends_on: [G2-DOCX-04]
write_paths:
  - packages/core/src/formats/docx/docx-list-numbering-stub.ts
  - packages/core/src/formats/docx/docx-session-list-mutation.ts
  - packages/core/src/session/document-session.ts
forbidden_paths:
  - domdoc-wasm/**
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test docx
deliverables: [list markers on ProseMirror attrs, session commit stubs]
status: review
```

OPC numbering.xml mutation **not implemented**; gate **G2** **not-run**.
