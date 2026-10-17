# W2-G4-13-post-edit-suffix-incremental

```yaml
id: W2-G4-13
goal: Incremental layout after live text mutation (post-edit suffix at caret)
requirements: [F18]
acceptance: [AF]
depends_on: [W2-G4-12]
write_paths:
  - domdoc-wasm/src/layout/incremental.rs
  - packages/core/src/components/fragmentation-af-post-edit-incremental.ts
  - evidence/gates/G4-feasibility/af-incremental-post-edit-suffix.json
commands:
  - cd domdoc-wasm && cargo test post_edit
  - cd domdoc-web && pnpm --filter @domdoc/core test fragmentation-af-post-edit
deliverables: [allPostEditSuffixBreakpointsEquivalent when pkg built]
status: review
```

G4 gate **not-run**.
