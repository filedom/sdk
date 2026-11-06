import { button, placeAt, type ElementFactory } from "./dom.js";
import { errorBundle, errorEntry } from "./error-report.js";
import type { Align, Capabilities, DocInfo } from "./engine-types.js";
import { fileIconName, fileKind } from "./formats.js";
import { icon, type IconName } from "./icons.js";
import {
  DOCUMENT_TEXT_FIELDS,
  DOCUMENT_THEME_FIELDS,
  THEME_PRESETS,
  UI_TEXT_FIELDS,
  UI_THEME_FIELDS,
  type DocumentTheme,
  type ThemeToken,
  type ThemeTokens,
  type UiTheme,
} from "./theme.js";
import {
  actionAvailability,
  actionHint,
  groupAvailability,
  TOOLBAR_CATALOG,
  type CatalogContext,
  type SelectionKind,
} from "./toolbar-catalog.js";
import { DISPLAY_LAYOUTS, type DisplayLayout } from "./display-layout.js";
import { zoomFromPercent, MIN_ZOOM, MAX_ZOOM, type FitMode } from "./zoom.js";

/** How the open document is shown and whether edits are allowed. */
export type ViewMode = "live" | "track" | "view";

/** One open file in the tab strip under the menus. */
export interface OpenFileTab {
  id: string;
  name: string;
  format?: DocInfo["format"];
  active: boolean;
}

/** Which tools sit on the side rails, and whether each rail is expanded. */
export interface ToolbarLayout {
  left: string[];
  right: string[];
  leftOpen: boolean;
  rightOpen: boolean;
}

/** File actions on the left, view actions on the right. Both rails start as icon strips. */
export const DEFAULT_TOOLBAR_LAYOUT: ToolbarLayout = {
  left: ["open", "save", "close", "undo", "redo"],
  right: ["zoomOut", "zoomReset", "zoomIn", "fitWidth", "fitPage", "find", "theme"],
  leftOpen: false,
  rightOpen: false,
};

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
  /** Open file name. Omitted when nothing is open. */
  fileName?: string;
  /** Every file kept open. Omitted: one tab from `fileName`. */
  tabs?: readonly OpenFileTab[];
  /** How the open file is drawn. */
  displayLayout?: DisplayLayout;
  /** Last find query. Empty until Find runs. */
  searchQuery?: string;
  /** Matches for `searchQuery`. */
  searchHitCount?: number;
  /** Zero-based current match, or -1. */
  searchHitIndex?: number;
}

