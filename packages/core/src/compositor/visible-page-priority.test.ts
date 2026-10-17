import { describe, expect, it } from "vitest";
import { boundedPaintCacheKeys, visiblePageWindow } from "./visible-page-priority.js";

describe("F06 visible-page priority", () => {
  it("keeps a bounded window around the current page", () => {
    expect(visiblePageWindow(0, 5)).toEqual([0, 1]);
    expect(visiblePageWindow(2, 5)).toEqual([1, 2, 3]);
    expect(boundedPaintCacheKeys([1, 2, 3], 2)).toEqual(["page:1", "page:2"]);
  });
});
