import type { PageView, Rect, RunView } from "./engine-types.js";
import { runBox } from "./geometry.js";
import { PX_PER_PT } from "./zoom.js";

/** One selectable PDF element: a text line, image, path, or other page object. */
export interface PdfElement {
  id: string;
  kind: string;
  box: Rect;
  /** Clockwise degrees. */
  rotation: number;
  /** Paint order. A higher value is on top. */
  z: number;
  text: string;
  /** Baseline origin for a text line. The box origin otherwise. */
  xPt: number;
  yPt: number;
}

/** One addressable text line on a page, in engine points. */
export interface TextElement {
  unit: string;
  text: string;
  box: Rect;
  /** Baseline origin `moveUnit` writes. */
  xPt: number;
  yPt: number;
}

/** Unions the visible runs of `unit`. The engine still decides which unit a click hit. */
export function textElement(runs: RunView[], unit: string): TextElement | undefined {
  const visible = runs.filter((run) => run.unit === unit && run.revision?.kind !== "delete");
  const mine = visible.length ? visible : runs.filter((run) => run.unit === unit);
  if (!mine.length) return undefined;
  let box: Rect | undefined;
  for (const run of mine) {
    const next = runBox(run);
    box = box ? union(box, next) : next;
  }
  const origin = mine.find((run) => run.unitStart === 0) ?? mine[0]!;
  return {
    unit,
    text: mine.map((run) => run.text).join(""),
    box: box!,
    xPt: origin.xPt,
    yPt: origin.yPt,
  };
}

/** Text lines, images, paths, and the other objects on a PDF page. */
export function pageElements(page: PageView): PdfElement[] {
  const listed = page.objects ?? [];
  if (listed.length) {
    return listed.map((object) => {
      const text = object.kind === "text" ? textElement(page.runs, object.id) : undefined;
      return {
        id: object.id,
        kind: object.kind,
        box: text?.box ?? {
          xPt: object.xPt,
          yPt: object.yPt,
          widthPt: object.widthPt,
          heightPt: object.heightPt,
        },
        rotation: object.rotation,
        z: object.z,
        text: text?.text ?? "",
        xPt: text?.xPt ?? object.xPt,
        yPt: text?.yPt ?? object.yPt,
      };
    });
  }
  const units = [...new Set(page.runs.map((run) => run.unit).filter((unit) => unit.length > 0))];
  return units.flatMap((unit, index) => {
    const text = textElement(page.runs, unit);
    if (!text) return [];
    return [{ id: unit, kind: "text", box: text.box, rotation: 0, z: index, text: text.text, xPt: text.xPt, yPt: text.yPt }];
  });
}

export function elementLabel(element: PdfElement): string {
  if (element.kind === "text") return element.text ? `Selected text: ${element.text}` : "Selected text";
  if (element.kind === "image") return "Selected image";
  if (element.kind === "path") return "Selected shape";
  if (element.kind === "form") return "Selected group";
  if (element.kind === "shading") return "Selected shading";
  return "Selected element";
}

/** Live readout while an element is resized or rotated. */
export function gestureMeasure(input: {
  mode: "move" | "resize" | "rotate";
  widthPt: number;
  heightPt: number;
  /** Absolute clockwise rotation of the element. */
  rotationDeg: number;
}): string | undefined {
  if (input.mode === "resize") {
    return `${Math.round(input.widthPt)} × ${Math.round(input.heightPt)} pt`;
  }
  if (input.mode === "rotate") {
    let deg = input.rotationDeg % 360;
    if (deg > 180) deg -= 360;
    if (deg <= -180) deg += 360;
    const rounded = Math.round(deg);
    return `${rounded > 0 ? "+" : ""}${rounded}°`;
  }
  return undefined;
}

/** Live move / resize / rotate values while a gesture is in progress (or held after commit). */
export interface ElementGesture {
  mode: "move" | "resize" | "rotate";
  xPt: number;
  yPt: number;
  widthPt: number;
  heightPt: number;
  /** Absolute clockwise rotation while the gesture is active. */
  rotationDeg: number;
  /** Absolute rotation when the gesture began. */
  originRotationDeg: number;
}

/** Axis-aligned overlay rect plus the CSS spin that wraps the rotated element. */
export interface ElementOverlayFrame {
  xPt: number;
  yPt: number;
  widthPt: number;
  heightPt: number;
  /** Absolute clockwise rotation of the element (committed or live). */
  rotationDeg: number;
  /**
   * CSS rotation of the selection chrome. The engine box is the axis-aligned
   * bounds of the rotated ink, so the chrome uses the unrotated size and this
   * spin to stay wrapped around the element.
   */
  cssRotationDeg: number;
}

/**
 * Unrotated rectangle centered on `box`. `box` is the axis-aligned bounds of an
 * element rotated by `rotationDeg`. `recovered` is false near 45°, where the
 * original size cannot be told apart from those bounds.
 */
