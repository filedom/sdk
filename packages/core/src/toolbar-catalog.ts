import type { Capabilities, FileKind, Format } from "./engine-types.js";

/** Editor chrome modes. */
export type CatalogMode = "live" | "track" | "view";

/** Selection kind that drives the contextual toolbar row. */
export type SelectionKind = "none" | "text" | "image" | "shape" | "group" | "audio" | "video";

export type ActionAvailability = "shown" | "hidden" | "disabled";

export interface CatalogAction {
  id: string;
  label: string;
  /** One-line hover hint when help is on. */
  hint: string;
}

export interface ToolbarGroup {
  id: string;
  label: string;
  /** App menus stay on the bar. Contextual groups become a toolbar for the selection. */
  row: "app" | "contextual";
  actions: CatalogAction[];
}

export interface CatalogContext {
  capabilities: Capabilities;
  mode: CatalogMode;
  selection: SelectionKind;
  /** True when the open file is a generic `.filedom` store. */
  isFiledom?: boolean;
  /** Insert kinds the open adapter can place. Empty hides Insert. */
  insertKinds?: string[];
  canUndo?: boolean;
  canRedo?: boolean;
  hasSelection?: boolean;
  /** Format can show the given contextual group (PDF text vs image). */
  supportsGroup?: (groupId: string) => boolean;
  /** Kind of the open file. Audio, video, archive, and email toolbars key off this. */
  fileKind?: FileKind;
  /** Open format. The sheet toolbar is CSV, which is still a document. */
  format?: Format;
}

const APP: ToolbarGroup[] = [
  {
    id: "file",
    label: "File",
    row: "app",
    actions: [
      { id: "new", label: "New", hint: "Create a new .filedom file" },
      { id: "open", label: "Open", hint: "Open a document" },
      { id: "save", label: "Save", hint: "Save in the open format" },
      { id: "close", label: "Close", hint: "Close the open file" },
      { id: "storeFiledom", label: "Store as filedom", hint: "Write this session as a .filedom file" },
      { id: "export", label: "Export", hint: "Export to another format" },
    ],
  },
  {
    id: "history",
    label: "History",
    row: "app",
    actions: [
      { id: "undo", label: "Undo", hint: "Undo the last change" },
      { id: "redo", label: "Redo", hint: "Redo the last undone change" },
    ],
  },
  {
    id: "mode",
    label: "Mode",
    row: "app",
    actions: [
      { id: "live", label: "Live", hint: "Edit without showing the history list" },
      { id: "track", label: "Track changes", hint: "Edit and list each change" },
      { id: "view", label: "View only", hint: "Read the document without editing" },
    ],
  },
  {
    id: "find",
    label: "Find",
    row: "app",
    actions: [
      { id: "search", label: "Search", hint: "Find text in the document" },
      { id: "findPrev", label: "Previous", hint: "Go to the previous match" },
      { id: "findNext", label: "Next", hint: "Go to the next match" },
      { id: "replace", label: "Replace with", hint: "Text that replaces a match" },
      { id: "replaceMatch", label: "Replace", hint: "Replace the current match" },
      { id: "replaceAll", label: "Replace all", hint: "Replace every match in the file" },
    ],
  },
  {
    id: "view",
    label: "View",
    row: "app",
    actions: [
      { id: "zoomOut", label: "Zoom out", hint: "Zoom out" },
      { id: "zoomReset", label: "Actual size", hint: "Type a zoom from 10% to 500%" },
      { id: "zoomIn", label: "Zoom in", hint: "Zoom in" },
      { id: "fitWidth", label: "Fit width", hint: "Fit the page to the window width" },
      { id: "fitPage", label: "Fit page", hint: "Fit the whole page in the window" },
      { id: "theme", label: "Theme", hint: "Choose a theme" },
      { id: "deselect", label: "Deselect", hint: "Clear the current selection" },
      { id: "toolbarVisibility", label: "Panels", hint: "Show or hide toolbars and side trays" },
      { id: "lockToolbars", label: "Lock toolbars", hint: "Freeze or unlock toolbar positions" },
    ],
  },
  {
    id: "help",
    label: "Help",
    row: "app",
    actions: [{ id: "help", label: "Help", hint: "Show short descriptions on hover" }],
  },
  {
    id: "insert",
    label: "Insert",
    row: "app",
    actions: [
      { id: "insertImage", label: "Image", hint: "Insert an image" },
      { id: "insertTextBox", label: "Text box", hint: "Insert a text box" },
      { id: "insertCode", label: "Code", hint: "Insert source code" },
      { id: "insertShape", label: "Shape", hint: "Insert a shape" },
    ],
  },
];

