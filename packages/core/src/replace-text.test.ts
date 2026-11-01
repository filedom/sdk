import { describe, expect, it } from "vitest";
import { replacementOrder } from "./replace-text.js";

describe("replacementOrder", () => {
  it("replaces the later match in a unit first and drops an overlap", () => {
    const ordered = replacementOrder([
      { unit: "a", start: 0, end: 5, page: 0 },
      { unit: "a", start: 2, end: 7, page: 0 },
      { unit: "a", start: 10, end: 14, page: 0 },
      { unit: "b", start: 1, end: 3, page: 1 },
    ]);
    expect(ordered).toEqual([
      { unit: "a", start: 10, end: 14, page: 0 },
      { unit: "a", start: 2, end: 7, page: 0 },
      { unit: "b", start: 1, end: 3, page: 1 },
    ]);
  });
});