export interface ToolbarActions {
  pick(): void;
  newFile(): void;
  download(): void;
  closeFile(): void;
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
  /** Shows a file that is already open. Omitted when the host keeps one file. */
  selectTab?(id: string): void;
  /** Writes the tab strip order after a drag. */
  reorderTabs?(ids: readonly string[]): void;
  /** Switches numbered, paginated, or frame. */
  setDisplayLayout(layout: DisplayLayout): void;
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
  /** Applies a named theme from Settings. */
  setThemePreset(id: string): void;
  /** Changes one chrome or document color without replacing the rest of the theme. */
  setThemeColors(patch: { ui?: UiTheme; document?: DocumentTheme }): void;
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
  /** The side rails changed. Omitted when the host does not listen. */
  layoutChanged?(layout: ToolbarLayout): void;
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

/** A color input only accepts `#rrggbb`. Short hex such as `#fff` is expanded. */
function colorInputValue(value: string): string | undefined {
  const full = normalizeColor(value);
  if (full) return full;
  const short = value.trim().match(/^#([\da-fA-F])([\da-fA-F])([\da-fA-F])$/);
  if (!short) return undefined;
  return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toLowerCase();
}

function sizeLabel(pt: number): string {
  const rounded = Math.round(pt * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** One line, with a trailing address removed. */
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
};

/** Where a nested menu sits so its labels stay inside the window. */
export function nestedMenuBox(
  anchor: { top: number; left: number; right: number },
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  margin = 8,
): { top: number; left: number } {
  const roomRight = viewport.width - anchor.right;
  const roomLeft = anchor.left;
  let left = roomRight >= size.width || roomRight >= roomLeft ? anchor.right - 4 : anchor.left + 4 - size.width;
  let top = anchor.top;
  if (size.width > 0) left = Math.min(Math.max(margin, left), Math.max(margin, viewport.width - margin - size.width));
  if (size.height > 0) top = Math.min(Math.max(margin, top), Math.max(margin, viewport.height - margin - size.height));
  return { top, left };
}

const LEFT_ACTIVITIES: { id: string; label: string; icon: IconName }[] = [
  { id: "text", label: "Text", icon: "type" },
  { id: "draw", label: "Draw", icon: "pen" },
  { id: "shapes", label: "Shapes", icon: "shapes" },
  { id: "image", label: "Image", icon: "image" },
];

const RIGHT_ACTIVITIES: { id: string; label: string; icon: IconName }[] = [
  { id: "layout", label: "Layout", icon: "fit-page" },
  { id: "comments", label: "Comments", icon: "comment" },
  { id: "history", label: "Tracked changes", icon: "undo" },
  { id: "layers", label: "Layers", icon: "layers" },
  { id: "elements", label: "Elements", icon: "elements" },
  { id: "errors", label: "Errors", icon: "alert" },
];

/**
 * DOM chrome built from the catalog. The constant bar is a horizontal list of
 * menus. A toolbar row appears only for the current selection.
 * The View menu shows or hides groups; lock freezes drag positions.
 */
let settingsSerial = 0;

const SETTINGS_TABS = [
  ["appearance", "Appearance"],
  ["toolbars", "Toolbars"],
  ["editing", "Editing"],
  ["layout", "Layout"],
] as const;

export class Toolbar {
  readonly el: HTMLDivElement;
  readonly status: HTMLSpanElement;
  private errorIcon?: HTMLButtonElement;
  private errorBadge?: HTMLSpanElement;
  private errorList?: HTMLElement;
  private errorCopyAll?: HTMLButtonElement;
  private errors: { summary: string; report: string }[] = [];
  private documentNotes: { summary: string; report: string }[] = [];
  private documentNoteKeys: string[] = [];
  private readonly chrome: HTMLDivElement;
  private readonly appRow: HTMLDivElement;
  private readonly toolsRow: HTMLDivElement;
  private readonly findCluster: HTMLDivElement;
  private readonly contextRow: HTMLDivElement;
  private readonly optionsRow: HTMLDivElement;
  private readonly toolShelf: HTMLDivElement;
  private readonly selectionSlot: HTMLDivElement;
  readonly selectionBar: HTMLDivElement;
  private readonly groups = new Map<string, HTMLElement>();
  private readonly controls = new Map<string, HTMLButtonElement | HTMLInputElement | HTMLSelectElement>();
  private readonly menuTriggers = new Map<string, HTMLButtonElement>();
  private readonly positions = new Map<string, { x: number; y: number }>();
  private lastQuery = "";
  /** True while `sync` writes the selection into the font controls, so that write is not an edit. */
  private echoing = false;
  private state: ToolbarState | undefined;
  private themePanel!: HTMLElement;
  private settingsDialog!: HTMLElement;
  private settingsKey = "";
  private helpSetting?: HTMLInputElement;
  private zoomField?: HTMLInputElement;
  private zoomEditing = false;
  private findCount!: HTMLElement;
  private openMenuId: string | undefined;
  private doc!: Document;
  private activeLeft: string | undefined;
  private activeRight: string | undefined;
  private leftPanel!: HTMLElement;
  private rightPanel!: HTMLElement;
  private readonly iconsShown = { left: true, right: true };
  private readonly tabsEl: HTMLElement;
  private readonly fileRow: HTMLElement;
  private draggingTab?: HTMLElement;
  readonly leftRail: HTMLElement;
  readonly rightRail: HTMLElement;
  private readonly closeDialog: HTMLElement;
  private layout: ToolbarLayout;

  constructor(
    private readonly h: ElementFactory,
    private readonly actions: ToolbarActions,
    highlightColor: string,
    layout?: Partial<ToolbarLayout>,
  ) {
    this.layout = {
      ...DEFAULT_TOOLBAR_LAYOUT,
      ...layout,
      left: layout?.left ?? DEFAULT_TOOLBAR_LAYOUT.left,
      right: layout?.right ?? DEFAULT_TOOLBAR_LAYOUT.right,
    };
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
    this.optionsRow = h("div", "dd-toolbar dd-toolbar-options");
    this.optionsRow.setAttribute("role", "toolbar");
    this.optionsRow.setAttribute("aria-label", "Zoom");
    this.toolShelf = h("div", "dd-tool-shelf");
    this.toolShelf.hidden = true;
    this.selectionSlot = h("div", "dd-selection-slot");
    this.selectionBar = h("div", "dd-toolbar dd-selection-bar");
    this.selectionBar.hidden = true;
    this.selectionBar.setAttribute("role", "toolbar");
    this.selectionBar.setAttribute("aria-label", "Selection");
    this.selectionSlot.append(this.selectionBar);
    this.selectionBar.addEventListener("pointerdown", (event) => event.stopPropagation());

    for (const row of [this.appRow, this.toolsRow, this.contextRow, this.optionsRow, this.toolShelf, this.selectionBar]) {
      row.addEventListener("keydown", (event) => this.onToolbarKey(event));
      row.addEventListener("mousedown", (event) => {
        if ((event.target as Element | null)?.closest("button, label")) event.preventDefault();
      });
    }

    this.fileRow = h("div", "dd-file-row");
    this.tabsEl = h("div", "dd-tabs");
    this.tabsEl.hidden = true;
    this.tabsEl.setAttribute("role", "tablist");
    this.tabsEl.setAttribute("aria-label", "Open files");
    this.fileRow.append(this.tabsEl);
    this.leftRail = h("div", "dd-rail dd-rail-left");
    this.rightRail = h("div", "dd-rail dd-rail-right");
    this.leftRail.dataset.open = String(this.layout.leftOpen);
    this.rightRail.dataset.open = String(this.layout.rightOpen);
    this.leftRail.setAttribute("role", "toolbar");
    this.rightRail.setAttribute("role", "toolbar");
    this.leftRail.setAttribute("aria-label", "Editing");
    this.rightRail.setAttribute("aria-label", "Review");
    this.leftRail.dataset.icons = "shown";
    this.rightRail.dataset.icons = "shown";
    this.closeDialog = h("div", "dd-close-dialog");
    this.closeDialog.hidden = true;
    this.closeDialog.setAttribute("role", "dialog");
    this.closeDialog.setAttribute("aria-modal", "true");
    this.closeDialog.setAttribute("aria-label", "Discard changes");
    const closeCopy = h("p");
    closeCopy.textContent = "Closing discards unsaved changes. The file stays in the list.";
    const discard = button(h, "Discard", () => {
      this.closeDialog.hidden = true;
      this.actions.closeFile();
    });
    discard.dataset.action = "close-discard";
    const cancel = button(h, "Cancel", () => {
      this.closeDialog.hidden = true;
    });
    cancel.dataset.action = "close-cancel";
    const closeActions = h("div", "dd-close-actions");
    closeActions.append(discard, cancel);
    const closeCard = h("div", "dd-close-card");
    closeCard.append(closeCopy, closeActions);
    this.closeDialog.append(closeCard);

    this.buildApp();
    this.buildTools();
    this.buildContext(highlightColor);

    this.status = h("span", "dd-status");
    this.status.setAttribute("role", "status");
    this.status.tabIndex = -1;
    this.status.addEventListener("mousedown", (event) => event.stopPropagation());
    this.status.addEventListener("copy", (event) => this.writeClipboard(event, this.statusMessage()));

    this.fileRow.append(this.status);
    this.arrangeRails();
    this.buildSettings();
    this.chrome.append(
      this.appRow,
      this.fileRow,
      this.optionsRow,
      this.toolShelf,
      this.selectionSlot,
      this.leftRail,
      this.rightRail,
      this.findCluster,
      this.closeDialog,
      this.settingsDialog,
    );
    this.el = this.chrome;
    this.doc = this.chrome.ownerDocument;
    this.doc.addEventListener("pointerdown", this.onDocPointer);
    this.doc.addEventListener("keydown", this.onDocKey, true);
    this.doc.addEventListener("fullscreenchange", this.onFullscreen);
  }

  /** Drops the document listeners. The host removes `el`. */
  destroy(): void {
    this.doc.removeEventListener("pointerdown", this.onDocPointer);
    this.doc.removeEventListener("keydown", this.onDocKey, true);
    this.doc.removeEventListener("fullscreenchange", this.onFullscreen);
  }

  private readonly onFullscreen = (): void => {
    this.paintFullscreen();
  };

  private readonly onDocPointer = (event: Event): void => {
    const target = event.target as Node | null;
    const inChromeTools =
      !!target && (this.leftRail.contains(target) || this.rightRail.contains(target) || this.toolShelf.contains(target));
    if (this.activeLeft && !inChromeTools) {
      this.activeLeft = undefined;
      this.applyActivity("left");
    }
    if (this.activeRight && !inChromeTools) {
      const current = this.activeRight;
      this.activeRight = undefined;
      this.applyActivity("right");
      if (this.closesHostTray(current)) this.actions.setTrayVisible(current, false);
    }
    if (!this.openMenuId) return;
    const open = this.groups.get(this.openMenuId);
    if (open?.contains(event.target as Node)) return;
    this.closeMenus();
  };

  private readonly onDocKey = (event: KeyboardEvent): void => {
    if (event.key !== "Escape") return;
    if (!this.findCluster.hidden) {
      event.preventDefault();
      event.stopPropagation();
      this.findCluster.hidden = true;
      return;
    }
    if (!this.settingsDialog.hidden) {
      event.preventDefault();
      event.stopPropagation();
      this.settingsDialog.hidden = true;
      return;
    }
    if (!this.openMenuId) return;
    event.preventDefault();
    event.stopPropagation();
    const id = this.openMenuId;
    this.closeMenus();
    this.menuTriggers.get(id)?.focus();
  };

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
      const action = control.dataset.action ?? "";
      if (control.closest(".dd-find") || control.closest(".dd-menu-nested")) return;
      if (action === "zoomIn" || action === "zoomOut" || action === "zoomReset") return;
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
    this.closeNested();
    this.openMenuId = undefined;
  }

  /** A flyout stays beside its row. A parent menu that scrolls would clip it. */
  private closeNested(): void {
    for (const panel of this.el.querySelectorAll<HTMLElement>(".dd-menu-nested")) {
      panel.hidden = true;
      panel.style.position = "";
      panel.style.top = "";
      panel.style.insetInlineStart = "";
      panel.style.insetInlineEnd = "";
      panel.previousElementSibling?.setAttribute("aria-expanded", "false");
    }
  }

  /**
   * Pins the flyout to the window so a scrolling or clipping parent cannot hide it,
   * on the side of the row that keeps the labels in view.
   */
  private placeNested(panel: HTMLElement, trigger: HTMLElement): void {
    const view = trigger.ownerDocument.defaultView;
    if (!view) return;
    panel.style.position = "fixed";
    panel.style.insetInlineEnd = "auto";
    panel.style.insetInlineStart = "0px";
    panel.style.top = "0px";
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    const anchor = trigger.getBoundingClientRect();
    const box = nestedMenuBox(anchor, { width, height }, { width: view.innerWidth, height: view.innerHeight });
    const rtl = view.getComputedStyle(trigger).direction === "rtl";
    const start = rtl ? view.innerWidth - box.left - width : box.left;
    panel.style.insetInlineStart = `${Math.round(start)}px`;
    panel.style.top = `${Math.round(box.top)}px`;
  }

  private toggleFullscreen(): void {
    const doc = this.el.ownerDocument;
    const view = doc.defaultView;
    if (!view) return;
    if (doc.fullscreenElement) {
      void doc.exitFullscreen?.();
      return;
    }
    const target = this.el.closest<HTMLElement>(".dd-viewer") ?? this.el;
    void target.requestFullscreen?.();
  }

  private paintFullscreen(): void {
    const open = Boolean(this.el.ownerDocument.fullscreenElement);
    for (const control of this.el.querySelectorAll<HTMLButtonElement>(".dd-tab [data-action='fullscreen']")) {
      control.replaceChildren(icon(control.ownerDocument, open ? "fullscreen-exit" : "fullscreen"));
      control.setAttribute("aria-label", open ? "Exit full screen" : "Full screen");
      control.title = open ? "Exit full screen" : "Full screen";
    }
  }

  /** Closes immediately when the file is unchanged. A dirty file asks first. */
  private requestClose(): void {
    if (this.state?.info?.canUndo) {
      this.closeDialog.hidden = false;
      return;
    }
    this.actions.closeFile();
  }

  private menuFolder(label: string, ...nodes: Node[]): HTMLElement {
    const item = this.h("div", "dd-menu-folder");
    const trigger = this.h("button");
    trigger.type = "button";
    trigger.className = "dd-menu-command";
    trigger.setAttribute("aria-haspopup", "menu");
    trigger.setAttribute("aria-expanded", "false");
    const text = this.h("span", "dd-menu-label");
    text.textContent = label;
    trigger.append(text);
    const panel = this.h("div", "dd-menu dd-menu-nested");
    panel.hidden = true;
    panel.setAttribute("role", "menu");
    panel.append(...nodes);
    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const open = panel.hidden;
      panel.hidden = !open;
      trigger.setAttribute("aria-expanded", String(open));
      if (open) this.placeNested(panel, trigger);
    });
    item.append(trigger, panel);
    return item;
  }

