# G2-DOCX-09-numbering-xml-runtime

```yaml
id: G2-DOCX-09
goal: Runtime list markers from numbering.xml level defs (beyond stub decimal markers)
requirements: [F07]
acceptance: [W-subset, D05]
depends_on: [G2-DOCX-08]
write_paths:
  - packages/core/src/formats/docx/docx-numbering-runtime.ts
  - packages/core/src/formats/docx/docx-prosemirror-projection.ts
  - packages/core/src/formats/docx/docx-store.ts
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test docx-numbering
deliverables: [parseWordNumberingXml, computeListMarkersFromNumberingXml, D05 matrix marker updates]
status: review
```

Full Word numbering compat **not implemented**; gate **G2** **not-run**.
