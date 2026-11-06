// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { LINES_PER_CODE_ELEMENT, codeCaretPoint, offsetInCodeText, splitCodeElements } from "./code-element.js";
import { mountCodeEditor } from "./code-editor.js";

describe("code editor mount", () => {
  it("opens another file as the first tab", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const editor = mountCodeEditor(host, { name: "app.html", source: "<p>a</p>\n" });
    editor.open("sample.ts", "export const n = 1\n");
    expect([...host.querySelectorAll(".dd-file-name")].map((el) => el.textContent)).toEqual(["sample.ts", "app.html"]);
    expect(host.querySelector(".dd-tab[aria-selected='true'] .dd-file-name")?.textContent).toBe("sample.ts");
    expect(host.querySelector("textarea")?.value).toContain("export const n");
    const [first, second] = [...host.querySelectorAll<HTMLElement>(".dd-tab")];
    second!.dispatchEvent(new Event("dragstart", { bubbles: true }));
    first!.dispatchEvent(new Event("dragover", { bubbles: true, cancelable: true }));
    second!.dispatchEvent(new Event("dragend", { bubbles: true }));
    expect([...host.querySelectorAll(".dd-file-name")].map((el) => el.textContent)).toEqual(["app.html", "sample.ts"]);
    (host.querySelector(".dd-tab[aria-selected='true']") as HTMLElement | null)?.click();
    editor.open("sample.ts", "export const n = 2\n");
    expect(host.querySelectorAll(".dd-tab")).toHaveLength(2);
    editor.destroy();
  });

  it("opens a source file in view only", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const editor = mountCodeEditor(host, { name: "src/App.tsx", source: "const n = 1\n", readOnly: true });
    const input = host.querySelector("textarea");
    expect(host.querySelector(".fd-code-format")).toBeNull();
    expect(host.querySelector("[data-action='close-file']")).toBeTruthy();
    expect(host.querySelector("[data-action='fullscreen']")?.getAttribute("aria-label")).toBe("Full screen");
    expect(host.querySelector(".dd-file-name")?.textContent).toBe("src/App.tsx");
    expect(host.querySelector(".dd-file-icon svg")?.getAttribute("data-icon")).toBe("code");
    expect(host.classList.contains("fd-code-readonly")).toBe(true);
    expect(input?.readOnly).toBe(true);
    expect(input?.getAttribute("aria-label")).toBe("src/App.tsx");
    editor.destroy();
  });

  it("draws source on document pages and keeps the caret field hidden", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const source = Array.from({ length: 80 }, (_, index) => `line ${index}`).join("\n");
    const editor = mountCodeEditor(host, { name: "notes.txt", source });
    const input = host.querySelector("textarea") as HTMLTextAreaElement;
    expect(input.className).toBe("dd-input");
    expect(getComputedStyle(input).opacity).toBe("0");
    expect(host.querySelector(".dd-page")).toBeNull();
    expect(host.querySelectorAll(".dd-code-element")).toHaveLength(1);
    expect(host.querySelector(".dd-code-gutter")?.textContent?.startsWith("1\n")).toBe(true);
    expect(host.querySelector(".dd-code-text")?.textContent).toContain("line 0");
    expect(host.querySelector(".dd-code-caret")).toBeTruthy();
    editor.destroy();
  });

  it("shows the document menu on a source file", () => {
    const host = document.createElement("div");
    document.body.append(host);
    let closed = false;
    const editor = mountCodeEditor(host, {
      name: "notes.txt",
      source: "const n = 1\n",
      onClose: () => {
        closed = true;
      },
    });
    const labels = [...host.querySelectorAll(".dd-menu-item")]
      .filter((item) => !(item as HTMLElement).hidden)
      .map((item) => item.querySelector(".dd-menu-trigger")?.textContent);
    expect(labels).toEqual(["File", "Edit", "View", "Help"]);
    expect(host.querySelector(".dd-brand")).toBeNull();
    expect(host.dataset.display).toBe("numbered");
    const area = host.querySelector("textarea") as HTMLTextAreaElement;
    expect(host.querySelector(".dd-code-element")).toBeTruthy();
    expect(host.querySelector(".dd-code-gutter")?.textContent?.startsWith("1")).toBe(true);
    expect(host.querySelector(".dd-code-text")?.textContent).toContain("const n = 1");
    expect(host.querySelector(".dd-page")).toBeNull();
    host.querySelector<HTMLButtonElement>("[data-activity='layout']")?.click();
    host.querySelector<HTMLButtonElement>("[data-layout='paginated']")?.click();
    expect(host.dataset.display).toBe("paginated");
    expect(host.querySelector(".dd-page .dd-code-element")).toBeTruthy();
    expect(host.querySelectorAll(".dd-page").length).toBeGreaterThan(0);
    host.querySelector<HTMLButtonElement>("[data-layout='frame']")?.click();
    expect(host.dataset.display).toBe("frame");
    expect(host.querySelector(".dd-rail-right [data-activity='layout']")).toBeTruthy();
    const leftRail = host.querySelector<HTMLElement>(".dd-rail-left")!;
    expect(leftRail.hidden).toBe(false);
    expect(
      [...leftRail.querySelectorAll<HTMLElement>(".dd-activity-icons [data-activity]")].map((el) => ({
        id: el.dataset.activity,
        hidden: el.hidden,
      })),
    ).toEqual([
      { id: "text", hidden: false },
      { id: "draw", hidden: false },
      { id: "shapes", hidden: false },
      { id: "image", hidden: false },
    ]);
    expect(host.querySelector(".dd-mode-value")).toBeNull();
    expect(host.querySelector(".dd-toolbar-options [data-icon='zoom']")).toBeTruthy();
    expect(host.querySelector(".dd-toolbar-options [data-action='zoomReset']")?.textContent).toBe("100%");
    expect(host.querySelector(".dd-toolbar-options [data-action='live']")).toBeNull();
    expect(host.querySelector("[data-menu-panel='edit'] [data-action='find']")).toBeTruthy();
    expect(host.querySelector("[data-menu-panel='edit'] [data-action='undo']")).toBeTruthy();
    const file = [...host.querySelectorAll<HTMLButtonElement>(".dd-menu-trigger")].find((el) => el.textContent === "File");
    file?.click();
    const panel = host.querySelector("[data-menu-panel='file']:not([hidden])") as HTMLElement;
    expect([...panel.querySelectorAll(".dd-menu-label")].map((el) => el.textContent)).toEqual([
      "New",
      "Open",
      "Save",
      "Close",
      "Store as filedom",
      "Export",
    ]);
    (panel.querySelector("[data-action='close']") as HTMLButtonElement).click();
    expect(closed).toBe(true);
    expect(host.querySelector("[data-menu='mode']")).toBeNull();
    closed = false;
    host.querySelector<HTMLButtonElement>("[data-action='close-file']")?.click();
    expect(closed).toBe(true);
    area.value = "edited";
    area.dispatchEvent(new Event("input"));
    (host.querySelector("[data-action='undo']") as HTMLButtonElement).click();
    expect(area.value.startsWith("const n = 1")).toBe(true);
    editor.destroy();
  });

  it("keeps a short file in one element and continues a long file in the next", () => {
    expect(splitCodeElements("const n = 1\n")).toHaveLength(1);
    expect(codeCaretPoint("ab\ncd", 3)).toEqual({ line: 1, column: 0 });
    expect(offsetInCodeText("ab\ncd", 1, 1)).toBe(4);
    expect(codeCaretPoint("a\tb", 2).column).toBe(3);
    const source = Array.from({ length: LINES_PER_CODE_ELEMENT + 5 }, (_, index) => `line ${index}`).join("\n");
    const pieces = splitCodeElements(source);
    expect(pieces).toHaveLength(2);
    expect(pieces[1]?.startLine).toBe(LINES_PER_CODE_ELEMENT + 1);
    const host = document.createElement("div");
    document.body.append(host);
    const editor = mountCodeEditor(host, { name: "notes.txt", source });
    const elements = host.querySelectorAll(".dd-code-element");
    expect(elements).toHaveLength(2);
    expect(elements[0]?.querySelector(".dd-code-gutter")?.textContent?.startsWith("1\n")).toBe(true);
    expect(elements[1]?.querySelector(".dd-code-gutter")?.textContent?.startsWith(`${LINES_PER_CODE_ELEMENT + 1}\n`)).toBe(true);
    expect(host.querySelector(".dd-page")).toBeNull();
    editor.destroy();
  });
});
