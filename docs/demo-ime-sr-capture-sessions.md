# Demo IME / SR capture sessions (G3-INPUT-17)

Full **physical-host** capture for gate **G3** is still **not-run**. This doc describes the demo shell workflow and how **synthetic** fuller session payloads validate in CI.

## Demo shell hooks

| Dataset | Location |
| --- | --- |
| Session id | `document.body.dataset.m2SessionId` (`packages/demo/src/main.ts`) |
| Toolbar session | `document.body.dataset.m2ToolbarSessionId` |
| IME hidden input | `#domdoc-ime-input` |

## Real capture (not-run)

1. Open `packages/demo` dev server on macOS / Windows with VoiceOver or NVDA.
2. Follow [platform-log-capture-checklist.md](./platform-log-capture-checklist.md).
3. Export from demo shell via `projectPhysicalDemoCaptureToRealSlotFile` (non-synthetic entries only).
4. Write to real slot paths (`ime-01-real-empty.json`, etc.) or `*-real-capture-pending.json` stubs.
5. Run `pnpm --filter @domdoc/core test input-evidence-demo-real` and `input-platform-log`.

## Synthetic fuller sessions (labeled)

Use `validateSyntheticDemoInputSessionFile` in `@domdoc/core` for CI-safe payloads:

- `evidence/gates/G3-feasibility/logs/ime-demo-macos-synthetic-session.json`
- `evidence/gates/G3-feasibility/logs/sr-demo-voiceover-synthetic-session.json`

These files set `synthetic: true` at file and entry level. They **must not** be cited as gate pass evidence.
