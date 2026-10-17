# G2-LAYOUT-01-flow-slice

```yaml
id: G2-LAYOUT-01
goal: Deterministic Rust flow line-break slice toward Parley integration (no Parley pin yet)
requirements: [F13, F14]
acceptance: [V-subset]
depends_on: [W0-FOUNDATION]
base_pair: { wasm_commit: TBD, web_commit: 9d2e8e7-or-later }
contract_hash: d37ee9aabf1f9468851ed78961716531ed86d616faf80232f1db31998eb9b2a3
write_paths:
  - /Users/nektarioskonstantinidis/Desktop/projects/domdoc/domdoc-wasm/src/layout/**
  - /Users/nektarioskonstantinidis/Desktop/projects/domdoc/domdoc-wasm/docs/layout.md
forbidden_paths:
  - domdoc-web/packages/core/src/formats/docx/**
  - domdoc-wasm/schema/**
context: [blueprint_§4.2, blueprint_§12.3, C06 Parley licence MIT/Apache-2.0]
fixtures: [flow-simple-wrap, flow-empty-paragraph]
commands:
  - cd domdoc-wasm && cargo test layout::
deliverables: [flow.rs word-wrap stub, unit tests, layout.md with Parley pin checklist]
status: ready
```

G4 must not edit these files concurrently (W2). This slice proves bounded-width line breaking and emitted line metrics; shaping/bidi deferred until font stack proof.
