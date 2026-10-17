import { describe, expect, it } from "vitest";
import { copySelectionToClipboardData, selectedPlainText } from "./selection-copy.js";

describe("F09 selection copy", () => {
  it("copies the selected plain-text range", () => {
    expect(selectedPlainText(["Hello world"], { paragraphIndex: 0, start: 6, end: 11 })).toBe(
      "world",
    );
    expect(
      copySelectionToClipboardData(["Hello world"], { paragraphIndex: 0, start: 0, end: 5 }),
    ).toEqual({ "text/plain": "Hello" });
  });
});
