# W2-G4-18-authoritative-gate-proof-runner

```yaml
id: W2-G4-18
goal: Authoritative G4 gate proof runner binding browser + node WASM
requirements: [F18]
acceptance: [AF]
depends_on: [W2-G4-17]
write_paths:
  - packages/core/src/components/fragmentation-af-authoritative-gate-proof-runner.ts
  - scripts/run-g4-authoritative-gate-proof.mjs
  - evidence/gates/G4-feasibility/af-authoritative-gate-proof-runner.json
commands:
  - cd domdoc-web && pnpm proof:g4-authoritative-gate
deliverables: [af-authoritative-gate-proof-runner.json; authoritativeGatePath not-run]
status: review
```

G4 gate equivalence proof **not-run**; gate **G4 not-run**.
