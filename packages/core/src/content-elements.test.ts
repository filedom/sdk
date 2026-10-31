// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { CONTENT_ELEMENTS, mountContentElement } from "./content-elements.js";

describe("content elements", () => {
  it("draws each insertable element and skips text", () => {
    const host = document.createElement("div");
    for (const item of CONTENT_ELEMENTS) {
      host.replaceChildren();
      mountContentElement(host, { kind: item.kind });
      expect(host.querySelector("[data-kind]")?.dataset.kind).toBe(item.kind);
    }
    host.replaceChildren();
    mountContentElement(host, { kind: "paragraph" });
    mountContentElement(host, { kind: "heading" });
    expect(host.childElementCount).toBe(0);
  });

  it("builds a table, a list, and an image picker", () => {
    const host = document.createElement("div");
    mountContentElement(host, { kind: "table" });
    expect(host.querySelectorAll("th")).toHaveLength(3);
    expect(host.querySelectorAll("td")).toHaveLength(6);
    host.replaceChildren();
    mountContentElement(host, { kind: "list" });
    expect(host.querySelectorAll("li")).toHaveLength(3);
    host.replaceChildren();
    mountContentElement(host, { kind: "image" });
    const input = host.querySelector("input");
    expect(input?.type).toBe("file");
    expect(input?.accept).toBe("image/*");
    expect(input?.getAttribute("aria-label")).toBe("Choose image");
  });
});
