# G2-DOCX-02-opc-relationships

```yaml
id: G2-DOCX-02
goal: Expand OPC store with relationship index, comments part stub, preservation bag; sanitized fixture tests (D02–D04 slice)
requirements: [F07, F08]
acceptance: [W, AD-subset]
depends_on: [G2-DOCX-01]
base_pair: { wasm_commit: 4b2e3e7755eaad3bc190825449a38ea9936df0f2, web_commit: TBD }
contract_hash: d37ee9aabf1f9468851ed78961716531ed86d616faf80232f1db31998eb9b2a3
write_paths:
  - packages/core/src/formats/docx/**
  - evidence/gates/G2-feasibility/**
forbidden_paths:
  - domdoc-wasm/src/layout/flow.rs
fixtures: [D02-rels, D03-preservation, D04-comments-stub]
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test src/formats/docx
deliverables: [opc-relationships.ts, preservation-bag.ts, comments-part-stub.ts, docx-store extensions, tests]
status: review
```

ProseMirror projection and D05 remain follow-on; gate **G2** **not-run**.
