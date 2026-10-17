# G3-INPUT-19-physical-host-gate-grade-logs

```yaml
id: G3-INPUT-19
goal: Real OS IME/SR gate-grade capture log shape on physical host
requirements: [F12]
acceptance: [O-subset]
depends_on: [G3-INPUT-18]
write_paths:
  - packages/core/src/input/input-evidence-physical-host-gate-grade.ts
  - evidence/gates/G3-feasibility/physical-host-gate-grade-manifest.json
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test input-evidence-physical-host-gate-grade
deliverables: [gate-grade IME/SR log builder + manifest; host capture not-run]
status: review
```

Physical-host capture **not-run**; gate **G3 not-run**.
