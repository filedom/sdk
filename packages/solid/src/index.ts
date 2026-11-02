import { createViewer, type FiledomViewer as Viewer, type ViewerOptions } from "@filedom/core";
import { onCleanup, onMount } from "solid-js";

export type { Viewer, ViewerOptions };

export interface FiledomViewerProps {
  options: ViewerOptions;
  onReady?: (viewer: Viewer) => void;
  class?: string;
}

/** Solid component returning its host element: `<FiledomViewer options={options} />` */
export function FiledomViewer(props: FiledomViewerProps): HTMLDivElement {
  const host = document.createElement("div");
  host.style.height = "100%";
  if (props.class) host.className = props.class;
  let viewer: Viewer | undefined;
  onMount(() => {
    viewer = createViewer(host, props.options);
    props.onReady?.(viewer);
  });
  onCleanup(() => viewer?.destroy());
  return host;
}