  /** Shows or hides a vertical icon list. A tab stays on the edge either way. */
  private railTab(side: "left" | "right"): HTMLButtonElement {
    const tab = button(
      this.h,
      "",
      () => this.toggleRail(side),
      side === "left" ? "Hide editing tools" : "Hide review",
      side === "left" ? "chevron-left" : "chevron-right",
    );
    tab.dataset.railTab = side;
    tab.classList.add("dd-rail-tab");
    tab.setAttribute("aria-expanded", "true");
    return tab;
  }

  private toggleRail(side: "left" | "right"): void {
    this.iconsShown[side] = !this.iconsShown[side];
    const rail = side === "left" ? this.leftRail : this.rightRail;
    const shown = this.iconsShown[side];
    rail.dataset.icons = shown ? "shown" : "hidden";
    const tab = rail.querySelector<HTMLButtonElement>("[data-rail-tab]");
    if (tab) {
      const glyph = shown
        ? side === "left"
          ? "chevron-left"
          : "chevron-right"
        : side === "left"
          ? "chevron-right"
          : "chevron-left";
      tab.replaceChildren(icon(tab.ownerDocument, glyph));
      tab.setAttribute("aria-expanded", String(shown));
      tab.setAttribute(
        "aria-label",
        shown ? (side === "left" ? "Hide editing tools" : "Hide review") : side === "left" ? "Show editing tools" : "Show review",
      );
    }
    if (shown) return;
    if (side === "left" && this.activeLeft) {
      this.activeLeft = undefined;
      this.applyActivity("left");
    }
    if (side === "right" && this.activeRight) {
      const current = this.activeRight;
      this.activeRight = undefined;
      this.applyActivity("right");
      if (this.closesHostTray(current)) this.actions.setTrayVisible(current, false);
    }
  }

  /** Icon columns. Each icon opens the tray for that group. */
  private arrangeRails(): void {
    this.toolShelf.append(this.contextRow);
    this.buildSide("left");
    this.buildSide("right");
  }

  private buildSide(side: "left" | "right"): void {
    const icons = this.h("div", "dd-activity-icons");
    icons.setAttribute("role", "toolbar");
    icons.setAttribute("aria-label", side === "left" ? "Editing" : "Review");
    const panel = this.h("div", "dd-activity-panel");
    panel.hidden = true;
    const specs = side === "left" ? LEFT_ACTIVITIES : RIGHT_ACTIVITIES;
    for (const spec of specs) {
      const trigger = button(this.h, spec.label, () => this.toggleActivity(side, spec.id), spec.label, spec.icon);
      trigger.dataset.activity = spec.id;
      trigger.setAttribute("aria-pressed", "false");
      if (spec.id === "errors") this.attachErrorBadge(trigger);
      icons.append(trigger);
    }
    for (const spec of specs) {
      const tray = this.h("div", "dd-activity-tray");
      tray.dataset.activityTray = spec.id;
      tray.hidden = true;
      const title = this.h("p", "dd-activity-title");
      title.textContent = spec.label;
      tray.append(title);
      this.fillTray(spec.id, tray);
      panel.append(tray);
    }
    if (side === "left") {
      this.leftPanel = panel;
      this.leftRail.replaceChildren(this.railTab("left"), icons, panel);
      this.leftRail.classList.add("dd-activity");
    } else {
      this.rightPanel = panel;
      this.rightRail.replaceChildren(panel, this.railTab("right"), icons);
      this.rightRail.classList.add("dd-activity");
    }
  }

  private fillTray(id: string, tray: HTMLElement): void {
    if (id === "text") {
      const text = this.groups.get("text");
      if (text) tray.append(text);
      tray.append(this.trayCommand("insertTextBox", "Text box", () => this.actions.insertElement("text-box")));
      tray.append(this.trayCommand("insertCode", "Code", () => this.actions.insertElement("code")));
      return;
    }
    if (id === "draw") {
      tray.append(this.trayCommand("insertShape", "Shape", () => this.actions.insertElement("shape")));
      return;
    }
    if (id === "shapes") {
      const shape = this.groups.get("shape");
      if (shape) tray.append(shape);
      return;
    }
    if (id === "image") {
      tray.append(this.trayCommand("insertImage", "Image", () => this.actions.insertElement("image")));
      const image = this.groups.get("image");
      if (image) tray.append(image);
      return;
    }
    if (id === "layout") {
      for (const layout of DISPLAY_LAYOUTS) tray.append(this.layoutChoice(layout));
      return;
    }
    if (id === "errors") {
      this.fillErrors(tray);
      return;
    }
    const host = this.h("div", "dd-review-list");
    host.dataset.review = id;
    const empty = this.h("p", "dd-muted");
    empty.textContent = id === "comments" ? "No comments" : id === "history" ? "No changes" : id === "layers" ? "No layers" : "No elements";
    host.append(empty);
    tray.append(host);
    if (id === "history") {
      const track = this.groups.get("trackHistory");
      if (track) tray.append(track);
    }
    if (id === "layers") {
      const group = this.groups.get("group");
      if (group) tray.append(group);
    }
  }

  /** True when the open format can use the group, apart from the current selection. */
  private groupFitsFormat(groupId: string, ctx: CatalogContext): boolean {
    if (ctx.isFiledom) return true;
    if (groupId === "text") return ctx.capabilities.formatText || ctx.capabilities.formatParagraph;
    if (groupId === "image" || groupId === "shape") return ctx.capabilities.transform;
    if (groupId === "group") return ctx.capabilities.layers;
    return groupAvailability(groupId, ctx) !== "hidden";
  }

  private paintActivityIcons(_state: ToolbarState, ctx: CatalogContext): void {
    this.leftRail.hidden = false;
    for (const icon of this.leftRail.querySelectorAll<HTMLElement>(".dd-activity-icons [data-activity]")) {
      icon.hidden = false;
    }
    for (const name of ["insertImage", "insertTextBox", "insertCode", "insertShape"] as const) {
      const availability = actionAvailability("insert", name, ctx);
      for (const el of this.leftRail.querySelectorAll<HTMLButtonElement>(`[data-activity-tray] [data-action="${name}"]`)) {
        el.hidden = false;
        el.disabled = availability !== "shown";
      }
    }
  }

