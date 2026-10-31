import type { DomdocActionParams } from "@domdoc/svelte";

export type { DomdocActionParams, Viewer, ViewerOptions } from "@domdoc/svelte";

/**
 * SvelteKit-safe action: the SDK is imported on mount, so SSR bundles never include
 * DOM or wasm code. `<div use:domdocClient={{ options }} style="height:100%"></div>`
 */
export function domdocClient(node: HTMLElement, params: DomdocActionParams) {
  let current = params;
  let action: ReturnType<typeof import("@domdoc/svelte").domdoc> | undefined;
  let destroyed = false;
  const ready = import("@domdoc/svelte").then(({ domdoc }) => {
    if (!destroyed) action = domdoc(node, current);
  });
  return {
    ready,
    update(next: DomdocActionParams) {
      current = next;
      action?.update(next);
    },
    destroy() {
      destroyed = true;
      action?.destroy();
    },
  };
}
