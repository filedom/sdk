# G3-INPUT-15-ime-sr-partial-captures

```yaml
id: G3-INPUT-15
goal: IME-02 + SR-01 validated partial real logs (full demo sessions still pending)
requirements: [F12]
acceptance: [O-subset]
depends_on: [G3-INPUT-14]
write_paths:
  - evidence/gates/G3-feasibility/logs/ime-02-real-empty.json
  - evidence/gates/G3-feasibility/logs/sr-01-real-empty.json
  - docs/platform-log-capture-checklist.md
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test input-platform-log
deliverables: [IME-02/SR-01 filled-validated partial captures]
status: review
```

Full platform demo capture **not-run**; gate **G3 not-run**.
