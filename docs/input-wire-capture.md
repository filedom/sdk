# Input wire capture (G3-INPUT-11)

Documents how IME/screen-reader events map to wire-level capture records for gate **G3** evidence. Gate stays **not-run** until non-synthetic logs validate per [ime-sr-platform-capture.md](./ime-sr-platform-capture.md).

## Record shape

Each capture file is JSON with:

| Field | Required | Notes |
| --- | --- | --- |
| `formatVersion` | yes | Matches `INPUT_EVIDENCE_FORMAT_VERSION` in core |
| `slotId` | yes | `IME-01-real`, `IME-02-real`, or `SR-01-real` |
| `platform` | yes | e.g. `macos`, `windows`, `voiceover` |
| `capturedAt` | yes | ISO-8601 timestamp |
| `synthetic` | yes | **Must be `false` for real slots** |
| `entries` | yes | Array of `CapturedInputLogEntry` |

## Synthetic vs real

| Kind | `synthetic` | Use |
| --- | --- | --- |
| Template / CI scaffold | `true` | `evidence/gates/G3-feasibility/logs/*-synthetic-example.json` |
| Platform capture | `false` | Paths listed in `ime-sr-real-log-slots.json` after manual capture |

`validateRealPlatformInputLog` rejects any entry with `synthetic: true` for real slots.

## Example files (synthetic)

- `evidence/gates/G3-feasibility/logs/ime-01-macos-synthetic-example.json`
- `evidence/gates/G3-feasibility/logs/sr-01-voiceover-synthetic-example.json`

These are **explicitly marked synthetic** and must not be cited as gate pass evidence.
