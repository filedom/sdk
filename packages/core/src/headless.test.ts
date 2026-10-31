// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Capabilities, DocInfo } from "./engine-types.js";
import { DomdocError } from "./errors.js";
import { createViewerStore as fromIndex } from "./index.js";
import { createViewerStore } from "./headless.js";
import { TOOLBAR_CATALOG } from "./toolbar-catalog.js";
import { DomdocViewer, type SelectionState, type ThemeName, type ViewMode } from "./viewer.js";

const CAPS: Capabilities = {
  editText: true,
  editStructure: true,
  formatText: true,
  formatParagraph: false,
  flowEmbeds: false,
  transform: false,
  layers: false,
  insert: false,
};

function info(patch: Partial<DocInfo> = {}): DocInfo {
  return {
    format: "pdf",
    pageCount: 3,
    trackChanges: false,
    author: "domdoc",
    pendingRevisions: 0,
    exportExtension: "pdf",
    exportMime: "application/pdf",
    canUndo: false,
    canRedo: false,
    capabilities: CAPS,
    warnings: [],
    ...patch,
  };
}

/** Public viewer surface the store reads, with events emitted by hand. */
class FakeViewer {
  readonly handlers = new Map<string, Set<(event: unknown) => void>>();
  document: { name: string; info: () => DocInfo } | undefined;
  selection: { anchor: SelectionState["anchor"]; focus: SelectionState["focus"] } | null = null;
  viewMode: ViewMode = "live";
  theme: ThemeName = "light";
  zoom = 1;
  docInfo = info();

  on(type: string, handler: (event: unknown) => void): () => void {
    let set = this.handlers.get(type);
    if (!set) this.handlers.set(type, (set = new Set()));
    set.add(handler);
    return () => set.delete(handler);
  }

  emit(type: string, event: unknown = {}): void {
    for (const handler of this.handlers.get(type) ?? []) handler(event);
  }

  listenerCount(): number {
    return [...this.handlers.values()].reduce((sum, set) => sum + set.size, 0);
  }

  getZoom(): number {
    return this.zoom;
  }

  selectedText(): string {
    return "";
  }

  openDoc(name = "notes.pdf"): void {
    this.emit("loading", { name });
    this.document = { name, info: () => this.docInfo };
    this.emit("open", { document: this.document });
  }

  zoomIn = vi.fn(() => {
    this.zoom = 1.25;
    this.emit("zoom", { zoom: this.zoom });
  });
  zoomOut = vi.fn();
  setZoom = vi.fn();
  fit = vi.fn();
  undo = vi.fn();
  redo = vi.fn();
  pick = vi.fn();
  nextHit = vi.fn();
  setParagraph = vi.fn();
  toggle = vi.fn();
  setViewMode = vi.fn((mode: ViewMode) => {
    this.viewMode = mode;
    this.emit("viewMode", { mode });
  });
  setTheme = vi.fn((theme: ThemeName) => {
    this.theme = theme;
    this.emit("theme", { theme });
  });
}

function setup() {
  const fake = new FakeViewer();
  const store = createViewerStore(fake as unknown as DomdocViewer);
  return { fake, store };
}

const SELECTION: SelectionState = { anchor: { unit: "u1", offset: 0 }, focus: { unit: "u1", offset: 5 }, text: "Hello" };

