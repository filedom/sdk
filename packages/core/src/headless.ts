import type { Align, Capabilities, Format } from "./engine-types.js";
import { fileKind } from "./formats.js";
import {
  TOOLBAR_CATALOG,
  actionAvailability,
  type ActionAvailability,
  type CatalogContext,
  type SelectionKind,
} from "./toolbar-catalog.js";
import type { FiledomViewer, SelectionState, ThemeName, ViewMode } from "./viewer.js";

/** Shell lifecycle, mirrored on the UI kit shell as `data-filedom-state`. */
export type ViewerStoreStatus = "empty" | "loading" | "ready" | "error";

/** The open document as the store reports it. */
export interface ViewerStoreDocument {
  name?: string;
  format: Format;
  pageCount: number;
  capabilities: Capabilities;
  canUndo: boolean;
  canRedo: boolean;
}

export interface ViewerStoreSearch {
  query: string;
  hitCount: number;
  /** Zero-based current hit, or -1 when there are no hits. */
  hitIndex: number;
}

/** One `TOOLBAR_CATALOG` action. `detail` is set whenever `availability` is not `shown`. */
export interface ViewerStoreAction {
  group: string;
  availability: ActionAvailability;
  detail?: string;
}

/**
 * Immutable view of the viewer. `getSnapshot` returns the same object until a
 * viewer event changes a field, so it is safe for `useSyncExternalStore`.
 */
export interface ViewerStoreSnapshot {
  status: ViewerStoreStatus;
  document: ViewerStoreDocument | null;
  error: { code: string; detail: string } | null;
  zoom: number;
  theme: ThemeName;
  viewMode: ViewMode;
  selection: SelectionState | null;
  search: ViewerStoreSearch;
  /** Keyed by catalog action id. */
  actions: Readonly<Record<string, ViewerStoreAction>>;
}

export type ViewerStoreRunResult = { status: "applied" } | { status: "unsupported"; detail: string };

export interface ViewerStore {
  /** Returns the unsubscribe function. */
  subscribe(listener: () => void): () => void;
  getSnapshot(): ViewerStoreSnapshot;
  /** Runs a `TOOLBAR_CATALOG` action id. An action that is not `shown` returns `unsupported`. */
  run(actionId: string): ViewerStoreRunResult;
  /** For calls that take arguments: `search`, `setZoom`, `setTheme`, `open`. */
  readonly viewer: FiledomViewer;
  /** Detaches from the viewer's events. Does not destroy the viewer. */
  destroy(): void;
}

const NO_CAPABILITIES: Capabilities = {
  editText: false,
  editStructure: false,
  formatText: false,
  formatParagraph: false,
  flowEmbeds: false,
  transform: false,
  layers: false,
  insert: false,
};

const NO_SEARCH: ViewerStoreSearch = { query: "", hitCount: 0, hitIndex: -1 };

interface CatalogEntry {
  label: string;
  groups: string[];
}

/** Each distinct action id, with every group it appears in, in catalog order. */
const CATALOG = new Map<string, CatalogEntry>();
for (const group of TOOLBAR_CATALOG) {
  for (const action of group.actions) {
    const entry = CATALOG.get(action.id);
    if (entry) entry.groups.push(group.id);
    else CATALOG.set(action.id, { label: action.label, groups: [group.id] });
  }
}

/** The selection each contextual group needs before it opens. */
const GROUP_SELECTION: Record<string, SelectionKind> = {
  text: "text",
  image: "image",
  shape: "shape",
  group: "group",
  timeline: "audio",
};

const align = (value: Align) => (viewer: FiledomViewer) => void viewer.setParagraph({ align: value });

