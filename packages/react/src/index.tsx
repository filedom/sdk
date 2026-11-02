import { createViewer, type FiledomViewer as Viewer, type ViewerOptions } from "@filedom/core";
import { useEffect, useRef, type CSSProperties } from "react";

export type { Viewer, ViewerOptions };

export interface FiledomViewerProps {
  /** Memoize this object: a new identity remounts the viewer. */
  options: ViewerOptions;
  onReady?: (viewer: Viewer) => void;
  className?: string;
  style?: CSSProperties;
}

export function FiledomViewer({ options, onReady, className, style }: FiledomViewerProps) {
  const host = useRef<HTMLDivElement>(null);
  const ready = useRef(onReady);
  ready.current = onReady;
  useEffect(() => {
    const viewer = createViewer(host.current!, options);
    ready.current?.(viewer);
    return () => viewer.destroy();
  }, [options]);
  return <div ref={host} className={className} style={{ height: "100%", ...style }} />;
}
