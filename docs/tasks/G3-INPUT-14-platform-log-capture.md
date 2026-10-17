# G3-INPUT-14-platform-log-capture

```yaml
id: G3-INPUT-14
goal: Filled real platform logs OR documented capture checklist with partial fills
requirements: [F12]
acceptance: [O-subset]
depends_on: [G3-INPUT-13]
write_paths:
  - docs/platform-log-capture-checklist.md
  - evidence/gates/G3-feasibility/logs/ime-01-real-empty.json
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test input-platform-log
deliverables: [IME-01 partial fill, checklist for remaining slots]
status: review
```

Gate **G3 not-run** until all real slots filled-validated.
