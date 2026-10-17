import { describe, expect, it } from "vitest";
import { applyViewerCanvasCssLayout } from "./canvas-display-layout.js";

describe("applyViewerCanvasCssLayout", () => {
  it("sets explicit width, height, and aspect ratio on the canvas element", () => {
    if (typeof document === "undefined") return;
    const canvas = document.createElement("canvas");
    applyViewerCanvasCssLayout(canvas, { cssWidthPx: 640, cssHeightPx: 826 });
    expect(canvas.style.width).toBe("640px");
    expect(canvas.style.height).toBe("826px");
    expect(canvas.style.maxWidth).toBe("100%");
    expect(canvas.style.aspectRatio).toBe("640 / 826");
  });
});
