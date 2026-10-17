# G2-LAYOUT-12-human-signoff-template

```yaml
id: G2-LAYOUT-12
goal: Human sign-off hook when reviewer absent — doc + signed checksum template
requirements: [F13]
acceptance: [V-subset]
depends_on: [G2-LAYOUT-11]
write_paths:
  - docs/layout-visual-human-signoff.md
  - evidence/gates/G2-feasibility/layout-visual-human-signoff-template.json
commands:
  - cd domdoc-web && pnpm --filter @domdoc/core test layout-visual-baseline
deliverables: [pending-human-signoff template, G2-LAYOUT-12 doc section]
status: review
```

No human reviewer in local integration; gate **G2 not-run**.
