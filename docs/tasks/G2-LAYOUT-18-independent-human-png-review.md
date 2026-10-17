# G2-LAYOUT-18-independent-human-png-review

```yaml
id: G2-LAYOUT-18
goal: Independent human PNG review recorded outside CI attestation flags
requirements: [F13]
acceptance: [D10-subset]
depends_on: [G2-LAYOUT-17]
write_paths:
  - scripts/record-layout-independent-png-review.mjs
  - docs/layout-visual-human-signoff-escalation.md
  - evidence/gates/G2-feasibility/layout-visual-independent-human-png-review.json
commands:
  - cd domdoc-web && LAYOUT_INDEPENDENT_REVIEWER_ID=reviewer pnpm record:layout-independent-png-review
deliverables: [layout-visual-independent-human-png-review.json independentOfCiAttestation]
status: review
```

Independent review workflow only; gate **G2 not-run**.
