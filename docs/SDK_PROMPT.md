# sdk — SDK prompt

Revision: **18 October 2026**.

This repository is the public viewer and the framework adapters. The engine, fixtures, visual corpus and delivery lanes live in the sibling `wasm` repository. When both trees are checked out, execute one ready lane of `../wasm/docs/Filedom_Delivery_Workflow.md`. A red lane blocks only lanes that name it. The feature list is `../wasm/docs/Filedom_Feature_Programme.md`. Do not copy engine source, fixtures, or `pkg/` into this repo. Do not edit `engine-types.ts` unless you are the contract lane. Do not raise `VISUAL_MAX_DIFF`.

## What this repo owns

- Forward browser events to the session `handle`. Apply the events it returns.
- Paint, text layer, toolbar, review panel, component layer, file shelf.
- `bundlesFromCdn`. A PDF open must not fetch the DOCX or DOC bundle.
- Eleven adapters. Each one constructs and destroys `createViewer` and contains no document logic.

## What this repo must not grow

- A second document model, hit-tester, caret mover, or format detector. `viewer.ts` still calls some of those helpers. New work deletes a call site or leaves it. It does not add another. The event shell lane is green.
- Format-specific branches. Enable a control from `DocInfo.capabilities`. PDF `format` and `setParagraph` stay `unsupported` until the engine says otherwise.
- A claim that a gate (G1–G5) has passed, or that the viewer matches Apryse or Nutrient. The allowed sentence is the one the active lane has turned green.

## Contract

`packages/core/src/engine-types.ts` mirrors the engine. Commands today: `replace`, `format`, `setParagraph`, `highlight`, `setTrackChanges`, `accept`, `reject`, `acceptAll`, `rejectAll`, `undo`, `redo`. Changing that list without the engine change is a bug.

## Tests that count

A change a user can see needs a test that asserts the expected result from the active lane. In this repo that is a vitest which does not need the private fixtures: lifecycle, capability flags, event forwarding, chrome presets once they exist. Browser journeys and visual diffs run in `wasm/host` against local bundles.

```bash
pnpm install && pnpm build && pnpm test
```

## Done

The lane’s SDK exit tests pass, adapters still only manage lifecycle, and the handoff in the engine repo names what this repo changed.
