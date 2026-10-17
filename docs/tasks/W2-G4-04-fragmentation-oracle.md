# W2-G4-04-fragmentation-oracle

```yaml
id: W2-G4-04
goal: Fragmentation convergence / equivalence oracle stub (Taleweaver-style bounded passes)
requirements: [F18]
acceptance: [AF-subset]
depends_on: [W2-G4-03]
write_paths:
  - packages/core/src/components/fragmentation-equivalence-oracle.ts
forbidden_paths:
  - domdoc-wasm/**
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test fragmentation-equivalence
deliverables: [runFragmentationConvergenceOracle, fragmentsEquivalent]
status: review
```

Full AF browser corpus **not-run**; gate **G4** **not-run**.
