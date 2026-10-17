# G2-LAYOUT-19-coordinator-independent-png-accept

```yaml
id: G2-LAYOUT-19
goal: Coordinator accepts independent PNG review packet (not G2-LAYOUT-16)
requirements: [F13]
acceptance: [D10-subset]
depends_on: [G2-LAYOUT-18]
write_paths:
  - scripts/accept-layout-independent-png-review.mjs
  - evidence/gates/G2-feasibility/layout-visual-independent-png-review-coordinator-accepted.json
commands:
  - cd domdoc-web && LAYOUT_INDEPENDENT_COORDINATOR_ACCEPT=1 LAYOUT_INDEPENDENT_COORDINATOR_ID=coord pnpm accept:layout-independent-png-review
deliverables: [coordinator-accepted independent PNG packet; gate not-run]
status: review
```

Independent coordinator accept only; gate **G2 not-run**.
