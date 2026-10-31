import { createViewer, type DomdocViewer as Viewer, type ViewerOptions } from "@domdoc/core";

export type { Viewer, ViewerOptions };

export interface DomdocActionParams {
  options: ViewerOptions;
  onReady?: (viewer: Viewer) => void;
}

/** Svelte action: `<div use:domdoc={{ options, onReady }} style="height:100%"></div>` */
export function domdoc(node: HTMLElement, params: DomdocActionParams) {
  let current = params;
  let viewer = createViewer(node, params.options);
  params.onReady?.(viewer);
  return {
    update(next: DomdocActionParams) {
      if (next.options !== current.options) {
        viewer.destroy();
        viewer = createViewer(node, next.options);
        next.onReady?.(viewer);
      }
      current = next;
    },
    destroy() {
      viewer.destroy();
    },
  };
}