/** Catalog actions that map onto a public viewer call with no arguments. */
const RUNNERS: Record<string, (viewer: FiledomViewer, snapshot: ViewerStoreSnapshot) => void> = {
  open: (viewer) => viewer.pick(),
  save: (viewer) => void viewer.download(),
  export: (viewer) => void viewer.download(),
  storeFiledom: (viewer) => void viewer.apply({ type: "storeFiledom" }),
  undo: (viewer) => void viewer.undo(),
  redo: (viewer) => void viewer.redo(),
  live: (viewer) => viewer.setViewMode("live"),
  track: (viewer) => viewer.setViewMode("track"),
  view: (viewer) => viewer.setViewMode("view"),
  findPrev: (viewer) => viewer.nextHit(-1),
  findNext: (viewer) => viewer.nextHit(1),
  zoomOut: (viewer) => viewer.zoomOut(),
  zoomReset: (viewer) => viewer.setZoom(1),
  zoomIn: (viewer) => viewer.zoomIn(),
  fitWidth: (viewer) => viewer.fit("width"),
  fitPage: (viewer) => viewer.fit("page"),
  theme: (viewer, snapshot) =>
    viewer.setTheme(snapshot.theme === "dark" ? "light" : "dark"),
  deselect: (viewer) => viewer.deselect(),
  deselectElement: (viewer) => viewer.deselect(),
  bold: (viewer) => void viewer.toggle("bold"),
  italic: (viewer) => void viewer.toggle("italic"),
  underline: (viewer) => void viewer.toggle("underline"),
  strike: (viewer) => void viewer.toggle("strike"),
  highlight: (viewer) => void viewer.highlight(),
  clearHighlight: (viewer) => void viewer.highlight(null),
  alignLeft: align("left"),
  alignCenter: align("center"),
  alignRight: align("right"),
  alignJustify: align("justify"),
  outdent: (viewer) => void viewer.setParagraph({ indentByPt: -36 }),
  indent: (viewer) => void viewer.setParagraph({ indentByPt: 36 }),
  replaceImage: (viewer) => viewer.replaceImage(),
  playMedia: (viewer) => viewer.playMedia(),
  pauseMedia: (viewer) => viewer.pauseMedia(),
  muteMedia: (viewer) => viewer.muteMedia(),
  copyListing: (viewer) => viewer.copyListing(),
};

/** Shown actions the store cannot run without arguments or the built-in toolbar. */
const NOT_RUNNABLE: Record<string, string> = {
  search: "Search takes a query: call store.viewer.search(query)",
  replace: "Replace takes the current search and a replacement: call store.viewer.replaceMatch(text) or store.viewer.replaceAll(text)",
  replaceMatch: "Replace takes the current search and a replacement: call store.viewer.replaceMatch(text)",
  replaceAll: "Replace all takes the current search and a replacement: call store.viewer.replaceAll(text)",
  trimClip: "Trim a clip with store.viewer.trimClip(id, startMs, endMs)",
  clipSpeed: "Set the clip speed with store.viewer.setClipSpeed(speed)",
  appendClip: "Add a clip with store.viewer.appendClip()",
};

function catalogContext(document: ViewerStoreDocument | null, viewMode: ViewMode, selection: SelectionState | null): CatalogContext {
  return {
    capabilities: document?.capabilities ?? NO_CAPABILITIES,
    mode: viewMode,
    selection: selection ? "text" : "none",
    canUndo: document?.canUndo ?? false,
    canRedo: document?.canRedo ?? false,
    hasSelection: Boolean(selection?.text),
    fileKind: document ? fileKind(document.format) : undefined,
    format: document?.format,
  };
}

/** Why an action is not shown, found by lifting one blocker at a time. */
function availabilityDetail(
  groupId: string,
  actionId: string,
  label: string,
  ctx: CatalogContext,
  document: ViewerStoreDocument | null,
): string {
  const needsTrack = groupId === "trackHistory";
  const fixes = {
    mode: (c: CatalogContext): CatalogContext => ({ ...c, mode: needsTrack ? "track" : c.mode === "view" ? "live" : c.mode }),
    selection: (c: CatalogContext): CatalogContext => ({
      ...c,
      selection: GROUP_SELECTION[groupId] ?? (c.selection === "none" ? "text" : c.selection),
      hasSelection: true,
    }),
    history: (c: CatalogContext): CatalogContext => ({ ...c, canUndo: true, canRedo: true }),
  };
  const order = ["mode", "selection", "history"] as const;
  const apply = (skip?: (typeof order)[number]) =>
    order.reduce((acc, key) => (key === skip ? acc : fixes[key](acc)), ctx);
  if (actionAvailability(groupId, actionId, apply()) !== "shown") {
    return document ? `${label} is not supported for ${document.format.toUpperCase()} documents` : `${label} needs an open document`;
  }
  for (const key of order) {
    if (actionAvailability(groupId, actionId, apply(key)) === "shown") continue;
    if (key === "mode") return needsTrack ? `${label} needs track changes mode` : `${label} is not available in view only mode`;
    if (key === "selection") return `${label} needs a selection`;
    return actionId === "redo" ? "Nothing to redo" : "Nothing to undo";
  }
  return `${label} is not available right now`;
}

