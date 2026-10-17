import { describe, expect, it } from "vitest";
import {
  cssPxToPt,
  fitPageZoom,
  fitWidthZoom,
  mapPagePointToCss,
  ptToCssPx,
} from "./view-transform.js";

describe("F07 view transforms", () => {
  it("converts 72 pt to 96 css px at zoom 1", () => {
    expect(ptToCssPx(72)).toBe(96);
    expect(cssPxToPt(96)).toBe(72);
  });

  it("fit-width and point mapping scale with zoom, not layout points", () => {
    const base = {
      rotationDeg: 0 as const,
      viewportWidthCssPx: 480,
      viewportHeightCssPx: 640,
      pageWidthPt: 612,
      pageHeightPt: 792,
    };
    expect(fitWidthZoom(base)).toBeCloseTo(480 / ptToCssPx(612), 5);
    expect(fitPageZoom(base)).toBeLessThanOrEqual(fitWidthZoom(base));
    const mapped = mapPagePointToCss({ ...base, zoom: 2 }, { x: 72, y: 72 });
    expect(mapped.x).toBe(192);
  });
});
