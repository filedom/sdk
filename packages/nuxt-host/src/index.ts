import { defineAsyncComponent } from "vue";

export type { Viewer, ViewerOptions } from "@filedom/vue";

/**
 * Lazily loaded viewer for Nuxt pages. Wrap it in `<ClientOnly>` so SSR never touches
 * the DOM or wasm: `<ClientOnly><FiledomClientViewer :options="options" /></ClientOnly>`.
 */
export const FiledomClientViewer = defineAsyncComponent(() => import("@filedom/vue").then((m) => m.FiledomViewer));
