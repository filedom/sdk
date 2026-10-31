---
title: Svelte
---

# Svelte

Mount only. The UI comes from `@domdoc/core`.

```ts
import { bundlesFromCdn } from "@domdoc/core";
import { DomdocViewer } from "@domdoc/svelte";

const options = { bundles: bundlesFromCdn("https://cdn.example.com/domdoc/v1") };
```

See the package README for the exact tag or component name in this host.
