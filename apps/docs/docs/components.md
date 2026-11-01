---
sidebar_position: 6
title: Components
---

# Components

Register a component, then place it on the open document. `props` is the input your factory receives.

```ts
viewer.registerComponent("note", ({ container, props }) => {
  const el = document.createElement("aside");
  el.textContent = String(props.text ?? "");
  container.append(el);
  return {
    element: el,
    update(next) {
      el.textContent = String(next.text ?? "");
    },
    destroy() {
      el.remove();
    },
  };
});

viewer.on("open", () => {
  viewer.placeComponent({
    type: "note",
    props: { text: "Review" },
    position: { mode: "page", page: 0, x: 72, y: 72 },
  });
});
```

`placeComponent` returns an id. `updateComponent(id, patch)` changes that placement. `removeComponent(id)` takes it off the page.

| Field | Meaning |
| --- | --- |
| `type` | The name passed to `registerComponent` |
| `props` | Values your factory reads from `context.props` |
| `position` | Where it sits. See the modes below |
| `width`, `height` | A number of points, or `"72pt"`, `"120px"`, `"50%"`. `height: "auto"` measures the element |
| `zoom` | `scale` (default), `resize`, or `fixed` |
| `interactive` | `false` lets clicks pass through to the text |
| `label` | Accessible name of the region |

| `position.mode` | Where it sits |
| --- | --- |
| `page` | A fixed point on a page: `{ page, x, y }` |
| `anchor` | Follows a text position: `{ anchor, dx?, dy? }` |
| `block` | A band between paragraphs |
| `inline` | Inside a line, like a character |
| `float` | Beside the text: `{ anchor, side: "left" \| "right" }` |

`block`, `inline`, and `float` reflow the text when the open format supports it. Otherwise they sit as overlays on the anchor. The factory also receives `context.document` and `context.files`.
