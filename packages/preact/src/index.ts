import { createViewer, type FiledomViewer as Viewer, type ViewerOptions } from "@filedom/core";
import { h, type JSX } from "preact";
import { useEffect, useRef } from "preact/hooks";

export type { Viewer, ViewerOptions };

export interface FiledomViewerProps {
  /** Memoize this object: a new identity remounts the viewer. */
  options: ViewerOptions;
  onReady?: (viewer: Viewer) => void;
  class?: string;
  style?: JSX.CSSProperties;
}

export function FiledomViewer(props: FiledomViewerProps) {
  const host = useRef<HTMLDivElement>(null);
  const ready = useRef(props.onReady);
  ready.current = props.onReady;
  useEffect(() => {
    const viewer = createViewer(host.current!, props.options);
    ready.current?.(viewer);
    return () => viewer.destroy();
  }, [props.options]);
  return h("div", { ref: host, class: props.class, style: { height: "100%", ...props.style } });
}
