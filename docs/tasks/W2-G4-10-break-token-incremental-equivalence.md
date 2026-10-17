# W2-G4-10-break-token-incremental-equivalence

```yaml
id: W2-G4-10
goal: Break-token incremental layout at legal line boundaries → AF authoritative equivalence
requirements: [F18]
acceptance: [AF]
depends_on: [W2-G4-09]
write_paths:
  - domdoc-wasm/src/layout/incremental.rs
  - domdoc-wasm/src/bindings/mod.rs
  - packages/core/src/components/fragmentation-af-incremental-engine.ts
  - packages/core/src/layout/wasm-shaped-layout-hook.ts
commands:
  - cd domdoc-wasm && cargo test incremental
  - cd domdoc-web && pnpm --filter @domdoc/core test fragmentation-af-incremental-engine
deliverables: [layout_flow_paragraph_legal_breaks_json, break-token AF equivalence when pkg built]
status: review
```

Arbitrary mid-paragraph sketch breaks may still drift; G4 gate **not-run**.
