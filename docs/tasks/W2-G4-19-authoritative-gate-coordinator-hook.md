# W2-G4-19-authoritative-gate-coordinator-hook

```yaml
id: W2-G4-19
goal: Coordinator promotion hook for authoritativeGatePath
requirements: [F18]
acceptance: [AF-subset]
depends_on: [W2-G4-18]
write_paths:
  - packages/core/src/components/fragmentation-af-authoritative-gate-proof-runner.ts
commands:
  - cd domdoc-web && pnpm proof:g4-authoritative-gate
deliverables: [resolveAuthoritativeGatePathFromCoordinatorAccept; default not-run]
status: review
```

Gate **G4 not-run** until coordinator accepts bundled browser+e2e+node evidence.
