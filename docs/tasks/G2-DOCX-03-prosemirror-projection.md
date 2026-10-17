# G2-DOCX-03-prosemirror-projection

```yaml
id: G2-DOCX-03
goal: ProseMirror projection slice from OOXML store (MIT prosemirror-model); D05-style mapping tests
requirements: [F07]
acceptance: [W-subset]
depends_on: [G2-DOCX-02]
base_pair: { wasm_commit: ee8ddb0c1173e9f97d13c618bca8fde376343d04, web_commit: TBD }
contract_hash: d37ee9aabf1f9468851ed78961716531ed86d616faf80232f1db31998eb9b2a3
write_paths:
  - packages/core/src/formats/docx/docx-prosemirror-projection.ts
  - packages/core/src/formats/docx/docx-prosemirror-projection.test.ts
forbidden_paths:
  - domdoc-wasm/src/layout/flow.rs
fixtures: [D05-synthetic]
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test docx-prosemirror
deliverables: [docxProjectionSchema, buildProseMirrorDocFromOoxmlBody, synthetic D05 tests]
status: review
```

Editor wiring and full D05 corpus remain follow-on; gate **G2** **not-run**.
