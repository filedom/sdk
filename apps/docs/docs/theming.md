---
sidebar_position: 8
title: Theming
description: "The editor starts in the FileDOM theme: paper, ink, and logo blue. Light and dark can follow the host."
---

# Theming

The editor starts in the FileDOM theme. That is the website palette: cool paper, ink, and the logo blue, set in Saira. Light and dark follow the host. Pass `theme: "system"` to follow the operating system, `"light"` or `"dark"` to keep one mode, or omit it to start light.

View → Settings opens in the center of the window. Appearance lists the built-in palettes, then Interface and Document colors.

| Palette | Id | What it looks like |
| --- | --- | --- |
| FileDOM | `filedom` | Website light. The default. |
| FileDOM Dark | `filedom-dark` | Website dark. |
| Paper | `paper` | Warm paper and a forest accent. |
| Ink | `ink` | The same warm palette, for a dark room. |

## Interface and document

Interface colors paint the toolbar, panels, and the well around the page. Document colors paint the page the viewer draws: the page background, the ink, and the marks for inserted text, deleted text, and search.

A file's own picture stays as stored. A PDF page is a bitmap from the engine, so a document color does not recolor those pixels. It does recolor a flow page, the sheet behind the page, and the text the viewer draws.

`ui` and `document` are separate. Setting a page color does not change the toolbar, and setting a toolbar color does not change the page.

```ts
viewer.setTheme("paper");

viewer.setTheme({
  preference: "dark",
  ui: {
    accent: "#7c9ae6",
    background: "#05080c",
    surface: "#101820",
    text: "#f4f8fb",
    canvas: "#101820",
    radius: "0.45rem",
    font: '"Saira","Segoe UI",sans-serif',
  },
  document: {
    page: "#fffef8",
    ink: "#07131c",
  },
});
```

A `--dd-*` variable on the mount element wins over `ui` and `document`.

The interface tokens are `accent`, `background`, `surface`, `surface-raised`, `text`, `text-muted`, `border`, `hover`, `canvas`, `control`, `control-down`, `field`, `radius`, and `font`.

The document tokens are `page`, `ink`, `caret`, `caret-width`, `canvas-fill`, `ins`, `del`, `search`, and `search-active`.

`page` is the sheet behind the canvas. `caret` and `caret-width` style the HTML caret. `ins` and `del` style the HTML marks for tracked changes. `canvas-fill` is optional: leave it unset and the canvas stays transparent. The glyphs, pictures, and the file's own highlights stay the colors stored in the file.

The `theme` event reports the mode on screen: `light` or `dark`.

```ts
viewer.on("theme", (event) => {
  event.theme; // "light" | "dark"
});
```
