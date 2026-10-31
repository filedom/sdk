import { describe, expect, it } from "vitest";
import { shouldMount } from "./render-policy.js";

const viewport = { x: 0, y: 0, width: 100, height: 200 };
const onScreen = { x: 10, y: 20, width: 40, height: 30 };
const below = { x: 10, y: 400, width: 40, height: 30 };
const nearBelow = { x: 10, y: 250, width: 40, height: 30 };

describe("shouldMount", () => {
  it("visible mounts on intersection and skips when offscreen", () => {
    expect(shouldMount({ viewport, element: onScreen, mode: "visible" })).toBe("mount");
    expect(shouldMount({ viewport, element: below, mode: "visible" })).toBe("skip");
  });

  it("prerender mounts inside the margin ahead of the viewport", () => {
    expect(shouldMount({ viewport, element: nearBelow, mode: "prerender", margin: 100 })).toBe("mount");
    expect(shouldMount({ viewport, element: nearBelow, mode: "prerender", margin: 0 })).toBe("skip");
    expect(shouldMount({ viewport, element: below, mode: "prerender", margin: 100 })).toBe("skip");
  });

  it("manual stays unmounted until requested", () => {
    expect(shouldMount({ viewport, element: onScreen, mode: "manual" })).toBe("skip");
    expect(shouldMount({ viewport, element: onScreen, mode: "manual", requested: false })).toBe("skip");
    expect(shouldMount({ viewport, element: below, mode: "manual", requested: true })).toBe("mount");
  });
});
