// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { pointerKeepsSelection } from "./viewer.js";

describe("pointerKeepsSelection", () => {
  it("keeps the element selected when a click on its border detaches the frame", () => {
    const page = document.createElement("div");
    page.className = "dd-page";
    const frame = document.createElement("div");
    frame.className = "dd-abs dd-mark dd-element";
    page.append(frame);
    document.body.append(page);
    let kept = false;
    page.addEventListener("pointerdown", (event) => {
      frame.remove();
      expect((event.target as Element).closest(".dd-page")).toBeNull();
      kept = pointerKeepsSelection(event.composedPath());
    });
    frame.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(kept).toBe(true);
    page.remove();
  });

  it("keeps the element selected when a click lands on one of its handles", () => {
    const page = document.createElement("div");
    page.className = "dd-page";
    const frame = document.createElement("div");
    frame.className = "dd-element";
    const handle = document.createElement("button");
    handle.className = "dd-resize-handle";
    frame.append(handle);
    page.append(frame);
    document.body.append(page);
    let kept = false;
    page.addEventListener("pointerdown", (event) => {
      frame.remove();
      kept = pointerKeepsSelection(event.composedPath());
    });
    handle.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(kept).toBe(true);
    page.remove();
  });

  it("clears the selection when the click is on the margin around the page", () => {
    const pages = document.createElement("div");
    pages.className = "dd-pages";
    document.body.append(pages);
    let kept = true;
    pages.addEventListener("pointerdown", (event) => {
      kept = pointerKeepsSelection(event.composedPath());
    });
    pages.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(kept).toBe(false);
    pages.remove();
  });
});
