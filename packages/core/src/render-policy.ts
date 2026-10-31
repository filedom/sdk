/** When a document DOM node should mount relative to the scrollport. */
export type RenderMode = "visible" | "prerender" | "manual";

export interface RectLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RenderPolicyInput {
  /** Visible scrollport in the same coordinate space as `element`. */
  viewport: RectLike;
  /** Element box in the same coordinate space as `viewport`. */
  element: RectLike;
  mode: RenderMode;
  /** Extra margin (same units) ahead of the viewport for `prerender`. */
  margin?: number;
  /** Host asked to mount this element (`manual` only). */
  requested?: boolean;
}

/** Whether the element should be in the DOM. */
export type RenderDecision = "mount" | "skip";

function intersects(a: RectLike, b: RectLike): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function expand(rect: RectLike, margin: number): RectLike {
  return {
    x: rect.x - margin,
    y: rect.y - margin,
    width: rect.width + margin * 2,
    height: rect.height + margin * 2,
  };
}

/**
 * Pure scroll policy for document DOM nodes.
 * `visible` mounts on intersection. `prerender` mounts inside a margin ahead of the
 * viewport. `manual` stays unmounted until the host asks.
 */
export function shouldMount(input: RenderPolicyInput): RenderDecision {
  switch (input.mode) {
    case "manual":
      return input.requested ? "mount" : "skip";
    case "visible":
      return intersects(input.viewport, input.element) ? "mount" : "skip";
    case "prerender": {
      const margin = input.margin ?? 0;
      return intersects(expand(input.viewport, margin), input.element) ? "mount" : "skip";
    }
  }
}
