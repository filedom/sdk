/** Resolve CSS pixel width for the viewer canvas (handles pre-layout / zero-width containers). */
export function resolveViewerCanvasCssWidth(
  container: HTMLElement | null | undefined,
  options?: { minPx?: number; maxPx?: number; fallbackPx?: number },
): number {
  const minPx = options?.minPx ?? 320;
  const maxPx = options?.maxPx ?? 900;
  const fallbackPx = options?.fallbackPx ?? 640;
  let width = container?.clientWidth ?? 0;
  if (width <= 0 && container) {
    width = container.getBoundingClientRect().width;
  }
  if (width <= 0) width = fallbackPx;
  return Math.max(minPx, Math.min(maxPx, width));
}
