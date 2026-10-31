/** CSS pixels per point at 100% zoom: 96 DPI, so a Letter page is 816px wide like in Word. */
export const PX_PER_PT = 96 / 72;

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5;
export const ZOOM_STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5];

export type FitMode = "width" | "page";

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return 1;
  return Math.min(Math.max(zoom, MIN_ZOOM), MAX_ZOOM);
}

/** The next preset step above (`1`) or below (`-1`) `zoom`. */
export function stepZoom(zoom: number, direction: 1 | -1): number {
  const eps = 1e-3;
  if (direction > 0) return ZOOM_STEPS.find((z) => z > zoom + eps) ?? MAX_ZOOM;
  for (let i = ZOOM_STEPS.length - 1; i >= 0; i--) if (ZOOM_STEPS[i]! < zoom - eps) return ZOOM_STEPS[i]!;
  return ZOOM_STEPS[0]!;
}

/**
 * Zoom after a Ctrl/⌘+wheel or trackpad pinch event. Pinch gestures arrive as small
 * pixel deltas, mouse wheels as lines; both map to a smooth exponential factor.
 */
export function wheelZoom(zoom: number, deltaY: number, deltaMode = 0): number {
  const pixels = deltaMode === 1 ? deltaY * 16 : deltaMode === 2 ? deltaY * 400 : deltaY;
  const bounded = Math.max(Math.min(pixels, 100), -100);
  return clampZoom(zoom * Math.exp(-bounded * 0.0075));
}

/** Zoom that fits a page of `widthPt × heightPt` into a viewport of CSS pixels. */
export function fitZoom(
  mode: FitMode,
  viewport: { width: number; height: number },
  page: { widthPt: number; heightPt: number },
  padding = 32,
): number {
  const byWidth = (viewport.width - padding) / (page.widthPt * PX_PER_PT);
  const byHeight = (viewport.height - padding) / (page.heightPt * PX_PER_PT);
  return clampZoom(mode === "width" ? byWidth : Math.min(byWidth, byHeight));
}

/** Largest canvas side and area browsers render reliably; rasters are capped to them. */
export const MAX_CANVAS_SIDE = 8192;
export const MAX_CANVAS_AREA = 16_777_216;

/** Device pixels per point for painting a page, capped so the canvas stays allocatable. */
export function rasterScale(widthPt: number, heightPt: number, scale: number, devicePixelRatio: number): number {
  let s = scale * devicePixelRatio;
  s = Math.min(s, MAX_CANVAS_SIDE / widthPt, MAX_CANVAS_SIDE / heightPt);
  const area = widthPt * heightPt * s * s;
  if (area > MAX_CANVAS_AREA) s *= Math.sqrt(MAX_CANVAS_AREA / area);
  return s;
}
