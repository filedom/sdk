# G3-INPUT-21-gate-grade-ingest-validation

```yaml
id: G3-INPUT-21
goal: Validate PHYSICAL_HOST_GATE_GRADE_LOG ingest path
requirements: [F12]
acceptance: [O-subset]
depends_on: [G3-INPUT-20]
write_paths:
  - packages/core/src/input/input-evidence-physical-host-gate-grade.ts
  - scripts/ingest-physical-host-gate-grade-log.mjs
commands:
  - cd domdoc-web && PHYSICAL_HOST_GATE_GRADE_LOG=… pnpm ingest:physical-host-gate-grade-log
deliverables: [validatePhysicalHostGateGradeIngestPayload; refuse synthetic]
status: review
```

Real OS capture **not-run**; gate **G3 not-run**.
