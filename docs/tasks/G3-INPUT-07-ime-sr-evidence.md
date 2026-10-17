# G3-INPUT-07-ime-sr-evidence

```yaml
id: G3-INPUT-07
goal: IME-01/02 fixtures + screen-reader evidence scaffolding (honest not-run for real SR)
requirements: [F12]
acceptance: [O-subset]
depends_on: [G3-INPUT-06]
write_paths:
  - evidence/gates/G3-feasibility/ime-01-02-fixtures.json
  - evidence/gates/G3-feasibility/sr-evidence-scaffold.json
  - docs/ime-composition-manual-test.md
commands:
  - cd domdoc-web && pnpm qa:gates -- --scope feasibility
deliverables: [IME fixture record, SR scaffold not-run]
status: review
```

Real OS IME and SR logs **not-run** in CI; gate **G3** **not-run**.
