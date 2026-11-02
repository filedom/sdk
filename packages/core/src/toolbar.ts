import { button, type ElementFactory } from "./dom.js";
import type { Align, Capabilities, DocInfo } from "./engine-types.js";
import { fileKind } from "./formats.js";
import { icon, type IconName } from "./icons.js";
import {
  actionAvailability,
  actionHint,
  groupAvailability,
  TOOLBAR_CATALOG,
  TRAY_CATALOG,
  type CatalogContext,
  type SelectionKind,
} from "./toolbar-catalog.js";
import type { FitMode } from "./zoom.js";

/** How the open document is shown and whether edits are allowed. */
export type ViewMode = "live" | "track" | "view";

export interface ToolbarState {
  info?: DocInfo;
  viewMode: ViewMode;
  /** The host locked the viewer to view only. */
  modeLocked: boolean;
  zoom: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  /** A non-empty text selection (highlight and clear apply to it). */
  hasSelection: boolean;
  /** Font family at the caret or shared by the selection. Omitted when the faces differ. */
  font?: string;
  /** Point size at the caret or shared by the selection. Omitted when the sizes differ. */
  sizePt?: number;
  /** `#rrggbb` ink color. Omitted when the selection uses more than one color. */
  color?: string;
  /** Selection kind for the contextual row. */
  selectionKind: SelectionKind;
  /** Insert kinds the open adapter can place. */
  insertKinds: string[];
  /** True when the open file is a generic `.filedom` store. */
  isFiledom: boolean;
  helpOn: boolean;
  toolbarsLocked: boolean;
  /** Group ids the View menu has hidden. View itself cannot be hidden. */
  hiddenGroups: string[];
  /** Trays that can appear for the open document and mode. */
  availableTrays: string[];
  /** Trays currently open beside the pages. */
  shownTrays: string[];
  /** Speed of the clip the timeline is editing. */
  clipSpeed?: number;
}

export interface ToolbarActions {
  pick(): void;
  newFile(): void;
  download(): void;
  storeFiledom(): void;
  exportFile(): void;
  undo(): void;
  redo(): void;
  toggle(style: "bold" | "italic" | "underline" | "strike"): void;
  setColor(color: string): void;
  setFont(font: string): void;
  setSize(sizePt: number): void;
  highlight(): void;
  clearHighlight(): void;
  setHighlightColor(color: string): void;
  /** Opens a comment on the current selection. */
  comment(): void;
  align(align: Align): void;
  indent(byPt: number): void;
  setLineSpacing(spacing: number): void;
  setViewMode(mode: ViewMode): void;
  search(query: string): void;
  nextHit(step: number): void;
  /** Replaces the current search match with `text`. */
  replaceMatch(text: string): void;
  /** Replaces every match of the current search with `text`. */
  replaceAll(text: string): void;
  zoomIn(): void;
  zoomOut(): void;
  setZoom(zoom: number): void;
  fit(mode: FitMode): void;
  /** Places a non-text content element (image, table, …) at the caret. */
  insertElement(kind: string): void;
  /** Switches the chrome between light and dark. */
  toggleTheme(): void;
  setHelp(on: boolean): void;
  setToolbarVisible(groupId: string, visible: boolean): void;
  setTrayVisible(trayId: string, visible: boolean): void;
  lockToolbars(locked: boolean): void;
  moveToolbar(groupId: string, x: number, y: number): void;
  replaceImage(): void;
  /** Removes the selected page element. */
  deleteElement(): void;
  /** Clears the text or element selection. */
  deselect(): void;
  /** Sets the selected shape's fill or stroke through the format command. */
  paintShape(part: "fill" | "stroke", color: string): void;
  /** Report of the error on screen, written so it can be pasted into Cursor. */
  debugReport(): string;
  /** Starts the open audio or video. */
  playMedia(): void;
  /** Pauses the open audio or video. */
  pauseMedia(): void;
  /** Mutes or unmutes the open audio or video. */
  muteMedia(): void;
  /** Sets the speed of the clip selected on the timeline. */
  setClipSpeed(speed: number): void;
  /** Opens a file picker and appends that file to the timeline. */
  appendClip(): void;
  /** Copies the archive listing, message, or sheet. */
  copyListing(): void;
}

const FONTS = ["Arial", "Calibri", "Georgia", "Times New Roman", "Courier New"];
const SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];

/** One face when every run agrees. A pending caret style wins over the character behind the caret. */
export function shownTextFormat(
  runs: Array<{ font?: string; fontSizePt: number; color?: string }>,
  pending?: { font?: string; sizePt?: number; color?: string },
): { font?: string; sizePt?: number; color?: string } {
  const same = <T>(pick: (run: (typeof runs)[number]) => T | undefined, equal: (a: T, b: T) => boolean): T | undefined => {
    const first = runs[0] ? pick(runs[0]) : undefined;
    if (first === undefined || !runs.every((run) => {
      const value = pick(run);
      return value !== undefined && equal(value, first);
    })) {
      return undefined;
    }
    return first;
  };
  const font = pending?.font || same((run) => run.font?.trim() || undefined, (a, b) => a.toLowerCase() === b.toLowerCase());
  const sizePt =
    pending?.sizePt ??
    same(
      (run) => (Number.isFinite(run.fontSizePt) && run.fontSizePt > 0 ? run.fontSizePt : undefined),
      (a, b) => Math.abs(a - b) < 0.25,
    );
  const color =
    pending?.color ||
    same(
      (run) => normalizeColor(run.color) ?? "#000000",
      (a, b) => a === b,
    );
  return { font: font || undefined, sizePt, color };
}

