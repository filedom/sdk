---
sidebar_position: 1
title: Install
---

# Install

```bash
pnpm add @domdoc/core
```

Point the viewer at the CDN that hosts the format bundles, then mount it:

```ts
import { bundlesFromCdn, createViewer } from "@domdoc/core";

const viewer = createViewer(document.querySelector("#viewer")!, {
  bundles: bundlesFromCdn("https://cdn.example.com/domdoc/v1"),
  author: "Ana",
});

await viewer.open(fileFromInput);
```

`bundlesFromCdn` loads `{base}/{format}/domdoc_{format}.js` when a file of that kind opens. The empty editor mounts only the chrome until a file opens.

Framework packages take the same options and only mount the viewer. The playground has the source for each one. The UI itself lives in `@domdoc/core`.
