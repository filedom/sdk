// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { DomdocViewer } from "./viewer.js";

describe("highlight and comment", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.replaceChildren();
    document.head.querySelector("style[data-domdoc]")?.remove();
  });

  it("offers highlight and comment on a selection, and emits nothing until a passage is chosen", () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    }));
    const root = document.createElement("div");
    document.body.append(root);
    const viewer = new DomdocViewer(root, { bundles: {} });
    const highlights: unknown[] = [];
    const annotations: unknown[] = [];
    viewer.on("highlight", (event) => highlights.push(event));
    viewer.on("annotation", (event) => annotations.push(event));

    const menu = root.querySelector<HTMLElement>(".dd-menu")!;
    const comment = root.querySelector<HTMLButtonElement>(".dd-toolbar [data-action=comment]")!;
    expect(menu.hidden).toBe(true);
    expect(comment.disabled).toBe(true);
    expect(comment.getAttribute("aria-label")).toBe("Comment");
    expect(viewer.highlight()).toBeUndefined();
    expect(viewer.annotate("A note")).toBeUndefined();
    expect(viewer.annotations()).toEqual([]);
    expect(highlights).toEqual([]);
    expect(annotations).toEqual([]);

    comment.click();
    expect(menu.hidden).toBe(true);
    expect(menu.querySelector("form")?.hidden).toBe(true);
    viewer.destroy();
  });
});
