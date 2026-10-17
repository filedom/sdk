# W2-G4-08-af-incremental-authoritative

```yaml
id: W2-G4-08
goal: Authoritative incremental≡full layout on AF corpus; testable equivalence where incremental path exists
requirements: [F18]
acceptance: [AF]
depends_on: [W2-G4-07]
write_paths:
  - packages/core/src/components/fragmentation-af-incremental-authoritative.ts
  - packages/core/src/components/fragmentation-af-incremental-authoritative.test.ts
  - evidence/gates/G4-feasibility/af-incremental-authoritative.json
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test fragmentation-af-incremental-authoritative
deliverables: [authoritative full layout oracle, oracle-split incremental hook]
status: review
```

WASM engine incremental API **unavailable**; G4 gate **not-run**.
