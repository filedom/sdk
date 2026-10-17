/**
 * G3 browser spike: compositor input hook under a DOM-like environment (happy-dom).
 * Not a G3 gate proof — no IME, WASM paint, or screen reader coverage.
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from "vitest";
import {
  createCompositorInputState,
  pointerDown,
} from "./input-hook.js";
import type { RenderWireResponse } from "../wire/generated-response.js";

function sampleResponse(): RenderWireResponse {
  return {
    header: {
      protocolVersion: 1,
      schemaId: "domdoc://render-wire/v1",
      requestId: "browser-spike",
      documentGeneration: 1,
      engineBuild: "test",
    },
    geometry: {
      pages: [
        {
          pageIndex: 0,
          runBounds: [
            {
              id: "run-browser",
              xPt: 0,
              yPt: 0,
              widthPt: 200,
              heightPt: 14,
            },
          ],
        },
      ],
    },
    paint: { items: [] },
  };
}

describe("compositor input (browser spike)", () => {
  it("binds pointer coordinates from a canvas-like element box", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 300;
    document.body.appendChild(canvas);

    const scaleX = 612 / canvas.width;
    const scaleY = 792 / canvas.height;
    const point = { xPt: 50, yPt: 10 };
    const clientX = point.xPt / scaleX;
    const clientY = point.yPt / scaleY;
    expect(clientX).toBeGreaterThan(0);
    expect(clientY).toBeGreaterThan(0);

    let state = createCompositorInputState(sampleResponse());
    state = pointerDown(state, point);
    expect(state.active?.runId).toBe("run-browser");

    canvas.remove();
  });
});
