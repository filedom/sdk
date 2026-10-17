import { describe, expect, it } from "vitest";
import { canvasPaintMetrics, paintRenderWireResponse } from "./canvas-paint.js";
import type { RenderWireResponse } from "../wire/generated-response.js";

describe("canvas paint", () => {
  it("computes fit metrics for letter page width", () => {
    const m = canvasPaintMetrics({ pageWidthPt: 612, pageHeightPt: 792, cssWidthPx: 612 });
    expect(m.cssHeightPx).toBeCloseTo(792, 0);
  });

  it("paints glyph runs without throwing (jsdom lacks full canvas)", () => {
    if (typeof document === "undefined") return;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const response: RenderWireResponse = {
      header: {
        protocolVersion: 1,
        schemaId: "domdoc://render-wire/v1",
        requestId: "r",
        documentGeneration: 1,
        engineBuild: "test",
      },
      geometry: { pages: [] },
      paint: {
        items: [
          {
            kind: "fillRect",
            pageIndex: 0,
            rect: { id: "p", xPt: 0, yPt: 0, widthPt: 612, heightPt: 792 },
            colorRgba: [1, 1, 1, 1],
          },
          {
            kind: "glyphRun",
            pageIndex: 0,
            runId: "run-a",
            glyphs: [{ char: "A", xPt: 72, yPt: 720, advancePt: 6 }],
          },
        ],
      },
    };
    paintRenderWireResponse(ctx, response, {
      pageWidthPt: 612,
      pageHeightPt: 792,
      cssWidthPx: 400,
    });
    expect(canvas.width).toBeGreaterThan(0);
  });
});