  /** Mount point for a review list. The viewer fills comments, changes, layers, and elements. */
  reviewHost(id: string): HTMLElement | null {
    return this.rightRail.querySelector<HTMLElement>(`[data-review="${id}"]`);
  }

  /** Opens one activity tray without asking the host to toggle it again. */
  showActivity(side: "left" | "right", id: string): void {
    if (side === "left") this.activeLeft = id;
    else this.activeRight = id;
    this.applyActivity(side);
  }

  private trayCommand(name: string, label: string, onClick: () => void): HTMLButtonElement {
    const el = button(this.h, label, onClick, label);
    el.dataset.action = name;
    return el;
  }

  /** Layout and the error log stay in the rail. The host only hears about review trays. */
  private closesHostTray(id: string | undefined): boolean {
    return id !== undefined && id !== "layout" && id !== "errors";
  }

  private attachErrorBadge(trigger: HTMLButtonElement): void {
    const badge = this.h("span", "dd-error-badge");
    badge.hidden = true;
    trigger.append(badge);
    this.errorIcon = trigger;
    this.errorBadge = badge;
  }

  private fillErrors(tray: HTMLElement): void {
    const actions = this.h("div", "dd-error-actions");
    const copyAll = button(this.h, "Copy all", () => this.copyAllErrors(), "Copy every error and its context");
    copyAll.dataset.action = "copy-errors";
    actions.append(copyAll);
    const list = this.h("div", "dd-error-list");
    tray.append(actions, list);
    this.errorList = list;
    this.errorCopyAll = copyAll;
    this.paintErrors();
  }

  /** Warnings from the open file. Thrown errors stay in the list beside them. */
  setDocumentNotes(messages: readonly string[], fileName?: string): void {
    const next = messages.map((message) => message.trim()).filter(Boolean);
    const same = next.length === this.documentNoteKeys.length && next.every((message, index) => message === this.documentNoteKeys[index]);
    if (same) return;
    this.documentNoteKeys = next;
    this.documentNotes = next.map((message) => errorEntry(message, { fileName: fileName || this.state?.fileName }));
    this.paintErrors();
  }

  private listedErrors(): { summary: string; report: string }[] {
    return [...this.documentNotes, ...this.errors];
  }

  private paintErrors(): void {
    const listed = this.listedErrors();
    const count = listed.length;
    if (this.errorBadge) {
      this.errorBadge.hidden = count === 0;
      this.errorBadge.textContent = count ? String(count) : "";
    }
    if (this.errorIcon) {
      this.errorIcon.setAttribute("aria-label", count ? `Errors, ${count}` : "Errors");
      this.errorIcon.title = count === 1 ? "1 error" : count ? `${count} errors` : "Errors";
      if (count) this.errorIcon.setAttribute("data-alert", "true");
      else this.errorIcon.removeAttribute("data-alert");
    }
    if (this.errorCopyAll) {
      this.errorCopyAll.disabled = count === 0;
      this.errorCopyAll.textContent = "Copy all";
    }
    if (!this.errorList) return;
    this.errorList.replaceChildren();
    if (!count) {
      const empty = this.h("p", "dd-muted");
      empty.textContent = "No errors";
      this.errorList.append(empty);
      return;
    }
    listed.forEach((entry, index) => {
      const row = this.h("article", "dd-error-row");
      const summary = this.h("p");
      summary.textContent = entry.summary;
      let copy!: HTMLButtonElement;
      copy = button(this.h, "Copy", () => this.copyOneError(index, copy), "Copy this error and its context");
      copy.dataset.action = "copy-error";
      row.append(summary, copy);
      this.errorList?.append(row);
    });
  }

  private firstActivity(side: "left" | "right"): string {
    const rail = side === "left" ? this.leftRail : this.rightRail;
    const visible = [...rail.querySelectorAll<HTMLElement>(".dd-activity-icons [data-activity]")].find((icon) => !icon.hidden);
    return visible?.dataset.activity ?? (side === "left" ? "text" : "layout");
  }

  private toggleActivity(side: "left" | "right", id: string): void {
    const current = side === "left" ? this.activeLeft : this.activeRight;
    const next = current === id ? undefined : id;
    if (side === "left") this.activeLeft = next;
    else this.activeRight = next;
    this.applyActivity(side);
    if (side !== "right") return;
    if (current && current !== next && this.closesHostTray(current)) this.actions.setTrayVisible(current, false);
    if (next && this.closesHostTray(next)) this.actions.setTrayVisible(next, true);
  }

  private applyActivity(side: "left" | "right"): void {
    const panel = side === "left" ? this.leftPanel : this.rightPanel;
    const rail = side === "left" ? this.leftRail : this.rightRail;
    const active = side === "left" ? this.activeLeft : this.activeRight;
    panel.hidden = !active;
    for (const tray of panel.querySelectorAll<HTMLElement>("[data-activity-tray]")) {
      tray.hidden = tray.dataset.activityTray !== active;
    }
    for (const icon of rail.querySelectorAll<HTMLButtonElement>(".dd-activity-icons [data-activity]")) {
      icon.setAttribute("aria-pressed", String(icon.dataset.activity === active));
    }
  }

  /** Audio, video, and the other file toolbars stay on the bar under the menus. */
  private syncContextShelf(): void {
    this.toolShelf.hidden = this.contextRow.hidden;
  }

  /** Puts the selection bar back under the menu. */
  dockSelection(): void {
    this.selectionBar.classList.remove("dd-abs");
    this.selectionBar.style.removeProperty("--x");
    this.selectionBar.style.removeProperty("--y");
    if (this.selectionBar.parentElement !== this.selectionSlot) this.selectionSlot.append(this.selectionBar);
  }

  /** Floats the selection bar just above an element on the page. */
  floatSelection(anchor: HTMLElement, rect: { xPt: number; yPt: number }): void {
    if (this.selectionBar.hidden) {
      this.dockSelection();
      return;
    }
    if (this.selectionBar.parentElement !== anchor) anchor.append(this.selectionBar);
    this.selectionBar.classList.add("dd-abs");
    placeAt(this.selectionBar, { xPt: rect.xPt, yPt: rect.yPt, widthPt: 0, heightPt: 0 });
  }

  private bindRailDrag(rail: HTMLElement, side: "left" | "right"): void {
    rail.addEventListener("dragover", (event) => event.preventDefault());
    rail.addEventListener("drop", (event) => {
      event.preventDefault();
      const action = event.dataTransfer?.getData("text/plain");
      if (!action) return;
      this.moveAction(action, side);
    });
    for (const control of rail.querySelectorAll<HTMLElement>("[data-action]")) {
      if (control.classList.contains("dd-rail-toggle")) continue;
      control.draggable = true;
      control.addEventListener("dragstart", (event) => {
        event.dataTransfer?.setData("text/plain", control.dataset.action ?? "");
      });
    }
  }

  private moveAction(action: string, side: "left" | "right"): void {
    const left = this.layout.left.filter((name) => name !== action);
    const right = this.layout.right.filter((name) => name !== action);
    if (side === "left") left.push(action);
    else right.push(action);
    this.layout = { ...this.layout, left, right };
    const control = this.controls.get(action);
    const rail = side === "left" ? this.leftRail : this.rightRail;
    if (control && control.closest(".dd-menu") === null) rail.append(control);
    this.actions.layoutChanged?.(this.layout);
  }

  /** Menu copies stay in the chrome. Rail copies are moved beside the page. */
  private actionNodes(name: string): HTMLElement[] {
    const selector = `[data-action="${name}"]`;
    return [
      ...new Set([
        ...this.el.querySelectorAll<HTMLElement>(selector),
        ...this.leftRail.querySelectorAll<HTMLElement>(selector),
        ...this.rightRail.querySelectorAll<HTMLElement>(selector),
      ]),
    ];
  }