function catalogActions(
  document: ViewerStoreDocument | null,
  viewMode: ViewMode,
  selection: SelectionState | null,
): Record<string, ViewerStoreAction> {
  const ctx = catalogContext(document, viewMode, selection);
  const actions: Record<string, ViewerStoreAction> = {};
  for (const [id, entry] of CATALOG) {
    const group = entry.groups.find((groupId) => actionAvailability(groupId, id, ctx) !== "hidden") ?? entry.groups[0]!;
    const availability = actionAvailability(group, id, ctx);
    actions[id] =
      availability === "shown"
        ? { group, availability }
        : { group, availability, detail: availabilityDetail(group, id, entry.label, ctx, document) };
  }
  return actions;
}

function same(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = Object.keys(left);
  if (keys.length !== Object.keys(right).length) return false;
  return keys.every((key) => Object.prototype.hasOwnProperty.call(right, key) && same(left[key], right[key]));
}

/** Keeps unchanged branches of `prev` so selectors on nested fields stay referentially stable. */
function share<T>(prev: T, next: T): T {
  if (same(prev, next)) return prev;
  if (typeof prev !== "object" || typeof next !== "object" || prev === null || next === null) return next;
  if (Array.isArray(prev) || Array.isArray(next)) return next;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(next as Record<string, unknown>)) {
    out[key] = share((prev as Record<string, unknown>)[key], value);
  }
  return out as T;
}

/** Wraps a viewer created with `toolbar: false` in a framework-neutral store. */
export function createViewerStore(viewer: FiledomViewer): ViewerStore {
  const listeners = new Set<() => void>();
  let status: ViewerStoreStatus = viewer.document ? "ready" : "empty";
  let error: ViewerStoreSnapshot["error"] = null;
  let selection: SelectionState | null = readSelection();
  let search: ViewerStoreSearch = NO_SEARCH;
  let snapshot = build();

  function readSelection(): SelectionState | null {
    const current = viewer.selection;
    return current ? { anchor: current.anchor, focus: current.focus, text: viewer.selectedText() } : null;
  }

  function readDocument(): ViewerStoreDocument | null {
    const doc = viewer.document;
    if (!doc) return null;
    const info = doc.info();
    return {
      name: doc.name,
      format: info.format,
      pageCount: info.pageCount,
      capabilities: { ...info.capabilities },
      canUndo: info.canUndo,
      canRedo: info.canRedo,
    };
  }

  function build(): ViewerStoreSnapshot {
    const document = readDocument();
    const viewMode = viewer.viewMode;
    return {
      status,
      document,
      error,
      zoom: viewer.getZoom(),
      theme: viewer.theme,
      viewMode,
      selection,
      search,
      actions: catalogActions(document, viewMode, selection),
    };
  }

  function refresh(): void {
    const next = share(snapshot, build());
    if (next === snapshot) return;
    snapshot = next;
    for (const listener of [...listeners]) listener();
  }

  const offs = [
    viewer.on("loading", () => {
      status = "loading";
      error = null;
      refresh();
    }),
    viewer.on("open", () => {
      status = "ready";
      error = null;
      selection = readSelection();
      search = NO_SEARCH;
      refresh();
    }),
    viewer.on("close", () => {
      if (status !== "loading") status = "empty";
      selection = null;
      search = NO_SEARCH;
      refresh();
    }),
    viewer.on("error", ({ error: failure }) => {
      error = { code: failure.code, detail: failure.detail };
      if (status === "loading" || !viewer.document) status = "error";
      refresh();
    }),
    viewer.on("selection", (next) => {
      selection = next;
      refresh();
    }),
    viewer.on("search", (next) => {
      search = { query: next.query, hitCount: next.hitCount, hitIndex: next.hitIndex };
      refresh();
    }),
    viewer.on("change", refresh),
    viewer.on("zoom", refresh),
    viewer.on("theme", refresh),
    viewer.on("viewMode", refresh),
  ];

  return {
    viewer,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    run(actionId) {
      const entry = CATALOG.get(actionId);
      if (!entry) return { status: "unsupported", detail: `"${actionId}" is not a toolbar catalog action` };
      const action = snapshot.actions[actionId]!;
      if (action.availability !== "shown") {
        return { status: "unsupported", detail: action.detail ?? `${entry.label} is not available` };
      }
      const runner = RUNNERS[actionId];
      if (!runner) {
        return {
          status: "unsupported",
          detail: NOT_RUNNABLE[actionId] ?? `${entry.label} is not on the public viewer API; call store.viewer instead`,
        };
      }
      runner(viewer, snapshot);
      return { status: "applied" };
    },
    destroy() {
      while (offs.length) offs.pop()!();
      listeners.clear();
    },
  };
}
