import { describe, expect, it } from "vitest";
import type { PageObjectView, RunView } from "./engine-types.js";
import {
  boxContains,
  clientToPagePoint,
  elementDisplayBox,
  elementOverlayFrame,
  gestureCursor,
  gestureMeasure,
  hitElement,
  hitPadPt,
  pageElements,
  pageHoverCursor,
  textElement,
  textUnderHandle,
  tightElementBox,
  zoomSlackPt,
} from "./element-select.js";
import { PX_PER_PT } from "./zoom.js";

/** Axis-aligned bounds of `local` rotated clockwise by `deg` around its center. */
function axisBounds(
  local: { xPt: number; yPt: number; widthPt: number; heightPt: number },
  deg: number,
): { xPt: number; yPt: number; widthPt: number; heightPt: number } {
  const rad = (deg * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  const widthPt = local.widthPt * c + local.heightPt * s;
  const heightPt = local.widthPt * s + local.heightPt * c;
  const cx = local.xPt + local.widthPt / 2;
  const cy = local.yPt + local.heightPt / 2;
  return { xPt: cx - widthPt / 2, yPt: cy - heightPt / 2, widthPt, heightPt };
}

function run(patch: Partial<RunView> & Pick<RunView, "text" | "xPt" | "yPt" | "widthPt">): RunView {
  return {
    id: "r",
    unit: "p0u0",
    unitStart: 0,
    fontSizePt: 12,
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    advances: [patch.widthPt],
    editable: true,
    ...patch,
  };
}

describe("text elements", () => {
  it("unions the runs of one line and keeps the baseline origin", () => {
    const element = textElement(
      [
        run({ text: "Hi", xPt: 72, yPt: 100, widthPt: 20, unitStart: 0 }),
        run({ text: "!", xPt: 92, yPt: 100, widthPt: 8, unitStart: 2, unit: "p0u0" }),
        run({ text: "Next", xPt: 72, yPt: 120, widthPt: 30, unit: "p0u1" }),
      ],
      "p0u0",
    );
    expect(element?.text).toBe("Hi!");
    expect(element?.xPt).toBe(72);
    expect(element?.yPt).toBe(100);
    expect(element?.box.xPt).toBe(72);
    expect(element?.box.widthPt).toBe(28);
    expect(boxContains(element!.box, 80, element!.box.yPt + 2)).toBe(true);
    expect(boxContains(element!.box, 10, 10)).toBe(false);
  });

  it("picks the topmost element, so an image above a line wins the click", () => {
    const image: PageObjectView = {
      id: "p0o2",
      kind: "image",
      xPt: 70,
      yPt: 90,
      widthPt: 16,
      heightPt: 20,
      rotation: 0,
      z: 2,
    };
    const text: PageObjectView = {
      id: "p0u0",
      kind: "text",
      xPt: 72,
      yPt: 88,
      widthPt: 80,
      heightPt: 16,
      rotation: 0,
      z: 1,
    };
    const page = {
      index: 0,
      widthPt: 200,
      heightPt: 200,
      content: { xPt: 0, yPt: 0, widthPt: 200, heightPt: 200 },
      rasterized: true,
      runs: [run({ text: "Hi", xPt: 72, yPt: 100, widthPt: 20 })],
      highlights: [],
      embeds: [],
      objects: [text, image],
    };
    expect(hitElement(pageElements(page), 76, 96)?.id).toBe("p0o2");
    expect(hitElement(pageElements(page), 94, 96)?.kind).toBe("text");
  });

  it("keeps a zoomed-out click on the words, using the page's on-screen size", () => {
    const page = { widthPt: 612, heightPt: 792 };
    const zoom = 0.25;
    const rect = { left: 40, top: 80, width: page.widthPt * zoom * PX_PER_PT, height: page.heightPt * zoom * PX_PER_PT };
    const center = clientToPagePoint(rect.left + rect.width / 2, rect.top + rect.height / 2, rect, page, PX_PER_PT);
    expect(center.xPt).toBeCloseTo(page.widthPt / 2, 4);
    expect(center.yPt).toBeCloseTo(page.heightPt / 2, 4);
    const word = clientToPagePoint(rect.left + 72 * zoom * PX_PER_PT, rect.top + 100 * zoom * PX_PER_PT, rect, page, PX_PER_PT);
    expect(word.xPt).toBeCloseTo(72, 4);
    expect(word.yPt).toBeCloseTo(100, 4);
  });

  it("grows the text hit pad when zoomed out and leaves it unchanged at 100%", () => {
    expect(zoomSlackPt(1)).toBe(0);
    expect(hitPadPt("text", 1)).toBe(6);
    expect(hitPadPt("text", 0.25)).toBeGreaterThan(20);
    const text: PageObjectView = {
      id: "p0u0",
      kind: "text",
      xPt: 72,
      yPt: 88,
      widthPt: 80,
      heightPt: 16,
      rotation: 0,
      z: 1,
    };
    const page = {
      index: 0,
      widthPt: 200,
      heightPt: 200,
      content: { xPt: 0, yPt: 0, widthPt: 200, heightPt: 200 },
      rasterized: true,
      runs: [run({ text: "Hi", xPt: 72, yPt: 100, widthPt: 20 })],
      highlights: [],
      embeds: [],
      objects: [text],
    };
    const elements = pageElements(page);
    const above = elements[0]!.box.yPt - 10;
    expect(hitElement(elements, 80, above, 1)?.kind).toBeUndefined();
    expect(hitElement(elements, 80, above, 0.25)?.kind).toBe("text");
  });

  it("edits text when a handle sits on the glyphs and still drags a handle in the margin", () => {
    expect(textUnderHandle("resize-element", "text", true)).toBe(true);
    expect(textUnderHandle("move-element", "text", true)).toBe(true);
    expect(textUnderHandle("resize-element", "text", false)).toBe(false);
    expect(textUnderHandle("resize-element", "image", true)).toBe(false);
    expect(textUnderHandle("delete-element", "text", true)).toBe(false);
    expect(gestureCursor("resize", "ne")).toBe("nesw-resize");
    expect(gestureCursor("move")).toBe("grabbing");
  });

  it("uses the text cursor only on the text being edited", () => {
    expect(pageHoverCursor({ viewing: true, objectEdit: true, overText: true, hit: { id: "t", kind: "text" } })).toBe("default");
    expect(pageHoverCursor({ viewing: false, objectEdit: true, overText: false })).toBe("default");
    expect(pageHoverCursor({ viewing: false, objectEdit: true, overText: false, hit: { id: "img", kind: "image" } })).toBe("pointer");
    expect(
      pageHoverCursor({
        viewing: false,
        objectEdit: true,
        overText: false,
        hit: { id: "t", kind: "text" },
        editingTextId: "other",
      }),
    ).toBe("pointer");
    expect(
      pageHoverCursor({
        viewing: false,
        objectEdit: true,
        overText: true,
        hit: { id: "t", kind: "text" },
        editingTextId: "t",
      }),
    ).toBe("text");
    expect(pageHoverCursor({ viewing: false, objectEdit: false, overText: false })).toBe("default");
    expect(pageHoverCursor({ viewing: false, objectEdit: false, overText: true })).toBe("text");
  });

  it("shows width × height while resizing and degrees while rotating", () => {
    expect(gestureMeasure({ mode: "resize", widthPt: 120.4, heightPt: 80.6, rotationDeg: 12 })).toBe("120 × 81 pt");
    expect(gestureMeasure({ mode: "rotate", widthPt: 40, heightPt: 40, rotationDeg: 12.4 })).toBe("+12°");
    expect(gestureMeasure({ mode: "rotate", widthPt: 40, heightPt: 40, rotationDeg: -8.2 })).toBe("-8°");
    expect(gestureMeasure({ mode: "move", widthPt: 40, heightPt: 40, rotationDeg: 0 })).toBeUndefined();
  });

  it("wraps the selection border around a rotated element", () => {
    const local = { xPt: 10, yPt: 20, widthPt: 100, heightPt: 40 };
    expect(elementOverlayFrame(local, 0)).toEqual({
      ...local,
      rotationDeg: 0,
      cssRotationDeg: 0,
    });
    const bounds = axisBounds(local, 30);
    const wrapped = elementOverlayFrame(bounds, 30);
    expect(wrapped.cssRotationDeg).toBe(30);
    expect(wrapped.rotationDeg).toBe(30);
    expect(wrapped.widthPt).toBeCloseTo(100, 4);
    expect(wrapped.heightPt).toBeCloseTo(40, 4);
    expect(wrapped.xPt + wrapped.widthPt / 2).toBeCloseTo(bounds.xPt + bounds.widthPt / 2, 4);
    expect(wrapped.yPt + wrapped.heightPt / 2).toBeCloseTo(bounds.yPt + bounds.heightPt / 2, 4);
    const diamond = tightElementBox(axisBounds({ xPt: 0, yPt: 0, widthPt: 80, heightPt: 20 }, 45), 45);
    expect(diamond.recovered).toBe(false);
    expect(elementOverlayFrame(axisBounds({ xPt: 0, yPt: 0, widthPt: 80, heightPt: 20 }, 45), 45).cssRotationDeg).toBe(0);
  });

  it("keeps the live rotation on the border while a gesture is in progress", () => {
    const box = { xPt: 10, yPt: 20, widthPt: 100, heightPt: 40 };
    const resized = elementOverlayFrame(box, 15, {
      mode: "resize",
      xPt: 10,
      yPt: 20,
      widthPt: 160,
      heightPt: 72,
      rotationDeg: 15,
      originRotationDeg: 15,
    });
    expect(resized.widthPt).toBe(160);
    expect(resized.heightPt).toBe(72);
    expect(resized.cssRotationDeg).toBe(15);
    expect(resized.rotationDeg).toBe(15);
    const rotated = elementOverlayFrame(box, 15, {
      mode: "rotate",
      xPt: 10,
      yPt: 20,
      widthPt: 100,
      heightPt: 40,
      rotationDeg: 40,
      originRotationDeg: 15,
    });
    expect(rotated.widthPt).toBe(100);
    expect(rotated.heightPt).toBe(40);
    expect(rotated.rotationDeg).toBe(40);
    expect(rotated.cssRotationDeg).toBe(40);
    const moved = elementOverlayFrame(box, 0, {
      mode: "move",
      xPt: 30,
      yPt: 50,
      widthPt: 100,
      heightPt: 40,
      rotationDeg: 0,
      originRotationDeg: 0,
    });
    expect(moved.xPt).toBe(30);
    expect(moved.yPt).toBe(50);
    expect(moved.cssRotationDeg).toBe(0);
  });

  it("uses the same text line box for the overlay frame and the text element geometry", () => {
    const runs = [
      run({ text: "Hi", xPt: 72, yPt: 100, widthPt: 20, unitStart: 0 }),
      run({ text: "!", xPt: 92, yPt: 100, widthPt: 8, unitStart: 2, unit: "p0u0" }),
    ];
    const text = textElement(runs, "p0u0")!;
    const page = {
      index: 0,
      widthPt: 200,
      heightPt: 200,
      content: { xPt: 0, yPt: 0, widthPt: 200, heightPt: 200 },
      rasterized: true,
      runs,
      highlights: [],
      embeds: [],
      objects: [
        {
          id: "p0u0",
          kind: "text",
          xPt: text.box.xPt,
          yPt: text.box.yPt,
          widthPt: text.box.widthPt,
          heightPt: text.box.heightPt,
          rotation: 0,
          z: 1,
        },
      ],
    };
    const element = pageElements(page).find((item) => item.id === "p0u0")!;
    const display = elementDisplayBox(element);
    expect(display).toEqual(text.box);
    expect(element.xPt).toBe(text.xPt);
    expect(element.yPt).toBe(text.yPt);
    const frame = elementOverlayFrame(display, element.rotation);
    expect(frame.xPt).toBe(text.box.xPt);
    expect(frame.yPt).toBe(text.box.yPt);
    expect(frame.widthPt).toBe(text.box.widthPt);
    expect(frame.heightPt).toBe(text.box.heightPt);
    const shifted = elementOverlayFrame(display, 0, {
      mode: "move",
      xPt: text.box.xPt + 12,
      yPt: text.box.yPt + 8,
      widthPt: text.box.widthPt,
      heightPt: text.box.heightPt,
      rotationDeg: 0,
      originRotationDeg: 0,
    });
    expect(shifted.xPt - display.xPt).toBe(12);
    expect(shifted.yPt - display.yPt).toBe(8);
  });
});
