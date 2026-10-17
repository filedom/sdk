/** Clear inline layout from a prior format paint (DOCX ↔ PDF switches). */
export function resetViewerCanvasCssLayout(canvas: HTMLCanvasElement): void {
  canvas.style.removeProperty("width");
  canvas.style.removeProperty("height");
  canvas.style.removeProperty("aspect-ratio");
  canvas.style.removeProperty("max-width");
}

/**
 * Scale the canvas to the viewer column using intrinsic bitmap dimensions.
 * (Avoid fixed aspect-ratio / height pairs that can collapse to 0px in some engines.)
 */
export function applyViewerCanvasCssLayout(canvas: HTMLCanvasElement): void {
  canvas.style.display = "block";
  canvas.style.maxWidth = "100%";
  canvas.style.width = "100%";
  canvas.style.height = "auto";
  canvas.style.removeProperty("aspect-ratio");
}

/** Hint on the empty lazy viewer so the page is not a blank white box before first open. */
export function paintViewerEmptyPlaceholder(canvas: HTMLCanvasElement): void {
  resetViewerCanvasCssLayout(canvas);
  const cssWidthPx = 640;
  const cssHeightPx = 120;
  canvas.width = cssWidthPx;
  canvas.height = cssHeightPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#f1f5f9";
  ctx.fillRect(0, 0, cssWidthPx, cssHeightPx);
  ctx.strokeStyle = "#cbd5e1";
  ctx.strokeRect(0.5, 0.5, cssWidthPx - 1, cssHeightPx - 1);
  ctx.fillStyle = "#475569";
  ctx.font = '600 15px ui-sans-serif, system-ui, sans-serif';
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText("Open or drop a PDF or DOCX file", cssWidthPx / 2, cssHeightPx / 2);
  ctx.textAlign = "start";
  applyViewerCanvasCssLayout(canvas);
}

/** Wait for layout so container/clientWidth is stable before sizing the canvas. */
export async function waitForViewerCanvasLayout(): Promise<void> {
  if (typeof requestAnimationFrame === "undefined") return;
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}
