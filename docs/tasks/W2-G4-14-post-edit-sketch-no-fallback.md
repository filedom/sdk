# W2-G4-14-post-edit-sketch-no-fallback

```yaml
id: W2-G4-14
goal: Post-edit suffix sketch without full fallback on safe suffix-only caret edits
requirements: [F18]
acceptance: [AF]
depends_on: [W2-G4-13]
write_paths:
  - domdoc-wasm/src/layout/incremental.rs
  - packages/core/src/components/fragmentation-af-post-edit-incremental.ts
commands:
  - cd domdoc-wasm && cargo test post_edit
  - cd domdoc-web && pnpm --filter @domdoc/core test fragmentation-af-post-edit
deliverables: [postEditSafeSuffixSketchWithoutFullFallback evidence flag]
status: review
```

G4 gate **not-run**.
