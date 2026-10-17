# W2-G4-20-legal-break-incremental-line-texts

```yaml
id: W2-G4-20
goal: Compare WASM incremental continuation at legal line breaks to full layout line texts
requirements: [F13]
acceptance: [AF-subset]
depends_on: [W2-G4-19]
write_paths:
  - packages/core/src/components/fragmentation-af-incremental-equivalence.ts
  - packages/core/src/components/fragmentation-af-incremental-gate-grade.ts
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test fragmentation-af-incremental
deliverables: [IncrementalLayoutHooks; AF corpus legal-break line-text match]
status: review
```

Gate **G4 not-run** until C01–C04 component pagination is proved in browser/worker.
