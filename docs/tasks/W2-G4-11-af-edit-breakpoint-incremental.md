# W2-G4-11-af-edit-breakpoint-incremental

```yaml
id: W2-G4-11
goal: Incremental layout at legal + arbitrary edit breakpoints on AF corpus
requirements: [F18]
acceptance: [AF]
depends_on: [W2-G4-10]
write_paths:
  - domdoc-wasm/src/layout/incremental.rs
  - packages/core/src/components/fragmentation-af-incremental-breakpoints.ts
  - evidence/gates/G4-feasibility/af-incremental-edit-breakpoints.json
commands:
  - cd domdoc-wasm && cargo test incremental
  - cd domdoc-web && pnpm --filter @domdoc/core test fragmentation-af-incremental-breakpoints
deliverables: [edit-breakpoint matrix evidence, all legal breaks ≡ full]
status: review
```

Arbitrary mid-edit breakpoints may drift; G4 gate **not-run**.
