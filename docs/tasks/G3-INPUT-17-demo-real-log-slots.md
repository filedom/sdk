# G3-INPUT-17-demo-real-log-slots

```yaml
id: G3-INPUT-17
goal: Physical demo IME/SR capture ingested into real log slots (format path)
requirements: [F12]
acceptance: [O-subset, AE-subset]
depends_on: [G3-INPUT-16]
write_paths:
  - docs/demo-ime-sr-capture-sessions.md
  - packages/core/src/input/input-evidence-demo-real-capture.ts
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test input-evidence-demo-real
deliverables: [projectPhysicalDemoCaptureToRealSlotFile + demo slot paths]
status: review
```

Full physical-host demo capture **not-run**; gate **G3 not-run**.
