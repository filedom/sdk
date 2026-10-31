import { createViewer, type DomdocViewer as Viewer, type ViewerOptions } from "@domdoc/core";
import { useEffect, useRef, type CSSProperties } from "react";

export type { Viewer, ViewerOptions };

export interface DomdocViewerProps {
  /** Memoize this object: a new identity remounts the viewer. */
  options: ViewerOptions;
  onReady?: (viewer: Viewer) => void;
  className?: string;
  style?: CSSProperties;
}

export function DomdocViewer({ options, onReady, className, style }: DomdocViewerProps) {
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
