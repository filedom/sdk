import { describe, expect, it } from "vitest";
import {
  createCompositorInputState,
  onGeometryUpdated,
  pointerDown,
} from "../compositor/input-hook.js";
import type { RenderWireResponse } from "../wire/generated-response.js";
import { hitTest, hitTargetsFromGeometry } from "./geometry-map.js";
import { rebindRegionAfterGeometry } from "./input-region.js";

function mockResponse(runId: string): RenderWireResponse {
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
            {
              id: runId,
              xPt: 10,
              yPt: 20,
              widthPt: 100,
              heightPt: 12,
            },
          ],
        },
      ],
    },
    paint: { items: [] },
  };
}

describe("geometry hit testing", () => {
  it("selects top-most run under pointer", () => {
    const targets = hitTargetsFromGeometry(mockResponse("run-a").geometry);
    const hit = hitTest(targets, { xPt: 50, yPt: 25 });
    expect(hit?.runId).toBe("run-a");
  });

  it("I10: retains active region when geometry refresh keeps run id", () => {
    let state = createCompositorInputState(mockResponse("run-a"));
    state = pointerDown(state, { xPt: 50, yPt: 25 });
    expect(state.active?.runId).toBe("run-a");
    state = onGeometryUpdated(state, mockResponse("run-a"));
    expect(state.active?.runId).toBe("run-a");
  });

  it("clears focus when run disappears after layout", () => {
    const prev = rebindRegionAfterGeometry(
      { pageIndex: 0, runId: "gone", caretOffset: 0 },
      hitTargetsFromGeometry(mockResponse("other").geometry),
    );
    expect(prev).toBeNull();
  });
});
