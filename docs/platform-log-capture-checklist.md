# Platform log capture checklist (G3-INPUT-14)

Real IME/SR logs for gate **G3** remain **not-run** until all slots pass ingestion with non-empty entries.

| Slot | Path | Status (2026-10-17) | Action |
| --- | --- | --- | --- |
| IME-01-real | `evidence/gates/G3-feasibility/logs/ime-01-real-empty.json` | **partial fill** (macOS composition events) | Extend with full demo session per `ime-sr-platform-capture.md` |
| IME-02-real | `evidence/gates/G3-feasibility/logs/ime-02-real-empty.json` | empty-validated | Capture on Windows with IME-02 template |
| SR-01-real | `evidence/gates/G3-feasibility/logs/sr-01-real-empty.json` | empty-validated | Capture VoiceOver session per template |

Validate locally:

```bash
cd domdoc-web && pnpm --filter @domdoc/core test input-platform-log
```

Gate **G3 not-run** until all slots report `filled-validated`.
