import { describe, expect, it } from "vitest";
import { createPageNavigation, jumpToPage, navigateHistory } from "./page-navigation.js";

describe("F08 page navigation", () => {
  it("jumps and walks history without leaving bounds", () => {
    let nav = createPageNavigation(5);
    nav = jumpToPage(nav, 3);
    nav = jumpToPage(nav, 1);
    expect(nav.currentIndex).toBe(1);
    expect(nav.history).toEqual([0, 3, 1]);
    nav = navigateHistory(nav, -1);
    expect(nav.currentIndex).toBe(3);
    expect(jumpToPage(nav, 99).currentIndex).toBe(4);
  });
});