const CONTEXTUAL: ToolbarGroup[] = [
  {
    id: "text",
    label: "Text",
    row: "contextual",
    actions: [
      { id: "font", label: "Font", hint: "Change the font" },
      { id: "size", label: "Size", hint: "Change the font size" },
      { id: "bold", label: "Bold", hint: "Bold" },
      { id: "italic", label: "Italic", hint: "Italic" },
      { id: "underline", label: "Underline", hint: "Underline" },
      { id: "strike", label: "Strikethrough", hint: "Strikethrough" },
      { id: "color", label: "Color", hint: "Text color" },
      { id: "highlight", label: "Highlight", hint: "Highlight the selection" },
      { id: "clearHighlight", label: "Clear highlight", hint: "Remove highlighting" },
      { id: "alignLeft", label: "Align left", hint: "Align left" },
      { id: "alignCenter", label: "Align center", hint: "Align center" },
      { id: "alignRight", label: "Align right", hint: "Align right" },
      { id: "alignJustify", label: "Justify", hint: "Justify" },
      { id: "spacing", label: "Line spacing", hint: "Line spacing" },
      { id: "outdent", label: "Decrease indent", hint: "Decrease indent" },
      { id: "indent", label: "Increase indent", hint: "Increase indent" },
      { id: "comment", label: "Comment", hint: "Comment on the selection" },
    ],
  },
  {
    id: "image",
    label: "Image",
    row: "contextual",
    actions: [
      { id: "replaceImage", label: "Replace", hint: "Replace the selected image" },
      { id: "deleteElement", label: "Delete", hint: "Delete the selected element" },
      { id: "deselectElement", label: "Deselect", hint: "Clear the selection" },
    ],
  },
  {
    id: "shape",
    label: "Shape",
    row: "contextual",
    actions: [
      { id: "fill", label: "Fill", hint: "Shape fill color" },
      { id: "stroke", label: "Stroke", hint: "Shape stroke color" },
      { id: "deleteElement", label: "Delete", hint: "Delete the selected element" },
      { id: "deselectElement", label: "Deselect", hint: "Clear the selection" },
    ],
  },
  {
    id: "group",
    label: "Layer",
    row: "contextual",
    actions: [
      { id: "lockLayer", label: "Lock", hint: "Lock the layer" },
      { id: "hideLayer", label: "Hide", hint: "Hide the layer" },
      { id: "deleteElement", label: "Delete", hint: "Delete the selected element" },
      { id: "deselectElement", label: "Deselect", hint: "Clear the selection" },
    ],
  },
  {
    id: "trackHistory",
    label: "Track changes",
    row: "contextual",
    actions: [
      { id: "restoreHistory", label: "Restore", hint: "Restore the document to this change" },
      { id: "revertHistory", label: "Revert", hint: "Drop this change" },
    ],
  },
  {
    id: "audio",
    label: "Audio",
    row: "contextual",
    actions: [
      { id: "playMedia", label: "Play", hint: "Play the audio" },
      { id: "pauseMedia", label: "Pause", hint: "Pause the audio" },
      { id: "muteMedia", label: "Mute", hint: "Mute or unmute the audio" },
    ],
  },
  {
    id: "video",
    label: "Video",
    row: "contextual",
    actions: [
      { id: "playMedia", label: "Play", hint: "Play the video" },
      { id: "pauseMedia", label: "Pause", hint: "Pause the video" },
      { id: "muteMedia", label: "Mute", hint: "Mute or unmute the video" },
    ],
  },
  {
    id: "archive",
    label: "Archive",
    row: "contextual",
    actions: [{ id: "copyListing", label: "Copy", hint: "Copy the archive listing" }],
  },
  {
    id: "email",
    label: "Message",
    row: "contextual",
    actions: [{ id: "copyListing", label: "Copy", hint: "Copy the message" }],
  },
  {
    id: "sheet",
    label: "Sheet",
    row: "contextual",
    actions: [{ id: "copyListing", label: "Copy", hint: "Copy the sheet" }],
  },
  {
    id: "timeline",
    label: "Timeline",
    row: "contextual",
    actions: [
      { id: "trimClip", label: "Trim", hint: "Crop the selected clip on the timeline" },
      { id: "clipSpeed", label: "Speed", hint: "Change the selected clip speed" },
      { id: "appendClip", label: "Add clip", hint: "Add another file on the track" },
    ],
  },
];

/** Every toolbar group: app row plus contextual groups. */
export const TOOLBAR_CATALOG: ToolbarGroup[] = [...APP, ...CONTEXTUAL];

/** Side trays that sit beside the pages. */
export interface TraySpec {
  id: string;
  label: string;
}

export const TRAY_CATALOG: TraySpec[] = [
  { id: "comments", label: "Comments" },
  { id: "history", label: "Track changes" },
  { id: "layers", label: "Layers" },
  { id: "elements", label: "Elements" },
];

export function catalogGroup(id: string): ToolbarGroup | undefined {
  return TOOLBAR_CATALOG.find((group) => group.id === id);
}

export function catalogTray(id: string): TraySpec | undefined {
  return TRAY_CATALOG.find((tray) => tray.id === id);
}

