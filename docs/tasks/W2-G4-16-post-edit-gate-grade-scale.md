# W2-G4-16-post-edit-gate-grade-scale

```yaml
id: W2-G4-16
goal: Gate-grade AF post-edit incremental oracle at scale (multiple breakpoints per entry)
requirements: [F18]
acceptance: [AF]
depends_on: [W2-G4-15]
write_paths:
  - packages/core/src/components/fragmentation-af-post-edit-gate-grade-scale.ts
  - evidence/gates/G4-feasibility/af-incremental-post-edit-gate-grade-scale.json
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test fragmentation-af-post-edit-gate-grade-scale
deliverables: [buildAfPostEditGateGradeScaleEvidence breakpointsPerEntry=3]
status: review
```

G4 gate equivalence proof **not-run**; gate **G4** **not-run**.
