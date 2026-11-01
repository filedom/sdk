# @domdoc/ui contracts

These values are frozen. A worker that needs one changed reports it to the coordinator and does not edit it. The machine-readable copies are `src/contracts.ts`, `schema/*.schema.json`, and `packages/core/src/headless.ts`. `src/contracts.test.ts` fails when this file and those constants drift apart.

## 1. Frameworks

Eleven frameworks, one example each under `examples/<id>`, package name `@domdoc/example-<id>`:

`react`, `next`, `preact`, `vue`, `nuxt`, `svelte`, `sveltekit`, `angular`, `solid`, `lit`, `astro`.

Registry source sets live under `registry/<set>/`. `domdoc add` picks the set from the framework:

| Framework | Registry set |
| --- | --- |
| react, next | react (Next adds `"use client"` to each copied component) |
| preact | preact |
| vue, nuxt | vue |
| svelte, sveltekit | svelte |
| angular | angular |
| solid | solid |
| lit | lit |
| astro | astro (island wrappers) |

## 2. Headless store (`@domdoc/core`)

`packages/core/src/headless.ts`, exported from the core entry:

```ts
function createViewerStore(viewer: DomdocViewer): ViewerStore;

interface ViewerStore {
  subscribe(listener: () => void): () => void;
  getSnapshot(): ViewerStoreSnapshot;
  run(actionId: string): ViewerStoreRunResult;
  readonly viewer: DomdocViewer;
  destroy(): void;
}

interface ViewerStoreSnapshot {
  status: "empty" | "loading" | "ready" | "error";
  document: {
    name?: string;
    format: Format;
    pageCount: number;
    capabilities: Capabilities;
    canUndo: boolean;
    canRedo: boolean;
  } | null;
  error: { code: string; detail: string } | null;
  zoom: number;
  theme: ThemeName;
  viewMode: ViewMode;
  selection: SelectionState | null;
  search: { query: string; hitCount: number; hitIndex: number };
  actions: Readonly<Record<string, { group: string; availability: "shown" | "hidden" | "disabled"; detail?: string }>>;
}

type ViewerStoreRunResult = { status: "applied" } | { status: "unsupported"; detail: string };
```

- The viewer is created with `toolbar: false`. The store is built only from `viewer.on(...)` events, the viewer's public getters, and `actionAvailability` from `toolbar-catalog.ts`.
- `subscribe` and `getSnapshot` follow React's `useSyncExternalStore`: `getSnapshot` returns the same object until a field changes, and each change produces a new object. Listeners are called with no arguments.
- `actions` has one entry per distinct action id in `TOOLBAR_CATALOG`. An id that appears in several groups (`deleteElement`, `deselectElement`) takes the first group whose availability is not `hidden`. `detail` is set whenever availability is not `shown`.
- `run(actionId)` runs a catalog action. An action that is not `shown`, or an id that is not in the catalog, returns `{ status: "unsupported", detail }` and does not touch the viewer. Calls that take arguments (`search(query)`, `setZoom(n)`, `setTheme(t)`, `open(source)`) go through `store.viewer`.
- `destroy()` detaches from viewer events. It does not destroy the viewer.
- Until the store lands, `createViewerStore` throws `DomdocError` with code `not-implemented`.
- The usage notice field is added by the usage contract wave, not here.

## 3. `data-slot` names

Every block renders these exact `data-slot` values in every framework. Tests and docs select on them. A control bound to a catalog action also sets `data-action="<action id>"`. When the action is `disabled` the control has the `disabled` attribute and its `title` is the `detail`. A `hidden` action's control may be left out.

| Slot | Catalog action | Block |
| --- | --- | --- |
| `viewer-shell` | | viewer-shell (carries `data-domdoc-state`) |
| `viewer-canvas` | | viewer-shell (element passed to `createViewer`) |
| `empty-state` | | viewer-shell |
| `dropzone` | | viewer-shell |
| `open-sample` | | viewer-shell (fetches the sample PDF) |
| `toolbar` | | toolbar |
| `undo` | `undo` | toolbar |
| `redo` | `redo` | toolbar |
| `zoom-controls` | | zoom-controls |
| `zoom-out` | `zoomOut` | zoom-controls |
| `zoom-label` | `zoomReset` | zoom-controls (shows the zoom as a percentage) |
| `zoom-in` | `zoomIn` | zoom-controls |
| `fit-width` | `fitWidth` | zoom-controls |
| `fit-page` | `fitPage` | zoom-controls |
| `search-bar` | | search-bar |
| `search-input` | `search` | search-bar |
| `search-prev` | `findPrev` | search-bar |
| `search-next` | `findNext` | search-bar |
| `search-count` | | search-bar |
| `mode-select` | | mode-select (options run `live`, `track`, `view`) |
| `theme-toggle` | `theme` | theme-toggle |
| `file-button` | `open` | file-button |
| `page-status` | | page-status |
| `usage-notice` | | painted by the viewer for the usage banner |

