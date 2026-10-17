# W2-G4-07-af-incremental-gate-grade

```yaml
id: W2-G4-07
goal: Gate-grade incremental≡full oracle on AF corpus with JSON evidence artifact
requirements: [F18]
acceptance: [AF-subset]
depends_on: [W2-G4-06]
write_paths:
  - packages/core/src/components/fragmentation-af-incremental-gate-grade.ts
  - packages/core/src/components/fragmentation-af-incremental-gate-grade.test.ts
  - evidence/gates/G4-feasibility/af-incremental-gate-grade.json
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test fragmentation-af-incremental-gate
deliverables: [buildAfIncrementalGateGradeEvidence]
status: review
```

G4 gate equivalence proof **not-run**; gate **G4** **not-run**.
