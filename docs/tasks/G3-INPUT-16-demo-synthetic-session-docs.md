# G3-INPUT-16-demo-synthetic-session-docs

```yaml
id: G3-INPUT-16
goal: Full demo IME/SR capture docs + validators for fuller synthetic session payloads
requirements: [F12]
acceptance: [O-subset, AE-subset]
depends_on: [G3-INPUT-15]
write_paths:
  - docs/demo-ime-sr-capture-sessions.md
  - packages/core/src/input/input-evidence-synthetic-demo-session.ts
  - evidence/gates/G3-feasibility/logs/*-synthetic-session.json
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test input-evidence-synthetic-demo
deliverables: [validateSyntheticDemoInputSessionFile, labeled synthetic demo JSON]
status: review
```

Full physical-host demo capture **not-run**; gate **G3 not-run**.
