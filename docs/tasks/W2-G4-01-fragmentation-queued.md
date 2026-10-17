# W2-G4-01-fragmentation-queued

```yaml
id: W2-G4-01
goal: Queue G4 fragmentation types/tests in isolated modules (no concurrent G2 flow edits)
requirements: [F18, F19, F20]
acceptance: [AF, N-subset]
depends_on: [G2-LAYOUT-02, G3-INPUT-01]
base_pair: { wasm_commit: TBD, web_commit: TBD }
contract_hash: d37ee9aabf1f9468851ed78961716531ed86d616faf80232f1db31998eb9b2a3
write_paths:
  - domdoc-web/packages/core/src/components/**
  - domdoc-wasm/src/layout/fragmentation.rs
forbidden_paths: [domdoc-wasm/src/layout/flow.rs, domdoc-wasm/src/layout/shaping.rs]
context: [blueprint_§6]
fixtures: [C01-C04 type validation subset]
commands:
  - cd domdoc-wasm && cargo test fragmentation
  - cd domdoc-web && pnpm --filter @domdoc/core test fragmentation-types
deliverables: [BreakToken validation Rust + TS mirror, queued integration]
status: review
```

Component measurement and browser proofs remain **not-run**; gate **G4** **not-run**.
