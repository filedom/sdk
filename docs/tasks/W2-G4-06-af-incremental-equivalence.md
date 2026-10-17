# W2-G4-06-af-incremental-equivalence

```yaml
id: W2-G4-06
goal: Incremental vs full shaped layout equivalence oracle on AF browser corpus
requirements: [F18]
acceptance: [AF-subset]
depends_on: [W2-G4-05]
write_paths:
  - packages/core/src/components/fragmentation-af-incremental-equivalence.ts
  - packages/core/src/components/fragmentation-af-incremental-equivalence.test.ts
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test fragmentation-af-incremental
deliverables: [evaluateAfIncrementalVsFullEquivalence]
status: review
```

Full AF gate equivalence proof **not-run**; gate **G4** **not-run**.
