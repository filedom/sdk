# G3-INPUT-18-physical-demo-real-slots-validated

```yaml
id: G3-INPUT-18
goal: Physical demo capture files in real log slots with validated:true
requirements: [F12]
acceptance: [O-subset, AE-subset]
depends_on: [G3-INPUT-17]
write_paths:
  - packages/core/src/input/input-evidence-demo-real-capture.ts
  - evidence/gates/G3-feasibility/logs/*-real-empty.json
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test input-evidence-demo-real
deliverables: [buildValidatedPhysicalDemoCaptureFile + real slot JSON writes]
status: review
```

Format-validated demo captures **do not** substitute for physical-host IME/SR gate proof; gate **G3 not-run**.
