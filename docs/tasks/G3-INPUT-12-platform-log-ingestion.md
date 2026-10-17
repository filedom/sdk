# G3-INPUT-12-platform-log-ingestion

```yaml
id: G3-INPUT-12
goal: Real platform log ingestion path — validate format; empty real slots OK
requirements: [F12]
acceptance: [O-subset, AE-subset]
depends_on: [G3-INPUT-11]
write_paths:
  - packages/core/src/input/input-platform-log-ingestion.ts
  - docs/input-wire-capture.md
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test input-platform-log-ingestion
deliverables: [ingestRealPlatformInputLog, shape validator]
status: review
```

Real platform captures **not populated**; gate **G3 not-run**.
