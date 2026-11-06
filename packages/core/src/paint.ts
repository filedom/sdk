import type { PageView, RunView } from "./engine-types.js";
import { runBox } from "./geometry.js";
import { inkGeneration, paintInkCluster } from "./ink.js";

const FALLBACK_FONTS = "Helvetica, Arial, sans-serif";

function isTimes(name: string): boolean {
  return name.includes("times") || name.includes("libertine") || name.includes("frank") || name.includes("liberation serif") || name.includes("nimbus");
}

/**
 * Times is drawn with the faces LibreOffice substituted (Linux Libertine, Frank Ruhl Hofshi Bold).
 * Those files load on `need: fonts`; until then the generic serif fallback shows.
 */
export function fontFamily(name: string | undefined, bold = false): string {
  if (!name) return FALLBACK_FONTS;
  const clean = name.replace(/["\\]/g, "");
  const lower = clean.toLowerCase();
  if (isTimes(lower)) {
    return bold
      ? `"Frank Ruhl Hofshi", "Times New Roman", serif`
      : `"Linux Libertine G", "Times New Roman", serif`;
  }
  const fallback =
    lower.includes("georgia") || lower.includes("garamond") || lower.includes("cambria") || lower.includes("palatino")
      ? "Times New Roman, serif"
      : lower.includes("courier") || lower.includes("consolas") || lower.includes("mono")
        ? "Courier New, monospace"
        : FALLBACK_FONTS;
  return `"${clean}", ${fallback}`;
}

function fontFor(run: RunView, sizePx = run.fontSizePt): string {
  return `${run.italic ? "italic " : ""}${run.bold ? "bold " : ""}${sizePx}px ${fontFamily(run.font, run.bold)}`;
}

/** The middle of `deleted` and `inserted` after the shared prefix and suffix. */
export interface TextChange {
  /** Index into `inserted` where the edit starts. */
  start: number;
  removed: string;
  added: string;
}

export function textDiff(deleted: string, inserted: string): TextChange {
  const before = Array.from(deleted);
  const after = Array.from(inserted);
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start += 1;
  let endBefore = before.length;
  let endAfter = after.length;
  while (endBefore > start && endAfter > start && before[endBefore - 1] === after[endAfter - 1]) {
    endBefore -= 1;
    endAfter -= 1;
  }
  return { start, removed: before.slice(start, endBefore).join(""), added: after.slice(start, endAfter).join("") };
}

function line(ctx: CanvasRenderingContext2D, run: RunView, y: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(run.fontSizePt / 14, 0.6);
  ctx.beginPath();
  ctx.moveTo(run.xPt, y);
  ctx.lineTo(run.xPt + run.widthPt, y);
  ctx.stroke();
}

/**
 * Identity of the PDF bitmap. Typed text, formatting, and highlights are drawn over it,
 * so a keystroke does not need a new raster.
 */
export function baseRasterKey(index: number, scale: number, view: PageView): string {
  return `${index}@${scale.toFixed(3)}@${view.widthPt.toFixed(2)}x${view.heightPt.toFixed(2)}@${objectPaintKey(view)}`;
}

/** Identity of PDF page objects, so a move, resize, or rotation repaints the raster. */
export function objectPaintKey(view: PageView): string {
  const objects = view.objects;
  if (!objects?.length) return "";
  let key = "";
  for (const object of objects) {
    key += `\n${object.id}\t${object.kind}\t${object.xPt.toFixed(2)}\t${object.yPt.toFixed(2)}\t${object.widthPt.toFixed(2)}\t${object.heightPt.toFixed(2)}\t${object.rotation.toFixed(2)}`;
  }
  return key;
}

/** Identity of everything `paintFlowPage` draws, including the raster scale. */
export function flowPaintKey(view: PageView, scale: number): string {
  let key = `${inkGeneration()}@${scale.toFixed(3)}`;
  for (const mark of view.highlights) {
    key += `\n${mark.xPt.toFixed(2)},${mark.yPt.toFixed(2)},${mark.widthPt.toFixed(2)},${mark.heightPt.toFixed(2)},${mark.color}`;
  }
  for (const run of view.runs) key += `\n${runPaintKey(run)}`;
  return key;
}

function runPaintKey(run: RunView): string {
  return [
    run.text,
    run.xPt.toFixed(2),
    run.yPt.toFixed(2),
    run.widthPt.toFixed(2),
    run.fontSizePt,
    run.bold ? "b" : "",
    run.italic ? "i" : "",
    run.underline ? "u" : "",
    run.strike ? "s" : "",
    run.color ?? "",
    run.font ?? "",
    run.revision?.kind ?? "",
    run.advances.join(","),
  ].join("\t");
}

export type Markup = "plain" | "track";

/** Live and view-only hide deleted characters. Track changes shows both sides. */
export function paintsRun(run: RunView, markup: Markup): boolean {
  return markup === "track" || run.revision?.kind !== "delete";
}

/** Width of deleted runs on this line that end at or before `xPt`. */
export function deletedBefore(runs: RunView[], xPt: number, yPt: number): number {
  let width = 0;
  for (const run of runs) {
    if (run.revision?.kind !== "delete") continue;
    if (Math.abs(run.yPt - yPt) > Math.max(run.fontSizePt, 1)) continue;
    if (run.xPt + run.widthPt <= xPt + 0.05) width += run.widthPt;
  }
  return width;
}

/** Page x of a track-space point once deleted runs are hidden. */
export function visualX(runs: RunView[], xPt: number, yPt: number): number {
  return xPt - deletedBefore(runs, xPt, yPt);
}

/** Track-space x of a click on the live page, where deleted runs are hidden. */
export function trackX(runs: RunView[], xPt: number, yPt: number): number {
  const deletes = runs
    .filter((run) => run.revision?.kind === "delete" && Math.abs(run.yPt - yPt) <= Math.max(run.fontSizePt, 1))
    .sort((a, b) => a.xPt - b.xPt);
  let track = xPt;
  for (const run of deletes) {
    if (run.xPt <= track + 0.5) track += run.widthPt;
  }
  return track;
}

/** Runs as the current view draws them. Live view drops deletions and closes the gap. */
export function presentedRuns(runs: RunView[], markup: Markup): RunView[] {
  if (markup !== "plain") return runs;
  return runs
    .filter((run) => paintsRun(run, markup))
    .map((run) => ({ ...run, xPt: visualX(runs, run.xPt, run.yPt) }));
}

function paintRuns(
  ctx: CanvasRenderingContext2D,
  runs: RunView[],
  markup: Markup,
  scale: number,
  include?: (run: RunView) => boolean,
): void {
  ctx.textBaseline = "alphabetic";
  // Unhinted outlines. Hinted stems come out a pixel heavier than Poppler.
  (ctx as CanvasRenderingContext2D & { textRendering: string }).textRendering = "geometricPrecision";
  for (const run of presentedRuns(runs, markup)) {
    if (include && !include(run)) continue;
    const color = run.color ?? "#000";
    ctx.fillStyle = color;
    ctx.font = fontFor(run);
    const chars = Array.from(run.text);
    const serif = isTimes((run.font ?? "").toLowerCase());
    let x = run.xPt;
    let i = 0;
    while (i < chars.length) {
      let j = i + 1;
      // A following 0 advance was consumed by a ligature (Th → T_h). Draw the cluster once.
      while (j < chars.length && (run.advances[j] ?? 0) === 0) j += 1;
      let slot = 0;
      for (let k = i; k < j; k += 1) slot += run.advances[k] ?? 0;
      const cluster = chars.slice(i, j).join("").replace(/[ \t\u000b]/g, "");
      const inked =
        serif &&
        cluster &&
        paintInkCluster(ctx, run.bold, run.italic, cluster, run.fontSizePt * scale, x * scale, run.yPt * scale, color);
      if (cluster && !inked) fillFitted(ctx, cluster, x, run.yPt, slot);
      x += slot;
      i = j;
    }
    if (run.underline) line(ctx, run, run.yPt + run.fontSizePt * 0.12, color);
    if (run.strike) line(ctx, run, run.yPt - run.fontSizePt * 0.3, color);
  }
}

/**
 * Draws `text` so its ink width is `slot` points. The caret and the selection use that
 * same slot, which is how a canvas editor keeps the beam on the glyph edge.
 */
const measuredWidths = new Map<string, number>();

function measuredWidth(ctx: CanvasRenderingContext2D, text: string): number {
  const key = `${ctx.font}\0${text}`;
  const found = measuredWidths.get(key);
  if (found !== undefined) return found;
  const width = ctx.measureText(text).width;
  if (measuredWidths.size > 4000) measuredWidths.clear();
  measuredWidths.set(key, width);
  return width;
}

function fillFitted(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, slot: number): void {
  const measured = measuredWidth(ctx, text);
  if (measured <= 0 || slot <= 0) {
    ctx.fillText(text, x, y);
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(slot / measured, 1);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** Clears edited raster ink, then draws the replacement glyphs in the same boxes. */
export function paintEditedRuns(ctx: CanvasRenderingContext2D, runs: RunView[], scale: number, markup: Markup): void {
  if (!runs.some((run) => run.redraw)) return;
  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  const shown = presentedRuns(runs, markup).filter((run) => run.redraw);
  for (const run of shown) {
    const box = runBox(run);
    // The stored cover can be the whole line. Never let it run past the last glyph
    // on this band, or it erases a picture sitting beside the text.
    const lineEnd = shown.reduce((end, other) => {
      if (Math.abs(other.yPt - run.yPt) > Math.max(run.fontSizePt, 1)) return end;
      return Math.max(end, other.xPt + other.widthPt);
    }, run.xPt + run.widthPt);
    const width = Math.min(Math.max(run.clearPt ?? 0, run.widthPt, 1), Math.max(lineEnd - run.xPt, run.widthPt));
    ctx.clearRect(box.xPt - 1, box.yPt - 1, width + 2, box.heightPt + 2);
  }
  paintRuns(ctx, runs, markup, scale, (run) => !!run.redraw);
  ctx.restore();
}

function uniqueRunIds(runs: RunView[]): boolean {
  const seen = new Set<string>();
  for (const run of runs) {
    if (seen.has(run.id)) return false;
    seen.add(run.id);
  }
  return true;
}

function highlightPaintKey(view: PageView): string {
  let key = "";
  for (const mark of view.highlights) {
    key += `${mark.xPt.toFixed(2)},${mark.yPt.toFixed(2)},${mark.widthPt.toFixed(2)},${mark.heightPt.toFixed(2)},${mark.color};`;
  }
  return key;
}

interface Band {
  y: number;
  height: number;
}

function runBand(run: RunView): Band {
  const box = runBox(run);
  return { y: box.yPt - 1, height: box.heightPt + 2 };
}

function mergeBands(bands: Band[]): Band[] {
  const sorted = [...bands].sort((a, b) => a.y - b.y);
  const merged: Band[] = [];
  for (const band of sorted) {
    const last = merged.at(-1);
    if (last && band.y <= last.y + last.height + 0.5) {
      const bottom = Math.max(last.y + last.height, band.y + band.height);
      last.height = bottom - last.y;
    } else merged.push({ y: band.y, height: band.height });
  }
  return merged;
}

function overlaps(a: Band, b: Band): boolean {
  return a.y < b.y + b.height && b.y < a.y + a.height;
}

/**
 * Repaints only the lines a text edit changed. Returns false when the page should be
 * painted from scratch (scale, markup, highlights, or most of the page moved).
 */
export function paintFlowChanges(
  ctx: CanvasRenderingContext2D,
  previous: PageView,
  next: PageView,
  previousScale: number,
  scale: number,
  previousMarkup: Markup,
  markup: Markup,
): boolean {
  if (previousMarkup !== markup || Math.abs(previousScale - scale) > 0.001) return false;
  if (previous.widthPt !== next.widthPt || previous.heightPt !== next.heightPt) return false;
  if (highlightPaintKey(previous) !== highlightPaintKey(next)) return false;
  if (!uniqueRunIds(previous.runs) || !uniqueRunIds(next.runs)) return false;
  const before = new Map(previous.runs.map((run) => [run.id, run]));
  const after = new Map(next.runs.map((run) => [run.id, run]));
  const dirty: RunView[] = [];
  for (const run of previous.runs) {
    const now = after.get(run.id);
    if (!now || runPaintKey(run) !== runPaintKey(now)) dirty.push(run);
  }
  for (const run of next.runs) {
    const was = before.get(run.id);
    if (!was || runPaintKey(was) !== runPaintKey(run)) dirty.push(run);
  }
  if (!dirty.length) return true;
  const bands = mergeBands(dirty.map(runBand));
  const span = bands.reduce((total, band) => total + band.height, 0);
  if (span > next.heightPt * 0.6) return false;
  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  for (const band of bands) ctx.clearRect(-1, band.y, next.widthPt + 2, band.height);
  for (const mark of next.highlights) {
    const band = { y: mark.yPt, height: mark.heightPt };
    if (!bands.some((item) => overlaps(item, band))) continue;
    ctx.fillStyle = mark.color;
    ctx.fillRect(mark.xPt, mark.yPt, mark.widthPt, mark.heightPt);
  }
  const shown = next.runs.filter((run) => bands.some((band) => overlaps(band, runBand(run))));
  paintRuns(ctx, shown, markup, scale);
  ctx.restore();
  return true;
}

/**
 * Paints a flow page glyph by glyph. The canvas is left transparent outside the glyphs
 * and the file's own highlights. Track-change marks are HTML, not paint.
 */
export function paintFlowPage(
  ctx: CanvasRenderingContext2D,
  view: PageView,
  scale: number,
  markup: Markup = "plain",
): void {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, view.widthPt, view.heightPt);
  for (const h of view.highlights) {
    ctx.fillStyle = h.color;
    ctx.fillRect(h.xPt, h.yPt, h.widthPt, h.heightPt);
  }
  paintRuns(ctx, view.runs, markup, scale);
}

/** Sets the bitmap size only when it changed. Assigning either side clears the canvas. */
export function assignCanvasSize(canvas: { width: number; height: number }, width: number, height: number): void {
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
}

export interface CachedRaster {
  width: number;
  height: number;
  rgba: Uint8ClampedArray<ArrayBuffer>;
}

/**
 * Keeps the last PDF bitmaps. A text edit reuses the bitmap; a new scale or a moved
 * object loads again. Entries are dropped oldest-first.
 */
export class RasterCache {
  private readonly entries = new Map<string, CachedRaster>();

  constructor(private readonly limit = 8) {}

  get(key: string, load: () => { width: number; height: number; rgba: Uint8ClampedArray } | undefined): CachedRaster | undefined {
    const hit = this.entries.get(key);
    if (hit) {
      this.entries.delete(key);
      this.entries.set(key, hit);
      return hit;
    }
    const loaded = load();
    if (!loaded) return undefined;
    const stored: CachedRaster = {
      width: loaded.width,
      height: loaded.height,
      rgba: new Uint8ClampedArray(loaded.rgba),
    };
    this.entries.set(key, stored);
    while (this.entries.size > this.limit) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
    return stored;
  }

  clear(): void {
    this.entries.clear();
  }
}

/** Copies an RGBA raster into the canvas. The source buffer stays reusable. */
export function paintRaster(canvas: HTMLCanvasElement, raster: { width: number; height: number; rgba: Uint8ClampedArray<ArrayBuffer> }): void {
  assignCanvasSize(canvas, raster.width, raster.height);
  const pixels = new Uint8ClampedArray(raster.rgba);
  canvas.getContext("2d")?.putImageData(new ImageData(pixels, raster.width, raster.height), 0, 0);
}
