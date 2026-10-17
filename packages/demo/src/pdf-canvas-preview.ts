import { applyViewerCanvasCssLayout } from "../../core/dist/compositor/canvas-display-layout.js";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = workerSrc;

/** Rasterize a PDF page to the viewer canvas (display path; separate from G1 writer WASM). */
export async function paintPdfPageToCanvas(
  canvas: HTMLCanvasElement,
  pdfBytes: Uint8Array,
  pageIndex: number,
  cssWidthPx: number,
): Promise<{ width: number; height: number; pixelCount: number }> {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas-2d-unavailable");
  const doc = await getDocument({ data: pdfBytes.slice() }).promise;
  const page = await doc.getPage(pageIndex + 1);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = cssWidthPx / baseViewport.width;
  const viewport = page.getViewport({ scale });
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  if (typeof doc.destroy === "function") {
    await doc.destroy();
  }
  const paintedWidthPx = canvas.width;
  const paintedHeightPx = canvas.height;
  applyViewerCanvasCssLayout(canvas, {
    cssWidthPx: paintedWidthPx,
    cssHeightPx: paintedHeightPx,
  });
  return {
    width: paintedWidthPx,
    height: paintedHeightPx,
    pixelCount: paintedWidthPx * paintedHeightPx,
  };
}
