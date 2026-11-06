import type { ComponentHandle } from "./components.js";
import { mountCodeElement } from "./code-element.js";

/**
 * Block elements a Word document can hold besides a paragraph of text.
 * Labels are the Insert menu. `kind` is what gets placed on the page.
 */
export const CONTENT_ELEMENTS = [
  { kind: "image", label: "Image" },
  { kind: "table", label: "Table" },
  { kind: "list", label: "List" },
  { kind: "text-box", label: "Text box" },
  { kind: "rule", label: "Horizontal line" },
  { kind: "page-break", label: "Page break" },
  { kind: "column-break", label: "Column break" },
  { kind: "code", label: "Code block" },
  { kind: "shape", label: "Shape" },
] as const;

export type ContentKind = (typeof CONTENT_ELEMENTS)[number]["kind"];

/** Component type the viewer registers for every insertable element. */
export const CONTENT_COMPONENT = "dd-content";

export function contentElement(kind: string): (typeof CONTENT_ELEMENTS)[number] | undefined {
  return CONTENT_ELEMENTS.find((item) => item.kind === kind);
}

export function contentLabel(kind: ContentKind): string {
  return contentElement(kind)?.label ?? kind;
}

/** Width and height in points. `"auto"` follows the rendered element. */
export function contentSize(kind: ContentKind, contentWidthPt: number): { width: number; height: number | "auto" } {
  const full = Math.max(contentWidthPt, 72);
  switch (kind) {
    case "image":
      return { width: Math.min(220, full), height: 150 };
    case "shape":
      return { width: Math.min(160, full), height: 90 };
    case "rule":
      return { width: full, height: 18 };
    case "page-break":
    case "column-break":
      return { width: full, height: 32 };
    default:
      return { width: full, height: "auto" };
  }
}

/** Fills `container` with the element. An unknown kind leaves it empty. */
export function mountContentElement(container: HTMLElement, props: Record<string, unknown>): ComponentHandle | void {
  const kind = typeof props.kind === "string" ? contentElement(props.kind)?.kind : undefined;
  if (!kind) return;
  const doc = container.ownerDocument;
  const root = render(doc, kind, props);
  root.dataset.kind = kind;
  container.append(root);
  if (kind !== "image") return;
  const img = root.querySelector("img");
  return {
    destroy() {
      const src = img?.src ?? "";
      if (src.startsWith("blob:")) URL.revokeObjectURL(src);
    },
  };
}

function render(doc: Document, kind: ContentKind, props: Record<string, unknown>): HTMLElement {
  switch (kind) {
    case "image":
      return image(doc);
    case "table":
      return table(doc);
    case "list":
      return list(doc);
    case "text-box":
      return editable(doc, "div", "dd-content dd-content-box", "Text box");
    case "code":
      return codeBlock(doc, props);
    case "rule":
      return line(doc, "hr", "dd-content dd-content-rule");
    case "page-break":
      return divider(doc, "Page break");
    case "column-break":
      return divider(doc, "Column break");
    case "shape":
      return editable(doc, "div", "dd-content dd-content-shape", "Shape");
  }
}

function image(doc: Document): HTMLElement {
  const frame = doc.createElement("div");
  frame.className = "dd-content dd-content-image";
  const caption = doc.createElement("span");
  caption.textContent = "Image";
  const img = doc.createElement("img");
  img.alt = "";
  img.hidden = true;
  const input = doc.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.setAttribute("aria-label", "Choose image");
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;
    if (img.src.startsWith("blob:")) URL.revokeObjectURL(img.src);
    img.src = URL.createObjectURL(file);
    img.alt = file.name;
    img.hidden = false;
    caption.hidden = true;
  });
  frame.append(caption, img, input);
  return frame;
}

function table(doc: Document): HTMLElement {
  const table = doc.createElement("table");
  table.className = "dd-content dd-content-table";
  const body = doc.createElement("tbody");
  for (let row = 0; row < 3; row += 1) {
    const tr = doc.createElement("tr");
    for (let column = 0; column < 3; column += 1) {
      const cell = doc.createElement(row === 0 ? "th" : "td");
      cell.contentEditable = "true";
      cell.spellcheck = false;
      tr.append(cell);
    }
    body.append(tr);
  }
  table.append(body);
  return table;
}

function list(doc: Document): HTMLElement {
  const ul = doc.createElement("ul");
  ul.className = "dd-content dd-content-list";
  for (let index = 0; index < 3; index += 1) {
    const item = doc.createElement("li");
    item.contentEditable = "true";
    item.spellcheck = false;
    item.textContent = "Item";
    ul.append(item);
  }
  return ul;
}

function codeBlock(doc: Document, props: Record<string, unknown>): HTMLElement {
  const source = typeof props.source === "string" ? props.source : "Code";
  return mountCodeElement(doc, { startLine: 1, startOffset: 0, text: source }, { editable: true });
}

function editable(doc: Document, tag: "div" | "pre", className: string, text: string): HTMLElement {
  const el = doc.createElement(tag);
  el.className = className;
  el.contentEditable = "true";
  el.spellcheck = false;
  el.textContent = text;
  return el;
}

function line(doc: Document, tag: "hr", className: string): HTMLElement {
  const el = doc.createElement(tag);
  el.className = className;
  return el;
}

function divider(doc: Document, label: string): HTMLElement {
  const el = doc.createElement("div");
  el.className = "dd-content dd-content-break";
  el.textContent = label;
  return el;
}
