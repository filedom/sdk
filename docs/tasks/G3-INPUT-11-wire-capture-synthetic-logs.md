# G3-INPUT-11-wire-capture-synthetic-logs

```yaml
id: G3-INPUT-11
goal: Wire capture doc + synthetic example logs clearly marked synthetic vs real
requirements: [F12]
acceptance: [O-subset, AE-subset]
depends_on: [G3-INPUT-10]
write_paths:
  - docs/input-wire-capture.md
  - evidence/gates/G3-feasibility/logs/*-synthetic-example.json
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test input-evidence
deliverables: [input-wire-capture.md, synthetic example JSON files]
status: review
```

Real platform logs **not captured**; gate **G3** **not-run**.
