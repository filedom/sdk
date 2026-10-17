# G2-LAYOUT-08-visual-diff-artifacts

```yaml
id: G2-LAYOUT-08
goal: Record shaped≠flow visual diff artifacts (JSON snapshots) for LV corpus
requirements: [F13]
acceptance: [V-subset]
depends_on: [G2-LAYOUT-07]
write_paths:
  - scripts/record-layout-visual-diff.mjs
  - evidence/gates/G2-feasibility/layout-shaped-flow-visual-diff.json
commands:
  - cd domdoc-web && pnpm record:layout-visual-diff
deliverables: [layout-shaped-flow-visual-diff.json]
status: review
```

Visual baseline review **not-run**; gate **G2** **not-run**.
