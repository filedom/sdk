# W2-G4-15-post-edit-non-legal-incremental

```yaml
id: W2-G4-15
goal: Broader post-edit incremental without full fallback when suffix sketch matches full layout (non-legal caret)
requirements: [F18]
acceptance: [AF]
depends_on: [W2-G4-14]
write_paths:
  - domdoc-wasm/src/layout/incremental.rs
  - packages/core/src/components/fragmentation-af-post-edit-incremental.ts
commands:
  - cd domdoc-wasm && cargo test post_edit
  - cd domdoc-web && pnpm --filter @domdoc/core test fragmentation-af-post-edit
deliverables: [postEditNonLegalSketchWithoutFallbackWhenEquivalent evidence flag]
status: review
```

G4 gate **not-run**.
