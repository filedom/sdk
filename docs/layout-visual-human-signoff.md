# Layout visual baseline — human sign-off (G2-LAYOUT-11)

G2-LAYOUT-10 pins **checksum-approved-ci-simulated** baselines via `pnpm approve:layout-visual-baselines`. That workflow is structural CI approval, not human visual review.

## Optional human sign-off (not performed in this workspace)

When a human reviewer is available:

1. Run `pnpm generate:layout-visual-baselines` and inspect PNG/HTML artifacts under `evidence/gates/G2-feasibility/layout-visual/`.
2. Record reviewer id, date, and corpus entry ids in `layout-visual-baseline-manifest.json` (`humanReviewStatus: "approved-by-human"`).
3. Re-run `pnpm approve:layout-visual-baselines` only after manifest update; do not claim G2 gate pass without full gate evidence.

**Status:** No human reviewer available in local integration; checksum CI path remains authoritative for automation. Gate **G2 not-run**.

## G2-LAYOUT-12 — absent reviewer hook

When no human is available, use the signed-checksum template at  
`evidence/gates/G2-feasibility/layout-visual-human-signoff-template.json` (`humanReviewStatus: "pending-human-signoff"`).

When a reviewer returns:

1. Fill `reviewerId`, `reviewedAt`, and `signedChecksumSha256` (SHA-256 of pinned `layout-visual-baseline-checksums.json` bytes).
2. Set `humanReviewStatus` to `"approved-by-human"` in the template (or copy fields into `layout-visual-baseline-manifest.json`).
3. Re-run `pnpm approve:layout-visual-baselines` only after manifest reflects human approval; gate **G2** remains **not-run** until full gate evidence exists.

## G2-LAYOUT-13 — simulated sign-off (local integration)

When no human reviewer is available but checksum pins exist:

```bash
cd domdoc-web && pnpm sign:layout-human-signoff
```

This writes `layout-visual-human-signoff-signed.json` with `signatureKind: "simulated-local-integration"`. That is **not** human visual review. Gate **G2 not-run**.
