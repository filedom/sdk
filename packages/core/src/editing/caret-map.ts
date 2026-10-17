import type { RenderWireResponse } from "../wire/generated-response.js";
import type { HitTarget, PointPt } from "./geometry-map.js";

type PaintItem = RenderWireResponse["paint"]["items"][number];
type GlyphItem = Extract<PaintItem, { kind: "glyphRun" }>;

export function findGlyphRun(
  response: RenderWireResponse,
  pageIndex: number,
  runId: string,
): GlyphItem | undefined {
  for (const item of response.paint.items) {
    if (item.kind === "glyphRun" && item.pageIndex === pageIndex && item.runId === runId) {
      return item;
    }
  }
  return undefined;
}

/**
 * Maps pointer x within a hit run to a grapheme-safe caret offset using engine glyph metrics.
 */
export function caretOffsetFromGeometry(
  response: RenderWireResponse,
  hit: HitTarget,
  point: PointPt,
  runText: string,
): number {
  const glyphRun = findGlyphRun(response, hit.pageIndex, hit.runId);
  if (!glyphRun || glyphRun.glyphs.length === 0) {
    return fallbackCaretOffset(hit, point, runText);
  }

  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i <= glyphRun.glyphs.length; i++) {
    const x =
      i < glyphRun.glyphs.length
        ? glyphRun.glyphs[i]!.xPt
        : glyphRun.glyphs[i - 1]!.xPt + glyphRun.glyphs[i - 1]!.advancePt;
    const distance = Math.abs(point.xPt - x);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }
  const maxOffset = [...runText].length;
  return Math.min(Math.max(0, bestIndex), maxOffset);
}

function fallbackCaretOffset(hit: HitTarget, point: PointPt, runText: string): number {
  const width = hit.bounds.widthPt;
  if (width <= 0) return 0;
  const chars = [...runText];
  const ratio = (point.xPt - hit.bounds.xPt) / width;
  const index = Math.round(ratio * chars.length);
  return Math.min(Math.max(0, index), chars.length);
}
