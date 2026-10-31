import { describe, expect, it } from "vitest";
import { centerDelta } from "./viewer.js";

describe("centerDelta", () => {
  const viewport = { left: 100, top: 40, width: 200, height: 100 };

  it("scrolls so the element box sits in the middle of the viewport", () => {
    const delta = centerDelta(viewport, { left: 420, top: 300, width: 40, height: 20 });
    expect(delta).toEqual({ x: 240, y: 220 });
  });

  it("stays put when the element is already centered", () => {
    const delta = centerDelta(viewport, { left: 180, top: 80, width: 40, height: 20 });
    expect(delta).toEqual({ x: 0, y: 0 });
  });

  it("moves toward an element that sits above and left of the viewport", () => {
    const delta = centerDelta(viewport, { left: 20, top: -160, width: 20, height: 20 });
    expect(delta).toEqual({ x: -170, y: -240 });
  });
});
