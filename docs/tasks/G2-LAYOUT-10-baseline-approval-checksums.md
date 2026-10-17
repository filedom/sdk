# G2-LAYOUT-10-baseline-approval-checksums

```yaml
id: G2-LAYOUT-10
goal: Baseline approval workflow — CI structural approval via pinned checksums (honest: not human review)
requirements: [F13]
acceptance: [V-subset]
depends_on: [G2-LAYOUT-09]
write_paths:
  - scripts/approve-layout-visual-baselines.mjs
  - evidence/gates/G2-feasibility/layout-visual-baseline-checksums.json
  - evidence/gates/G2-feasibility/layout-visual-baseline-manifest.json
commands:
  - cd domdoc-web && pnpm approve:layout-visual-baselines
deliverables: [checksum-pinned manifest, humanReviewStatus=checksum-approved-ci-simulated]
status: review
```

True human visual sign-off **not performed**; gate **G2** **not-run**.
