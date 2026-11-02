/** Frozen UI kit contract values. CONTRACTS.md is the prose version; contracts.test.ts keeps them in step. */

/** One example app per id under `examples/<id>`, and one `filedom.json` `framework` value. */
export const FRAMEWORKS = [
  "react",
  "next",
  "preact",
  "vue",
  "nuxt",
  "svelte",
  "sveltekit",
  "angular",
  "solid",
  "lit",
  "astro",
] as const;

export type FrameworkId = (typeof FRAMEWORKS)[number];

/** Source sets under `registry/<set>/`. */
export const REGISTRY_SETS = ["react", "preact", "vue", "svelte", "angular", "solid", "lit", "astro"] as const;

export type RegistrySetId = (typeof REGISTRY_SETS)[number];

/** The set `filedom add` copies for each framework. Next adds `"use client"` to the React set. */
export const FRAMEWORK_REGISTRY_SET: Readonly<Record<FrameworkId, RegistrySetId>> = {
  react: "react",
  next: "react",
  preact: "preact",
  vue: "vue",
  nuxt: "vue",
  svelte: "svelte",
  sveltekit: "svelte",
  angular: "angular",
  solid: "solid",
  lit: "lit",
  astro: "astro",
};

/**
 * `data-slot` values rendered by the filedom blocks, identical in every framework.
 * Keys are slot names; values are the `TOOLBAR_CATALOG` action the control runs, or null.
 */
export const BLOCK_SLOTS = {
  "viewer-shell": null,
  "viewer-canvas": null,
  "empty-state": null,
  dropzone: null,
  "open-sample": null,
  toolbar: null,
  undo: "undo",
  redo: "redo",
  "zoom-controls": null,
  "zoom-out": "zoomOut",
  "zoom-label": "zoomReset",
  "zoom-in": "zoomIn",
  "fit-width": "fitWidth",
  "fit-page": "fitPage",
  "search-bar": null,
  "search-input": "search",
  "search-prev": "findPrev",
  "search-next": "findNext",
  "search-count": null,
  "mode-select": null,
  "theme-toggle": "theme",
  "file-button": "open",
  "page-status": null,
  "usage-notice": null,
} as const satisfies Record<string, string | null>;

export type BlockSlot = keyof typeof BLOCK_SLOTS;

export const DATA_SLOTS = Object.keys(BLOCK_SLOTS) as BlockSlot[];

/** Default `data-slot` on primitives. A block's own slot replaces it on the same element. */
export const PRIMITIVE_SLOTS = ["button", "select", "input", "separator", "tooltip", "toggle-group", "toggle-group-item"] as const;

/** Registry items. Every block exists in every registry set. */
export const REGISTRY_PRIMITIVES = ["cn", "button", "select", "input", "separator", "tooltip", "toggle-group"] as const;

export const REGISTRY_BLOCKS = [
  "filedom-provider",
  "viewer-shell",
  "toolbar",
  "zoom-controls",
  "search-bar",
  "mode-select",
  "theme-toggle",
  "file-button",
  "page-status",
] as const;

/** Attribute on the `viewer-shell` element. */
export const STATE_ATTRIBUTE = "data-filedom-state";

/** `blocked` is reserved for the usage blocklist. */
export const FILEDOM_STATES = ["empty", "loading", "ready", "error", "blocked"] as const;

export type FiledomState = (typeof FILEDOM_STATES)[number];

export const READY_STATE: FiledomState = "ready";

/** One base path everywhere: local serve, tests, production. */
export const SITE_BASE = "/sdk-docs/";
export const PLAYGROUND_PATH = "/sdk-docs/playground/";
export const LICENSING_PATH = "/sdk-docs/licensing/";
export const SAMPLE_PDF_PATH = "/sdk-docs/samples/hello.pdf";
export const BUNDLES_BASE = "/api/bundles/";
/** Overrides the bundle base when an example is built. */
export const BUNDLES_ENV = "FILEDOM_EXAMPLES_BUNDLES";
/** Upstream that `serve-examples` proxies `/api/bundles/*` to without `--bundles`. */
export const DEFAULT_CDN = "https://filedom.io/api/bundles";
/** Nothing may load from here; it is blocked in production. */
export const FORBIDDEN_PREFIX = "/wasm/";

export function examplePath(fw: FrameworkId): string {
  return `${SITE_BASE}examples/${fw}/`;
}

export function frameworkDocPath(fw: FrameworkId): string {
  return `${SITE_BASE}frameworks/${fw}/`;
}

export function bundlesPath(version: string): string {
  return `${BUNDLES_BASE}${version}/`;
}

export const EXAMPLE_MANIFEST = "filedom-example.json";
export const PROJECT_CONFIG = "filedom.json";
