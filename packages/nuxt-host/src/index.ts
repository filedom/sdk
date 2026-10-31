import { defineAsyncComponent } from "vue";

export type { Viewer, ViewerOptions } from "@domdoc/vue";

/**
 * Lazily loaded viewer for Nuxt pages. Wrap it in `<ClientOnly>` so SSR never touches
 * the DOM or wasm: `<ClientOnly><DomdocClientViewer :options="options" /></ClientOnly>`.
 */
export const DomdocClientViewer = defineAsyncComponent(() => import("@domdoc/vue").then((m) => m.DomdocViewer));
