# Layout visual human sign-off — escalation (G2-LAYOUT-14)

Gate **G2 not-run** until a **real** human approves baselines (not CI-simulated checksum only).

## Required path

1. Run `pnpm generate:layout-visual-baselines` and review PNG/JSON under `evidence/gates/G2-feasibility/layout-visual/`.
2. Designer or layout owner fills `docs/layout-visual-human-signoff.md` (name, date, corpus version).
3. Run `pnpm sign:layout-human-signoff` with `LAYOUT_SIGNOFF_MODE=human` (refuses simulated-only signatures).
4. Attach reviewer notes to `layout-visual-human-signoff-signed.json` with `"signatureKind": "human"`.
5. **G2-LAYOUT-16:** Coordinator runs sign-off with `LAYOUT_SIGNOFF_COORDINATOR_ACCEPT=1` and `LAYOUT_SIGNOFF_COORDINATOR_ID` (sets `coordinator-accepted-workflow` — still **not** a visual pass).
6. **G2-LAYOUT-17:** Reviewer may self-attest pinned PNG review with `LAYOUT_SIGNOFF_VISUAL_REVIEW_COMPLETE=1` (sets `human-visual-review-attested` — **workflow only**, gate **G2 not-run**).
7. **G2-LAYOUT-18:** Independent human PNG review **outside** CI attestation flags — `LAYOUT_INDEPENDENT_REVIEWER_ID=… pnpm record:layout-independent-png-review` → `layout-visual-independent-human-png-review.json` (still **not** gate pass).
8. **G2-LAYOUT-19:** Coordinator accepts independent PNG packet — `LAYOUT_INDEPENDENT_COORDINATOR_ACCEPT=1 LAYOUT_INDEPENDENT_COORDINATOR_ID=… pnpm accept:layout-independent-png-review` (distinct from G2-LAYOUT-16; still **not** gate pass).

## Escalation (if blocked)

| Blocker | Owner | Action |
| --- | --- | --- |
| No Parley demo fonts on reviewer machine | Web | Ship pinned corpus + `pnpm record:layout-visual-diff` artifacts only |
| Baseline drift after engine bump | WASM + Web | Bump `layout-visual-baseline-manifest.json` with written rationale |
| Simulated sign-off only | Coordinator | Do **not** mark G2 pass; keep gate **not-run** |

Until step 3 completes with `signatureKind: human`, automated checksum approval (`approve:layout-visual-baselines`) remains **CI-simulated** only.
