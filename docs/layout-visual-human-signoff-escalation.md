# Layout visual human sign-off — escalation (G2-LAYOUT-14)

Gate **G2 not-run** until a **real** human approves baselines (not CI-simulated checksum only).

## Required path

1. Run `pnpm generate:layout-visual-baselines` and review PNG/JSON under `evidence/gates/G2-feasibility/layout-visual/`.
2. Designer or layout owner fills `docs/layout-visual-human-signoff.md` (name, date, corpus version).
3. Run `pnpm sign:layout-human-signoff` with `LAYOUT_SIGNOFF_MODE=human` (refuses simulated-only signatures).
4. Attach reviewer notes to `layout-visual-human-signoff-signed.json` with `"signatureKind": "human"`.

## Escalation (if blocked)

| Blocker | Owner | Action |
| --- | --- | --- |
| No Parley demo fonts on reviewer machine | Web | Ship pinned corpus + `pnpm record:layout-visual-diff` artifacts only |
| Baseline drift after engine bump | WASM + Web | Bump `layout-visual-baseline-manifest.json` with written rationale |
| Simulated sign-off only | Coordinator | Do **not** mark G2 pass; keep gate **not-run** |

Until step 3 completes with `signatureKind: human`, automated checksum approval (`approve:layout-visual-baselines`) remains **CI-simulated** only.