describe("createViewerStore", () => {
  it("is exported from the package entry", () => {
    expect(fromIndex).toBe(createViewerStore);
  });

  it("starts empty with one action per distinct catalog id", () => {
    const { store } = setup();
    const snap = store.getSnapshot();
    expect(snap).toMatchObject({
      status: "empty",
      document: null,
      error: null,
      zoom: 1,
      theme: "light",
      viewMode: "live",
      selection: null,
      search: { query: "", hitCount: 0, hitIndex: -1 },
    });
    const ids = new Set(TOOLBAR_CATALOG.flatMap((group) => group.actions.map((action) => action.id)));
    expect(Object.keys(snap.actions).sort()).toEqual([...ids].sort());
    expect(snap.actions.zoomIn).toEqual({ group: "view", availability: "shown" });
    expect(snap.actions.undo).toEqual({ group: "history", availability: "disabled", detail: "Nothing to undo" });
    expect(snap.actions.bold).toMatchObject({ availability: "hidden", detail: "Bold needs an open document" });
    for (const action of Object.values(snap.actions)) {
      expect(action.availability === "shown" ? action.detail : typeof action.detail).toBe(
        action.availability === "shown" ? undefined : "string",
      );
    }
  });

  it("goes loading then ready on open, with the document from the viewer", () => {
    const { fake, store } = setup();
    const statuses: string[] = [];
    store.subscribe(() => statuses.push(store.getSnapshot().status));
    fake.openDoc("notes.pdf");
    expect(statuses).toEqual(["loading", "ready"]);
    expect(store.getSnapshot().document).toEqual({
      name: "notes.pdf",
      format: "pdf",
      pageCount: 3,
      capabilities: CAPS,
      canUndo: false,
      canRedo: false,
    });
  });

  it("follows zoom, theme and view mode events", () => {
    const { fake, store } = setup();
    fake.openDoc();
    fake.zoom = 1.5;
    fake.emit("zoom", { zoom: 1.5 });
    expect(store.getSnapshot().zoom).toBe(1.5);
    fake.theme = "dark";
    fake.emit("theme", { theme: "dark" });
    expect(store.getSnapshot().theme).toBe("dark");
    fake.viewMode = "view";
    fake.emit("viewMode", { mode: "view" });
    expect(store.getSnapshot().viewMode).toBe("view");
    expect(store.getSnapshot().actions.undo).toMatchObject({
      availability: "disabled",
      detail: "Undo is not available in view only mode",
    });
  });

  it("follows selection events and recomputes the text actions", () => {
    const { fake, store } = setup();
    fake.openDoc();
    expect(store.getSnapshot().actions.bold!.availability).toBe("hidden");
    fake.emit("selection", SELECTION);
    const snap = store.getSnapshot();
    expect(snap.selection).toEqual(SELECTION);
    expect(snap.actions.bold).toEqual({ group: "text", availability: "shown" });
    expect(snap.actions.highlight!.availability).toBe("shown");
    expect(snap.actions.alignCenter).toMatchObject({
      availability: "disabled",
      detail: "Align center is not supported for PDF documents",
    });
    fake.emit("selection", null);
    expect(store.getSnapshot().selection).toBeNull();
    expect(store.getSnapshot().actions.bold!.availability).toBe("hidden");
  });

  it("follows search events and resets them on close", () => {
    const { fake, store } = setup();
    fake.openDoc();
    fake.emit("search", { query: "Hello", hitCount: 4, hitIndex: 0 });
    expect(store.getSnapshot().search).toEqual({ query: "Hello", hitCount: 4, hitIndex: 0 });
    fake.emit("search", { query: "Hello", hitCount: 4, hitIndex: 2 });
    expect(store.getSnapshot().search.hitIndex).toBe(2);
    fake.document = undefined;
    fake.emit("close");
    expect(store.getSnapshot()).toMatchObject({ status: "empty", document: null, search: { query: "", hitCount: 0, hitIndex: -1 } });
  });

  it("reads canUndo after a change event", () => {
    const { fake, store } = setup();
    fake.openDoc();
    fake.docInfo = info({ canUndo: true });
    fake.emit("change", { command: { type: "undo" }, result: {} });
    expect(store.getSnapshot().document!.canUndo).toBe(true);
    expect(store.getSnapshot().actions.undo).toEqual({ group: "history", availability: "shown" });
  });

  it("reports a failed open as error and keeps ready for an edit error", () => {
    const { fake, store } = setup();
    fake.emit("loading", { name: "bad.pdf" });
    fake.emit("error", { error: new DomdocError("bad-file", "not a pdf") });
    expect(store.getSnapshot()).toMatchObject({ status: "error", error: { code: "bad-file", detail: "not a pdf" } });
    fake.openDoc();
    expect(store.getSnapshot()).toMatchObject({ status: "ready", error: null });
    fake.emit("error", { error: new DomdocError("unsupported", "paragraph formatting") });
    expect(store.getSnapshot()).toMatchObject({ status: "ready", error: { code: "unsupported" } });
  });

  it("calls subscribers with no arguments until they unsubscribe", () => {
    const { fake, store } = setup();
    const listener = vi.fn();
    const off = store.subscribe(listener);
    fake.zoomIn();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith();
    off();
    fake.zoom = 2;
    fake.emit("zoom", { zoom: 2 });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().zoom).toBe(2);
  });

  it("keeps the snapshot object until a field changes", () => {
    const { fake, store } = setup();
    const listener = vi.fn();
    store.subscribe(listener);
    const first = store.getSnapshot();
    expect(store.getSnapshot()).toBe(first);
    fake.emit("zoom", { zoom: 1 });
    fake.emit("theme", { theme: "light" });
    expect(store.getSnapshot()).toBe(first);
    expect(listener).not.toHaveBeenCalled();
    fake.zoomIn();
    const second = store.getSnapshot();
    expect(second).not.toBe(first);
    expect(second.zoom).toBe(1.25);
    expect(second.actions).toBe(first.actions);
    expect(second.search).toBe(first.search);
    expect(store.getSnapshot()).toBe(second);
  });

  it("runs a shown action through the public viewer API", () => {
    const { fake, store } = setup();
    expect(store.run("zoomIn")).toEqual({ status: "applied" });
    expect(fake.zoomIn).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().zoom).toBe(1.25);
    expect(store.run("track")).toEqual({ status: "applied" });
    expect(fake.setViewMode).toHaveBeenCalledWith("track");
    expect(store.getSnapshot().viewMode).toBe("track");
    expect(store.run("theme")).toEqual({ status: "applied" });
    expect(fake.setTheme).toHaveBeenCalledWith("dark");
    expect(store.getSnapshot().theme).toBe("dark");
    expect(store.run("findNext")).toEqual({ status: "applied" });
    expect(fake.nextHit).toHaveBeenCalledWith(1);
    expect(store.run("open")).toEqual({ status: "applied" });
    expect(fake.pick).toHaveBeenCalled();
  });

  it("returns unsupported with a detail and leaves the viewer alone", () => {
    const { fake, store } = setup();
    expect(store.run("undo")).toEqual({ status: "unsupported", detail: "Nothing to undo" });
    expect(fake.undo).not.toHaveBeenCalled();
    expect(store.run("nope")).toEqual({ status: "unsupported", detail: '"nope" is not a toolbar catalog action' });
    const search = store.run("search");
    expect(search.status).toBe("unsupported");
    expect(search.status === "unsupported" && search.detail).toContain("store.viewer.search");

    fake.openDoc();
    fake.emit("selection", SELECTION);
    expect(store.run("alignCenter")).toEqual({
      status: "unsupported",
      detail: "Align center is not supported for PDF documents",
    });
    expect(fake.setParagraph).not.toHaveBeenCalled();
    expect(store.run("bold")).toEqual({ status: "applied" });
    expect(fake.toggle).toHaveBeenCalledWith("bold");
  });

  it("detaches from the viewer on destroy", () => {
    const { fake, store } = setup();
    const listener = vi.fn();
    store.subscribe(listener);
    expect(fake.listenerCount()).toBeGreaterThan(0);
    const before = store.getSnapshot();
    store.destroy();
    expect(fake.listenerCount()).toBe(0);
    fake.zoom = 3;
    fake.emit("zoom", { zoom: 3 });
    expect(listener).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toBe(before);
  });
});

