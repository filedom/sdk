# G2-LAYOUT-17-human-visual-signoff-attestation

```yaml
id: G2-LAYOUT-17
goal: Real human visual baseline attestation path (honest when workflow-only)
requirements: [F13]
acceptance: [V-subset]
depends_on: [G2-LAYOUT-16]
write_paths:
  - scripts/sign-layout-human-signoff.mjs
  - docs/layout-visual-human-signoff-escalation.md
commands:
  - cd domdoc-web && LAYOUT_SIGNOFF_MODE=human LAYOUT_SIGNOFF_REVIEWER_ID=reviewer LAYOUT_SIGNOFF_VISUAL_REVIEW_COMPLETE=1 pnpm sign:layout-human-signoff
deliverables: [human-visual-review-attested signed JSON; gate remains not-run]
status: review
```

Reviewer self-attestation is **workflow only** — not independent visual verification; gate **G2 not-run**.
