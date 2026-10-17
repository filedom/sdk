import { createButton, createCard, createInput, createLabel } from "./components/ui.js";
import { cn } from "./lib/cn.js";

export interface DomdocShellElements {
  root: HTMLElement;
  toolbar: HTMLElement;
  openInput: HTMLInputElement;
  searchInput: HTMLInputElement;
  saveButton: HTMLButtonElement;
  undoButton: HTMLButtonElement;
  canvas: HTMLCanvasElement;
  statusText: HTMLElement;
  formatBadge: HTMLElement;
  prosemirrorInput: HTMLInputElement;
  commentsList: HTMLUListElement;
  acceptCommentButton: HTMLButtonElement;
  rejectSuggestionButton: HTMLButtonElement;
  imeInput: HTMLInputElement;
  dropZone: HTMLElement;
}

/** Framework-neutral document shell (Tailwind + shadcn-style tokens). */
export function mountDomdocShell(rootId = "domdoc-root"): DomdocShellElements {
  const mount = document.getElementById(rootId);
  if (!mount) throw new Error(`#${rootId} missing`);

  const root = document.createElement("div");
  root.className = "min-h-screen flex flex-col bg-muted/30";

  const header = document.createElement("header");
  header.id = "domdoc-toolbar";
  header.setAttribute("role", "toolbar");
  header.setAttribute("aria-label", "domdoc session shell");
  header.className =
    "sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b bg-background/95 backdrop-blur px-4 py-2";

  const brand = document.createElement("div");
  brand.className = "mr-2 flex items-center gap-2";
  const logo = document.createElement("span");
  logo.className = "font-semibold tracking-tight";
  logo.textContent = "domdoc";
  const sessionLabel = document.createElement("span");
  sessionLabel.id = "domdoc-session-label";
  sessionLabel.className = "text-xs text-muted-foreground";
  sessionLabel.textContent = "Session: demo-sess";
  brand.append(logo, sessionLabel);

  const formatBadge = document.createElement("span");
  formatBadge.id = "domdoc-format-badge";
  formatBadge.className =
    "rounded-full bg-muted px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground";
  formatBadge.textContent = "—";

  const openInput = document.createElement("input");
  openInput.id = "domdoc-open-local";
  openInput.type = "file";
  openInput.accept =
    ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  openInput.className = "hidden";

  const openButton = createButton({
    id: "domdoc-open-trigger",
    label: "Open",
    variant: "outline",
    onClick: () => openInput.click(),
  });

  const searchInput = createInput({
    id: "domdoc-search",
    type: "search",
    placeholder: "Search document…",
    ariaLabel: "Search document",
    className: "max-w-[200px]",
  });

  const saveButton = createButton({
    id: "domdoc-toolbar-save-stub",
    label: "Save",
    variant: "secondary",
  });
  const undoButton = createButton({
    id: "domdoc-toolbar-undo-stub",
    label: "Undo",
    variant: "ghost",
  });

  header.append(brand, formatBadge, openButton, openInput, searchInput, saveButton, undoButton);

  const main = document.createElement("main");
  main.className = "flex flex-1 flex-col gap-4 p-4 lg:flex-row lg:items-start";

  const viewerColumn = document.createElement("div");
  viewerColumn.className = "flex min-w-0 flex-1 flex-col gap-3";

  const dropZone = document.createElement("div");
  dropZone.className = cn(
    "relative flex w-full flex-col items-stretch justify-center overflow-hidden rounded-lg border border-dashed bg-muted/20 shadow-sm",
    "min-h-[420px] p-2",
  );
  dropZone.setAttribute("aria-label", "Document preview");

  const canvas = document.createElement("canvas");
  canvas.id = "domdoc-canvas";
  canvas.className =
    "mx-auto block max-w-full rounded-md bg-white shadow-md ring-1 ring-border [height:auto]";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "domdoc rendered page preview");
  dropZone.appendChild(canvas);

  const statusText = document.createElement("p");
  statusText.id = "domdoc-status";
  statusText.className = "text-xs text-muted-foreground";
  statusText.textContent = "Drop a PDF or DOCX file, or use Open.";

  viewerColumn.append(dropZone, statusText);

  const sidebar = document.createElement("aside");
  sidebar.className = "flex w-full shrink-0 flex-col gap-4 lg:w-80";

  const editCard = createCard("Edit (DOCX)");
  const pmLabel = createLabel("domdoc-prosemirror-edit", "First paragraph");
  const prosemirrorInput = createInput({
    id: "domdoc-prosemirror-edit",
    value: "domdoc",
    ariaLabel: "Edit first paragraph text",
  });
  editCard.body.append(pmLabel, prosemirrorInput);

  const commentsCard = createCard("Comments");
  commentsCard.root.id = "domdoc-comments-panel";
  commentsCard.root.setAttribute("aria-label", "Comments read-only list (F20 stub)");
  const commentsList = document.createElement("ul");
  commentsList.id = "domdoc-comments-list";
  commentsList.className = "list-disc space-y-1 pl-5 text-sm text-muted-foreground";
  const acceptCommentButton = createButton({
    id: "domdoc-comments-accept-stub",
    label: "Accept first comment (stub)",
    variant: "outline",
    className: "w-full",
  });
  const rejectSuggestionButton = createButton({
    id: "domdoc-prosemirror-reject-suggestion-stub",
    label: "Reject tracked insert (stub)",
    variant: "outline",
    className: "w-full",
  });
  commentsCard.body.append(commentsList, acceptCommentButton, rejectSuggestionButton);

  sidebar.append(editCard.root, commentsCard.root);

  main.append(viewerColumn, sidebar);
  root.append(header, main);

  const imeInput = document.createElement("input");
  imeInput.id = "domdoc-ime-input";
  imeInput.type = "text";
  imeInput.setAttribute("aria-label", "domdoc composition probe");
  imeInput.autocomplete = "off";
  imeInput.className = "sr-only";
  root.appendChild(imeInput);

  mount.replaceChildren(root);

  return {
    root,
    toolbar: header,
    openInput,
    searchInput,
    saveButton,
    undoButton,
    canvas,
    statusText,
    formatBadge,
    prosemirrorInput,
    commentsList,
    acceptCommentButton,
    rejectSuggestionButton,
    imeInput,
    dropZone,
  };
}
