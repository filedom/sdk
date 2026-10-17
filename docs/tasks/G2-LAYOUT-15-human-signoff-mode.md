# G2-LAYOUT-15-human-signoff-mode

```yaml
id: G2-LAYOUT-15
goal: LAYOUT_SIGNOFF_MODE=human workflow; refuse simulated-only when human mode
requirements: [F13]
acceptance: [V-subset]
depends_on: [G2-LAYOUT-14]
write_paths:
  - scripts/sign-layout-human-signoff.mjs
  - docs/layout-visual-human-signoff-escalation.md
commands:
  - cd domdoc-web && pnpm sign:layout-human-signoff
  - cd domdoc-web && LAYOUT_SIGNOFF_MODE=human LAYOUT_SIGNOFF_REVIEWER_ID=test pnpm sign:layout-human-signoff
deliverables: [human mode gate on reviewer id; simulated default labeled]
status: review
```

Real human visual review **not claimed**; default sign-off remains **simulated**; gate **G2 not-run**.
