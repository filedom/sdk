import { describe, expect, it } from "vitest";
import type { PageView, RunView } from "./engine-types.js";
import { assignCanvasSize, baseRasterKey, paintEditedRuns, paintFlowChanges, paintFlowPage, RasterCache } from "./paint.js";

function run(patch: Partial<RunView> = {}): RunView {
  return {
    id: "r",
    unit: "p0",
    unitStart: 0,
    text: "A",
    xPt: 10,
    yPt: 20,
    widthPt: 12,
    fontSizePt: 12,
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    color: "#225588",
    font: "Arial",
    advances: [12],
    editable: true,
    redraw: false,
    ...patch,
  };
}

function page(runs: RunView[]): PageView {
  return {
    index: 0,
    widthPt: 200,
    heightPt: 280,
    content: { xPt: 0, yPt: 0, widthPt: 200, heightPt: 280 },
    rasterized: false,
    runs,
    highlights: [],
    embeds: [],
  };
}

function recordingContext() {
  const fill: string[] = [];
  const cleared: number[] = [];
  const ctx = {
    setTransform() {},
    clearRect(_x: number, _y: number, w: number) {
      cleared.push(w);
    },
    fillRect() {},
    fillText() {},
    save() {},
    restore() {},
    translate() {},
    scale() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    measureText() {
      return { width: 12 };
    },
    set fillStyle(value: string) {
      fill.push(value);
    },
    get fillStyle() {
      return fill.at(-1) ?? "";
    },
    set strokeStyle(_value: string) {},
    set lineWidth(_value: number) {},
    set textBaseline(_value: string) {},
    set font(_value: string) {},
    set textRendering(_value: string) {},
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, fill, cleared };
}

describe("page paint", () => {
  it("leaves the canvas clear and paints the file color under track changes", () => {
    const { ctx, fill, cleared } = recordingContext();
    paintFlowPage(
      ctx,
      page([
        run({
          revision: { id: "c1", kind: "insert", author: "Ada" },
        }),
      ]),
      1,
      "track",
    );
    expect(cleared[0]).toBe(200);
    expect(fill).toContain("#225588");
    expect(fill).not.toContain("#1565c0");
    expect(fill).not.toContain("#c62828");
  });

  it("clears edited raster ink instead of covering it with white", () => {
    const { ctx, fill, cleared } = recordingContext();
    paintEditedRuns(ctx, [run({ redraw: true, clearPt: 12 })], 1, "plain");
    expect(cleared.length).toBeGreaterThan(0);
    expect(fill).not.toContain("#fff");
    expect(fill).toContain("#225588");
  });

  it("reuses the pdf bitmap when only the typed text changes", () => {
    const view = page([run({ text: "A" })]);
    view.objects = [{ id: "pic", kind: "image", xPt: 1, yPt: 2, widthPt: 30, heightPt: 40, rotation: 0, z: 1 }];
    const key = baseRasterKey(0, 2, view);
    view.runs[0]!.text = "AB";
    expect(baseRasterKey(0, 2, view)).toBe(key);
    view.objects[0]!.xPt = 12;
    expect(baseRasterKey(0, 2, view)).not.toBe(key);

    const cache = new RasterCache();
    let loads = 0;
    const load = () => {
      loads += 1;
      return { width: 1, height: 1, rgba: new Uint8ClampedArray([9, 8, 7, 255]) };
    };
    const first = cache.get(key, load);
    const again = cache.get(key, load);
    expect(loads).toBe(1);
    expect(again).toBe(first);
    expect(again?.rgba[0]).toBe(9);
  });

  it("repaints the edited line and leaves the rest of a flow page", () => {
    const boxes: Array<[number, number, number, number]> = [];
    const ctx = {
      setTransform() {},
      clearRect(x: number, y: number, w: number, h: number) {
        boxes.push([x, y, w, h]);
      },
      fillRect() {},
      fillText() {},
      save() {},
      restore() {},
      translate() {},
      scale() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      stroke() {},
      measureText() {
        return { width: 12 };
      },
      set fillStyle(_value: string) {},
      get fillStyle() {
        return "";
      },
      set strokeStyle(_value: string) {},
      set lineWidth(_value: number) {},
      set textBaseline(_value: string) {},
      set font(_value: string) {},
      set textRendering(_value: string) {},
    };
    const kept = run({ id: "other", text: "Keep", yPt: 200 });
    const before = page([run({ id: "line", text: "A", yPt: 40 }), kept]);
    const after = page([run({ id: "line", text: "AB", yPt: 40, widthPt: 24, advances: [12, 12] }), { ...kept }]);
    expect(paintFlowChanges(ctx as unknown as CanvasRenderingContext2D, before, after, 1, 1, "plain", "plain")).toBe(true);
    expect(boxes.length).toBeGreaterThan(0);
    for (const [, y, , height] of boxes) {
      expect(y).toBeGreaterThan(20);
      expect(y + height).toBeLessThan(80);
    }
    expect(paintFlowChanges(ctx as unknown as CanvasRenderingContext2D, before, after, 1, 2, "plain", "plain")).toBe(false);
  });

  it("leaves a canvas alone when it is already the right size", () => {
    let writes = 0;
    const canvas = {
      widthValue: 10,
      heightValue: 20,
      get width() {
        return this.widthValue;
      },
      set width(value: number) {
        writes += 1;
        this.widthValue = value;
      },
      get height() {
        return this.heightValue;
      },
      set height(value: number) {
        writes += 1;
        this.heightValue = value;
      },
    };
    assignCanvasSize(canvas, 10, 20);
    expect(writes).toBe(0);
    assignCanvasSize(canvas, 11, 20);
    expect(writes).toBe(1);
    expect(canvas.width).toBe(11);
  });
});
