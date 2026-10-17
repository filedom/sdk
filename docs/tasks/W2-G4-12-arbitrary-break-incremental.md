# W2-G4-12-arbitrary-break-incremental

```yaml
id: W2-G4-12
goal: Reduce arbitrary-break incremental drift on AF corpus (unchanged-text caret)
requirements: [F18]
acceptance: [AF]
depends_on: [W2-G4-11]
write_paths:
  - domdoc-wasm/src/layout/incremental.rs
  - packages/core/src/components/fragmentation-af-incremental-breakpoints.ts
  - evidence/gates/G4-feasibility/af-incremental-edit-breakpoints.json
commands:
  - cd domdoc-wasm && cargo test incremental
  - cd domdoc-web && pnpm --filter @domdoc/core test fragmentation-af-incremental-breakpoints
deliverables: [allArbitraryBreakpointsEquivalent when pkg built]
status: review
```

G4 gate **not-run**.
