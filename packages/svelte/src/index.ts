import { createViewer, type FiledomViewer as Viewer, type ViewerOptions } from "@filedom/core";

export type { Viewer, ViewerOptions };

export interface FiledomActionParams {
  options: ViewerOptions;
  onReady?: (viewer: Viewer) => void;
}

/** Svelte action: `<div use:filedom={{ options, onReady }} style="height:100%"></div>` */
export function filedom(node: HTMLElement, params: FiledomActionParams) {
  let current = params;
  let viewer = createViewer(node, params.options);
  params.onReady?.(viewer);
  return {
    update(next: FiledomActionParams) {
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
