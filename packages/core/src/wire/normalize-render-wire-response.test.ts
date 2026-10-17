import { describe, expect, it } from "vitest";
import { normalizeRenderWireResponse } from "./normalize-render-wire-response.js";
import type { RenderWireResponse } from "./generated-response.js";

describe("normalizeRenderWireResponse", () => {
  it("maps snake_case paint fields from WASM JSON", () => {
    const raw = {
      header: {
        protocolVersion: 1 as const,
        schemaId: "domdoc://render-wire/v1" as const,
        requestId: "r",
        documentGeneration: 1,
        engineBuild: "test",
      },
      geometry: { pages: [] },
      paint: {
        items: [
          {
            kind: "fillRect",
            page_index: 0,
            rect: { id: "p", xPt: 0, yPt: 0, widthPt: 612, heightPt: 792 },
            color_rgba: [1, 0, 0, 1],
          },
          {
            kind: "glyphRun",
            page_index: 0,
            run_id: "run-a",
            glyphs: [{ char: "A", xPt: 72, yPt: 720, advancePt: 6 }],
          },
        ],
      },
    } as unknown as RenderWireResponse;

    const normalized = normalizeRenderWireResponse(raw);
    expect(normalized.paint.items[0]).toMatchObject({
      kind: "fillRect",
      pageIndex: 0,
      colorRgba: [1, 0, 0, 1],
    });
    expect(normalized.paint.items[1]).toMatchObject({
      kind: "glyphRun",
      pageIndex: 0,
      runId: "run-a",
    });
  });
});