function normalizeColor(color: string | undefined): string | undefined {
  const raw = color?.trim();
  if (!raw) return undefined;
  const hex = raw.startsWith("#") ? raw.slice(1) : raw;
  if (!/^[\da-fA-F]{6}$/.test(hex)) return undefined;
  return `#${hex.toLowerCase()}`;
}

function sizeLabel(pt: number): string {
  const rounded = Math.round(pt * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** One line for the bar. The full message, including any URL, stays in the details. */
export function shortError(message: string): string {
  const line = (message.split("\n")[0] ?? "").replace(/https?:\/\/\S+/g, " ").replace(/\s+/g, " ").trim();
  const text = line.replace(/[:\s]+$/, "").trim() || "Something went wrong.";
  return text.length > 88 ? `${text.slice(0, 87)}…` : text;
}
const SPACING = [1, 1.15, 1.5, 2, 2.5];

const ICONS: Partial<Record<string, IconName>> = {
  open: "folder",
  save: "download",
  undo: "undo",
  redo: "redo",
  alignLeft: "align-left",
  alignCenter: "align-center",
  alignRight: "align-right",
  alignJustify: "align-justify",
  outdent: "outdent",
  indent: "indent",
  highlight: "highlight",
  clearHighlight: "eraser",
  comment: "comment",
  findPrev: "arrow-up",
  findNext: "arrow-down",
  fitWidth: "fit-width",
  fitPage: "fit-page",
  theme: "moon",
};

/**
 * DOM chrome built from the catalog. The constant bar is a horizontal list of
 * menus. A toolbar row appears only for the current selection.
 * The View menu shows or hides groups; lock freezes drag positions.
 */
export class Toolbar {
  readonly el: HTMLDivElement;
  readonly status: HTMLSpanElement;
  readonly error: HTMLDetailsElement;
  private readonly errorText: HTMLPreElement;
  private readonly copyErrorButton: HTMLButtonElement;
  private readonly debugErrorButton: HTMLButtonElement;
  private readonly chrome: HTMLDivElement;
  private readonly appRow: HTMLDivElement;
  private readonly toolsRow: HTMLDivElement;
  private readonly findCluster: HTMLDivElement;
  private readonly contextRow: HTMLDivElement;
  private readonly errorSummary: HTMLElement;
  private readonly groups = new Map<string, HTMLElement>();
  private readonly controls = new Map<string, HTMLButtonElement | HTMLInputElement | HTMLSelectElement>();
  private readonly menuTriggers = new Map<string, HTMLButtonElement>();
  private readonly positions = new Map<string, { x: number; y: number }>();
  private lastQuery = "";
  /** True while `sync` writes the selection into the font controls, so that write is not an edit. */
  private echoing = false;
  private state: ToolbarState | undefined;
  private viewMenu: HTMLDivElement | undefined;
  private openMenuId: string | undefined;

  constructor(
    private readonly h: ElementFactory,
    private readonly actions: ToolbarActions,
    highlightColor: string,
  ) {
    this.chrome = h("div", "dd-chrome");
    this.appRow = h("div", "dd-toolbar dd-toolbar-app");
    this.appRow.setAttribute("role", "menubar");
    this.appRow.setAttribute("aria-orientation", "horizontal");
    this.appRow.setAttribute("aria-label", "Document");
    this.toolsRow = h("div", "dd-toolbar dd-toolbar-tools");
    this.toolsRow.setAttribute("role", "toolbar");
    this.toolsRow.setAttribute("aria-label", "Tools");
    this.findCluster = h("div", "dd-find");
    this.findCluster.hidden = true;
    this.contextRow = h("div", "dd-toolbar dd-toolbar-context");
    this.contextRow.hidden = true;
    this.contextRow.setAttribute("role", "toolbar");
    this.contextRow.setAttribute("aria-label", "Selection");

    for (const row of [this.appRow, this.toolsRow, this.contextRow]) {
      row.addEventListener("keydown", (event) => this.onToolbarKey(event));
      row.addEventListener("mousedown", (event) => {
        if ((event.target as Element | null)?.closest("button, label")) event.preventDefault();
      });
    }

    this.buildApp();
    this.buildTools();
    this.buildContext(highlightColor);

    this.status = h("span", "dd-status");
    this.status.setAttribute("role", "status");
    this.status.tabIndex = -1;
    this.status.addEventListener("mousedown", (event) => event.stopPropagation());
    this.status.addEventListener("copy", (event) => this.writeClipboard(event, this.statusMessage()));

    const error = h("details", "dd-error");
    error.hidden = true;
    const summary = h("summary");
    summary.textContent = "Error";
    this.errorSummary = summary;
    const body = h("div", "dd-error-body");
    const pre = h("pre");
    pre.tabIndex = 0;
    pre.setAttribute("aria-label", "Error message");
    pre.addEventListener("copy", (event) => this.writeClipboard(event, this.errorMessage()));
    const copy = button(h, "Copy", () => void this.copyError(), "Copy error message");
    copy.dataset.action = "copy-error";
    const debug = button(
      h,
      "Debug",
      () => void this.copyDebug(),
      "Copy a report Cursor can use to debug and fix this error",
    );
    debug.dataset.action = "debug-error";
    const errorActions = h("div", "dd-error-actions");
    errorActions.append(copy, debug);
    body.append(pre, errorActions);
    error.append(summary, body);
    this.error = error;
    this.errorText = pre;
    this.copyErrorButton = copy;
    this.debugErrorButton = debug;

    this.appRow.append(this.status, this.error);
    this.chrome.append(this.appRow, this.toolsRow, this.contextRow);
    this.el = this.chrome;
    const doc = this.chrome.ownerDocument;
    doc.addEventListener("pointerdown", (event) => {
      if (!this.openMenuId) return;
      const open = this.groups.get(this.openMenuId);
      if (open?.contains(event.target as Node)) return;
      this.closeMenus();
    });
    doc.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== "Escape" || !this.openMenuId) return;
        event.preventDefault();
        event.stopPropagation();
        const id = this.openMenuId;
        this.closeMenus();
        this.menuTriggers.get(id)?.focus();
      },
      true,
    );
  }

  private act(
    name: string,
    label: string,
    onClick: () => void,
    title = label,
    glyph?: IconName,
  ): HTMLButtonElement {
    const el = glyph ? button(this.h, title, onClick, title, glyph) : button(this.h, label, onClick);
    el.dataset.action = name;
    if (!glyph) {
      el.title = title;
      if (title !== label) el.setAttribute("aria-label", title);
    }
    this.controls.set(name, el);
    return el;
  }

  private field<K extends "input" | "select">(name: string, tag: K, label: string) {
    const el = this.h(tag);
    el.dataset.action = name;
    el.title = label;
    el.setAttribute("aria-label", label);
    this.controls.set(name, el);
    return el;
  }

  private groupEl(id: string, label: string, menu = false): HTMLElement {
    const group = this.h("div", "dd-toolbar-group");
    group.dataset.group = id;
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", label);
    this.groups.set(id, group);
    if (!menu) this.enableDrag(group, id);
    return group;
  }

  /** A named menu on the constant bar. Actions stay in the dropdown. */
  private appMenu(id: string, label: string, ...nodes: Node[]): HTMLElement {
    const item = this.groupEl(id, label, true);
    item.classList.add("dd-menu-item");
    const trigger = button(this.h, label, () => this.toggleMenu(id));
    trigger.classList.add("dd-menu-trigger");
    trigger.dataset.menu = id;
    trigger.setAttribute("aria-haspopup", "menu");
    trigger.setAttribute("aria-expanded", "false");
    this.menuTriggers.set(id, trigger);
    const panel = this.h("div", "dd-menu dd-app-menu");
    panel.hidden = true;
    panel.dataset.menuPanel = id;
    panel.setAttribute("role", "menu");
    panel.append(...nodes);
    panel.addEventListener("click", (event) => {
      const control = (event.target as Element | null)?.closest<HTMLElement>("[data-action]");
      if (!control) return;
      if (control instanceof HTMLSelectElement || control instanceof HTMLInputElement) return;
      if (control.dataset.action === "toolbarVisibility") return;
      this.closeMenus();
    });
    item.append(trigger, panel);
    return item;
  }

  /** Icon commands in a menu keep a readable label beside the symbol. */
  private menuCommand(
    name: string,
    label: string,
    onClick: () => void,
    title = label,
    glyph?: IconName,
  ): HTMLButtonElement {
    const el = this.act(name, label, onClick, title, glyph);
    el.classList.remove("dd-icon");
    el.classList.add("dd-menu-command");
    if (!glyph) el.textContent = "";
    const text = this.h("span", "dd-menu-label");
    text.textContent = label;
    el.append(text);
    return el;
  }

  private sep(): HTMLDivElement {
    return this.h("div", "dd-menu-sep");
  }

  private openMenu(id: string): void {
    if (this.openMenuId === id) return;
    this.closeMenus();
    const group = this.groups.get(id);
    const panel = group?.querySelector<HTMLElement>("[data-menu-panel]");
    if (!group || group.hidden || !panel) return;
    panel.hidden = false;
    this.menuTriggers.get(id)?.setAttribute("aria-expanded", "true");
    this.openMenuId = id;
  }

  private toggleMenu(id: string): void {
    if (this.openMenuId === id) this.closeMenus();
    else this.openMenu(id);
  }

  private closeMenus(): void {
    for (const [id, trigger] of this.menuTriggers) {
      trigger.setAttribute("aria-expanded", "false");
      const panel = this.groups.get(id)?.querySelector<HTMLElement>("[data-menu-panel]");
      if (panel) panel.hidden = true;
    }
    this.openMenuId = undefined;
  }

  private setControlLabel(name: string, label: string): void {
    for (const el of this.el.querySelectorAll<HTMLElement>(`[data-action="${name}"]`)) {
      const text = el.querySelector(".dd-menu-label");
      if (text) text.textContent = label;
      else if (!el.querySelector("svg")) el.textContent = label;
    }
  }

  private enableDrag(group: HTMLElement, id: string): void {
    group.addEventListener("pointerdown", (event) => {
      if (this.state?.toolbarsLocked) return;
      if (id === "view") return;
      if ((event.target as Element).closest("button, input, select, label")) return;
      event.preventDefault();
      const startX = event.clientX;
      const startY = event.clientY;
      const origin = this.positions.get(id) ?? { x: 0, y: 0 };
      const onMove = (move: PointerEvent) => {
        const next = { x: origin.x + move.clientX - startX, y: origin.y + move.clientY - startY };
        this.positions.set(id, next);
        group.style.transform = `translate(${next.x}px, ${next.y}px)`;
        this.actions.moveToolbar(id, next.x, next.y);
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    });
  }

  private buildApp(): void {
    const file = this.appMenu(
      "file",
      "File",
      this.menuCommand("new", "New", () => this.actions.newFile(), "New"),
      this.menuCommand("open", "Open", () => this.actions.pick(), "Open", "folder"),
      this.menuCommand("save", "Save", () => this.actions.download(), "Save", "download"),
      this.sep(),
      this.menuCommand("storeFiledom", "Store as filedom", () => this.actions.storeFiledom()),
      this.menuCommand("export", "Export", () => this.actions.exportFile()),
    );

    const insert = this.appMenu(
      "insert",
      "Insert",
      this.menuCommand("insertImage", "Image", () => this.actions.insertElement("image")),
      this.menuCommand("insertTextBox", "Text box", () => this.actions.insertElement("text-box")),
      this.menuCommand("insertShape", "Shape", () => this.actions.insertElement("shape")),
    );

    const modeSelect = this.field("mode", "select", "View mode");
    modeSelect.append(
      Object.assign(this.h("option"), { value: "live", textContent: "Live" }),
      Object.assign(this.h("option"), { value: "track", textContent: "Track changes" }),
      Object.assign(this.h("option"), { value: "view", textContent: "View only" }),
    );
    modeSelect.addEventListener("change", () => {
      const next = modeSelect.value;
      if (next === "live" || next === "track" || next === "view") this.actions.setViewMode(next);
      this.closeMenus();
    });
    const mode = this.appMenu("mode", "Mode", modeSelect);

    const view = this.appMenu(
      "view",
      "View",
      this.menuCommand("deselect", "Deselect", () => this.actions.deselect(), "Deselect", "x"),
      this.sep(),
      this.menuCommand("toolbarVisibility", "Panels", () => this.toggleViewMenu(), "Show or hide panels"),
      this.menuCommand("lockToolbars", "Lock", () => this.actions.lockToolbars(!(this.state?.toolbarsLocked ?? false)), "Lock toolbars"),
    );

    const help = this.appMenu(
      "help",
      "Help",
      this.menuCommand("help", "Help", () => this.actions.setHelp(!(this.state?.helpOn ?? false)), "Help"),
    );

    this.appRow.append(file, insert, mode, view, help);
  }

  /** Daily actions stay on the bar. Find opens its fields beside the button. */
  private buildTools(): void {
    const rule = () => {
      const line = this.h("span", "dd-sep");
      line.setAttribute("aria-hidden", "true");
      return line;
    };
    const search = this.field("search", "input", "Search");
    search.type = "search";
    search.placeholder = "Search";
    search.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      event.stopPropagation();
      if (search.value && search.value === this.lastQuery) this.actions.nextHit(event.shiftKey ? -1 : 1);
      else {
        this.lastQuery = search.value;
        this.actions.search(search.value);
      }
    });
    const replace = this.field("replace", "input", "Replace with");
    replace.type = "text";
    replace.placeholder = "Replace with";
    replace.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      event.stopPropagation();
      this.actions.replaceMatch(replace.value);
    });
    this.findCluster.append(
      search,
      this.act("findPrev", "Previous", () => this.actions.nextHit(-1), "Previous match", "arrow-up"),
      this.act("findNext", "Next", () => this.actions.nextHit(1), "Next match", "arrow-down"),
      replace,
      this.act("replaceMatch", "Replace", () => this.actions.replaceMatch(replace.value), "Replace the current match"),
      this.act("replaceAll", "Replace all", () => this.actions.replaceAll(replace.value), "Replace every match"),
    );
    this.toolsRow.append(
      this.act("open", "Open", () => this.actions.pick(), "Open", "folder"),
      this.act("save", "Save", () => this.actions.download(), "Save", "download"),
      rule(),
      this.act("undo", "Undo", () => this.actions.undo(), "Undo", "undo"),
      this.act("redo", "Redo", () => this.actions.redo(), "Redo", "redo"),
      rule(),
      this.act("zoomOut", "−", () => this.actions.zoomOut(), "Zoom out"),
      this.act("zoomReset", "100%", () => this.actions.setZoom(1), "Actual size"),
      this.act("zoomIn", "+", () => this.actions.zoomIn(), "Zoom in"),
      this.act("fitWidth", "Fit width", () => this.actions.fit("width"), "Fit width", "fit-width"),
      this.act("fitPage", "Fit page", () => this.actions.fit("page"), "Fit page", "fit-page"),
      rule(),
      this.act("find", "Find", () => this.toggleFind(), "Find"),
      this.findCluster,
      this.act("theme", "Dark", () => this.actions.toggleTheme(), "Dark theme", "moon"),
    );
  }

  private toggleFind(): void {
    this.findCluster.hidden = !this.findCluster.hidden;
    if (!this.findCluster.hidden) this.controls.get("search")?.focus();
  }

  private buildContext(highlightColor: string): void {
    const text = this.groupEl("text", "Text");
    const font = this.field("font", "select", "Font");
    font.append(...FONTS.map((name) => Object.assign(this.h("option"), { value: name, textContent: name })));
    font.addEventListener("change", () => {
      if (!this.echoing) this.actions.setFont(font.value);
    });
    const size = this.field("size", "select", "Font size");
    size.append(...SIZES.map((pt) => Object.assign(this.h("option"), { value: String(pt), textContent: String(pt) })));
    size.value = "12";
    size.addEventListener("change", () => {
      if (!this.echoing) this.actions.setSize(Number(size.value));
    });
    const color = this.field("color", "input", "Font color");
    color.type = "color";
    color.value = "#000000";
    color.className = "dd-swatch";
    color.addEventListener("input", () => {
      if (!this.echoing) this.actions.setColor(color.value);
    });
    const swatch = this.field("highlight-color", "input", "Highlight color");
    swatch.type = "color";
    swatch.value = highlightColor;
    swatch.className = "dd-swatch";
    swatch.addEventListener("input", () => this.actions.setHighlightColor(swatch.value));
    const spacing = this.field("spacing", "select", "Line spacing");
    spacing.append(
      ...SPACING.map((n) => Object.assign(this.h("option"), { value: String(n), textContent: n === 1 ? "1.0" : String(n) })),
    );
    spacing.addEventListener("change", () => this.actions.setLineSpacing(Number(spacing.value)));
    const rule = () => {
      const line = this.h("span", "dd-sep");
      line.setAttribute("aria-hidden", "true");
      return line;
    };
    const textFormat = this.h("span");
    textFormat.dataset.group = "text-format";
    textFormat.setAttribute("role", "group");
    textFormat.setAttribute("aria-label", "Text format");
    textFormat.append(
      font,
      size,
      rule(),
      this.act("bold", "B", () => this.actions.toggle("bold"), "Bold"),
      this.act("italic", "I", () => this.actions.toggle("italic"), "Italic"),
      this.act("underline", "U", () => this.actions.toggle("underline"), "Underline"),
      this.act("strike", "S", () => this.actions.toggle("strike"), "Strikethrough"),
      color,
    );
    const textParagraph = this.h("span");
    textParagraph.dataset.group = "text-paragraph";
    textParagraph.setAttribute("role", "group");
    textParagraph.setAttribute("aria-label", "Paragraph");
    textParagraph.append(
      this.act("alignLeft", "Left", () => this.actions.align("left"), "Align left", "align-left"),
      this.act("alignCenter", "Center", () => this.actions.align("center"), "Align center", "align-center"),
      this.act("alignRight", "Right", () => this.actions.align("right"), "Align right", "align-right"),
      this.act("alignJustify", "Justify", () => this.actions.align("justify"), "Justify", "align-justify"),
      rule(),
      spacing,
      this.act("outdent", "Outdent", () => this.actions.indent(-36), "Decrease indent", "outdent"),
      this.act("indent", "Indent", () => this.actions.indent(36), "Increase indent", "indent"),
    );
    text.append(
      textFormat,
      rule(),
      this.act("highlight", "Highlight", () => this.actions.highlight(), "Highlight", "highlight"),
      swatch,
      this.act("clearHighlight", "Clear", () => this.actions.clearHighlight(), "Clear highlight", "eraser"),
      rule(),
      textParagraph,
      rule(),
      this.act("comment", "Comment", () => this.actions.comment(), "Comment", "comment"),
    );

    const image = this.groupEl("image", "Image");
    image.append(
      this.act("replaceImage", "Replace", () => this.actions.replaceImage(), "Replace image"),
      this.act("deleteElement", "Delete", () => this.actions.deleteElement(), "Delete"),
      this.act("deselectElement", "Deselect", () => this.actions.deselect(), "Deselect", "x"),
    );

    const shape = this.groupEl("shape", "Shape");
    const fill = this.field("fill", "input", "Shape fill");
    fill.type = "color";
    fill.value = "#d0d0d0";
    fill.className = "dd-swatch";
    fill.addEventListener("input", () => {
      if (!this.echoing) this.actions.paintShape("fill", fill.value);
    });
    const stroke = this.field("stroke", "input", "Shape stroke");
    stroke.type = "color";
    stroke.value = "#333333";
    stroke.className = "dd-swatch";
    stroke.addEventListener("input", () => {
      if (!this.echoing) this.actions.paintShape("stroke", stroke.value);
    });
    shape.append(
      fill,
      stroke,
      this.act("deleteElement", "Delete", () => this.actions.deleteElement(), "Delete"),
      this.act("deselectElement", "Deselect", () => this.actions.deselect(), "Deselect", "x"),
    );

    const group = this.groupEl("group", "Layer");
    group.append(
      this.act("lockLayer", "Lock", () => {}, "Lock layer"),
      this.act("hideLayer", "Hide", () => {}, "Hide layer"),
      this.act("deleteElement", "Delete", () => this.actions.deleteElement(), "Delete"),
      this.act("deselectElement", "Deselect", () => this.actions.deselect(), "Deselect", "x"),
    );

    const trackHistory = this.groupEl("trackHistory", "Track changes");
    trackHistory.append(
      this.act("restoreHistory", "Restore", () => {}, "Restore"),
      this.act("revertHistory", "Revert", () => {}, "Revert"),
    );

    const named = (text: string) => {
      const label = this.h("span");
      label.textContent = text;
      return label;
    };
    const audio = this.groupEl("audio", "Audio");
    audio.append(
      named("Audio"),
      this.act("playMedia", "Play", () => this.actions.playMedia(), "Play"),
      this.act("pauseMedia", "Pause", () => this.actions.pauseMedia(), "Pause"),
      this.act("muteMedia", "Mute", () => this.actions.muteMedia(), "Mute"),
    );
    const video = this.groupEl("video", "Video");
    video.append(
      named("Video"),
      this.act("playMedia", "Play", () => this.actions.playMedia(), "Play"),
      this.act("pauseMedia", "Pause", () => this.actions.pauseMedia(), "Pause"),
      this.act("muteMedia", "Mute", () => this.actions.muteMedia(), "Mute"),
    );
    const archive = this.groupEl("archive", "Archive");
    archive.append(named("Archive"), this.act("copyListing", "Copy", () => this.actions.copyListing(), "Copy listing"));
    const email = this.groupEl("email", "Message");
    email.append(named("Message"), this.act("copyListing", "Copy", () => this.actions.copyListing(), "Copy message"));
    const sheet = this.groupEl("sheet", "Sheet");
    sheet.append(named("Sheet"), this.act("copyListing", "Copy", () => this.actions.copyListing(), "Copy sheet"));
    const timeline = this.groupEl("timeline", "Timeline");
    const speed = this.field("clipSpeed", "select", "Clip speed");
    for (const value of [0.25, 0.5, 1, 1.5, 2, 4]) {
      const option = this.h("option");
      option.value = String(value);
      option.textContent = `${value}×`;
      speed.append(option);
    }
    speed.value = "1";
    speed.addEventListener("change", () => {
      if (!this.echoing) this.actions.setClipSpeed(Number(speed.value));
    });
    timeline.append(
      named("Timeline"),
      speed,
      this.act("appendClip", "Add clip", () => this.actions.appendClip(), "Add a file to the track"),
    );

    for (const el of [text, image, shape, group, trackHistory, audio, video, archive, email, sheet, timeline]) el.hidden = true;
    this.contextRow.append(text, image, shape, group, trackHistory, audio, video, archive, email, sheet, timeline);
    for (const name of ["bold", "italic", "underline", "strike", "theme", "help"]) {
      this.controls.get(name)?.setAttribute("aria-pressed", "false");
    }
  }

  private toggleViewMenu(): void {
    if (this.viewMenu) {
      this.viewMenu.remove();
      this.viewMenu = undefined;
      return;
    }
    const menu = this.h("div", "dd-menu dd-view-menu");
    menu.setAttribute("role", "menu");
    const toolbars = this.h("div", "dd-view-section");
    const toolbarsTitle = this.h("strong");
    toolbarsTitle.textContent = "Toolbars";
    toolbars.append(toolbarsTitle);
    for (const group of TOOLBAR_CATALOG) {
      if (group.id === "view") continue;
      const item = this.h("label");
      const check = this.h("input");
      check.type = "checkbox";
      check.checked = !this.state?.hiddenGroups.includes(group.id);
      check.addEventListener("change", () => this.actions.setToolbarVisible(group.id, check.checked));
      item.append(check, ` ${group.label}`);
      toolbars.append(item);
    }
    menu.append(toolbars);

    const trays = this.h("div", "dd-view-section");
    const traysTitle = this.h("strong");
    traysTitle.textContent = "Trays";
    trays.append(traysTitle);
    const available = new Set(this.state?.availableTrays ?? []);
    const shown = new Set(this.state?.shownTrays ?? []);
    for (const tray of TRAY_CATALOG) {
      const item = this.h("label");
      const check = this.h("input");
      check.type = "checkbox";
      check.dataset.tray = tray.id;
      const offered = available.has(tray.id);
      check.disabled = !offered;
      check.checked = offered && shown.has(tray.id);
      check.addEventListener("change", () => this.actions.setTrayVisible(tray.id, check.checked));
      item.append(check, ` ${tray.label}`);
      trays.append(item);
    }
    menu.append(trays);

    this.groups.get("view")?.querySelector("[data-menu-panel]")?.append(menu);
    this.viewMenu = menu;
  }

  private catalogContext(state: ToolbarState): CatalogContext {
    const caps: Capabilities = state.info?.capabilities ?? {
      editText: false,
      editStructure: false,
      formatText: false,
      formatParagraph: false,
      flowEmbeds: false,
      transform: false,
      layers: false,
      insert: false,
    };
    return {
      capabilities: caps,
      mode: state.viewMode,
      selection: state.selectionKind,
      isFiledom: state.isFiledom,
      insertKinds: state.insertKinds,
      canUndo: state.info?.canUndo,
      canRedo: state.info?.canRedo,
      hasSelection: state.hasSelection,
      fileKind: state.info ? fileKind(state.info.format) : undefined,
      format: state.info?.format,
      supportsGroup: (groupId) => {
        if (state.isFiledom) return true;
        if (groupId === "text") return caps.editText || caps.formatText;
        if (groupId === "image" || groupId === "shape") return caps.transform;
        if (groupId === "insert") return caps.insert && state.insertKinds.length > 0;
        if (groupId === "group") return caps.layers;
        return true;
      },
    };
  }

  /** `true` while the chrome is showing a dark palette. */
  setColorScheme(dark: boolean): void {
    for (const theme of this.el.querySelectorAll<HTMLButtonElement>('[data-action="theme"]')) {
      theme.setAttribute("aria-pressed", String(dark));
      const label = dark ? "Light theme" : "Dark theme";
      theme.title = label;
      theme.setAttribute("aria-label", label);
      const glyph = icon(theme.ownerDocument, dark ? "sun" : "moon");
      const existing = theme.querySelector("svg");
      if (existing) existing.replaceWith(glyph);
      else theme.prepend(glyph);
      const text = theme.querySelector(".dd-menu-label");
      if (text) text.textContent = dark ? "Light" : "Dark";
    }
  }

  /** Selects `value`, adding it when the open document uses a face that is not in the catalog. */
  private syncChoice(name: string, value: string | undefined, catalog: readonly string[]): void {
    const control = this.controls.get(name);
    if (!(control instanceof HTMLSelectElement)) return;
    for (const option of [...control.options]) {
      if (!catalog.includes(option.value)) option.remove();
    }
    if (!value) {
      control.selectedIndex = -1;
      if (name === "font") control.style.fontFamily = "";
      return;
    }
    if (![...control.options].some((option) => option.value === value)) {
      control.append(Object.assign(this.h("option"), { value, textContent: value }));
    }
    control.value = value;
    if (name === "font") control.style.fontFamily = `"${value.replace(/["\\]/g, "")}", var(--dd-font)`;
  }

  private syncColor(color: string | undefined): void {
    const control = this.controls.get("color");
    if (!(control instanceof HTMLInputElement) || !color) return;
    if (control.value.toLowerCase() !== color.toLowerCase()) control.value = color;
  }

  sync(state: ToolbarState): void {
    this.state = state;
    const ctx = this.catalogContext(state);
    const open = Boolean(state.info);
    const setDisabled = (name: string, disabled: boolean) => {
      for (const el of this.el.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>(
        `[data-action="${name}"]`,
      )) {
        el.disabled = disabled;
      }
    };

    for (const group of TOOLBAR_CATALOG) {
      const el = this.groups.get(group.id);
      if (!el) continue;
      const userHidden = group.id !== "view" && state.hiddenGroups.includes(group.id);
      const availability = groupAvailability(group.id, ctx);
      el.hidden = userHidden || availability === "hidden";
      el.dataset.availability = availability;
      if (group.id !== "view") {
        const pos = this.positions.get(group.id);
        if (pos && !state.toolbarsLocked) el.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
      }
      for (const action of group.actions) {
        const actionState = actionAvailability(group.id, action.id, ctx);
        const matched = el.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>(
          `[data-action="${action.id}"]`,
        );
        const controls = matched.length ? [...matched] : this.controls.get(action.id) ? [this.controls.get(action.id)!] : [];
        for (const control of controls) {
          control.hidden = actionState === "hidden";
          // Hidden or mode-blocked actions stay disabled so clicks are no-ops even if shown briefly.
          // View chrome (theme, zoom, lock) and Help stay usable before a file is open.
          const needsDocument =
            actionState === "shown" &&
            !open &&
            group.id !== "file" &&
            group.id !== "help" &&
            group.id !== "view" &&
            action.id !== "new" &&
            action.id !== "open";
          control.disabled = actionState !== "shown" || needsDocument;
          const hint = actionHint(group.id, action.id, state.helpOn);
          if (hint) control.title = hint;
          else if (ICONS[action.id] || control.getAttribute("aria-label")) {
            /* keep accessible name; clear tooltip when help is off */
            if (!state.helpOn && control.title && control.getAttribute("aria-label")) {
              control.removeAttribute("title");
            }
          }
        }
      }
    }

    setDisabled("mode", state.modeLocked);
    setDisabled("new", false);
    setDisabled("open", false);
    setDisabled("save", !open);
    const historyBlocked = !open || state.viewMode === "view";
    setDisabled("undo", historyBlocked || !state.info?.canUndo);
    setDisabled("redo", historyBlocked || !state.info?.canRedo);
    setDisabled("storeFiledom", !open);
    setDisabled("export", !open || !state.isFiledom);
    setDisabled("search", !open);
    setDisabled("findPrev", !open);
    setDisabled("findNext", !open);
    const canReplace = open && state.viewMode !== "view" && Boolean(state.info?.capabilities.editText);
    setDisabled("replace", !canReplace);
    setDisabled("replaceMatch", !canReplace);
    setDisabled("replaceAll", !canReplace);

    const mode = this.controls.get("mode");
    if (mode instanceof HTMLSelectElement) mode.value = state.viewMode;
    const zoom = this.controls.get("zoomReset");
    if (zoom) this.setControlLabel("zoomReset", `${Math.round(state.zoom * 100)}%`);
    for (const name of ["bold", "italic", "underline", "strike"] as const) {
      this.controls.get(name)?.setAttribute("aria-pressed", String(state[name]));
    }
    this.echoing = true;
    try {
      this.syncChoice("font", state.font, FONTS);
      this.syncChoice("size", state.sizePt === undefined ? undefined : sizeLabel(state.sizePt), SIZES.map(String));
      this.syncColor(state.color);
      const speed = this.controls.get("clipSpeed");
      if (speed instanceof HTMLSelectElement && state.clipSpeed !== undefined && [...speed.options].some((option) => option.value === String(state.clipSpeed))) {
        speed.value = String(state.clipSpeed);
      }
    } finally {
      this.echoing = false;
    }
    this.controls.get("help")?.setAttribute("aria-pressed", String(state.helpOn));
    this.controls.get("lockToolbars")?.setAttribute("aria-pressed", String(state.toolbarsLocked));
    this.setControlLabel("lockToolbars", state.toolbarsLocked ? "Unlock" : "Lock");
    const textFormat = this.el.querySelector<HTMLElement>('[data-group="text-format"]');
    if (textFormat) textFormat.hidden = !ctx.capabilities.formatText;
    const textParagraph = this.el.querySelector<HTMLElement>('[data-group="text-paragraph"]');
    if (textParagraph) textParagraph.hidden = !ctx.capabilities.formatParagraph;
    const contextual = ["text", "image", "shape", "group", "trackHistory", "audio", "video", "archive", "email", "sheet", "timeline"];
    this.contextRow.hidden = !contextual.some((id) => {
      const el = this.groups.get(id);
      return Boolean(el && !el.hidden);
    });
    if (this.openMenuId && this.groups.get(this.openMenuId)?.hidden) this.closeMenus();
  }

  focusSearch(): void {
    this.findCluster.hidden = false;
    this.controls.get("search")?.focus();
  }

  /** Arrow keys move between toolbar controls. Up and down change a focused select. */
  private onToolbarKey(event: KeyboardEvent): void {
    const key = event.key;
    const target = event.target;
    if ((key === "ArrowDown" || key === "ArrowUp") && target instanceof HTMLSelectElement) {
      event.preventDefault();
      const step = key === "ArrowDown" ? 1 : -1;
      const next = Math.min(target.options.length - 1, Math.max(0, target.selectedIndex + step));
      if (next === target.selectedIndex) return;
      target.selectedIndex = next;
      target.dispatchEvent(new Event("input", { bubbles: true }));
      target.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
    if (key !== "ArrowLeft" && key !== "ArrowRight" && key !== "Home" && key !== "End") return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (target instanceof HTMLInputElement && target.type !== "color" && target.type !== "button") {
      const start = target.selectionStart ?? 0;
      const end = target.selectionEnd ?? 0;
      if (key === "ArrowLeft" && start > 0) return;
      if (key === "ArrowRight" && end < target.value.length) return;
      if (key === "Home" || key === "End") return;
    }
    const items = toolbarItems(this.el);
    if (!items.length) return;
    const current = items.indexOf(event.target as HTMLElement);
    if (current < 0) return;
    event.preventDefault();
    if (key === "Home") {
      items[0]?.focus();
      return;
    }
    if (key === "End") {
      items[items.length - 1]?.focus();
      return;
    }
    const step = key === "ArrowRight" ? 1 : -1;
    items[(current + step + items.length) % items.length]?.focus();
  }

  setStatus(message: string, tone: "info" | "error" = "info"): void {
    const shown = tone === "error" ? shortError(message) : message;
    this.status.textContent = shown;
    this.status.dataset.message = message;
    this.status.title = shown;
    if (tone === "error") {
      this.status.dataset.tone = "error";
      this.showError(message);
    } else delete this.status.dataset.tone;
  }

  showError(message: string): void {
    this.error.hidden = false;
    this.error.open = false;
    this.error.dataset.message = message;
    this.errorSummary.textContent = shortError(message);
    this.errorText.textContent = message;
    this.errorText.dataset.message = message;
    this.copyErrorButton.textContent = "Copy";
    this.debugErrorButton.textContent = "Debug";
  }

  clearError(): void {
    this.error.hidden = true;
    this.error.open = false;
    delete this.error.dataset.message;
    this.errorSummary.textContent = "Error";
    this.errorText.textContent = "";
    delete this.errorText.dataset.message;
    this.copyErrorButton.textContent = "Copy";
    this.debugErrorButton.textContent = "Debug";
  }

  private statusMessage(): string {
    return this.status.dataset.message || this.status.textContent || "";
  }

  private errorMessage(): string {
    return this.errorText.dataset.message || this.errorText.textContent || "";
  }

  private writeClipboard(event: ClipboardEvent, text: string): void {
    if (!text || !event.clipboardData) return;
    event.preventDefault();
    event.stopPropagation();
    event.clipboardData.setData("text/plain", text);
  }

  private copyError(): void {
    const text = this.errorMessage();
    if (!text) return;
    this.copyTo(this.copyErrorButton, text);
  }

  private copyDebug(): void {
    let text = "";
    try {
      text = this.actions.debugReport();
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      text = `${this.errorMessage()}\n\nDebug report failed: ${reason}`;
    }
    if (!text) return;
    this.copyTo(this.debugErrorButton, text);
  }

  private copyTo(buttonEl: HTMLButtonElement, text: string): void {
    const legacy = copyPlainText(buttonEl.ownerDocument, text);
    const write = navigator.clipboard?.writeText?.bind(navigator.clipboard);
    if (!write) {
      if (legacy) buttonEl.textContent = "Copied";
      else this.selectError();
      return;
    }
    void write(text).then(
      () => {
        buttonEl.textContent = "Copied";
      },
      () => {
        if (legacy) buttonEl.textContent = "Copied";
        else this.selectError();
      },
    );
  }

  private selectError(): void {
    const doc = this.errorText.ownerDocument;
    const range = doc.createRange();
    range.selectNodeContents(this.errorText);
    const selection = doc.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
}

function toolbarItems(bar: HTMLElement): HTMLElement[] {
  return [...bar.querySelectorAll<HTMLElement>("button, input, select")].filter((el) => {
    if (el.closest("[hidden]")) return false;
    return !(el as HTMLButtonElement).disabled;
  });
}

function copyPlainText(doc: Document, text: string): boolean {
  const area = doc.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  doc.body.append(area);
  area.select();
  let copied = false;
  try {
    copied = doc.execCommand("copy");
  } catch {
    copied = false;
  }
  area.remove();
  return copied;
}
