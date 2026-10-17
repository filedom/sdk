# G3-INPUT-13-platform-log-paths

```yaml
id: G3-INPUT-13
goal: Populate real platform log paths; validate empty vs filled ingestion
requirements: [F12]
acceptance: [O-subset]
depends_on: [G3-INPUT-12]
write_paths:
  - packages/core/src/input/input-platform-log-paths.ts
  - evidence/gates/G3-feasibility/logs/*-real-empty.json
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test input-platform-log
deliverables: [REAL_PLATFORM_LOG_RELATIVE_PATHS, validateRealPlatformLogPaths]
status: review
```

Real logs still **empty-validated** only; gate **G3 not-run**.
