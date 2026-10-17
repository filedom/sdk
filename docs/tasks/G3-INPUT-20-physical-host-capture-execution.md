# G3-INPUT-20-physical-host-capture-execution

```yaml
id: G3-INPUT-20
goal: Physical-host gate-grade capture execution + ingest helpers
requirements: [F12]
acceptance: [O-subset]
depends_on: [G3-INPUT-19]
write_paths:
  - scripts/run-physical-host-gate-grade-capture.mjs
  - scripts/ingest-physical-host-gate-grade-log.mjs
  - packages/core/src/input/input-evidence-physical-host-gate-grade.ts
commands:
  - cd domdoc-web && pnpm run:physical-host-gate-grade-capture
  - cd domdoc-web && PHYSICAL_HOST_GATE_GRADE_LOG=… pnpm ingest:physical-host-gate-grade-log
deliverables: [honest macOS/Windows capture plan; linux-ci skip; ingest path]
status: review
```

Physical capture **not-run** on CI; gate **G3 not-run**.
