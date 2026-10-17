import { describe, expect, it } from "vitest";
import { pointerDownWithCaret } from "../compositor/input-hook.js";
import type { RenderWireResponse } from "../wire/generated-response.js";
import { caretOffsetFromGeometry, findGlyphRun } from "./caret-map.js";
import { hitTargetsFromGeometry } from "./geometry-map.js";

function responseWithGlyphs(runId: string, text: string): RenderWireResponse {
  const advance = 5;
  let x = 10;
  const glyphs = [...text].map((ch) => {
    const g = { char: ch, xPt: x, yPt: 20, advancePt: advance };
    x += advance;
    return g;
  });
  return {
    header: {
      protocolVersion: 1,
      schemaId: "domdoc://render-wire/v1",
      requestId: "r",
      documentGeneration: 1,
      engineBuild: "test",
    },
    geometry: {
      pages: [
        {
          pageIndex: 0,
          runBounds: [
            { id: runId, xPt: 10, yPt: 20, widthPt: text.length * advance, heightPt: 12 },
          ],
        },
      ],
    },
    paint: {
      items: [{ kind: "glyphRun", pageIndex: 0, runId, glyphs }],
    },
  };
}

describe("G3-INPUT-03 caret mapping", () => {
  it("finds glyph run paint item for geometry run id", () => {
    const response = responseWithGlyphs("run-a", "abcd");
    expect(findGlyphRun(response, 0, "run-a")?.glyphs).toHaveLength(4);
  });

  it("maps pointer x to caret offset via glyph advances", () => {
    const response = responseWithGlyphs("run-a", "abcd");
    const hit = hitTargetsFromGeometry(response.geometry)[0]!;
    const offset = caretOffsetFromGeometry(response, hit, { xPt: 22, yPt: 25 }, "abcd");
    expect(offset).toBeGreaterThanOrEqual(1);
    expect(offset).toBeLessThanOrEqual(3);
  });

  it("compositor pointerDownWithCaret stores mapped offset", () => {
    const response = responseWithGlyphs("run-a", "abcd");
    let state = { targets: hitTargetsFromGeometry(response.geometry), active: null };
    state = pointerDownWithCaret(state, { xPt: 12, yPt: 25 }, response, "abcd");
    expect(state.active?.caretOffset).toBe(0);
  });
});
