# G2-DOCX-04-prosemirror-transaction-boundary

```yaml
id: G2-DOCX-04
goal: ProseMirror ↔ transaction boundary stub; expand D05 corpus tests (tabs, spacing, empty paragraphs)
requirements: [F07]
acceptance: [W-subset]
depends_on: [G2-DOCX-03]
base_pair: { wasm_commit: 230369647ff0d78c9b48e7287134c1947b755693, web_commit: TBD }
contract_hash: d37ee9aabf1f9468851ed78961716531ed86d616faf80232f1db31998eb9b2a3
write_paths:
  - packages/core/src/formats/docx/docx-prosemirror-transaction-boundary.ts
  - packages/core/src/formats/docx/docx-prosemirror-d05-corpus.test.ts
forbidden_paths:
  - domdoc-wasm/**
fixtures: [D05-corpus-partial]
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test docx-prosemirror
deliverables: [projection-sync stub, D05 corpus tests]
status: review
```

Full editor wiring and complete D05 family remain follow-on; gate **G2** **not-run**.