export function tightElementBox(box: Rect, rotationDeg: number): Rect & { recovered: boolean } {
  const rad = ((rotationDeg % 360) * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  const det = c * c - s * s;
  let widthPt = box.widthPt;
  let heightPt = box.heightPt;
  let recovered = Math.abs((rotationDeg % 180) + 180) % 180 < 0.01;
  if (Math.abs(det) > 1e-3 && box.widthPt > 0.5 && box.heightPt > 0.5) {
    const w = (box.widthPt * c - box.heightPt * s) / det;
    const h = (box.heightPt * c - box.widthPt * s) / det;
    if (w > 0.5 && h > 0.5) {
      widthPt = w;
      heightPt = h;
      recovered = true;
    }
  }
  const cx = box.xPt + box.widthPt / 2;
  const cy = box.yPt + box.heightPt / 2;
  return { xPt: cx - widthPt / 2, yPt: cy - heightPt / 2, widthPt, heightPt, recovered };
}

/**
 * Selection chrome. An idle frame unwraps the engine's axis-aligned bounds and
 * spins that rectangle by the element's rotation. A gesture already carries the
 * unrotated size, and the chrome keeps the live rotation so the border does not
 * snap back when the pointer lifts.
 */
export function elementOverlayFrame(
  box: Rect,
  rotationDeg: number,
  gesture?: ElementGesture | undefined,
): ElementOverlayFrame {
  if (!gesture) {
    const tight = tightElementBox(box, rotationDeg);
    return {
      xPt: tight.xPt,
      yPt: tight.yPt,
      widthPt: tight.widthPt,
      heightPt: tight.heightPt,
      rotationDeg,
      cssRotationDeg: tight.recovered ? rotationDeg : 0,
    };
  }
  return {
    xPt: gesture.xPt,
    yPt: gesture.yPt,
    widthPt: gesture.widthPt,
    heightPt: gesture.heightPt,
    rotationDeg: gesture.rotationDeg,
    cssRotationDeg: gesture.rotationDeg,
  };
}

/**
 * Display box for the selection chrome. Text uses the run-union line box (same
 * origin/size as caret and selection marks); other kinds use the object box.
 */
export function elementDisplayBox(element: PdfElement): Rect {
  return {
    xPt: element.box.xPt,
    yPt: element.box.yPt,
    widthPt: element.box.widthPt,
    heightPt: element.box.heightPt,
  };
}

/** The cursor for a point on the page. The I-beam is only for the text being edited. */
export function pageHoverCursor(input: {
  viewing: boolean;
  objectEdit: boolean;
  editingTextId?: string;
  hit?: { id: string; kind: string };
  overText: boolean;
}): "default" | "text" | "pointer" {
  if (input.viewing) return "default";
  if (input.objectEdit) {
    if (!input.hit) return "default";
    if (input.hit.kind === "text" && input.editingTextId === input.hit.id) return "text";
    return "pointer";
  }
  return input.overText ? "text" : "default";
}

/**
 * Extra points so a few screen pixels still count once the page is scaled down.
 * At 100% and above the boxes keep their own pad.
 */
export function zoomSlackPt(zoom: number, minPx = 8): number {
  if (!(zoom > 0) || zoom >= 1) return 0;
  return minPx / (Math.max(zoom, 0.1) * PX_PER_PT);
}

/** Click pad for one element. Text keeps a wider pad, and both grow when zoomed out. */
export function hitPadPt(kind: string, zoom = 1): number {
  return (kind === "text" ? 6 : 2) + zoomSlackPt(zoom, kind === "text" ? 8 : 4);
}

/** CSS pixels per point from the page's on-screen box, so a zoomed page hits where it looks. */
export function pageScale(
  rect: { width: number; height: number },
  page: { widthPt: number; heightPt: number },
  fallback = 1,
): { x: number; y: number } {
  const safe = fallback > 0 ? fallback : 1;
  return {
    x: rect.width > 0.5 && page.widthPt > 0 ? rect.width / page.widthPt : safe,
    y: rect.height > 0.5 && page.heightPt > 0 ? rect.height / page.heightPt : safe,
  };
}

/** Page point under a viewport pixel. `rect` is the page element's border box. */
export function clientToPagePoint(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  page: { widthPt: number; heightPt: number },
  fallbackScale = 1,
): { xPt: number; yPt: number } {
  const scale = pageScale(rect, page, fallbackScale);
  return { xPt: (clientX - rect.left) / scale.x, yPt: (clientY - rect.top) / scale.y };
}

/** A handle that sits on the glyphs places the caret. A handle out in the margin still drags. */
export function textUnderHandle(action: string | undefined, kind: string | undefined, onGlyphs: boolean): boolean {
  return kind === "text" && onGlyphs && (action === "move-element" || action === "resize-element" || action === "rotate-element");
}

/** Cursor while a move, resize, or rotate gesture is in progress. */
export function gestureCursor(mode: "move" | "resize" | "rotate", corner?: string): string {
  if (mode === "resize") return corner === "ne" || corner === "sw" ? "nesw-resize" : "nwse-resize";
  return "grabbing";
}

/** The topmost element under the point. A smaller element wins a tie. */
export function hitElement(elements: PdfElement[], xPt: number, yPt: number, zoom = 1): PdfElement | undefined {
  let best: PdfElement | undefined;
  for (const element of elements) {
    if (!boxContains(element.box, xPt, yPt, hitPadPt(element.kind, zoom))) continue;
    if (!best || element.z > best.z || (element.z === best.z && area(element.box) < area(best.box))) best = element;
  }
  return best;
}

function area(box: Rect): number {
  return Math.max(0, box.widthPt) * Math.max(0, box.heightPt);
}

/** True when the point sits on the element's box, with a little slack for a click. */
export function boxContains(box: Rect, xPt: number, yPt: number, pad = 8): boolean {
  return (
    xPt >= box.xPt - pad &&
    yPt >= box.yPt - pad &&
    xPt <= box.xPt + box.widthPt + pad &&
    yPt <= box.yPt + box.heightPt + pad
  );
}

function union(a: Rect, b: Rect): Rect {
  const x = Math.min(a.xPt, b.xPt);
  const y = Math.min(a.yPt, b.yPt);
  const right = Math.max(a.xPt + a.widthPt, b.xPt + b.widthPt);
  const bottom = Math.max(a.yPt + a.heightPt, b.yPt + b.heightPt);
  return { xPt: x, yPt: y, widthPt: right - x, heightPt: bottom - y };
}
