// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import type { RunView } from "./engine-types.js";
import { caretBox, hitTest, rectsForRange, wordAt, wordBoundary } from "./geometry.js";
import { toPoints } from "./components.js";

const run = (unit: string, unitStart: number, text: string, xPt: number, yPt: number): RunView => ({
  id: `${unit}~${unitStart}`,
  unit,
  unitStart,
  text,
  xPt,
  yPt,
  widthPt: Array.from(text).length * 5,
  fontSizePt: 10,
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  advances: Array.from(text).map(() => 5),
  editable: true,
});

// A bullet prefix is not addressable. p0 wraps; the break space is not in the visible text.
const runs = [run("", 0, "•", 60, 100), run("p0", 0, "hello", 72, 100), run("p0", 6, "world", 72, 112), run("p1", 0, "next", 72, 130)];

describe("selection geometry", () => {
  it("maps points to carets, rounding to the nearest glyph edge", () => {
    expect(hitTest(runs, 72 + 7, 97)?.pos).toEqual({ unit: "p0", offset: 1 });
    expect(hitTest(runs, 72 + 8, 97)?.pos).toEqual({ unit: "p0", offset: 2 });
    expect(hitTest(runs, 500, 110)?.pos).toEqual({ unit: "p0", offset: 11 });
    expect(hitTest(runs, 61, 97)?.pos.unit).toBe("p0");
  });

  it("computes caret boxes and selection rects from advances", () => {
    expect(rectsForRange(runs, { unit: "p0", start: 4, end: 8 })).toEqual([
      { xPt: 92, yPt: 100 - 9.3, widthPt: 5, heightPt: 12 },
      { xPt: 72, yPt: 112 - 9.3, widthPt: 10, heightPt: 12 },
    ]);
    expect(caretBox(runs, { unit: "p0", offset: 7 })).toMatchObject({ xPt: 77, yPt: 112 - 9.3, widthPt: 0 });
  });

  it("moves by words the way a word processor does", () => {
    const text = "hello  world";
    expect(wordBoundary(text, 0, 1)).toBe(7);
    expect(wordBoundary(text, 7, -1)).toBe(0);
    expect(wordAt(text, 1)).toEqual([0, 5]);
  });
});

describe("component lengths", () => {
  it("resolves points, CSS pixels and percentages", () => {
    expect(toPoints(72, 400)).toBe(72);
    expect(toPoints("36pt", 400)).toBe(36);
    expect(toPoints("96px", 400)).toBeCloseTo(72);
    expect(toPoints("50%", 400)).toBe(200);
    expect(toPoints("-12pt", 400)).toBe(-12);
  });
});
