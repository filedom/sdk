import type { RenderWireResponse } from "../wire/generated-response.js";
import { resolveViewerCanvasCssWidth } from "./viewer-canvas-width.js";
import { CSS_PX_PER_INCH, PT_PER_INCH } from "./view-transform.js";

export { resolveViewerCanvasCssWidth };

export interface CanvasPaintOptions {
  pageIndex?: number;
  /** Page size in points (US Letter default). */
  pageWidthPt: number;
  pageHeightPt: number;
  /** Target canvas pixel width (height derived from aspect). */
  cssWidthPx: number;
  /** When true, yPt is measured from the page bottom (domdoc wire default). */
  originBottomLeft?: boolean;
}

export interface CanvasPaintMetrics {
  cssWidthPx: number;
  cssHeightPx: number;
  scalePxPerPt: number;
}

export function canvasPaintMetrics(options: CanvasPaintOptions): CanvasPaintMetrics {
  const cssWidthPx = Math.max(1, options.cssWidthPx);
  const cssHeightPx = (cssWidthPx * options.pageHeightPt) / options.pageWidthPt;
  const scalePxPerPt = cssWidthPx / options.pageWidthPt;
  return { cssWidthPx, cssHeightPx, scalePxPerPt };
}

function ptToCanvasY(yPt: number, pageHeightPt: number, scale: number, bottomLeft: boolean): number {
  const y = bottomLeft ? pageHeightPt - yPt : yPt;
  return y * scale;
}

/** Paint domdoc render-wire response onto a 2D canvas (framework-neutral). */
export function paintRenderWireResponse(
  ctx: CanvasRenderingContext2D,
  response: RenderWireResponse,
  options: CanvasPaintOptions,
): CanvasPaintMetrics {
  const pageIndex = options.pageIndex ?? 0;
  const bottomLeft = options.originBottomLeft !== false;
  const metrics = canvasPaintMetrics(options);
  const { cssWidthPx, cssHeightPx, scalePxPerPt: scale } = metrics;

  const canvas = ctx.canvas;
  if (canvas.width !== Math.ceil(cssWidthPx) || canvas.height !== Math.ceil(cssHeightPx)) {
    canvas.width = Math.ceil(cssWidthPx);
    canvas.height = Math.ceil(cssHeightPx);
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#e2e8f0";
  ctx.fillRect(0, 0, cssWidthPx, cssHeightPx);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, cssWidthPx, cssHeightPx);

  for (const item of response.paint.items) {
    if (item.pageIndex !== pageIndex) continue;
    if (item.kind === "fillRect") {
      const x = item.rect.xPt * scale;
      const y = ptToCanvasY(
        item.rect.yPt + item.rect.heightPt,
        options.pageHeightPt,
        scale,
        bottomLeft,
      );
      const w = item.rect.widthPt * scale;
      const h = item.rect.heightPt * scale;
      const [r, g, b, a] = item.colorRgba;
      ctx.fillStyle = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
      ctx.fillRect(x, y, w, h);
      continue;
    }
    if (item.kind === "glyphRun") {
      ctx.fillStyle = "#0f172a";
      ctx.textBaseline = "alphabetic";
      for (const glyph of item.glyphs) {
        const fontPx = Math.max(8, scale * (CSS_PX_PER_INCH / PT_PER_INCH) * 12);
        ctx.font = `${fontPx}px ui-sans-serif, system-ui, sans-serif`;
        const x = glyph.xPt * scale;
        const y = ptToCanvasY(glyph.yPt, options.pageHeightPt, scale, bottomLeft);
        ctx.fillText(glyph.char, x, y);
      }
    }
  }

  return metrics;
}

/** Draw an RGBA bitmap (PDFium BGRA stride) scaled to fit the canvas width. */
export function paintRgbaBitmapToCanvas(
  ctx: CanvasRenderingContext2D,
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  cssWidthPx: number,
): void {
  const cssHeightPx = (cssWidthPx * height) / width;
  const canvas = ctx.canvas;
  canvas.width = Math.ceil(cssWidthPx);
  canvas.height = Math.ceil(cssHeightPx);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#e2e8f0";
  ctx.fillRect(0, 0, cssWidthPx, cssHeightPx);
  const imageData = new ImageData(new Uint8ClampedArray(rgba), width, height);
  const offscreen = document.createElement("canvas");
  offscreen.width = width;
  offscreen.height = height;
  offscreen.getContext("2d")!.putImageData(imageData, 0, 0);
  ctx.drawImage(offscreen, 0, 0, cssWidthPx, cssHeightPx);
}