  private setControlLabel(name: string, label: string): void {
    for (const el of this.actionNodes(name)) {
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
      this.menuCommand("close", "Close", () => this.requestClose(), "Close the open file", "x"),
      this.sep(),
      this.menuCommand("storeFiledom", "Store as filedom", () => this.actions.storeFiledom()),
      this.menuCommand("export", "Export", () => this.actions.exportFile()),
    );

    const edit = this.appMenu(
      "edit",
      "Edit",
      this.menuCommand("undo", "Undo", () => this.actions.undo(), "Undo", "undo"),
      this.menuCommand("redo", "Redo", () => this.actions.redo(), "Redo", "redo"),
      this.sep(),
      this.menuCommand("deselect", "Deselect", () => this.actions.deselect(), "Deselect", "x"),
      this.sep(),
      this.menuCommand("find", "Find", () => this.toggleFind(), "Find", "search"),
    );

    const insert = this.appMenu(
      "insert",
      "Insert",
      this.menuCommand("insertImage", "Image", () => this.actions.insertElement("image")),
      this.menuCommand("insertTextBox", "Text box", () => this.actions.insertElement("text-box")),
      this.menuCommand("insertCode", "Code", () => this.actions.insertElement("code")),
      this.menuCommand("insertShape", "Shape", () => this.actions.insertElement("shape")),
    );

    const view = this.appMenu(
      "view",
      "View",
      this.toolbarMenu(),
      this.modeMenu(),
      this.menuCommand("settings", "Settings", () => this.toggleSettings(), "Settings"),
    );

    const help = this.appMenu(
      "help",
      "Help",
      this.menuCommand("help", "Help", () => this.actions.setHelp(!(this.state?.helpOn ?? false)), "Help"),
    );

    this.appRow.append(file, edit, insert, view, help);
    this.buildOptions();
  }

