import type { CreateDocumentRequest, DocumentKind, DocumentLayout } from "./engine-types.js";

export interface NewFileChoice {
  kind: DocumentKind;
  layout: DocumentLayout;
}

/** A4 in PDF points (210mm × 297mm). */
export const A4_PT = { width: 595.28, height: 841.89 } as const;

/**
 * Builds the `createDocument` request from a New dialog choice.
 * Text → A4 only. Image → pixel width and height only.
 */
export function createDocumentRequest(choice: NewFileChoice): CreateDocumentRequest {
  if (choice.kind === "text") {
    if (choice.layout.type !== "a4") {
      throw new Error("a text document uses A4, not a pixel size");
    }
    return { kind: "text", layout: { type: "a4" } };
  }
  if (choice.layout.type !== "pixels") {
    throw new Error("an image document uses a pixel width and height, not A4");
  }
  if (choice.layout.width < 1 || choice.layout.height < 1) {
    throw new Error("pixel size must be at least 1×1");
  }
  return {
    kind: "image",
    layout: { type: "pixels", width: choice.layout.width, height: choice.layout.height },
  };
}

export type NewFileExportTarget =
  | { kind: "text"; format: "docx" | "pdf" }
  | { kind: "image"; format: "png" | "jpeg" | "tiff" | "pdf" };

/** Export formats offered for a `.filedom` of the given kind. */
export function exportTargets(kind: DocumentKind): NewFileExportTarget[] {
  if (kind === "text") {
    return [
      { kind: "text", format: "docx" },
      { kind: "text", format: "pdf" },
    ];
  }
  return [
    { kind: "image", format: "png" },
    { kind: "image", format: "jpeg" },
    { kind: "image", format: "tiff" },
    { kind: "image", format: "pdf" },
  ];
}

export interface NewFileDialogActions {
  create(request: CreateDocumentRequest): void;
  cancel(): void;
}

/**
 * Small New dialog: pick text or image, then A4 or pixel size that matches.
 * Returns the dialog root; call `destroy` when done.
 */
export function openNewFileDialog(
  parent: HTMLElement,
  actions: NewFileDialogActions,
): { el: HTMLElement; destroy(): void } {
  const doc = parent.ownerDocument;
  const el = doc.createElement("div");
  el.className = "dd-dialog";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-label", "New document");

  const kind = doc.createElement("select");
  kind.setAttribute("aria-label", "Document kind");
  kind.append(
    Object.assign(doc.createElement("option"), { value: "text", textContent: "Text" }),
    Object.assign(doc.createElement("option"), { value: "image", textContent: "Image" }),
  );

  const layout = doc.createElement("select");
  layout.setAttribute("aria-label", "Page size");

  const width = doc.createElement("input");
  width.type = "number";
  width.min = "1";
  width.value = "800";
  width.setAttribute("aria-label", "Width in pixels");
  const height = doc.createElement("input");
  height.type = "number";
  height.min = "1";
  height.value = "600";
  height.setAttribute("aria-label", "Height in pixels");

  const syncLayout = () => {
    const isText = kind.value === "text";
    layout.replaceChildren(
      ...(isText
        ? [Object.assign(doc.createElement("option"), { value: "a4", textContent: "A4" })]
        : [Object.assign(doc.createElement("option"), { value: "pixels", textContent: "Pixels" })]),
    );
    width.hidden = isText;
    height.hidden = isText;
  };
  syncLayout();
  kind.addEventListener("change", syncLayout);

  const create = doc.createElement("button");
  create.type = "button";
  create.textContent = "Create";
  create.addEventListener("click", () => {
    const documentKind = kind.value === "image" ? "image" : "text";
    const request = createDocumentRequest({
      kind: documentKind,
      layout:
        documentKind === "text"
          ? { type: "a4" }
          : { type: "pixels", width: Number(width.value) || 1, height: Number(height.value) || 1 },
    });
    actions.create(request);
  });

  const cancel = doc.createElement("button");
  cancel.type = "button";
  cancel.textContent = "Cancel";
  cancel.addEventListener("click", () => actions.cancel());

  el.append(kind, layout, width, height, create, cancel);
  parent.append(el);
  return {
    el,
    destroy() {
      el.remove();
    },
  };
}
