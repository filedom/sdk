# G2-LAYOUT-14-human-signoff-escalation

```yaml
id: G2-LAYOUT-14
goal: Real human visual sign-off path or documented escalation when blocked
requirements: [F13]
acceptance: [V-subset]
depends_on: [G2-LAYOUT-13]
write_paths:
  - docs/layout-visual-human-signoff-escalation.md
commands:
  - cd domdoc-web && pnpm sign:layout-human-signoff
deliverables: [escalation table + human sign-off steps; no gate pass]
status: review
```

Human signature **not obtained**; simulated checksum only; gate **G2 not-run**.
