# G2-LAYOUT-16-coordinator-human-signoff

```yaml
id: G2-LAYOUT-16
goal: Coordinator-accepted human visual sign-off workflow (not workflow ack alone)
requirements: [F13]
acceptance: [V-subset]
depends_on: [G2-LAYOUT-15]
write_paths:
  - scripts/sign-layout-human-signoff.mjs
  - docs/layout-visual-human-signoff-escalation.md
commands:
  - cd domdoc-web && LAYOUT_SIGNOFF_MODE=human LAYOUT_SIGNOFF_REVIEWER_ID=test LAYOUT_SIGNOFF_COORDINATOR_ACCEPT=1 LAYOUT_SIGNOFF_COORDINATOR_ID=coord pnpm sign:layout-human-signoff
deliverables: [coordinator acceptance fields on signed JSON; gate remains not-run]
status: review
```

Coordinator acceptance is **workflow only** — not human visual pass; gate **G2 not-run**.
