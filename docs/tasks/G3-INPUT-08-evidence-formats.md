# G3-INPUT-08-evidence-formats

```yaml
id: G3-INPUT-08
goal: Recorded IME/SR evidence file formats + automated scaffold completeness checks
requirements: [F12]
acceptance: [O-subset]
depends_on: [G3-INPUT-07]
write_paths:
  - packages/core/src/input/input-evidence-scaffold.ts
  - evidence/gates/G3-feasibility/ime-01-02-fixtures.json
  - evidence/gates/G3-feasibility/sr-evidence-scaffold.json
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test input-evidence-scaffold
deliverables: [validateImeEvidenceFile, validateSrEvidenceFile, formatVersion 1]
status: review
```

Real OS IME/SR session logs **not-run**; gate **G3** **not-run**.
