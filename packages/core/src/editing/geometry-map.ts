import type { RenderWireResponse } from "../wire/generated-response.js";

export type RectPt = RenderWireResponse["geometry"]["pages"][number]["runBounds"][number];
export type GeometryBundle = RenderWireResponse["geometry"];

export interface HitTarget {
  pageIndex: number;
  runId: string;
  bounds: RectPt;
}

export interface PointPt {
  xPt: number;
  yPt: number;
}

export function hitTargetsFromGeometry(geometry: GeometryBundle): HitTarget[] {
  const targets: HitTarget[] = [];
  for (const page of geometry.pages) {
    for (const rect of page.runBounds) {
      targets.push({
        pageIndex: page.pageIndex,
        runId: rect.id,
        bounds: rect,
      });
    }
  }
  return targets;
}

export function hitTest(targets: readonly HitTarget[], point: PointPt): HitTarget | undefined {
  for (let i = targets.length - 1; i >= 0; i--) {
    const t = targets[i]!;
    const b = t.bounds;
    if (
      point.xPt >= b.xPt &&
      point.xPt <= b.xPt + b.widthPt &&
      point.yPt >= b.yPt &&
      point.yPt <= b.yPt + b.heightPt
    ) {
      return t;
    }
  }
  return undefined;
}
