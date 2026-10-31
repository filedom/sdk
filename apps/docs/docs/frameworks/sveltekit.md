---
title: Sveltekit
---

# Sveltekit

Mount only. The UI comes from `@domdoc/core`.

```ts
import { bundlesFromCdn } from "@domdoc/core";
import { DomdocViewer } from "@domdoc/sveltekit-host";

const options = { bundles: bundlesFromCdn("https://cdn.example.com/domdoc/v1") };
```

See the package README for the exact tag or component name in this host.
