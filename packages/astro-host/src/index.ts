import { createViewer, type FiledomViewer as Viewer, type ViewerOptions } from "@filedom/core";

export type { Viewer, ViewerOptions };

/**
 * Mounts a viewer from an Astro island script (`<script>` or `client:only`).
 * Accepts an element or a CSS selector. The import is static so the island
 * script and the viewer cannot wait on each other.
 */
export async function mountFiledomIsland(target: HTMLElement | string, options: ViewerOptions): Promise<Viewer> {
  const element = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
  if (!element) throw new Error(`filedom island target not found: ${String(target)}`);
  return createViewer(element, options);
}
