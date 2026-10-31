# domdoc-sdk — public SDK

Viewer, file store, and framework adapters. The engine is the sibling repository `domdoc-wasm`. This repo loads built bundles from the CDN via `bundlesFromCdn` and must not contain engine source, fixtures, or `pkg/`.

| Read | Why |
| --- | --- |
| [docs/SDK_PROMPT.md](docs/SDK_PROMPT.md) | What this repo may change |
| `../domdoc-wasm/docs/Domdoc_Delivery_Workflow.md` | The lane to execute, with the test that proves it |
| `../domdoc-wasm/docs/Domdoc_Feature_Programme.md` | Current behaviour and the bar past Apryse and Nutrient |
| `.cursor/rules/sdk.mdc` | Page is an event applicator; adapters are lifecycle only |

## Invariants

- Document decisions stay in the engine. Do not add hit-testing, caret movement, key interpretation, or format detection here.
- Commands and views in `packages/core/src/engine-types.ts` stay in step with `domdoc-wasm/crates/core/src/model.rs`.
- One workflow lane per session. Take a lane whose dependencies are green. A red ink suite blocks only the lanes that name it. Do not edit `engine-types.ts` unless you are the contract lane. Do not raise `VISUAL_MAX_DIFF`.
- Gates G1–G5 are not passed. Do not claim them.

## Commands

```bash
pnpm install && pnpm build && pnpm test
```

Browser and visual proof run in `domdoc-wasm/host` after `node scripts/build-bundles.mjs`.
