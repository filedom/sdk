// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { elementFactory } from "./dom.js";
import { HistoryPanel } from "./history.js";

describe("HistoryPanel", () => {
  it("restores and reverts history rows", () => {
    const restored: string[] = [];
    const reverted: string[] = [];
    const panel = new HistoryPanel(elementFactory(document), {
      restoreHistory: (id) => restored.push(id),
      revertHistory: (id) => reverted.push(id),
    });
    panel.render(
      [
        { id: "h0", label: "Typed Hello" },
        { id: "h1", label: "Bold" },
      ],
      "h1",
    );
    expect(panel.el.querySelector('[data-history-id="h1"]')?.getAttribute("data-current")).toBe("true");
    panel.el.querySelector<HTMLButtonElement>(".dd-history-label")!.click();
    expect(restored).toEqual(["h0"]);
    panel.el.querySelector<HTMLButtonElement>('[data-action="revert"]')!.click();
    expect(reverted).toEqual(["h0"]);
  });

  it("does not open files or own a scrollport", () => {
    const panel = new HistoryPanel(elementFactory(document), {
      restoreHistory() {},
      revertHistory() {},
    });
    panel.render([]);
    expect(panel.el.querySelector("input[type=file]")).toBeNull();
    expect(panel.el.querySelector(".dd-pages")).toBeNull();
  });

  it("hides the tray from the heading control", () => {
    const hidden: string[] = [];
    const panel = new HistoryPanel(elementFactory(document), {
      restoreHistory() {},
      revertHistory() {},
      hideTray: () => hidden.push("history"),
    });
    panel.render([{ id: "h1", label: "Typed" }], "h1");
    panel.el.querySelector<HTMLButtonElement>('[data-action="hide-tray"]')!.click();
    expect(hidden).toEqual(["history"]);
  });
});
