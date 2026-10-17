import type { CanvasPaintMetrics } from "./canvas-paint.js";

/** Keep canvas CSS box aligned with the painted bitmap (avoids w-full / zero-height layout gaps). */
export function applyViewerCanvasCssLayout(
  canvas: HTMLCanvasElement,
  metrics: Pick<CanvasPaintMetrics, "cssWidthPx" | "cssHeightPx">,
): void {
  const w = Math.max(1, metrics.cssWidthPx);
  const h = Math.max(1, metrics.cssHeightPx);
  canvas.style.display = "block";
  canvas.style.maxWidth = "100%";
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  canvas.style.aspectRatio = `${w} / ${h}`;
}

/** Wait for layout so container/clientWidth is stable before sizing the canvas. */
export async function waitForViewerCanvasLayout(): Promise<void> {
  if (typeof requestAnimationFrame === "undefined") return;
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}
