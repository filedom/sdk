// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { createDocumentRequest, exportTargets, openNewFileDialog } from "./new-file.js";

describe("createDocumentRequest", () => {
  it("builds A4 text and pixel image requests", () => {
    expect(createDocumentRequest({ kind: "text", layout: { type: "a4" } })).toEqual({
      kind: "text",
      layout: { type: "a4" },
    });
    expect(
      createDocumentRequest({ kind: "image", layout: { type: "pixels", width: 800, height: 600 } }),
    ).toEqual({ kind: "image", layout: { type: "pixels", width: 800, height: 600 } });
  });

  it("rejects mismatched layouts", () => {
    expect(() =>
      createDocumentRequest({ kind: "text", layout: { type: "pixels", width: 1, height: 1 } }),
    ).toThrow(/A4/);
    expect(() => createDocumentRequest({ kind: "image", layout: { type: "a4" } })).toThrow(/pixel/);
  });
});

describe("exportTargets", () => {
  it("offers docx/pdf for text and image types for image", () => {
    expect(exportTargets("text").map((t) => t.format)).toEqual(["docx", "pdf"]);
    expect(exportTargets("image").map((t) => t.format)).toEqual(["png", "jpeg", "tiff", "pdf"]);
  });
});

describe("openNewFileDialog", () => {
  it("collects text A4 and calls createDocument", () => {
    let created: unknown;
    const host = document.createElement("div");
    document.body.append(host);
    const dialog = openNewFileDialog(host, {
      create: (request) => (created = request),
      cancel() {},
    });
    dialog.el.querySelector("button")!.click();
    expect(created).toEqual({ kind: "text", layout: { type: "a4" } });
    dialog.destroy();
  });
});
