// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { elementFactory } from "./dom.js";
import type { PageView, RunView } from "./engine-types.js";
import { fillTextLayer, textLayerKey } from "./text-layer.js";

const h = elementFactory(document);

function run(patch: Partial<RunView> & Pick<RunView, "id" | "text">): RunView {
  return {
    unit: "p0",
    unitStart: 0,
    xPt: 0,
    yPt: 0,
    widthPt: 10,
    fontSizePt: 12,
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    advances: [],
    editable: true,
    ...patch,
  };
}

function page(runs: RunView[]): PageView {
  return {
    index: 0,
    widthPt: 200,
    heightPt: 200,
    content: { xPt: 0, yPt: 0, widthPt: 200, heightPt: 200 },
    rasterized: false,
    runs,
    highlights: [],
    embeds: [],
  };
}

describe("text layer", () => {
  it("joins run text in reading order and does not build an element per run", () => {
    const view = page([
      run({ id: "a", text: "Hello", xPt: 72, yPt: 80, bold: true }),
      run({ id: "b", text: "" }),
      run({ id: "c", text: " there", xPt: 112, yPt: 80, unitStart: 5, italic: true }),
    ]);
    const layer = h("div");
    fillTextLayer(layer, view, h);
    expect(layer.textContent).toBe("Hello there");
    expect(layer.childElementCount).toBe(0);
  });

  it("changes its key when the text or its position changes", () => {
    const view = page([run({ id: "a", text: "Hello", xPt: 72 })]);
    const same = textLayerKey(view);
    expect(textLayerKey(view)).toBe(same);
    view.runs[0]!.text = "Goodbye";
    expect(textLayerKey(view)).not.toBe(same);
  });
});
