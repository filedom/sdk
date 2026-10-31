import type { DomdocViewer as Viewer, ViewerOptions } from "@domdoc/core";

export type { Viewer, ViewerOptions };

/**
 * Mounts a viewer from an Astro island script (`<script>` or `client:only`), loading the
 * SDK on demand. Accepts an element or a CSS selector.
 */
export async function mountDomdocIsland(target: HTMLElement | string, options: ViewerOptions): Promise<Viewer> {
  const element = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
  if (!element) throw new Error(`domdoc island target not found: ${String(target)}`);
  const { createViewer } = await import("@domdoc/core");
  return createViewer(element, options);
}
