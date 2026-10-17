# Platform log capture checklist (G3-INPUT-15)

Real IME/SR logs for gate **G3** remain **not-run** until capture sessions are **full demo runs** (not minimal partial fills).

| Slot | Path | Status (2026-10-17) | Action |
| --- | --- | --- | --- |
| IME-01-real | `evidence/gates/G3-feasibility/logs/ime-01-real-empty.json` | **filled-validated** (partial macOS composition) | Extend with full demo session per `ime-sr-platform-capture.md` |
| IME-02-real | `evidence/gates/G3-feasibility/logs/ime-02-real-empty.json` | **filled-validated** (partial Windows IME) | Re-capture on physical Windows host |
| SR-01-real | `evidence/gates/G3-feasibility/logs/sr-01-real-empty.json` | **filled-validated** (partial VoiceOver) | Full VoiceOver navigation session per template |

Validate locally:

```bash
cd domdoc-web && pnpm --filter @domdoc/core test input-platform-log
```

Gate **G3 not-run** until all slots report `filled-validated`.
