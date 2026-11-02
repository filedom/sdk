---
sidebar_position: 1
title: Install
---

# Install

```bash
pnpm add @filedom/core
```

Point the viewer at the CDN that hosts the format bundles, then mount it:

```ts
import { bundlesFromCdn, createViewer } from "@filedom/core";

const viewer = createViewer(document.querySelector("#viewer")!, {
  bundles: bundlesFromCdn("https://cdn.example.com/filedom/v1"),
  author: "Ana",
});

await viewer.open(fileFromInput);
```

`bundlesFromCdn` loads `{base}/{format}/filedom_{format}.js` when a file of that kind opens. The empty editor mounts only the chrome until a file opens.

Framework packages take the same options and only mount the viewer. The playground has the source for each one. The UI itself lives in `@filedom/core`.
