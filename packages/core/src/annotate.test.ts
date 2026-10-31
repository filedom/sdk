// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { AnnotationCard, SelectionMenu, passageEnds, quoteFromRanges } from "./annotate.js";
import { elementFactory } from "./dom.js";

describe("highlight passage", () => {
  it("reads the quoted text and the carets at each end", () => {
    const ranges = [
      { unit: "p0", start: 0, end: 5 },
      { unit: "p1", start: 1, end: 1 },
      { unit: "p2", start: 0, end: 3 },
    ];
    expect(passageEnds(ranges)).toEqual({
      anchor: { unit: "p0", offset: 0 },
      focus: { unit: "p2", offset: 3 },
    });
    expect(quoteFromRanges(ranges, (unit) => (unit === "p0" ? "Hello world" : unit === "p2" ? "Yes" : ""))).toBe("Hello\nYes");
    expect(quoteFromRanges([{ unit: "gone", start: 0, end: 2 }], () => {
      throw new Error("missing");
    })).toBe("");
    expect(passageEnds([])).toBeUndefined();
  });
});

describe("selection menu", () => {
  it("highlights the selection and submits a comment", () => {
    const highlight = vi.fn();
    const addComment = vi.fn();
    const menu = new SelectionMenu(elementFactory(document), { highlight, addComment });
    document.body.append(menu.el);

    expect(menu.el.hidden).toBe(true);
    menu.setOpen(true);
    expect(menu.el.hidden).toBe(false);
    menu.el.querySelector<HTMLButtonElement>("[data-action=highlight]")!.click();
    expect(highlight).toHaveBeenCalledOnce();

    menu.el.querySelector<HTMLButtonElement>("[data-action=comment]")!.click();
    const area = menu.el.querySelector("textarea")!;
    expect(menu.composing).toBe(true);
    expect(document.activeElement).toBe(area);
    area.value = "  Check this  ";
    menu.el.querySelector("form")!.requestSubmit();
    expect(addComment).toHaveBeenCalledWith("Check this");
    expect(menu.composing).toBe(false);

    menu.showComposer();
    area.value = "   ";
    menu.el.querySelector("form")!.requestSubmit();
    expect(addComment).toHaveBeenCalledOnce();

    menu.showComposer();
    menu.el.querySelector<HTMLButtonElement>("form button[type=button]")!.click();
    expect(menu.composing).toBe(false);
    menu.setOpen(false);
    expect(menu.el.hidden).toBe(true);
  });
});

describe("annotation card", () => {
  it("shows the quote and the comment", () => {
    const card = new AnnotationCard(elementFactory(document));
    card.show({
      id: "n1",
      text: "Needs a source",
      quote: "Closing remarks",
      ranges: [{ unit: "p0", start: 0, end: 15 }],
      anchor: { unit: "p0", offset: 0 },
      focus: { unit: "p0", offset: 15 },
    });
    expect(card.el.hidden).toBe(false);
    expect(card.el.textContent).toContain("Closing remarks");
    expect(card.el.textContent).toContain("Needs a source");
    card.show(undefined);
    expect(card.el.hidden).toBe(true);
  });
});
