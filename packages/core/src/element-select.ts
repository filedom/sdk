import type { PageView, Rect, RunView } from "./engine-types.js";
import { runBox } from "./geometry.js";

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

/** Axis-aligned overlay rect plus the CSS spin applied on top of the page box. */
export interface ElementOverlayFrame {
  xPt: number;
  yPt: number;
  widthPt: number;
  heightPt: number;
  /** Absolute clockwise rotation of the element (committed or live). */
  rotationDeg: number;
  /**
   * Extra CSS rotation for the selection chrome. Page object boxes are already the
   * axis-aligned bounds of rotated ink, so idle frames use 0; a rotate gesture adds
   * only the delta so the border tracks the pointer before commit.
   */
  cssRotationDeg: number;
}

/**
 * Selection / edit-frame geometry from the element's display box and an optional
 * live gesture. Resize and move replace the box; rotate keeps size and spins the
 * chrome by the gesture delta.
 */
export function elementOverlayFrame(
  box: Rect,
  rotationDeg: number,
  gesture?: ElementGesture | undefined,
): ElementOverlayFrame {
  if (!gesture) {
    return {
      xPt: box.xPt,
      yPt: box.yPt,
      widthPt: box.widthPt,
      heightPt: box.heightPt,
      rotationDeg,
      cssRotationDeg: 0,
    };
  }
  return {
    xPt: gesture.xPt,
    yPt: gesture.yPt,
    widthPt: gesture.widthPt,
    heightPt: gesture.heightPt,
    rotationDeg: gesture.rotationDeg,
    cssRotationDeg: gesture.mode === "rotate" ? gesture.rotationDeg - gesture.originRotationDeg : 0,
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

/** The topmost element under the point. A smaller element wins a tie. */
export function hitElement(elements: PdfElement[], xPt: number, yPt: number): PdfElement | undefined {
  let best: PdfElement | undefined;
  for (const element of elements) {
    const pad = element.kind === "text" ? 6 : 2;
    if (!boxContains(element.box, xPt, yPt, pad)) continue;
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
