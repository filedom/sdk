// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { VIEWER_CSS } from "./styles.js";
import { DROP_TEXT, FiledomViewer } from "./viewer.js";

function lead(root: HTMLElement): string {
  return root.querySelector<HTMLElement>(".dd-empty [data-drop-text]")?.textContent ?? "";
}

describe("drop zone text", () => {
  it("names any file, such as a document or a media file", () => {
    const root = document.createElement("div");
    const viewer = new FiledomViewer(root, { bundles: {} });
    expect(lead(root)).toBe(DROP_TEXT);
    expect(lead(root)).toBe("Drop any file here, such as a document or a media file.");
    expect(root.querySelector(".dd-empty")?.textContent).not.toMatch(/pdf|office/i);
    viewer.destroy();
  });

  it("paints the empty drop zone on the chrome surface so dark text stays readable", () => {
    const rule = VIEWER_CSS.match(/\.dd-empty\{[^}]*\}/)?.[0] ?? "";
    expect(rule).toContain("color:var(--dd-fg)");
    expect(rule).toContain("background:var(--dd-panel)");
    expect(rule).not.toContain("--dd-page");
    expect(rule).not.toContain("color:var(--dd-muted)");
    const hint = VIEWER_CSS.match(/\.dd-empty \[data-drop-text\]\+p\{[^}]*\}/)?.[0] ?? "";
    expect(hint).toContain("color:var(--dd-muted)");
  });

  it("uses the host placeholder when one is set", () => {
    const root = document.createElement("div");
    const viewer = new FiledomViewer(root, { bundles: {}, dropText: "Drop a photo here" });
    expect(lead(root)).toBe("Drop a photo here");
    viewer.destroy();
  });
});
