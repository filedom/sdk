import { describe, expect, it } from "vitest";
import { applyViewerCanvasCssLayout, paintViewerEmptyPlaceholder } from "./canvas-display-layout.js";

describe("applyViewerCanvasCssLayout", () => {
  it("uses intrinsic bitmap sizing with width 100% and height auto", () => {
    if (typeof document === "undefined") return;
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 826;
    applyViewerCanvasCssLayout(canvas);
    expect(canvas.style.width).toBe("100%");
    expect(canvas.style.height).toBe("auto");
    expect(canvas.style.maxWidth).toBe("100%");
    expect(canvas.style.aspectRatio).toBe("");
  });
});

describe("paintViewerEmptyPlaceholder", () => {
  it("draws a non-empty placeholder bitmap", () => {
    if (typeof document === "undefined") return;
    const canvas = document.createElement("canvas");
    paintViewerEmptyPlaceholder(canvas);
    expect(canvas.width).toBeGreaterThan(0);
    expect(canvas.height).toBeGreaterThan(0);
  });
});