describe("createViewerStore on a DomdocViewer", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.replaceChildren();
    document.head.querySelector("style[data-domdoc]")?.remove();
  });

  it("follows the viewer's zoom, theme, view mode and search events", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    const root = document.createElement("div");
    document.body.append(root);
    const viewer = new DomdocViewer(root, { bundles: {}, toolbar: false });
    const store = createViewerStore(viewer);
    expect(store.viewer).toBe(viewer);
    expect(store.getSnapshot()).toMatchObject({ status: "empty", zoom: 1, theme: "light", viewMode: "live" });

    expect(store.run("zoomIn")).toEqual({ status: "applied" });
    expect(store.getSnapshot().zoom).toBe(viewer.getZoom());
    expect(viewer.getZoom()).toBeGreaterThan(1);

    store.viewer.setTheme("dark");
    expect(store.getSnapshot().theme).toBe("dark");
    expect(store.run("theme")).toEqual({ status: "applied" });
    expect(store.getSnapshot().theme).toBe("light");

    expect(store.run("view")).toEqual({ status: "applied" });
    expect(store.getSnapshot().viewMode).toBe("view");

    store.viewer.search("Hello");
    expect(store.getSnapshot().search).toEqual({ query: "Hello", hitCount: 0, hitIndex: -1 });

    store.destroy();
    viewer.setZoom(2);
    expect(store.getSnapshot().zoom).not.toBe(2);
    viewer.destroy();
  });
});
