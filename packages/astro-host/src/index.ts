import type { FiledomViewer as Viewer, ViewerOptions } from "@filedom/core";

export type { Viewer, ViewerOptions };

/**
 * Mounts a viewer from an Astro island script (`<script>` or `client:only`), loading the
 * SDK on demand. Accepts an element or a CSS selector.
 */
export async function mountFiledomIsland(target: HTMLElement | string, options: ViewerOptions): Promise<Viewer> {
  const element = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
  if (!element) throw new Error(`filedom island target not found: ${String(target)}`);
  const { createViewer } = await import("@filedom/core");
  return createViewer(element, options);
}
