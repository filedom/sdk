# IME / screen reader log capture (G3-INPUT-10)

Real input evidence slots are defined in `packages/core/src/input/input-evidence-real-log-slots.ts` and recorded in `evidence/gates/G3-feasibility/ime-sr-real-log-slots.json`. Gate **G3** stays **not-run** until non-synthetic logs validate.

## IME-01 (macOS)

1. Open `packages/demo` dev shell with composition logging enabled (see [ime-composition-manual-test.md](./ime-composition-manual-test.md)).
2. Switch to a CJK IME; compose a short phrase without committing mid-composition.
3. Export JSON log with fields: `compositionstart`, `compositionupdate`, `compositionend`, plus `data-composition-state`, `data-composition-preedit`, `caretOffset`.
4. Set `synthetic: false` on every entry; include `platform: macos` and `capturedAt` ISO timestamp in file metadata.
5. Save under `evidence/gates/G3-feasibility/logs/ime-01-macos.json` and update slot `logPath` in the manifest (manual step).

## IME-02 (Windows)

1. Repeat IME-01 flow on Windows with Microsoft Pinyin or equivalent.
2. Required events include `input` after `compositionend` when text commits.
3. Validate with `validateRealPlatformInputLog` for slot `IME-02-real`.

## SR-01 (VoiceOver)

1. Focus the demo canvas; navigate with VoiceOver rotor.
2. Capture `focusin`, `aria-live`, and `selectionchange` with `role`, `name`, `value`, `caretDescription`.
3. Label assistive tech as `voiceover`; reject synthetic entries.

## Validator

Use `validateRealPlatformInputLog(slot, entries, { platform, capturedAt })` — synthetic logs are rejected for real slots.