Primitives carry a default slot: `button`, `select`, `input`, `separator`, `tooltip`, `toggle-group`, `toggle-group-item`. When a block sets one of the slots above on a primitive, the block's slot replaces the default.

## 4. Readiness marker

The `viewer-shell` element carries `data-domdoc-state`, one of `empty`, `loading`, `ready`, `error`, `blocked`. It is `ready` once `viewer.open` resolves, and every example reaches `data-domdoc-state="ready"` after opening the sample. `blocked` is reserved for the usage blocklist.

## 5. `registry.json`

`packages/ui/registry.json`, validated by `schema/registry.schema.json`:

```json
{
  "$schema": "./schema/registry.schema.json",
  "name": "domdoc",
  "items": [
    {
      "name": "zoom-controls",
      "type": "block",
      "description": "Zoom out, zoom label, zoom in, fit width, fit page",
      "slots": ["zoom-controls", "zoom-out", "zoom-label", "zoom-in", "fit-width", "fit-page"],
      "registryDependencies": ["button", "domdoc-provider"],
      "files": {
        "react": [{ "path": "registry/react/zoom-controls.tsx", "target": "zoom-controls.tsx" }],
        "vue": [{ "path": "registry/vue/ZoomControls.vue", "target": "ZoomControls.vue" }]
      },
      "dependencies": { "react": ["lucide-react"], "vue": ["lucide-vue-next"] }
    }
  ]
}
```

- `type` is `lib` (`cn`), `primitive`, or `block`. Items: primitives `cn`, `button`, `select`, `input`, `separator`, `tooltip`, `toggle-group`; blocks `domdoc-provider`, `viewer-shell`, `toolbar`, `zoom-controls`, `search-bar`, `mode-select`, `theme-toggle`, `file-button`, `page-status`.
- `files` and `dependencies` are keyed by registry set. Every block has files for every set.
- `path` is relative to `packages/ui`. `target` is relative to `componentDir`, or to `aliases.lib` for `lib` items.
- `registryDependencies` names other items, which `domdoc add` installs first.
- `dependencies` lists npm packages still to install, as `name` or `name@range`. The only extra packages are `clsx`, `tailwind-merge`, and `lucide-*`, plus the framework adapter.

## 6. `domdoc.json`

Written by `domdoc init` at the project root, read by `domdoc add`, validated by `schema/domdoc.schema.json`:

```json
{
  "$schema": "https://domdoc.io/sdk-docs/schema/domdoc.schema.json",
  "framework": "vue",
  "componentDir": "src/components/domdoc",
  "css": "src/style.css",
  "aliases": { "components": "@/components/domdoc", "lib": "@/lib" }
}
```

All four fields are required. `framework` is one of the eleven ids. `css` is the stylesheet that imports `@domdoc/ui/theme.css`.

## 7. `domdoc-example.json`

Each `examples/<fw>/domdoc-example.json`, validated by `schema/domdoc-example.schema.json`:

```json
{
  "$schema": "../../packages/ui/schema/domdoc-example.schema.json",
  "framework": "vue",
  "label": "Vue",
  "logo": "logo.svg",
  "install": "npm install @domdoc/core @domdoc/vue",
  "add": "npx @domdoc/ui add viewer-shell toolbar",
  "files": [
    { "path": "src/App.vue", "role": "page" },
    { "path": "src/style.css", "role": "css" },
    { "path": "vite.config.ts", "role": "config" }
  ]
}
```

- `framework` equals the directory name. `logo` is an SVG relative to the example directory.
- `files` is shown as code tabs in order, with exactly one `page`. Paths are relative to the example directory, and a missing file fails the docs build.

## 8. Site URL contract

One base everywhere: local serve, tests, and production.

| Path | What |
| --- | --- |
| `/sdk-docs/` | Docs site (Docusaurus, `trailingSlash: true`) |
| `/sdk-docs/playground/` | Playground. `?fw=<id>` selects the framework and its code. An unknown value falls back to `react` |
| `/sdk-docs/licensing/` | Licensing page |
| `/sdk-docs/examples/<fw>/` | Built example |
| `/sdk-docs/samples/hello.pdf` | Sample PDF |
| `/api/bundles/<version>/` | Bundles |

- Examples load bundles from `bundlesFromCdn(DOMDOC_EXAMPLES_BUNDLES ?? "/api/bundles/<version>")`, fixed at build time.
- `serve-examples` maps `/api/bundles/<version>/*` to `--bundles <dir>` or proxies `DOMDOC_CDN` (default `https://domdoc.io/api/bundles`).
- Nothing loads from `/wasm/`. It is blocked in production and `serve-examples` returns 404 for it.
