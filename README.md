# sdk

Public SDK for embedding the filedom viewer. Install an adapter (or `@filedom/core`)
and point it at the CDN that hosts the private format bundles. This repository
does not contain the engine.

Integrator docs (install, events, files, modes, toolbars, components, frameworks)
live in [apps/docs](apps/docs). From the repo root: `pnpm --filter @filedom/docs start`.

What the viewer implements today, and the bar it is being built toward, is the
feature programme in the private engine repo:
`../wasm/docs/Filedom_Feature_Programme.md`. Agents execute
`../wasm/docs/Filedom_Delivery_Workflow.md` and the SDK prompt in
[docs/SDK_PROMPT.md](docs/SDK_PROMPT.md). The viewer opens PDF, DOC, DOCX, XLS, XLSX, PPT and PPTX (select, highlight,
tracked text edit, download, live DOM components). It is not yet the Apryse or
Nutrient web SDK, and gates G1–G5 are not passed.

| Package | Role |
| --- | --- |
| `@filedom/core` | `createViewer`, `bundlesFromCdn`, `FileStore`, `ComponentRegistry` |
| `@filedom/react`, `preact`, `vue`, `solid`, `svelte`, `lit`, `angular` | framework wrappers around `createViewer` |
| `@filedom/next-host`, `nuxt-host`, `sveltekit-host`, `astro-host` | SSR-safe client boundaries |

## Usage

```ts
import { bundlesFromCdn, createViewer } from "@filedom/core";

const viewer = createViewer(document.querySelector("#viewer")!, {
  bundles: bundlesFromCdn("https://cdn.example.com/filedom/v1"),
  author: "Ana",
});

await viewer.open(fileFromInput); // File | Blob | bytes | URL | FileStore id
viewer.download();
```

`bundlesFromCdn` loads `{base}/pdf/filedom_pdf.js`. The PDF renderer is inside that module's wasm,
so a PDF open does not fetch a second wasm. Office formats load their own glue module.
Each `.wasm` file sits beside its glue module. A PDF open does not download
the office bundle.

Framework adapters take the same options:

```tsx
import { bundlesFromCdn } from "@filedom/core";
import { FiledomViewer } from "@filedom/react";

<FiledomViewer options={{ bundles: bundlesFromCdn("https://cdn.example.com/filedom/v1") }} />
```

The viewer handles open, selection, highlight, comments, `replace` / `format` /
`setParagraph` where the open file's capabilities allow them, track changes,
search, zoom, download and DOM components placed on the page. PDF accepts
`replace` and returns `unsupported` for character and paragraph style. Component
placements are not saved in the file yet. Selecting text in a PDF or an Office
file offers Highlight and Comment. Highlight emits `highlight`. A comment on
that passage emits `annotation`. Events: `open`, `close`, `change`,
`selection`, `highlight`, `annotation`, `error`, `export`, `zoom`, `theme`.

## Develop

```bash
pnpm install
pnpm build && pnpm test
```
