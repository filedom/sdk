---
sidebar_position: 6
title: Components
---

# Components

Every visible control fires one catalog event. Extend a control or register a new one through `ComponentRegistry`:

```ts
import { ComponentRegistry, createViewer } from "@domdoc/core";

const components = new ComponentRegistry();
components.register("my-toolbar-button", (ctx) => {
  const el = document.createElement("button");
  el.textContent = "Custom";
  el.addEventListener("click", () => ctx.emit?.("search", { text: "" }));
  return { el, destroy() { el.remove(); } };
});

createViewer(host, { bundles, components });
```

There is no second plugin system. Framework wrappers stay thin mounts of `createViewer`.
