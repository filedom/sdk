# Layout visual baseline — human sign-off (G2-LAYOUT-11)

G2-LAYOUT-10 pins **checksum-approved-ci-simulated** baselines via `pnpm approve:layout-visual-baselines`. That workflow is structural CI approval, not human visual review.

## Optional human sign-off (not performed in this workspace)

When a human reviewer is available:

1. Run `pnpm generate:layout-visual-baselines` and inspect PNG/HTML artifacts under `evidence/gates/G2-feasibility/layout-visual/`.
2. Record reviewer id, date, and corpus entry ids in `layout-visual-baseline-manifest.json` (`humanReviewStatus: "approved-by-human"`).
3. Re-run `pnpm approve:layout-visual-baselines` only after manifest update; do not claim G2 gate pass without full gate evidence.

**Status:** No human reviewer available in local integration; checksum CI path remains authoritative for automation. Gate **G2 not-run**.
