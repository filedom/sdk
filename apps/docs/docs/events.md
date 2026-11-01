---
sidebar_position: 2
title: Events
---

# Events

`viewer.on` subscribes to one event and returns a function that removes that listener. The payload is the only argument.

```ts
const stop = viewer.on("open", ({ document }) => {
  document.info();
});
```

| Event | When it fires | Payload |
| --- | --- | --- |
| `loading` | `open` has started | `{ name? }` |
| `open` | The file is open | `{ document }` |
| `close` | The file is closed | `{}` |
| `change` | An edit is applied | `{ command, result }` |
| `selection` | The selection changes | `SelectionState` or `null` |
| `highlight` | A highlight is applied or cleared | `{ color, text, ranges, anchor, focus }` |
| `annotation` | A comment is attached to a highlight | `{ id, text, quote, ranges, anchor, focus }` |
| `replaceImage` | The host can swap the selected image | `{ id, page, file }` |
| `error` | Open or a command fails | `{ error }` |
| `export` | The edited file is exported | `{ name, blob }` |
| `zoom` | The zoom changes | `{ zoom }` |
| `theme` | The palette on screen changes | `{ theme }` |
| `viewMode` | The mode changes | `{ mode }` is `live`, `track`, or `view` |
| `search` | A search moves to a hit | `{ query, hitCount, hitIndex }` |

`hitIndex` is zero-based, or `-1` when there are no hits. `highlight.color` is `null` when the highlight was cleared.
