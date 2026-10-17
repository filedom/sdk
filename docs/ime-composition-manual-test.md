# IME / composition manual test plan (G3-INPUT-06 / G3-INPUT-07)

Automated Playwright cannot drive real OS IME in CI. Use this checklist with `@domdoc/demo` before claiming G3 pass.

Evidence scaffolds (honest **not-run** until logs exist):

- `evidence/gates/G3-feasibility/ime-01-02-fixtures.json` (`formatVersion: 1`, validated by `input-evidence-scaffold.test.ts`)
- `evidence/gates/G3-feasibility/sr-evidence-scaffold.json` (`formatVersion: 1`)

## Setup

1. `cd domdoc-web && pnpm --filter @domdoc/demo dev`
2. Open the demo URL; confirm `data-engine-ready=true` and `data-caret-offset` is set after canvas click.

## Manual cases

| ID | Steps | Expected |
| --- | --- | --- |
| IME-01 | Focus hidden `#domdoc-ime-input`, start macOS/Windows IME, type CJK preedit | `data-composition-state=active`, `data-composition-preedit` updates |
| IME-02 | Commit preedit | `data-composition-state=committed`, `data-caret-offset` increases by inserted length |
| IME-03 | Cancel IME (Esc) | Preedit clears; caret unchanged (stub — full cancel wiring follow-on) |
| SR-01 | VoiceOver/NVDA on canvas + input | Input region announced; not a G3 pass without recorded SR log |

## Playwright subset

`e2e/demo-caret-composition.spec.ts` asserts caret dataset wiring without OS IME.

Gate **G3** remains **not-run** until IME-01/02 pass on target platforms with evidence logs.