function formatAllows(ctx: CatalogContext, groupId: string): boolean {
  if (groupId === "audio") return ctx.fileKind === "audio";
  if (groupId === "video") return ctx.fileKind === "video";
  if (groupId === "timeline") return ctx.capabilities.timeline === true;
  if (groupId === "archive") return ctx.fileKind === "archive";
  if (groupId === "email") return ctx.fileKind === "email";
  if (groupId === "sheet") return ctx.format === "csv";
  if (ctx.isFiledom) return true;
  if (ctx.supportsGroup) return ctx.supportsGroup(groupId);
  switch (groupId) {
    case "text":
      return ctx.capabilities.editText || ctx.capabilities.formatText;
    case "image":
    case "shape":
      return ctx.capabilities.transform;
    case "insert":
      return ctx.capabilities.insert && (ctx.insertKinds?.length ?? 0) > 0;
    case "group":
      return ctx.capabilities.layers;
    case "trackHistory":
      return true;
    default:
      return true;
  }
}

/**
 * Hidden: format cannot support the group. Disabled: group applies but mode or
 * selection blocks it. Shown: available.
 */
export function groupAvailability(groupId: string, ctx: CatalogContext): ActionAvailability {
  const group = catalogGroup(groupId);
  if (!group) return "hidden";
  if (groupId === "view" || groupId === "help") return "shown";
  if (group.row === "app") {
    if (groupId === "insert") {
      if (!formatAllows(ctx, groupId)) return "hidden";
      if (ctx.mode === "view") return "disabled";
      return "shown";
    }
    if (groupId === "history") {
      if (ctx.mode === "view") return "disabled";
      return "shown";
    }
    if (groupId === "mode" || groupId === "find" || groupId === "file") return "shown";
    return "shown";
  }
  if (!formatAllows(ctx, groupId)) return "hidden";
  if (groupId === "trackHistory") return ctx.mode === "track" ? "shown" : "hidden";
  if (groupId === "text") {
    // A caret, a character range, or a selected text element all open the text tools.
    if (ctx.selection !== "text") return "hidden";
    if (ctx.mode === "view") return "disabled";
    return "shown";
  }
  if (groupId === "image") {
    if (ctx.selection !== "image") return "hidden";
    if (ctx.mode === "view") return "disabled";
    return "shown";
  }
  if (groupId === "shape") {
    if (ctx.selection !== "shape") return "hidden";
    if (ctx.mode === "view") return "disabled";
    return "shown";
  }
  if (groupId === "group") {
    if (ctx.selection !== "group") return "hidden";
    if (ctx.mode === "view") return "disabled";
    return "shown";
  }
  if (groupId === "timeline") {
    if (ctx.mode === "view" || (ctx.selection !== "audio" && ctx.selection !== "video")) return "hidden";
    return "shown";
  }
  return "shown";
}

/** Availability of one action inside its group. */
export function actionAvailability(groupId: string, actionId: string, ctx: CatalogContext): ActionAvailability {
  const group = groupAvailability(groupId, ctx);
  if (group === "hidden") return "hidden";
  if (group === "disabled") return "disabled";
  const usableInView =
    groupId === "view" ||
    groupId === "help" ||
    groupId === "find" ||
    groupId === "mode" ||
    groupId === "file" ||
    groupId === "audio" ||
    groupId === "video" ||
    groupId === "archive" ||
    groupId === "email" ||
    groupId === "sheet";
  if (ctx.mode === "view" && !usableInView) return "disabled";
  if (groupId === "find" && (actionId === "replace" || actionId === "replaceMatch" || actionId === "replaceAll")) {
    if (ctx.mode === "view" || !ctx.capabilities.editText) return "disabled";
  }
  if (groupId === "history") {
    if (actionId === "undo") return ctx.canUndo && ctx.mode !== "view" ? "shown" : "disabled";
    if (actionId === "redo") return ctx.canRedo && ctx.mode !== "view" ? "shown" : "disabled";
  }
  if (groupId === "view" && actionId === "deselect") {
    return ctx.selection === "none" && !ctx.hasSelection ? "disabled" : "shown";
  }
  if (groupId === "shape" && (actionId === "fill" || actionId === "stroke") && !ctx.capabilities.formatText) {
    return "hidden";
  }
  if (groupId === "text") {
    const format = ctx.capabilities.formatText;
    const paragraph = ctx.capabilities.formatParagraph;
    const styleIds = new Set(["font", "size", "bold", "italic", "underline", "strike", "color"]);
    const paraIds = new Set([
      "alignLeft",
      "alignCenter",
      "alignRight",
      "alignJustify",
      "spacing",
      "outdent",
      "indent",
    ]);
    if (styleIds.has(actionId) && !format) return "disabled";
    if (paraIds.has(actionId) && !paragraph) return "disabled";
    if ((actionId === "highlight" || actionId === "clearHighlight" || actionId === "comment") && !ctx.hasSelection) {
      return "disabled";
    }
  }
  if (groupId === "insert") {
    const kind =
      actionId === "insertImage"
        ? "image"
        : actionId === "insertTextBox"
          ? "text-box"
          : actionId === "insertCode"
            ? "code"
            : actionId === "insertShape"
              ? "shape"
              : "";
    if (kind && ctx.insertKinds && !ctx.insertKinds.includes(kind)) return "hidden";
  }
  return "shown";
}

/** Hint for an action, or empty when help is off. */
export function actionHint(groupId: string, actionId: string, helpOn: boolean): string {
  if (!helpOn) return "";
  return catalogGroup(groupId)?.actions.find((action) => action.id === actionId)?.hint ?? "";
}
