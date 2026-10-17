/** F07 view transforms: zoom/fit in CSS px; layout stays in points. */

export const CSS_PX_PER_INCH = 96;
export const PT_PER_INCH = 72;

export interface ViewTransform {
  zoom: number;
  rotationDeg: 0 | 90 | 180 | 270;
  viewportWidthCssPx: number;
  viewportHeightCssPx: number;
  pageWidthPt: number;
  pageHeightPt: number;
}

export function ptToCssPx(pt: number, zoom = 1): number {
  return (pt * CSS_PX_PER_INCH * zoom) / PT_PER_INCH;
}

export function cssPxToPt(px: number, zoom = 1): number {
  return (px * PT_PER_INCH) / (CSS_PX_PER_INCH * zoom);
}

export function fitPageZoom(transform: Omit<ViewTransform, "zoom">): number {
  const pageCssW = ptToCssPx(transform.pageWidthPt, 1);
  const pageCssH = ptToCssPx(transform.pageHeightPt, 1);
  return Math.min(transform.viewportWidthCssPx / pageCssW, transform.viewportHeightCssPx / pageCssH);
}

export function fitWidthZoom(transform: Omit<ViewTransform, "zoom">): number {
  const pageCssW = ptToCssPx(transform.pageWidthPt, 1);
  return transform.viewportWidthCssPx / pageCssW;
}

export function mapPagePointToCss(
  transform: ViewTransform,
  pointPt: { x: number; y: number },
): { x: number; y: number } {
  return {
    x: ptToCssPx(pointPt.x, transform.zoom),
    y: ptToCssPx(pointPt.y, transform.zoom),
  };
}
