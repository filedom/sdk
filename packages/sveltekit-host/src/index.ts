import type { FiledomActionParams } from "@filedom/svelte";

export type { FiledomActionParams, Viewer, ViewerOptions } from "@filedom/svelte";

/**
 * SvelteKit-safe action: the SDK is imported on mount, so SSR bundles never include
 * DOM or wasm code. `<div use:filedomClient={{ options }} style="height:100%"></div>`
 */
export function filedomClient(node: HTMLElement, params: FiledomActionParams) {
  let current = params;
  let action: ReturnType<typeof import("@filedom/svelte").filedom> | undefined;
  let destroyed = false;
  const ready = import("@filedom/svelte").then(({ filedom }) => {
    if (!destroyed) action = filedom(node, current);
  });
  return {
    ready,
    update(next: FiledomActionParams) {
      current = next;
      action?.update(next);
    },
    destroy() {
      destroyed = true;
      action?.destroy();
    },
  };
}
