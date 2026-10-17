# W2-G4-09-engine-incremental-layout-sketch

```yaml
id: W2-G4-09
goal: Engine incremental layout API sketch in wasm + web hook; AF equivalence where incremental exists
requirements: [F18]
acceptance: [AF]
depends_on: [W2-G4-08]
write_paths:
  - domdoc-wasm/src/layout/incremental.rs
  - domdoc-wasm/src/bindings/mod.rs
  - packages/core/src/layout/wasm-shaped-layout-hook.ts
  - packages/core/src/components/fragmentation-af-incremental-engine.ts
commands:
  - cd domdoc-wasm && cargo test
  - cd domdoc-web && pnpm --filter @domdoc/core test fragmentation-af-incremental
deliverables: [layout_flow_paragraph_incremental_json, engine-sketch equivalence tests]
status: review
```

True break-token incremental **not implemented**; G4 gate **not-run**.
