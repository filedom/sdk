import { describe, expect, it } from "vitest";
import { resolveViewerCanvasCssWidth } from "./viewer-canvas-width.js";

describe("resolveViewerCanvasCssWidth", () => {
  it("uses fallback when container is missing or zero-width", () => {
    expect(resolveViewerCanvasCssWidth(null)).toBe(640);
    const el = { clientWidth: 0, getBoundingClientRect: () => ({ width: 0 }) } as HTMLElement;
    expect(resolveViewerCanvasCssWidth(el)).toBe(640);
  });

  it("clamps wide containers", () => {
    const el = { clientWidth: 2000, getBoundingClientRect: () => ({ width: 2000 }) } as HTMLElement;
    expect(resolveViewerCanvasCssWidth(el)).toBe(900);
  });

  it("enforces a minimum width", () => {
    const el = { clientWidth: 40, getBoundingClientRect: () => ({ width: 40 }) } as HTMLElement;
    expect(resolveViewerCanvasCssWidth(el)).toBe(320);
  });
});