  /** Zoom sits on its own row under the menus. */
  private buildOptions(): void {
    const zoom = this.h("div", "dd-option-group dd-zoom");
    zoom.setAttribute("role", "group");
    zoom.setAttribute("aria-label", "Zoom");
    const mark = this.h("span", "dd-zoom-mark");
    mark.append(icon(zoom.ownerDocument, "zoom"));
    const zoomLabel = this.act("zoomReset", "100%", () => this.beginZoomEdit(), "Set zoom");
    zoomLabel.setAttribute("aria-label", "Zoom 100%");
    const zoomField = this.h("input");
    zoomField.type = "text";
    zoomField.inputMode = "decimal";
    zoomField.dataset.zoomEdit = "true";
    zoomField.setAttribute("aria-label", `Zoom percent, ${Math.round(MIN_ZOOM * 100)} to ${Math.round(MAX_ZOOM * 100)}`);
    zoomField.autocomplete = "off";
    zoomField.spellcheck = false;
    zoomField.hidden = true;
    zoomField.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "Enter") this.commitZoomEdit();
      else this.cancelZoomEdit();
      if (zoomLabel instanceof HTMLElement) zoomLabel.focus();
    });
    zoomField.addEventListener("blur", () => this.commitZoomEdit());
    this.zoomField = zoomField;
    zoom.append(
      mark,
      this.act("zoomOut", "−", () => this.actions.zoomOut(), "Zoom out"),
      zoomLabel,
      zoomField,
      this.act("zoomIn", "+", () => this.actions.zoomIn(), "Zoom in"),
      this.act("fitWidth", "Fit width", () => this.actions.fit("width"), "Fit width", "fit-width"),
      this.act("fitPage", "Fit page", () => this.actions.fit("page"), "Fit page", "fit-page"),
    );
    this.optionsRow.append(zoom);
  }

  /** The percentage becomes a field. Enter and blur apply it; Escape leaves the zoom unchanged. */
  private beginZoomEdit(): void {
    const field = this.zoomField;
    const button = this.controls.get("zoomReset");
    if (!field || !(button instanceof HTMLButtonElement) || this.zoomEditing) return;
    this.zoomEditing = true;
    field.value = `${Math.round((this.state?.zoom ?? 1) * 100)}%`;
    button.hidden = true;
    field.hidden = false;
    field.focus();
    field.select();
  }

  private commitZoomEdit(): void {
    if (!this.zoomEditing) return;
    const next = this.zoomField ? zoomFromPercent(this.zoomField.value) : undefined;
    this.endZoomEdit();
    if (next !== undefined) this.actions.setZoom(next);
  }

  private cancelZoomEdit(): void {
    this.endZoomEdit();
  }

  private endZoomEdit(): void {
    if (!this.zoomEditing) return;
    this.zoomEditing = false;
    if (this.zoomField) this.zoomField.hidden = true;
    const button = this.controls.get("zoomReset");
    if (!(button instanceof HTMLButtonElement)) return;
    button.hidden = false;
    const label = `${Math.round((this.state?.zoom ?? 1) * 100)}%`;
    this.setControlLabel("zoomReset", label);
    button.setAttribute("aria-label", `Zoom ${label}`);
  }

  /** Find opens a small window that can be dragged by its title. */
  private buildTools(): void {
    const search = this.field("search", "input", "Search");
    search.type = "search";
    search.placeholder = "Find";
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
    const head = this.h("div", "dd-find-head");
    const title = this.h("strong");
    title.textContent = "Find";
    this.findCount = this.h("span", "dd-find-count");
    const close = button(this.h, "×", () => {
      this.findCluster.hidden = true;
    }, "Close find");
    close.className = "dd-find-close";
    close.dataset.action = "find-close";
    head.append(title, this.findCount, close);
    this.dragFind(head);
    const findField = this.h("div", "dd-find-field");
    const steps = this.h("div", "dd-find-steps");
    const previous = this.act("findPrev", "Previous", () => this.actions.nextHit(-1), "Previous match");
    previous.prepend(icon(previous.ownerDocument, "arrow-up"));
    const next = this.act("findNext", "Next", () => this.actions.nextHit(1), "Next match");
    next.prepend(icon(next.ownerDocument, "arrow-down"));
    steps.append(previous, next);
    findField.append(search, steps);
    const replaceField = this.h("div", "dd-find-field");
    const writes = this.h("div", "dd-find-actions");
    writes.append(
      this.act("replaceMatch", "Replace", () => this.actions.replaceMatch(replace.value), "Replace the current match"),
      this.act("replaceAll", "Replace all", () => this.actions.replaceAll(replace.value), "Replace every match"),
    );
    replaceField.append(replace, writes);
    this.findCluster.setAttribute("role", "dialog");
    this.findCluster.setAttribute("aria-label", "Find and replace");
    this.findCluster.append(head, findField, replaceField);
  }

  /** Nested checkboxes. Side panels are toolbars too. */
  private toolbarMenu(): HTMLElement {
    return this.menuFolder("Toolbars", this.toolbarList());
  }

  /** Every toolbar the View menu can show or hide. */
  private toolbarList(): HTMLElement {
    const toolbars = this.h("div", "dd-view-section");
    const skip = new Set(["view", "mode", "find", "history"]);
    for (const group of TOOLBAR_CATALOG) {
      if (skip.has(group.id)) continue;
      toolbars.append(this.toolbarCheck(group.id, group.label));
    }
    toolbars.append(this.toolbarCheck("comments", "Comments"), this.toolbarCheck("elements", "Elements"));
    return toolbars;
  }

  private toolbarCheck(id: string, label: string): HTMLLabelElement {
    const item = this.h("label");
    const check = this.h("input");
    check.type = "checkbox";
    check.dataset.toolbarId = id;
    check.checked = true;
    check.addEventListener("change", () => this.actions.setToolbarVisible(id, check.checked));
    const name = this.h("span");
    name.textContent = label;
    item.append(check, name);
    return item;
  }

  /** Live, track changes, or view only. */
  private modeMenu(): HTMLElement {
    const choice = (id: ViewMode, label: string) => {
      const el = this.menuCommand(id, label, () => this.actions.setViewMode(id), label);
      el.classList.add("dd-menu-radio");
      el.setAttribute("role", "menuitemradio");
      return el;
    };
    return this.menuFolder("Mode", choice("live", "Live"), choice("track", "Track changes"), choice("view", "View only"));
  }

  private toggleSettings(): void {
    const opening = this.settingsDialog.hidden;
    if (opening) {
      this.closeMenus();
      this.selectSettingsTab("appearance");
    }
    this.settingsDialog.hidden = !opening;
    if (opening) this.settingsDialog.querySelector<HTMLButtonElement>("[data-settings-tab='appearance']")?.focus();
  }

  /** Theme, toolbars, editing, and layout, in one centered dialog. */
  private buildSettings(): void {
    this.settingsKey = `dd-settings-${(settingsSerial += 1)}`;
    this.settingsDialog = this.h("div", "dd-close-dialog dd-settings-dialog");
    this.settingsDialog.hidden = true;
    this.settingsDialog.setAttribute("role", "dialog");
    this.settingsDialog.setAttribute("aria-modal", "true");
    this.settingsDialog.setAttribute("aria-label", "Settings");
    this.settingsDialog.addEventListener("click", (event) => {
      if (event.target === this.settingsDialog) this.settingsDialog.hidden = true;
    });
    const card = this.h("div", "dd-close-card");
    const head = this.h("div", "dd-settings-head");
    const title = this.h("h2");
    title.id = `${this.settingsKey}-title`;
    title.textContent = "Settings";
    this.settingsDialog.setAttribute("aria-labelledby", title.id);
    const close = button(this.h, "Close", () => {
      this.settingsDialog.hidden = true;
    }, "Close settings");
    close.className = "dd-settings-close";
    close.dataset.action = "settings-close";
    head.append(title, close);
    const tabs = this.h("div", "dd-settings-tabs");
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", "Settings categories");
    tabs.setAttribute("aria-orientation", "vertical");
    tabs.addEventListener("keydown", (event) => this.onSettingsKey(event));
    const panels = this.h("div", "dd-settings-panels");
    const pages = [
      this.appearanceSettings(),
      this.toolbarSettings(),
      this.editingSettings(),
      this.layoutSettings(),
    ];
    for (const [id, label] of SETTINGS_TABS) {
      const panel = pages.find((page) => page.dataset.settingsPanel === id);
      if (!panel) continue;
      tabs.append(this.settingsTab(id, label, panel.id));
    }
    panels.append(...pages);
    const body = this.h("div", "dd-settings-body");
    body.append(tabs, panels);
    card.append(head, body);
    this.settingsDialog.append(card);
  }

  private settingsTab(id: string, label: string, panelId: string): HTMLButtonElement {
    const tab = this.h("button");
    tab.type = "button";
    tab.className = "dd-settings-tab";
    tab.id = `${panelId}-tab`;
    tab.dataset.settingsTab = id;
    tab.textContent = label;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-controls", panelId);
    const selected = id === "appearance";
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    tab.addEventListener("click", () => this.selectSettingsTab(id));
    return tab;
  }

  private settingsPanel(id: string): HTMLElement {
    const panel = this.h("section", "dd-settings-panel");
    panel.id = `${this.settingsKey}-${id}`;
    panel.dataset.settingsPanel = id;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", `${panel.id}-tab`);
    panel.hidden = id !== "appearance";
    return panel;
  }

  private selectSettingsTab(id: string): void {
    for (const tab of this.settingsDialog.querySelectorAll<HTMLButtonElement>("[data-settings-tab]")) {
      const on = tab.dataset.settingsTab === id;
      tab.setAttribute("aria-selected", String(on));
      tab.tabIndex = on ? 0 : -1;
    }
    for (const panel of this.settingsDialog.querySelectorAll<HTMLElement>("[data-settings-panel]")) {
      panel.hidden = panel.dataset.settingsPanel !== id;
    }
  }

  private onSettingsKey(event: KeyboardEvent): void {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.dataset.settingsTab) return;
    const ids = SETTINGS_TABS.map(([id]) => id);
    const index = ids.indexOf(target.dataset.settingsTab as (typeof ids)[number]);
    if (index < 0) return;
    const next =
      event.key === "ArrowDown" || event.key === "ArrowRight"
        ? index + 1
        : event.key === "ArrowUp" || event.key === "ArrowLeft"
          ? index - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? ids.length - 1
              : -1;
    if (next < 0) return;
    event.preventDefault();
    const id = ids[(next + ids.length) % ids.length]!;
    this.selectSettingsTab(id);
    this.settingsDialog.querySelector<HTMLButtonElement>(`[data-settings-tab="${id}"]`)?.focus();
  }

  private appearanceSettings(): HTMLElement {
    const panel = this.settingsPanel("appearance");
    const heading = this.h("h3");
    heading.textContent = "Theme";
    const note = this.h("p", "dd-settings-note");
    note.textContent =
      "Interface colors paint the toolbar. Document colors paint the page, the caret, and tracked changes. Leave Canvas fill empty and the canvas stays transparent. A file's own picture stays as stored.";
    const field = this.h("div", "dd-settings-field");
    const name = this.h("span");
    name.textContent = "Palette";
    field.append(name, this.themeSelect());
    this.themePanel = this.h("div", "dd-theme-panel");
    this.themePanel.append(
      this.themeGroup("Interface", "ui", UI_THEME_FIELDS, UI_TEXT_FIELDS),
      this.themeGroup("Document", "document", DOCUMENT_THEME_FIELDS, DOCUMENT_TEXT_FIELDS),
    );
    panel.append(heading, note, field, this.themePanel);
    return panel;
  }

  private toolbarSettings(): HTMLElement {
    const panel = this.settingsPanel("toolbars");
    const note = this.h("p", "dd-settings-note");
    note.textContent = "Lock freezes positions. Unlocked, a toolbar can be dragged. A hidden toolbar stays off until you show it again.";
    const show = this.h("h3");
    show.textContent = "Show";
    panel.append(note, this.lockControl(), show, this.toolbarList());
    return panel;
  }

  private lockControl(): HTMLLabelElement {
    const lock = this.h("label", "dd-settings-lock");
    const lockInput = this.h("input");
    lockInput.type = "checkbox";
    lockInput.dataset.action = "lockToolbars";
    lockInput.addEventListener("change", () => {
      if (!this.echoing) this.actions.lockToolbars(lockInput.checked);
    });
    this.controls.set("lockToolbars", lockInput);
    const lockName = this.h("span");
    lockName.textContent = "Lock toolbars";
    lock.append(lockInput, lockName);
    return lock;
  }

  private editingSettings(): HTMLElement {
    const panel = this.settingsPanel("editing");
    const modeTitle = this.h("h3");
    modeTitle.textContent = "Mode";
    const modeNote = this.h("p", "dd-settings-note");
    modeNote.textContent = "Live edits without the history list. Track changes lists each edit. View only reads the file.";
    const modes = this.h("div", "dd-settings-options");
    modes.setAttribute("role", "radiogroup");
    modes.setAttribute("aria-label", "Mode");
    modes.append(
      this.settingChoice("live", "Live", () => this.actions.setViewMode("live")),
      this.settingChoice("track", "Track changes", () => this.actions.setViewMode("track")),
      this.settingChoice("view", "View only", () => this.actions.setViewMode("view")),
    );
    const helpTitle = this.h("h3");
    helpTitle.textContent = "Help";
    const help = this.h("label", "dd-settings-lock");
    const input = this.h("input");
    input.type = "checkbox";
    input.dataset.setting = "help";
    input.addEventListener("change", () => {
      if (!this.echoing) this.actions.setHelp(input.checked);
    });
    this.helpSetting = input;
    const helpName = this.h("span");
    helpName.textContent = "Show descriptions on hover";
    help.append(input, helpName);
    panel.append(modeTitle, modeNote, modes, helpTitle, help);
    return panel;
  }

  private layoutSettings(): HTMLElement {
    const panel = this.settingsPanel("layout");
    const title = this.h("h3");
    title.textContent = "Layout";
    const note = this.h("p", "dd-settings-note");
    note.textContent = "Numbered is a full-width element with line numbers. Paginated shows pages. Frame holds a picture, sound, video, archive, or message.";
    const choices = this.h("div", "dd-settings-options");
    choices.setAttribute("role", "radiogroup");
    choices.setAttribute("aria-label", "Layout");
    for (const layout of DISPLAY_LAYOUTS) choices.append(this.layoutChoice(layout));
    panel.append(title, note, choices);
    return panel;
  }

  private layoutChoice(layout: (typeof DISPLAY_LAYOUTS)[number]): HTMLButtonElement {
    const el = button(this.h, layout.label, () => this.actions.setDisplayLayout(layout.id), layout.label, layout.icon);
    el.classList.add("dd-layout-choice");
    el.dataset.action = `layout-${layout.id}`;
    el.dataset.layout = layout.id;
    el.setAttribute("role", "radio");
    el.setAttribute("aria-checked", "false");
    const name = this.h("span");
    name.textContent = layout.label;
    el.append(name);
    return el;
  }

  private settingChoice(action: string, label: string, onClick: () => void): HTMLButtonElement {
    const el = button(this.h, label, onClick, label);
    el.dataset.action = action;
    el.setAttribute("role", "radio");
    el.setAttribute("aria-checked", "false");
    return el;
  }

  private dragFind(handle: HTMLElement): void {
    handle.addEventListener("pointerdown", (event) => {
      if ((event.target as Element).closest("button, input")) return;
      event.preventDefault();
      const parent = this.chrome.getBoundingClientRect();
      const box = this.findCluster.getBoundingClientRect();
      const originX = box.left - parent.left;
      const originY = box.top - parent.top;
      const startX = event.clientX;
      const startY = event.clientY;
      const onMove = (move: PointerEvent) => {
        this.findCluster.style.left = `${originX + move.clientX - startX}px`;
        this.findCluster.style.top = `${originY + move.clientY - startY}px`;
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    });
  }

  private themeGroup(
    title: string,
    slot: "ui" | "document",
    colors: ReadonlyArray<readonly [string, string]>,
    texts: ReadonlyArray<readonly [string, string]> = [],
  ): HTMLElement {
    const group = this.h("div");
    const heading = this.h("h3");
    heading.textContent = title;
    group.append(heading);
    for (const [token, label] of [...colors, ...texts]) {
      group.append(this.themeRow(slot, token, label, texts.some(([name]) => name === token) ? "text" : "color"));
    }
    return group;
  }

  private themeRow(slot: "ui" | "document", token: string, label: string, kind: "color" | "text"): HTMLLabelElement {
    const row = this.h("label", "dd-theme-row");
    const name = this.h("span");
    name.textContent = label;
    const input = this.h("input");
    input.type = kind;
    input.dataset.themeSlot = slot;
    input.dataset.themeToken = token;
    input.setAttribute("aria-label", label);
    if (kind === "color") input.value = "#000000";
    if (token === "canvas-fill") input.placeholder = "transparent";
    input.addEventListener("input", () => {
      if (this.echoing) return;
      const value = input.value;
      if (slot === "ui") this.actions.setThemeColors({ ui: { [token]: value } as UiTheme });
      else this.actions.setThemeColors({ document: { [token]: value } as DocumentTheme });
    });
    row.append(name, input);
    return row;
  }

  private themeSelect(): HTMLSelectElement {
    const theme = this.field("theme", "select", "Theme");
    for (const preset of THEME_PRESETS) {
      theme.append(Object.assign(this.h("option"), { value: preset.id, textContent: preset.label }));
    }
    theme.value = "filedom";
    theme.addEventListener("change", () => {
      if (!this.echoing) this.actions.setThemePreset(theme.value);
    });
    return theme;
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
      this.act("replaceImage", "Replace", () => this.actions.replaceImage(), "Replace image", "image"),
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

  private paintToolbarChecks(state: ToolbarState): void {
    const hidden = new Set(state.hiddenGroups);
    for (const input of this.el.querySelectorAll<HTMLInputElement>("input[data-toolbar-id]")) {
      const id = input.dataset.toolbarId ?? "";
      input.checked = !hidden.has(id);
    }
    const owners: Record<string, string> = {
      comments: "comments",
      elements: "elements",
      layers: "group",
      history: "trackHistory",
    };
    for (const [activity, toolbarId] of Object.entries(owners)) {
      const icon = this.rightRail.querySelector<HTMLElement>(`[data-activity="${activity}"]`);
      if (!icon) continue;
      const hide = hidden.has(toolbarId);
      icon.hidden = hide;
      if (hide && this.activeRight === activity) {
        this.activeRight = undefined;
        this.applyActivity("right");
      }
    }
  }

  private paintFindCount(state: ToolbarState): void {
    const query = state.searchQuery?.trim() ?? "";
    const hits = state.searchHitCount ?? 0;
    if (!query) {
      this.findCount.textContent = "";
      return;
    }
    if (hits > 0 && (state.searchHitIndex ?? -1) >= 0) {
      this.findCount.textContent = `${(state.searchHitIndex ?? 0) + 1} of ${hits}`;
      return;
    }
    this.findCount.textContent = hits === 1 ? "1 found" : `${hits} found`;
  }

  /** Selects the named theme in the menu without applying it again. */
  setThemePreset(id: string): void {
    const theme = this.controls.get("theme");
    if (!(theme instanceof HTMLSelectElement)) return;
    this.echoing = true;
    const custom = [...theme.options].find((option) => option.value === "custom");
    if (id === "custom") {
      if (!custom) theme.append(Object.assign(this.h("option"), { value: "custom", textContent: "Custom" }));
      theme.value = "custom";
    } else {
      custom?.remove();
      if ([...theme.options].some((option) => option.value === id)) theme.value = id;
    }
    this.echoing = false;
  }

  /** Writes the colors on screen into the panel without applying them again. */
  showThemeValues(values: ThemeTokens): void {
    if (!this.themePanel) return;
    this.echoing = true;
    for (const input of this.themePanel.querySelectorAll<HTMLInputElement>("[data-theme-token]")) {
      const token = input.dataset.themeToken as ThemeToken | undefined;
      const value = token ? values[token] : undefined;
      if (!value) continue;
      if (input.type === "color") {
        const hex = colorInputValue(value);
        if (hex) input.value = hex;
      } else input.value = value;
    }
    this.echoing = false;
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
    this.paintTabs(state);
    const ctx = this.catalogContext(state);
    const open = Boolean(state.info);
    const setDisabled = (name: string, disabled: boolean) => {
      for (const el of this.actionNodes(name)) {
        if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement || el instanceof HTMLSelectElement) el.disabled = disabled;
      }
    };

    for (const group of TOOLBAR_CATALOG) {
      const el = this.groups.get(group.id);
      if (!el) continue;
      const userHidden = group.id !== "view" && group.id !== "edit" && state.hiddenGroups.includes(group.id);
      const inTray = Boolean(el.closest("[data-activity-tray]"));
      let availability = groupAvailability(group.id, ctx);
      if (inTray && availability === "hidden" && this.groupFitsFormat(group.id, ctx)) {
        availability = ctx.mode === "view" ? "disabled" : "shown";
      }
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

    setDisabled("live", state.modeLocked);
    setDisabled("track", state.modeLocked);
    setDisabled("view", state.modeLocked);
    for (const mode of ["live", "track", "view"] as const) {
      const on = String(state.viewMode === mode);
      for (const el of this.actionNodes(mode)) {
        el.setAttribute("aria-checked", on);
        el.setAttribute("aria-pressed", on);
      }
    }
    setDisabled("new", false);
    setDisabled("open", false);
    setDisabled("save", !open);
    setDisabled("close", !open);
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

    for (const choice of this.el.querySelectorAll<HTMLButtonElement>("[data-layout]")) {
      const on = String(choice.dataset.layout === state.displayLayout);
      choice.setAttribute("aria-pressed", on);
      if (choice.getAttribute("role") === "radio") choice.setAttribute("aria-checked", on);
    }
    this.paintActivityIcons(state, ctx);
    const zoom = this.controls.get("zoomReset");
    if (zoom instanceof HTMLButtonElement && !this.zoomEditing) {
      const label = `${Math.round(state.zoom * 100)}%`;
      this.setControlLabel("zoomReset", label);
      zoom.setAttribute("aria-label", `Zoom ${label}`);
    }
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
      if (this.helpSetting) this.helpSetting.checked = state.helpOn;
    } finally {
      this.echoing = false;
    }
    this.controls.get("help")?.setAttribute("aria-pressed", String(state.helpOn));
    const lock = this.controls.get("lockToolbars");
    if (lock instanceof HTMLInputElement) lock.checked = state.toolbarsLocked;
    this.paintToolbarChecks(state);
    this.paintFindCount(state);
    const textFormat = this.el.querySelector<HTMLElement>('[data-group="text-format"]');
    if (textFormat) textFormat.hidden = !ctx.capabilities.formatText;
    const textParagraph = this.el.querySelector<HTMLElement>('[data-group="text-paragraph"]');
    if (textParagraph) textParagraph.hidden = !ctx.capabilities.formatParagraph;
    const contextual = ["audio", "video", "archive", "email", "sheet", "timeline"];
    this.contextRow.hidden = !contextual.some((id) => {
      const el = this.groups.get(id);
      return Boolean(el && !el.hidden);
    });
    this.syncContextShelf();
    this.mountSelection(state);
    if (this.openMenuId && this.groups.get(this.openMenuId)?.hidden) this.closeMenus();
  }

  /** Moves the selected element's tools onto the top bar. The page may float that bar. */
  private mountSelection(state: ToolbarState): void {
    const homes: Record<string, string> = { text: "text", image: "image", shape: "shapes", group: "layers" };
    const active = state.selectionKind === "text" || state.selectionKind === "image" || state.selectionKind === "shape" || state.selectionKind === "group"
      ? state.selectionKind
      : undefined;
    for (const id of Object.keys(homes)) {
      if (id === active) continue;
      const group = this.groups.get(id);
      const home = this.el.querySelector(`[data-activity-tray="${homes[id]}"]`);
      if (group && home && group.parentElement !== home) home.append(group);
    }
    const group = active ? this.groups.get(active) : undefined;
    if (group && !group.hidden) {
      if (group.parentElement !== this.selectionBar) this.selectionBar.replaceChildren(group);
      this.selectionBar.hidden = false;
      return;
    }
    this.selectionBar.hidden = true;
    this.dockSelection();
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

  /** One tab per open file, under the menus. A lone `fileName` is a single tab. */
  private paintTabs(state: ToolbarState): void {
    const tabs: readonly OpenFileTab[] = state.tabs?.length
      ? state.tabs
      : state.fileName?.trim()
        ? [{ id: state.fileName, name: state.fileName, format: state.info?.format, active: true }]
        : [];
    this.tabsEl.hidden = tabs.length === 0;
    this.tabsEl.replaceChildren();
    for (const tab of tabs) {
      const item = this.h("div", "dd-tab");
      item.dataset.tab = tab.id;
      item.title = tab.name;
      item.draggable = true;
      item.setAttribute("role", "tab");
      item.setAttribute("aria-selected", String(tab.active));
      item.tabIndex = tab.active ? 0 : -1;
      const mark = this.h("span", "dd-file-icon");
      mark.append(icon(item.ownerDocument, fileIconName(tab.name, tab.format)));
      const name = this.h("span", "dd-file-name");
      name.textContent = tab.name;
      const full = button(this.h, "", () => {
        if (!tab.active) this.actions.selectTab?.(tab.id);
        this.toggleFullscreen();
      }, "Full screen", "fullscreen");
      full.dataset.action = "fullscreen";
      const close = button(this.h, "", () => {
        if (!tab.active) this.actions.selectTab?.(tab.id);
        this.requestClose();
      }, `Close ${tab.name}`, "x");
      close.classList.add("dd-tab-close");
      close.dataset.action = "close-file";
      let pressed: EventTarget | null = null;
      item.addEventListener("pointerdown", (event) => {
        pressed = event.target;
      });
      item.addEventListener("dragstart", (event) => {
        if (pressed instanceof Element && pressed.closest("button")) {
          event.preventDefault();
          return;
        }
        this.draggingTab = item;
        item.dataset.dragging = "true";
        event.dataTransfer?.setData("text/plain", tab.id);
        if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
      });
      item.addEventListener("dragover", (event) => {
        const dragging = this.draggingTab;
        if (!dragging || dragging === item) return;
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
        const row = [...this.tabsEl.querySelectorAll(".dd-tab")];
        const from = row.indexOf(dragging);
        const to = row.indexOf(item);
        if (from < 0 || to < 0 || from === to) return;
        if (from < to) item.after(dragging);
        else item.before(dragging);
      });
      item.addEventListener("drop", (event) => {
        event.preventDefault();
        this.commitTabOrder();
      });
      item.addEventListener("dragend", () => {
        delete item.dataset.dragging;
        this.draggingTab = undefined;
        this.commitTabOrder();
      });
      item.addEventListener("click", (event) => {
        if ((event.target as Element | null)?.closest("button")) return;
        if (!tab.active) this.actions.selectTab?.(tab.id);
      });
      item.append(mark, name, full, close);
      this.tabsEl.append(item);
    }
    this.paintFullscreen();
  }

  /** Tells the host the strip order after a drag. Without a host, the last sync is restored. */
  private commitTabOrder(): void {
    const ids = [...this.tabsEl.querySelectorAll<HTMLElement>(".dd-tab")].map((el) => el.dataset.tab ?? "");
    if (this.actions.reorderTabs) {
      this.actions.reorderTabs(ids);
      return;
    }
    if (this.state) this.paintTabs(this.state);
  }

  setStatus(message: string, tone: "info" | "error" = "info"): void {
    if (tone === "error") {
      this.showError(message);
      return;
    }
    this.status.textContent = message;
    this.status.dataset.message = message;
    this.status.title = message;
    delete this.status.dataset.tone;
  }

  showError(message: string, fileName?: string): void {
    let debug = "";
    try {
      debug = this.actions.debugReport() ?? "";
    } catch (error) {
      debug = error instanceof Error ? error.message : String(error);
    }
    this.errors.push(errorEntry(message, { fileName: fileName || this.state?.fileName }, debug));
    this.paintErrors();
    this.status.textContent = "";
    delete this.status.dataset.message;
    delete this.status.dataset.tone;
    this.status.title = "";
  }

  clearError(): void {
    this.errors = [];
    this.documentNotes = [];
    this.documentNoteKeys = [];
    this.paintErrors();
    if (this.activeRight === "errors") {
      this.activeRight = undefined;
      this.applyActivity("right");
    }
  }

  private statusMessage(): string {
    return this.status.dataset.message || this.status.textContent || "";
  }

  private writeClipboard(event: ClipboardEvent, text: string): void {
    if (!text || !event.clipboardData) return;
    event.preventDefault();
    event.stopPropagation();
    event.clipboardData.setData("text/plain", text);
  }

  private copyOneError(index: number, buttonEl: HTMLButtonElement): void {
    const entry = this.listedErrors()[index];
    if (!entry) return;
    this.copyTo(buttonEl, entry.report);
  }

  private copyAllErrors(): void {
    const buttonEl = this.errorCopyAll;
    const listed = this.listedErrors();
    if (!buttonEl || !listed.length) return;
    this.copyTo(buttonEl, errorBundle(listed));
  }

  private copyTo(buttonEl: HTMLButtonElement, text: string): void {
    const legacy = copyPlainText(buttonEl.ownerDocument, text);
    const write = navigator.clipboard?.writeText?.bind(navigator.clipboard);
    const mark = () => {
      buttonEl.textContent = "Copied";
    };
    if (!write) {
      if (legacy) mark();
      return;
    }
    void write(text).then(
      () => mark(),
      () => {
        if (legacy) mark();
      },
    );
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
