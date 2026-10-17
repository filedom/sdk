# G2-LAYOUT-09-visual-baseline-review

```yaml
id: G2-LAYOUT-09
goal: Human-reviewable visual baseline artifacts from JSON diff (generate + test structure)
requirements: [F13]
acceptance: [V-subset]
depends_on: [G2-LAYOUT-08]
write_paths:
  - scripts/generate-layout-visual-baselines.mjs
  - evidence/gates/G2-feasibility/layout-visual-baselines.md
  - evidence/gates/G2-feasibility/layout-visual-baseline-manifest.json
  - packages/core/src/layout/layout-visual-baseline-structure.test.ts
commands:
  - cd domdoc-web && pnpm record:layout-visual-diff
  - cd domdoc-web && pnpm generate:layout-visual-baselines
deliverables: [markdown baselines, manifest, structure test]
status: review
```

Human baseline review **pending**; gate **G2** **not-run**.
