import { AnnotationCard, SelectionMenu, passageEnds, quoteFromRanges, type Annotation, type HighlightEvent } from "./annotate.js";
import { BundleLoader, type BundleImporters } from "./bundles.js";
import { ComponentLayer } from "./component-layer.js";
import { ComponentRegistry, type ComponentFactory, type Placement } from "./components.js";
import {
  CONTENT_COMPONENT,
  contentElement,
  contentLabel,
  contentSize,
  mountContentElement,
} from "./content-elements.js";
import {
  DEBUG_HISTORY,
  buildDebugReport,
  caretUnits,
  clipUnitText,
  commandAction,
  inputAction,
  roundPt,
  summarizeRun,
  unitsInAction,
  unitsMentioned,
  type DebugMate,
  type DebugSnapshot,
  type DebugUnit,
} from "./debug-report.js";
import type { DomdocDocument, DocumentChange } from "./document.js";
import { replacementOrder } from "./replace-text.js";
import { elementFactory, placeAt, type ElementFactory } from "./dom.js";
import {
  boxContains,
  elementDisplayBox,
  elementLabel,
  elementOverlayFrame,
  gestureMeasure,
  hitElement,
  pageElements,
  textElement,
  type ElementGesture,
  type PdfElement,
} from "./element-select.js";
import { Editor, isCollapsed, samePos, type Selection } from "./editor.js";
import {
  LINE_BREAK,
  type CaretMove,
  type Command,
  type CommandResult,
  type DocInfo,
  type EngineEvent,
  type EngineInput,
  type LayerView,
  type ParagraphPatch,
  type Pos,
  type RunView,
  type SearchHit,
  type TextStyle,
  type UnitRange,
} from "./engine-types.js";
import { upgradeLazyEdit } from "./edit-lazy.js";
import { DomdocError } from "./errors.js";
import { FileStore, type StoredFile } from "./file-store.js";
import { ACCEPT, detectFormat, fileKind } from "./formats.js";
import { placeMedia } from "./media-view.js";
import { isAddressable, rectsForRange, runBox, visibleLength } from "./geometry.js";
import { icon } from "./icons.js";
import type { CoreLoader } from "./modules.js";
import { loadingLabel } from "./modules.js";
import { openDocument, type OpenSource } from "./open.js";
import { promptForPassword } from "./password-prompt.js";
import { PageStack, type PageSlot } from "./pages.js";
import { bindInk, type InkLibrary } from "./ink.js";
import { flowPaintKey, objectPaintKey, paintEditedRuns, paintFlowPage, paintRaster, presentedRuns, trackX, visualX, type Markup } from "./paint.js";
import { HistoryPanel } from "./history.js";
import {
  LayerElementsCache,
  LayersPanel,
  layerElementsForPage,
  layerElementsKey,
  type LayerElementItem,
} from "./layers.js";
import { openNewFileDialog } from "./new-file.js";
import { injectStyles } from "./styles.js";
import { fillTextLayer, textLayerKey } from "./text-layer.js";
import {
  nextThemeKey,
  themeConfigOf,
  themeTokenCss,
  type ThemeConfig,
  type ThemeName,
  type ThemePreference,
} from "./theme.js";
import { shownTextFormat, Toolbar, type ToolbarActions, type ViewMode } from "./toolbar.js";
import type { SelectionKind } from "./toolbar-catalog.js";
import { PX_PER_PT, clampZoom, rasterScale, stepZoom, wheelZoom, type FitMode } from "./zoom.js";

export type { Annotation, HighlightEvent } from "./annotate.js";
export type { ThemeConfig, ThemeName, ThemePreference, ThemeToken, ThemeTokens } from "./theme.js";

export type ChromeDir = "ltr" | "rtl";

export interface ViewerOptions {
  /**
   * Previous per-format wasm bundles. Omit this when `core` is set: open then
   * uses the PDF or Office engine instead.
   */
  bundles?: BundleImporters;
  /**
   * When set, open ignores `bundles` and loads the pdf bundle or office_oxide, from
   * the switches on this loader. Track changes is a further
   * module, fetched only when the host turned it on.
   */
  core?: CoreLoader;
  /** Shared with the host SPA and DOM components. A new store is created if omitted. */
  files?: FileStore;
  components?: ComponentRegistry;
  /** Revision author for tracked changes. */
  author?: string;
  zoom?: number;
  highlightColor?: string;
  toolbar?: boolean;
  revisionsPanel?: boolean;
  /** Locks the viewer in view-only mode. */
  readOnly?: boolean;
  /**
   * Starting view mode. Omitted: live, unless the opened file already tracks changes.
   * `readOnly` forces view only.
   */
  viewMode?: ViewMode;
  /**
   * Directory of substitution fonts (`metrics.bin` and the face files). Fetched only when a
   * document's runs are not Helvetica or Arial.
   */
  fontsBase?: string;
  /** Lazy `domdoc_fonts.wasm` glue directory. Omitted: that module is not fetched. */
  fontsWasmBase?: string;
  /** Unused. Editing is inside the PDF and office bundles. */
  editWasmBase?: string;
  /** `POST /open` on this API. Omitted: `/api`. */
  apiBase?: string;
  /** Sent only on the open ping. A matching key hides the trial banner. */
  licenseKey?: string;
  /** When false, `attach("edit")` runs as soon as the file opens. */
  lazyEdit?: boolean;
  /**
   * Toolbar and page chrome. Defaults to light.
   * `system` follows the OS. An object sets that preference plus token overrides.
   * A `--dd-*` variable on this element, or any ancestor, wins over those tokens.
   */
  theme?: ThemePreference | ThemeConfig;
  /** Mirrors the toolbar when `rtl`. Defaults to ltr. */
  dir?: ChromeDir;
}

export type { ViewMode };

export interface SelectionState {
  anchor: Pos;
  focus: Pos;
  text: string;
}

export interface ViewerEvents {
  open: { document: DomdocDocument };
  close: Record<string, never>;
  change: { command: Command; result: CommandResult };
  selection: SelectionState | null;
  /** A highlight applied to the current passage. `color` is `null` when it was cleared. */
  highlight: HighlightEvent;
  /** A comment attached to a highlighted passage. */
  annotation: Annotation;
  /** The host can swap bytes for the selected image. */
  replaceImage: { id: string; page: number; file: File };
  error: { error: DomdocError };
  export: { name: string; blob: Blob };
  zoom: { zoom: number };
  /** The palette on screen. `system` reports the light or dark it resolved to. */
  theme: { theme: ThemeName };
  /** `open` started. `open` or `error` follows. */
  loading: { name?: string };
  viewMode: { mode: ViewMode };
  /** After `search` and `nextHit`. `hitIndex` is zero-based, or -1 with no hits. */
  search: { query: string; hitCount: number; hitIndex: number };
}

type Handler<K extends keyof ViewerEvents> = (event: ViewerEvents[K]) => void;

/**
 * The viewer shell: page stack, caret editor, toolbar and component layer.
 * Document state stays in the Rust session; this class paints it and sends commands.
 */
function openedName(source: OpenSource, name?: string): string {
  if (name?.trim()) return name.trim();
  if (typeof File !== "undefined" && source instanceof File) return source.name;
  return "";
}

function fileExtension(name: string): string {
  const match = /\.([a-z0-9]{1,16})$/i.exec(name.trim());
  return match?.[1]?.toLowerCase() ?? "";
}

export class DomdocViewer {
  readonly files: FileStore;
  readonly components: ComponentRegistry;
  private readonly loader: BundleLoader;
  private readonly h: ElementFactory;
  private readonly capture: HTMLDivElement;
  private readonly el: HTMLDivElement;
  private readonly themeKey = nextThemeKey();
  private readonly themeStyle: HTMLStyleElement;
  private preference: ThemePreference = "light";
  private themeConfig: ThemeConfig = {};
  private publishedTheme?: ThemeName;
  private schemeOff?: () => void;
  private readonly empty: HTMLDivElement;
  private readonly fileInput: HTMLInputElement;
  private readonly pages: PageStack;
  private readonly toolbar?: Toolbar;
  private readonly panel: HistoryPanel;
  private readonly layersPanel: LayersPanel;
  private readonly editor: Editor;
  private readonly layer: ComponentLayer;
  private readonly handlers = new Map<keyof ViewerEvents, Set<Handler<any>>>();
  private readonly cleanup: Array<() => void> = [];
  /** Object URL for the open audio or video, revoked on close. */
  private mediaBlob?: { key: string; url: string };
  /** Edit commands and typed text that led up to the error on screen. */
  private readonly recentEdits: unknown[] = [];
  /** The input or command currently inside the engine. */
  private inflight?: unknown;
  /** Frozen when the error was raised, so a later click still describes that failure. */
  private lastReport?: DebugSnapshot;
  /** The error already written into `lastReport`, so a rethrow does not capture it again. */
  private reportedError?: DomdocError;
  /** True until `open` has swapped in the new document, so a rejected file is not described as the one on screen. */
  private hideOpenDocument = false;
  private doc?: DomdocDocument;
  private zoomValue: number;
  private author: string;
  private highlightColor: string;
  private viewModeValue: ViewMode;
  /** The user or the host chose a mode; later files keep it. */
  private modePinned: boolean;
  private sel: Selection | null = null;
  /** Selection rectangles from the core, in page points. */
  private marks: Array<{ page: number; xPt: number; yPt: number; widthPt: number; heightPt: number }> = [];
  /** Comments on highlighted passages. They stay on the page for this open file. */
  private notes: Annotation[] = [];
  private noteSeq = 1;
  private openNote?: Annotation;
  private readonly menu: SelectionMenu;
  private readonly noteCard: AnnotationCard;
  private goalX: number | undefined;
  private pending?: TextStyle;
  private hits: SearchHit[] = [];
  private hitIndex = -1;
  private searchQuery = "";
  private dragging = false;
  private moved = false;
  /** A selected text line is being typed into, rather than only framed. */
  private textEditing = false;
  private helpOn = false;
  /** False until the View → Lock control freezes toolbar drag positions. */
  private toolbarsLocked = false;
  private hiddenGroups: string[] = [];
  /** Side trays the user hid from View → Panels. */
  private hiddenTrays: string[] = [];
  /** User asked to keep the layers tray open even before page elements exist. */
  private layersPinned = false;
  private newFileDialog?: { destroy(): void };
  private picked?: { id: string; page: number; kind: string };
  private drag?: {
    mode: "move" | "resize" | "rotate";
    corner?: string;
    startX: number;
    startY: number;
    startAngle: number;
    originX: number;
    originY: number;
    originW: number;
    originH: number;
    originRot: number;
    x: number;
    y: number;
    w: number;
    h: number;
    rot: number;
    moved: boolean;
  };
  /** Last gesture frame held until the next paint after commit so the border does not snap back. */
  private gesturePreview?: ElementGesture;
  private inRefresh = false;
  private refreshAgain = false;
  /** One node for the session. Rebuilding it restarts the blink, which reads as the beam lagging. */
  private caretEl?: HTMLDivElement;
  private caretLoc?: { page: number; xPt: number; yPt: number; heightPt: number };
  /** Set when the engine just returned caret geometry, so refresh does not locate again. */
  private caretFromEngine = false;
  private chromeTimer?: ReturnType<typeof setTimeout>;
  /** Coalesces layer thumb re-crops after a batch of full page paints. */
  private layerThumbTimer?: ReturnType<typeof setTimeout>;
  /** Page indices whose canvases painted since the last thumb refresh. */
  private readonly layerThumbPages = new Set<number>();
  /** Layer rows keyed by document revision; reused across selection chrome syncs. */
  private readonly layerElementsCache = new LayerElementsCache();
  /** Defers first layers-panel DOM build until after page paint. */
  private layersRenderTimer?: ReturnType<typeof setTimeout>;
  private layersRenderRaf?: number;
  private pendingLayersRender?: { layers: LayerView[]; fallbackLayer: string };
  /** Runs sampled once per toolbar sync. Unset means each style query samples itself. */
  private styleSample?: RunView[];
  private motionOff?: () => void;
  private fontsModule?: Promise<void>;
  private readonly loadingEl: HTMLDivElement;
  /** Shown when POST /open says this page is a trial. Memory only. */
  private readonly trialEl: HTMLDivElement;
  private trial = false;
  private readonly loadingText: HTMLParagraphElement;
  /** Image file picker for replacing a selected image. */
  private readonly imageInput: HTMLInputElement;
  /** Blank page is up while the engines for this file type download. */
  private loading = false;

  constructor(
    private readonly root: HTMLElement,
    private readonly options: ViewerOptions,
  ) {
    const host = globalThis as typeof globalThis & {
      __domdoc?: { rasterGlyph?: (face: Uint8Array, ch: string, sizePx: number) => Uint8Array | undefined };
    };
    if (!host.__domdoc) host.__domdoc = { rasterGlyph: () => undefined };
    injectStyles(root.ownerDocument);
    this.h = elementFactory(root.ownerDocument);
    this.files = options.files ?? new FileStore();
    this.components = options.components ?? new ComponentRegistry();
    if (!this.components.get(CONTENT_COMPONENT)) {
      this.components.register<Record<string, unknown>>(CONTENT_COMPONENT, ({ props, container }) => mountContentElement(container, props));
    }
    this.loader = new BundleLoader(options.bundles ?? {});
    this.zoomValue = clampZoom(options.zoom ?? 1);
    this.author = options.author ?? "domdoc";
    this.highlightColor = options.highlightColor ?? "#ffeb3b";
    this.viewModeValue = options.readOnly ? "view" : (options.viewMode ?? "live");
    this.modePinned = Boolean(options.readOnly || options.viewMode);

    this.capture = this.h("div", "dd-capture");
    this.el = this.h("div", "dd-viewer");
    this.el.dataset.dd = this.themeKey;
    this.el.dataset.mode = this.viewModeValue;
    this.themeStyle = this.h("style");
    this.el.append(this.themeStyle);
    this.trialEl = this.h("div", "dd-trial");
    this.trialEl.hidden = true;
    this.trialEl.setAttribute("role", "status");
    this.el.append(this.trialEl);
    this.applyTheme(options.theme);
    this.el.dir = options.dir ?? "ltr";
    this.el.tabIndex = -1;
    this.bindMotion();
    this.fileInput = this.h("input");
    this.fileInput.type = "file";
    this.fileInput.accept = ACCEPT;
    this.fileInput.hidden = true;
    this.fileInput.addEventListener("change", () => {
      const file = this.fileInput.files?.[0];
      this.fileInput.value = "";
      if (file) void this.open(file);
    });
    this.imageInput = this.h("input");
    this.imageInput.type = "file";
    this.imageInput.accept = "image/*";
    this.imageInput.hidden = true;
    this.imageInput.addEventListener("change", () => {
      const file = this.imageInput.files?.[0];
      this.imageInput.value = "";
      if (file) this.applyImageReplace(file);
    });

    this.menu = new SelectionMenu(this.h, {
      highlight: () => {
        this.highlight();
        this.focusCaret();
      },
      addComment: (text) => {
        this.annotate(text);
        this.focusCaret();
      },
    });
    this.noteCard = new AnnotationCard(this.h);
    this.el.append(this.menu.el, this.noteCard.el);
    this.toolbar = new Toolbar(this.h, this.actions(), this.highlightColor);
    this.syncThemeButton();
    if (options.toolbar !== false) this.el.append(this.toolbar.el);
    const body = this.h("div", "dd-body");
    const pagesEl = this.h("div", "dd-pages");
    pagesEl.setAttribute("role", "document");
    this.empty = this.h("div", "dd-empty");
    this.empty.dataset.empty = "";
    this.empty.tabIndex = 0;
    this.empty.setAttribute("role", "button");
    this.empty.setAttribute("aria-label", "Open a file");
    const lead = this.h("p");
    lead.textContent = "Drop a PDF or Office file here";
    const hint = this.h("p");
    hint.textContent = "or click to choose a file";
    this.empty.append(lead, hint);
    this.empty.addEventListener("click", () => this.pick());
    this.empty.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      this.pick();
    });
    this.loadingEl = this.h("div", "dd-loading");
    this.loadingEl.hidden = true;
    this.loadingEl.setAttribute("role", "status");
    this.loadingEl.setAttribute("aria-live", "polite");
    const sheet = this.h("div", "dd-sheet");
    const spinner = this.h("div", "dd-spinner");
    spinner.setAttribute("aria-hidden", "true");
    this.loadingText = this.h("p", "dd-loading-label");
    sheet.append(spinner);
    this.loadingEl.append(sheet, this.loadingText);
    this.editor = new Editor(this.editorHost(), this.h);
    pagesEl.append(this.empty, this.loadingEl, this.editor.input);
    this.pages = new PageStack(pagesEl, this.h, (slot, mode) => this.paintSlot(slot, mode), this.editor.input);
    this.panel = new HistoryPanel(this.h, {
      restoreHistory: (id) => {
        if (this.viewModeValue === "track") this.apply({ type: "restoreHistory", id });
        this.focusCaret();
      },
      revertHistory: (id) => {
        if (this.viewModeValue === "track") this.apply({ type: "reject", id });
        this.focusCaret();
      },
      hideTray: () => this.setTrayVisible("history", false),
    });
    this.layersPanel = new LayersPanel(this.h, {
      setLayer: (id, patch) => this.apply({ type: "setLayer", id, ...patch }),
      selectElement: (id, page) => {
        const element = this.elementOn(page, id);
        const object = this.doc?.page(page)?.objects?.find((item) => item.id === id);
        const kind = element?.kind ?? object?.kind;
        if (!kind) return;
        this.picked = { id, page, kind };
        this.textEditing = false;
        this.showCaret(undefined);
        this.editor.blur();
        if (kind !== "text") this.marks = [];
        this.centerOnPicked();
        const slot = this.pages.slots[page];
        if (slot && !slot.painted) this.pages.paintIndices([page], "full");
        this.paintNow("overlay");
        this.syncChrome(false);
      },
      hideTray: () => this.setTrayVisible("layers", false),
    });
    this.panel.el.hidden = !this.showHistory();
    this.layersPanel.el.hidden = true;
    body.append(pagesEl, this.panel.el, this.layersPanel.el);
    this.el.append(body, this.fileInput, this.imageInput);
    this.capture.append(this.el);
    root.append(this.capture);

    this.layer = new ComponentLayer(
      {
        document: () => this.doc,
        slot: (page) => this.slot(page),
        h: this.h,
        files: this.files,
        registry: this.components,
        zoom: () => this.zoomValue,
      },
      () => this.requestRefresh(),
    );
    this.applyScale();
    this.bindPointer();
    this.bindDrop();
    this.bindKeys();
    this.bindFocusReturn();
    this.syncChrome();
  }

  setTheme(theme: ThemePreference | ThemeConfig): void {
    this.applyTheme(theme);
  }

  /**
   * Host CSS on the mount element wins. Config tokens fill the slots underneath,
   * and `system` tracks `prefers-color-scheme` for the life of the viewer.
   */
  private applyTheme(theme: ThemePreference | ThemeConfig | undefined): void {
    const config = themeConfigOf(theme);
    this.themeConfig = config;
    this.preference = config.preference ?? "light";
    this.bindScheme();
    this.el.dataset.theme = this.preference === "system" ? this.systemMode() : this.preference;
    if (this.preference === "system") this.el.dataset.scheme = "system";
    else delete this.el.dataset.scheme;
    const css = themeTokenCss(config, `.dd-viewer[data-dd="${this.themeKey}"]`);
    if (this.themeStyle.textContent !== css) this.themeStyle.textContent = css;
    this.syncThemeButton();
  }

  /** The toolbar control flips light and dark and keeps any token overrides. */
  private toggleColorScheme(): void {
    const preference = this.shownDark() ? "light" : "dark";
    this.applyTheme({ ...this.themeConfig, preference });
  }

  private shownDark(): boolean {
    const theme = this.el.dataset.theme;
    return theme === "dark" || theme === "high-contrast-dark";
  }

  private syncThemeButton(): void {
    this.toolbar?.setColorScheme(this.shownDark());
    const theme = this.el.dataset.theme as ThemeName | undefined;
    if (!theme || theme === this.publishedTheme) return;
    this.publishedTheme = theme;
    this.emit("theme", { theme });
  }

  private systemMode(): "light" | "dark" {
    const query = this.root.ownerDocument.defaultView?.matchMedia?.("(prefers-color-scheme: dark)");
    return query?.matches ? "dark" : "light";
  }

  private bindScheme(): void {
    this.schemeOff?.();
    this.schemeOff = undefined;
    if (this.preference !== "system") return;
    const query = this.root.ownerDocument.defaultView?.matchMedia?.("(prefers-color-scheme: dark)");
    if (!query) return;
    const apply = () => {
      this.el.dataset.theme = query.matches ? "dark" : "light";
      this.syncThemeButton();
    };
    query.addEventListener("change", apply);
    this.schemeOff = () => query.removeEventListener("change", apply);
  }

  setDir(dir: ChromeDir): void {
    this.el.dir = dir;
  }

  get document(): DomdocDocument | undefined {
    return this.doc;
  }

  get selection(): Selection | null {
    return this.sel ? { anchor: { ...this.sel.anchor }, focus: { ...this.sel.focus } } : null;
  }

  /** Live records edits without the history list. Track changes shows that list. View only blocks edits. */
  get viewMode(): ViewMode {
    return this.viewModeValue;
  }

  /** The palette on screen, as last reported by the `theme` event. */
  get theme(): ThemeName {
    return this.el.dataset.theme as ThemeName;
  }

  /** Zoom factor. `1` is 96 DPI, the same page width Word uses at 100%. */
  get zoom(): number {
    return this.zoomValue;
  }

  getZoom(): number {
    return this.zoomValue;
  }

  /** CSS pixels per point at the current zoom. */
  get scale(): number {
    return this.zoomValue * PX_PER_PT;
  }

  on<K extends keyof ViewerEvents>(type: K, handler: Handler<K>): () => void {
    let set = this.handlers.get(type);
    if (!set) this.handlers.set(type, (set = new Set()));
    set.add(handler);
    return () => set.delete(handler);
  }

  registerComponent<P>(type: string, factory: ComponentFactory<P>): this {
    this.components.register(type, factory);
    return this;
  }

  /** Opens a picked/dropped file, bytes, URL, FileStore id or StoredFile. */
  async open(source: OpenSource, options: { name?: string } = {}): Promise<DomdocDocument> {
    this.toolbar?.clearError();
    this.recentEdits.length = 0;
    const previous = this.inflight;
    this.inflight = { type: "open", name: options.name };
    this.hideOpenDocument = true;
    this.emit("loading", { name: options.name });
    this.showLoading(await this.loadingCopy(source, options.name));
    try {
      const doc = await openDocument(this.loader, source, {
        files: this.files,
        name: options.name,
        core: this.options.core,
        getPassword: (hint) => promptForPassword(this.h, this.el, hint),
      });
      this.close();
      this.doc = doc;
      this.hideOpenDocument = false;
      doc.handle({ type: "zoom", op: "set", zoom: this.zoomValue });
      this.cleanup.push(doc.onChange((change) => this.onDocumentChange(change)));
      if (!this.modePinned) this.viewModeValue = doc.info().trackChanges ? "track" : "live";
      await this.ensureFonts(doc);
      if (this.options.core || this.options.lazyEdit === false) {
        doc.attach("edit");
      }
      this.applyViewMode();
      await this.notifyOpen(openedName(source, options.name));
      this.syncTrialBanner();
      void this.drive({ type: "scan" });
      this.requestRefresh();
      this.pages.container.scrollTop = 0;
      this.emit("open", { document: doc });
      this.editor.focus();
      return doc;
    } catch (error) {
      throw this.fail(error);
    } finally {
      this.hideLoading();
      this.inflight = previous;
      this.hideOpenDocument = false;
    }
  }

  /** Asks the API whether this page is licensed. A failed call shows the banner and still opens the file. */
  private async notifyOpen(name: string): Promise<void> {
    const extension = fileExtension(name);
    const base = (this.options.apiBase ?? "/api").replace(/\/$/, "");
    try {
      const headers = new Headers({ "content-type": "application/json" });
      const key = this.options.licenseKey?.trim();
      if (key) headers.set("x-domdoc-license-key", key);
      const response = await fetch(`${base}/open`, {
        method: "POST",
        headers,
        body: JSON.stringify({ extension }),
        credentials: "omit",
      });
      if (!response.ok) {
        this.trial = true;
        return;
      }
      const body = (await response.json()) as { trial?: unknown };
      this.trial = body.trial === true;
    } catch {
      this.trial = true;
    }
  }

  /** Paints the trial banner from the last open ping. Nothing is stored. */
  private syncTrialBanner(): void {
    this.trialEl.hidden = !this.trial;
    this.trialEl.textContent = this.trial ? "Trial: unlicensed domdoc" : "";
  }

  /** Blank page and spinner. Stays up until the engines for this file finish. */
  private showLoading(label: string): void {
    this.loading = true;
    this.empty.hidden = true;
    this.loadingEl.hidden = false;
    this.loadingText.textContent = label;
    this.el.dataset.loading = "";
    this.setStatus(label);
  }

  private hideLoading(): void {
    this.loading = false;
    this.loadingEl.hidden = true;
    delete this.el.dataset.loading;
    if (!this.doc) this.empty.hidden = false;
  }

  /** First bytes or the file name. Unknown sources stay on a generic label. */
  private async loadingCopy(source: OpenSource, name?: string): Promise<string> {
    try {
      const named = name ?? (typeof File !== "undefined" && source instanceof File ? source.name : "");
      const bytes =
        source instanceof Uint8Array
          ? source
          : typeof File !== "undefined" && source instanceof File
            ? new Uint8Array(await source.slice(0, 8).arrayBuffer())
            : undefined;
      if (!bytes) return "Loading";
      const format = detectFormat(bytes, named);
      if (
        format === "pdf" ||
        format === "doc" ||
        format === "docx" ||
        format === "xls" ||
        format === "xlsx" ||
        format === "ppt" ||
        format === "pptx"
      ) {
        return loadingLabel(format);
      }
    } catch {
      return "Loading";
    }
    return "Loading";
  }

  /** Loads `fonts.wasm` and wires `globalThis.__domdoc.rasterGlyph` for cold DOCX/DOC bundles. */
  private async ensureFontsModule(): Promise<void> {
    if (this.fontsModule) return this.fontsModule;
    const base = this.options.fontsWasmBase;
    if (!base) return;
    const root = base.endsWith("/") ? base : `${base}/`;
    this.fontsModule = (async () => {
      try {
        const mod = (await import(/* @vite-ignore */ `${root}domdoc_fonts.js`)) as {
          default: () => Promise<void>;
          rasterGlyph: (face: Uint8Array, ch: string, sizePx: number) => Uint8Array | undefined;
        };
        await mod.default();
        const raster = mod.rasterGlyph.bind(mod);
        const host = globalThis as typeof globalThis & {
          __domdoc: { rasterGlyph: (face: Uint8Array, ch: string, sizePx: number) => Uint8Array | undefined };
        };
        host.__domdoc = {
          rasterGlyph(face: Uint8Array, ch: string, sizePx: number) {
            return raster(face, ch, sizePx);
          },
        };
      } catch {
        // Outline raster stays on the 8×8 fallback until `fonts.wasm` is reachable.
      }
    })();
    return this.fontsModule;
  }

  /**
   * Reflowable pages rasterize in wasm, so the outline bytes have to be in the session
   * before the first paint. A fixed-layout page already carries its own fonts.
   * Serif metrics stay off the cold path until a run actually asks for them.
   */
  private async ensureFonts(doc: DomdocDocument): Promise<void> {
    const base = this.options.fontsBase;
    if (!base || !doc.info().capabilities.flowEmbeds) return;
    await this.ensureFontsModule();
    const serif = (font: string | undefined) => {
      const name = font?.toLowerCase() ?? "";
      return (
        name.includes("times") ||
        name.includes("libertine") ||
        name.includes("frank") ||
        name.includes("liberation serif") ||
        name.includes("nimbus") ||
        name.includes("georgia") ||
        name.includes("garamond") ||
        name.includes("cambria") ||
        name.includes("palatino") ||
        name.includes("omnes")
      );
    };
    const count = doc.info().pageCount;
    let needsSerif = false;
    for (let i = 0; i < count && !needsSerif; i += 1) needsSerif = doc.page(i).runs.some((run) => serif(run.font));
    const root = base.endsWith("/") ? base : `${base}/`;
    const bytes = async (file: string) => {
      const response = await fetch(`${root}${file}`);
      if (!response.ok) throw new DomdocError("bad-command", file);
      return new Uint8Array(await response.arrayBuffer());
    };
    const outline = async (slot: string, file: string) => {
      try {
        doc.loadFontFace(slot, await bytes(file));
      } catch {
        // The built-in face draws this slot until an outline file is available.
      }
    };
    const pending: Promise<unknown>[] = [
      outline("sans", "LiberationSans-Regular.ttf"),
      outline("sans-italic", "LiberationSans-Italic.ttf"),
      outline("sans-bold", "LiberationSans-Bold.ttf"),
      bytes("metrics.bin")
        .then((metrics) => {
          doc.loadFontMetrics(metrics);
        })
        .catch(() => undefined),
    ];
    if (needsSerif) {
      await this.loadInk(root, bytes);
      doc.attach("fonts");
      pending.push(
        outline("serif", "LinLibertine_R_G.ttf"),
        outline("serif-italic", "LinLibertine_RI_G.ttf"),
        outline("serif-bold", "FrankRuhlHofshi-Bold.otf"),
      );
    }
    await Promise.all(pending);
    if (doc.info().capabilities.flowEmbeds) this.requestRefresh();
  }

  /** FreeType for serif ink. A failure leaves canvas text in place. */
  private async loadInk(root: string, bytes: (file: string) => Promise<Uint8Array>): Promise<void> {
    try {
      const base = new URL(root, globalThis.location?.href ?? "http://127.0.0.1/");
      const href = new URL("index.mjs", base).href;
      const imported = (await import(/* @vite-ignore */ href)) as {
        default: (opts: { wasmBinary: Uint8Array }) => Promise<InkLibrary>;
      };
      const [wasm, regular, italic, bold] = await Promise.all([
        bytes("freetype.wasm"),
        bytes("LinLibertine_R_G.ttf"),
        bytes("LinLibertine_RI_G.ttf"),
        bytes("FrankRuhlHofshi-Bold.otf"),
      ]);
      const ft = await imported.default({ wasmBinary: wasm });
      bindInk(ft, { regular: ft.newFace(regular), italic: ft.newFace(italic), bold: ft.newFace(bold) });
    } catch {
      // Canvas text remains until the rasterizer is available.
    }
  }

  /** Shows the system file picker. */
  pick(): void {
    this.fileInput.click();
  }

  close(): void {
    this.releaseMedia();
    const doc = this.doc;
    this.doc = undefined;
    while (this.cleanup.length) this.cleanup.pop()!();
    this.layer.clear();
    this.pages.clear();
    this.sel = null;
    this.marks = [];
    this.picked = undefined;
    this.textEditing = false;
    this.drag = undefined;
    this.gesturePreview = undefined;
    delete this.el.dataset.layout;
    this.notes = [];
    this.noteSeq = 1;
    this.openNote = undefined;
    this.menu.setOpen(false);
    this.noteCard.show(undefined);
    this.el.append(this.menu.el, this.noteCard.el);
    this.goalX = undefined;
    this.pending = undefined;
    this.hits = [];
    this.hitIndex = -1;
    this.searchQuery = "";
    this.caretEl?.remove();
    this.caretEl = undefined;
    this.caretLoc = undefined;
    this.caretFromEngine = false;
    if (this.chromeTimer !== undefined) {
      this.root.ownerDocument.defaultView?.clearTimeout(this.chromeTimer);
      this.chromeTimer = undefined;
    }
    if (this.layerThumbTimer !== undefined) {
      this.root.ownerDocument.defaultView?.clearTimeout(this.layerThumbTimer);
      this.layerThumbTimer = undefined;
    }
    this.layerThumbPages.clear();
    this.cancelLayersRender();
    this.layerElementsCache.clear();
    this.layersPanel.clear();
    this.empty.hidden = this.loading;
    this.recentEdits.length = 0;
    this.lastReport = undefined;
    this.reportedError = undefined;
    this.toolbar?.clearError();
    this.syncChrome();
    if (doc) {
      doc.dispose();
      this.emit("close", {});
    }
  }

  destroy(): void {
    this.schemeOff?.();
    this.schemeOff = undefined;
    this.motionOff?.();
    this.motionOff = undefined;
    this.close();
    this.pages.destroy();
    this.layer.destroy();
    this.handlers.clear();
    this.capture.remove();
  }

  async apply(command: Command): Promise<CommandResult | undefined> {
    if (!this.doc) return undefined;
    const action = commandAction(command);
    this.noteEdit(action);
    const previous = this.inflight;
    this.inflight = action;
    try {
      try {
        return this.doc.apply(command);
      } catch (error) {
        const failure = DomdocError.from(error);
        if (failure.code !== "need" || failure.detail !== "edit") throw failure;
        await upgradeLazyEdit(this.doc);
        await this.ensureFonts(this.doc);
        this.applyViewMode();
        return this.doc.apply(command);
      }
    } catch (error) {
      this.fail(error);
      return undefined;
    } finally {
      this.inflight = previous;
    }
  }

  /** Places the caret, or a range when `focus` differs from `anchor`. */
  select(anchor: Pos, focus: Pos = anchor): void {
    void this.selectAsync(anchor, focus);
  }

  async selectAsync(anchor: Pos, focus: Pos = anchor): Promise<void> {
    await this.drive({ type: "select", anchor, focus });
    if (this.sel) this.scrollTo(this.sel.focus);
  }

  selectAll(): void {
    void this.drive({ type: "selectAll" });
    if (this.sel) this.scrollTo(this.sel.focus);
  }

  selectedText(): string {
    if (!this.doc || !this.sel || isCollapsed(this.sel)) return "";
    const doc = this.doc;
    return doc
      .span(this.sel.anchor, this.sel.focus)
      .ranges.map((range) => Array.from(doc.unitText(range.unit)).slice(range.start, range.end).join(""))
      .join("\n");
  }

  /** Replaces the selection. A collapsed caret inserts. Applies a pending character style. */
  async insertText(text: string): Promise<CommandResult | undefined> {
    if (!this.doc || !this.sel || !this.editable()) return undefined;
    const pending = this.pending;
    const span = this.doc.span(this.sel.anchor, this.sel.focus);
    const events = await this.drive({ type: "text", text });
    const applied = events.find((event) => event.type === "applied");
    if (!applied || applied.type !== "applied") return undefined;
    this.pending = undefined;
    const result = applied.result;
    this.doc.emitCommand({ type: "replace", from: span.start, to: span.end, text }, result);
    if (
      pending &&
      result.caret &&
      result.caret.unit === span.start.unit &&
      result.caret.offset > span.start.offset &&
      !text.includes("\n") &&
      !text.includes(LINE_BREAK)
    ) {
      void this.apply({
        type: "format",
        ranges: [{ unit: result.caret.unit, start: span.start.offset, end: result.caret.offset }],
        style: pending,
      });
    }
    return result;
  }

  /** Deletes the selection. A collapsed caret is left as it is. */
  deleteSelection(): Promise<CommandResult | undefined> {
    if (!this.sel || isCollapsed(this.sel)) return Promise.resolve(undefined);
    return this.insertText("");
  }

  format(style: TextStyle): Promise<CommandResult | undefined> | undefined {
    if (!this.doc || this.viewModeValue === "view") return undefined;
    const highlighted = this.sel && !isCollapsed(this.sel) ? this.activeRanges() : [];
    // A highlight formats that range. With no highlight, PDF text formats the whole element.
    const ranges = highlighted.length
      ? highlighted
      : this.doc.format === "pdf"
        ? this.pickedTextRanges()
        : [];
    if (!this.doc.info().capabilities.formatText) {
      const action = { type: "format" as const, ranges: ranges.length ? ranges : this.activeRanges(), style };
      this.noteEdit(action);
      this.fail(new DomdocError("unsupported", "text formatting"), action);
      return undefined;
    }
    if (!ranges.length) {
      if (this.sel && isCollapsed(this.sel)) {
        this.pending = { ...this.pending, ...style };
        this.syncChrome(false);
      }
      return undefined;
    }
    this.pending = undefined;
    return this.apply({ type: "format", ranges, style });
  }

  toggle(style: "bold" | "italic" | "underline" | "strike"): Promise<CommandResult | undefined> | undefined {
    return this.format({ [style]: !this.styleOn(style) });
  }

  setParagraph(style: ParagraphPatch): Promise<CommandResult | undefined> | undefined {
    const units = this.paragraphUnits();
    if (!units.length || !this.doc || this.viewModeValue === "view") return undefined;
    if (!this.doc.info().capabilities.formatParagraph) {
      const action = { type: "setParagraph" as const, units, style };
      this.noteEdit(action);
      this.fail(new DomdocError("unsupported", "paragraph formatting"), action);
      return undefined;
    }
    return this.apply({ type: "setParagraph", units, style });
  }

  /** Highlights the selection. `null` clears highlighting. Emits `highlight` when it applies. */
  highlight(color: string | null = this.highlightColor): Promise<CommandResult | undefined> | undefined {
    if (this.viewModeValue === "view") return undefined;
    const ranges = this.activeRanges().length ? this.activeRanges() : this.pickedTextRanges();
    if (!ranges.length) return undefined;
    return this.apply({ type: "highlight", ranges, color });
  }

  /**
   * Attaches a comment to the current selection and emits `annotation`.
   * The same call works for a PDF and for an Office file.
   */
  annotate(text: string): Annotation | undefined {
    const body = text.trim();
    if (!body || !this.doc || this.viewModeValue === "view") return undefined;
    const ranges = this.activeRanges().length ? this.activeRanges() : this.pickedTextRanges();
    if (!ranges.length || (!this.sel && this.picked?.kind !== "text")) return undefined;
    const anchor = this.sel?.anchor ?? { unit: ranges[0]!.unit, offset: ranges[0]!.start };
    const focus = this.sel?.focus ?? { unit: ranges[ranges.length - 1]!.unit, offset: ranges[ranges.length - 1]!.end };
    const quote =
      this.selectedText() ||
      ranges.map((range) => Array.from(this.doc!.unitText(range.unit)).slice(range.start, range.end).join("")).join("\n");
    const note: Annotation = {
      id: `n${this.noteSeq++}`,
      text: body,
      quote,
      ranges: ranges.map((range) => ({ ...range })),
      anchor: { ...anchor },
      focus: { ...focus },
    };
    this.notes.push(note);
    this.emit("annotation", {
      ...note,
      ranges: note.ranges.map((range) => ({ ...range })),
      anchor: { ...note.anchor },
      focus: { ...note.focus },
    });
    this.openNote = note;
    this.paintNow("overlay");
    return note;
  }

  /** Comments added since the file was opened. */
  annotations(): Annotation[] {
    return this.notes.map((note) => ({
      ...note,
      ranges: note.ranges.map((range) => ({ ...range })),
      anchor: { ...note.anchor },
      focus: { ...note.focus },
    }));
  }

  undo(): Promise<CommandResult | undefined> | undefined {
    if (this.viewModeValue === "view") return undefined;
    return this.apply({ type: "undo" });
  }

  redo(): Promise<CommandResult | undefined> | undefined {
    if (this.viewModeValue === "view") return undefined;
    return this.apply({ type: "redo" });
  }

  setTrackChanges(enabled: boolean): Promise<CommandResult | undefined> | undefined {
    return this.apply({ type: "setTrackChanges", enabled, author: this.author });
  }

  /** Live records edits and shows the latest version. Track changes shows removed and added text together. View only blocks edits. */
  setViewMode(mode: ViewMode): void {
    if (this.options.readOnly || mode === this.viewModeValue) return;
    this.modePinned = true;
    this.viewModeValue = mode;
    if (mode === "view") {
      this.picked = undefined;
      this.textEditing = false;
      this.drag = undefined;
      this.gesturePreview = undefined;
    }
    this.applyViewMode();
    this.paintNow("full");
    this.syncChrome();
    this.emit("viewMode", { mode });
  }

  private showHistory(): boolean {
    return (
      this.options.revisionsPanel !== false &&
      this.viewModeValue === "track" &&
      !this.hiddenTrays.includes("history")
    );
  }

  private showLayersTray(hasContent: boolean): boolean {
    if (!this.doc || this.viewModeValue === "view" || this.hiddenTrays.includes("layers")) return false;
    return hasContent || this.layersPinned;
  }

  /** True when the layers tray can appear in this mode (ignores content). */
  private layersTrayAllowed(): boolean {
    return Boolean(this.doc) && this.viewModeValue !== "view" && !this.hiddenTrays.includes("layers");
  }

  /**
   * Cheap signal that the tray has something to show — avoids walking every page
   * just to decide visibility.
   */
  private layersContentHint(info: DocInfo): boolean {
    if ((info.layers?.length ?? 0) > 0) return true;
    const caps = info.capabilities;
    if (caps.layers || caps.transform || caps.insert) return true;
    if (!this.doc || info.pageCount < 1) return false;
    const first = this.doc.page(0);
    return (first.objects?.length ?? 0) > 0 || first.runs.length > 0;
  }

  /** Trays the open document can show in the current mode. */
  private availableTrays(): string[] {
    const trays: string[] = [];
    if (this.options.revisionsPanel !== false && this.viewModeValue === "track") trays.push("history");
    if (this.viewModeValue !== "view" && this.doc) trays.push("layers");
    return trays;
  }

  private shownTrays(): string[] {
    const trays: string[] = [];
    if (this.showHistory()) trays.push("history");
    if (!this.layersPanel.el.hidden) trays.push("layers");
    return trays;
  }

  private setTrayVisible(trayId: string, visible: boolean): void {
    this.hiddenTrays = visible
      ? this.hiddenTrays.filter((id) => id !== trayId)
      : [...new Set([...this.hiddenTrays, trayId])];
    if (trayId === "layers") this.layersPinned = visible;
    this.syncChrome();
  }

  /** Insertions and deletions are drawn on the page only in the track-changes view. */
  private showDiff(): boolean {
    return this.viewModeValue === "track";
  }

  private markup(): Markup {
    return this.showDiff() ? "track" : "plain";
  }

  private applyViewMode(): void {
    this.el.dataset.mode = this.viewModeValue;
    this.panel.el.hidden = !this.showHistory();
    if (this.viewModeValue === "view") this.layersPanel.el.hidden = true;
    const doc = this.doc;
    if (!doc) return;
    doc.setReadOnly(this.viewModeValue === "view");
    // Live and track changes both record edits. Only the track-changes view lists them.
    if (this.viewModeValue !== "view") {
      this.apply({ type: "setTrackChanges", enabled: true, author: this.author });
    }
  }

  setAuthor(author: string): void {
    this.author = author;
    const info = this.doc?.info();
    if (info) this.setTrackChanges(info.trackChanges);
  }

  search(query: string): SearchHit[] {
    const hits = this.refreshHits(query);
    this.setStatus(query.trim() ? `${hits.length} match${hits.length === 1 ? "" : "es"}` : "");
    return hits;
  }

  /** Replaces the current search match. */
  async replaceMatch(text: string): Promise<boolean> {
    const hit = this.hits[this.hitIndex];
    if (!hit || !this.canReplaceText()) return false;
    const replaced = await this.applyReplacement(hit, text);
    this.refreshHits(this.searchQuery);
    if (replaced) this.setStatus("Replaced 1");
    return replaced;
  }

  /** Replaces every match of the current search, in every text unit of the open file. */
  async replaceAll(text: string): Promise<number> {
    if (!this.canReplaceText() || !this.doc || !this.searchQuery.trim()) return 0;
    const query = this.searchQuery;
    const hits = replacementOrder(this.doc.search(query));
    let count = 0;
    let failed = false;
    for (const hit of hits) {
      if (!(await this.applyReplacement(hit, text))) {
        failed = true;
        break;
      }
      count += 1;
    }
    this.refreshHits(query);
    if (!failed) this.setStatus(count ? `Replaced ${count}` : "0 matches");
    return count;
  }

  private canReplaceText(): boolean {
    if (!this.doc || this.options.readOnly || this.viewModeValue === "view") return false;
    return this.doc.info().capabilities.editText;
  }

  private async applyReplacement(hit: SearchHit, text: string): Promise<boolean> {
    const result = await this.apply({
      type: "replace",
      from: { unit: hit.unit, offset: hit.start },
      to: { unit: hit.unit, offset: hit.end },
      text,
    });
    return result !== undefined;
  }

  private refreshHits(query: string): SearchHit[] {
    this.hits = query.trim() && this.doc ? this.doc.search(query) : [];
    this.hitIndex = this.hits.length ? 0 : -1;
    this.paintNow("overlay");
    const hit = this.hits[this.hitIndex];
    if (hit) this.revealPos({ unit: hit.unit, offset: hit.start });
    this.searchQuery = query;
    this.emitSearch();
    return this.hits;
  }

  nextHit(step = 1): void {
    if (!this.hits.length) return;
    this.hitIndex = (this.hitIndex + step + this.hits.length) % this.hits.length;
    this.paintNow("overlay");
    const hit = this.hits[this.hitIndex]!;
    this.revealPos({ unit: hit.unit, offset: hit.start });
    this.setStatus(`${this.hitIndex + 1} / ${this.hits.length}`);
    this.emitSearch();
  }

  private emitSearch(): void {
    this.emit("search", { query: this.searchQuery, hitCount: this.hits.length, hitIndex: this.hitIndex });
  }

  setZoom(zoom: number, anchor?: { clientX: number; clientY: number }): void {
    const next = this.doc ? (this.engineZoom(this.doc.handle({ type: "zoom", op: "set", zoom })) ?? clampZoom(zoom)) : clampZoom(zoom);
    this.applyZoom(next, anchor);
  }

  /** Repaints visible pages immediately (e.g. visual tests after `setZoom`). */
  flushPaint(): void {
    this.pages.flush();
  }

  private applyZoom(next: number, anchor?: { clientX: number; clientY: number }): void {
    const old = this.zoomValue;
    if (Math.abs(next - old) < 1e-6) return;
    const pages = this.pages.container;
    let hold: { index: number; ox: number; oy: number; cx: number; cy: number } | undefined;
    if (anchor) {
      const point = this.pagePoint(anchor.clientX, anchor.clientY);
      const slot = point && this.pages.slots[point.index];
      if (point && slot) {
        const rect = slot.el.getBoundingClientRect();
        hold = { index: point.index, ox: anchor.clientX - rect.left, oy: anchor.clientY - rect.top, cx: anchor.clientX, cy: anchor.clientY };
      }
    }
    this.zoomValue = next;
    this.applyScale();
    for (const slot of this.pages.slots) slot.painted = undefined;
    if (hold) {
      const rect = this.pages.slots[hold.index]!.el.getBoundingClientRect();
      const ratio = next / old;
      pages.scrollLeft += rect.left + hold.ox * ratio - hold.cx;
      pages.scrollTop += rect.top + hold.oy * ratio - hold.cy;
    }
    this.pages.rescaleLater();
    this.placeInput();
    this.syncChrome(false);
    this.emit("zoom", { zoom: next });
  }

  zoomIn(): void {
    this.stepZoom(1);
  }

  zoomOut(): void {
    this.stepZoom(-1);
  }

  private stepZoom(direction: 1 | -1): void {
    if (!this.doc) {
      this.setZoom(stepZoom(this.zoomValue, direction));
      return;
    }
    const zoom = this.engineZoom(this.doc.handle({ type: "zoom", op: "step", direction }));
    if (zoom !== undefined) this.applyZoom(zoom);
  }

  /** Fits the first page to the viewport width, or to the whole viewport. */
  fit(mode: FitMode): void {
    const page = this.doc?.page(0);
    if (!page || !this.doc) return;
    const el = this.pages.container;
    const zoom = this.engineZoom(
      this.doc.handle({
        type: "zoom",
        op: "fit",
        mode,
        viewportWidth: el.clientWidth,
        viewportHeight: el.clientHeight,
        pageWidthPt: page.widthPt,
        pageHeightPt: page.heightPt,
      }),
    );
    if (zoom !== undefined) this.applyZoom(zoom);
  }

  /** Triggers a browser download of the edited file. */
  async download(): Promise<{ name: string; blob: Blob } | undefined> {
    const exported = await this.exportFile();
    if (!exported) return undefined;
    const url = URL.createObjectURL(exported.blob);
    const anchor = this.h("a");
    anchor.href = url;
    anchor.download = exported.name;
    this.el.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    return exported;
  }

  /** Attaches editing when a session has not enabled it yet. */
  private async ensureEditReady(): Promise<void> {
    const doc = this.doc;
    if (!doc || (doc.format !== "docx" && doc.format !== "doc")) return;
    try {
      doc.exportBytes();
    } catch (error) {
      const failure = DomdocError.from(error);
      if (failure.code !== "need" || failure.detail !== "edit") throw failure;
      await upgradeLazyEdit(doc);
      await this.ensureFonts(doc);
      this.applyViewMode();
    }
  }

  /** Exports the edited file without downloading it. */
  async exportFile(): Promise<{ name: string; blob: Blob; bytes: Uint8Array } | undefined> {
    if (!this.doc) return undefined;
    try {
      await this.ensureEditReady();
      const exported = this.doc.export();
      this.emit("export", { name: exported.name, blob: exported.blob });
      return exported;
    } catch (error) {
      this.fail(error, { type: "export" });
      return undefined;
    }
  }

  /** Writes the edited file back into the FileStore (same id) so components see it. */
  async saveToStore(): Promise<StoredFile | undefined> {
    const exported = await this.exportFile();
    if (!exported) return undefined;
    return this.files.add(exported.bytes, {
      id: this.doc?.fileId,
      name: exported.name,
      type: exported.blob.type,
      source: "export",
    });
  }

  placeComponent<P extends Record<string, unknown>>(placement: Placement<P>): string {
    const id = this.layer.mount(placement);
    this.requestRefresh();
    return id;
  }

  updateComponent(id: string, patch: Partial<Placement>): void {
    this.layer.update(id, patch);
    this.requestRefresh();
  }

  removeComponent(id: string): void {
    this.layer.remove(id);
    this.requestRefresh();
  }

  componentIds(): string[] {
    return this.layer.ids();
  }

  /** Scrolls a position into view and moves the caret there. */
  revealPos(pos: Pos): void {
    this.setSelection({ anchor: pos, focus: pos }, { reveal: true });
  }

  // ---- chrome ----------------------------------------------------------------------

  private actions(): ToolbarActions {
    return {
      pick: () => this.pick(),
      newFile: () => this.openNewFile(),
      download: () => this.download(),
      storeDomdoc: () => this.apply({ type: "storeDomdoc" }),
      exportFile: () => this.download(),
      undo: () => this.undo(),
      redo: () => this.redo(),
      toggle: (style) => this.toggle(style),
      setColor: (color) => this.format({ color }),
      setFont: (font) => this.format({ font }),
      setSize: (sizePt) => this.format({ sizePt }),
      highlight: () => {
        this.highlight();
        this.focusCaret();
      },
      clearHighlight: () => {
        this.highlight(null);
        this.focusCaret();
      },
      setHighlightColor: (color) => (this.highlightColor = color),
      comment: () => {
        this.placeSelectionMenu();
        if (this.menu.el.hidden) return;
        this.menu.showComposer();
      },
      align: (align) => this.setParagraph({ align }),
      indent: (byPt) => this.setParagraph({ indentByPt: byPt }),
      setLineSpacing: (lineSpacing) => this.setParagraph({ lineSpacing }),
      setViewMode: (mode) => this.setViewMode(mode),
      search: (query) => this.search(query),
      nextHit: (step) => this.nextHit(step),
      replaceMatch: (text) => void this.replaceMatch(text),
      replaceAll: (text) => void this.replaceAll(text),
      zoomIn: () => this.zoomIn(),
      zoomOut: () => this.zoomOut(),
      setZoom: (zoom) => this.setZoom(zoom),
      fit: (mode) => this.fit(mode),
      insertElement: (kind) => this.insertContentElement(kind),
      toggleTheme: () => this.toggleColorScheme(),
      setHelp: (on) => {
        this.helpOn = on;
        this.syncChrome(false);
      },
      setToolbarVisible: (groupId, visible) => {
        this.hiddenGroups = visible
          ? this.hiddenGroups.filter((id) => id !== groupId)
          : [...new Set([...this.hiddenGroups, groupId])];
        this.syncChrome(false);
      },
      setTrayVisible: (trayId, visible) => this.setTrayVisible(trayId, visible),
      lockToolbars: (locked) => {
        this.toolbarsLocked = locked;
        this.el.toggleAttribute("data-toolbars-locked", locked);
        this.syncChrome(false);
      },
      moveToolbar: () => {},
      replaceImage: () => this.replaceImage(),
      deleteElement: () => this.deletePicked(),
      deselect: () => this.deselect(),
      paintShape: (part, color) => {
        const picked = this.picked;
        const doc = this.doc;
        if (!picked || !doc || !doc.info().capabilities.formatText) return;
        const style = part === "fill" ? { color } : { font: color };
        try {
          doc.apply({ type: "format", ranges: [{ unit: picked.id, start: 0, end: 0 }], style });
        } catch (error) {
          this.fail(error);
        }
      },
      debugReport: () => this.debugReport(),
      playMedia: () => this.playMedia(),
      pauseMedia: () => this.pauseMedia(),
      muteMedia: () => this.muteMedia(),
      copyListing: () => this.copyListing(),
    };
  }

  /** Starts the open audio or video. */
  playMedia(): void {
    void this.mediaElement()?.play();
  }

  /** Pauses the open audio or video. */
  pauseMedia(): void {
    this.mediaElement()?.pause();
  }

  /** Mutes or unmutes the open audio or video. */
  muteMedia(): void {
    const el = this.mediaElement();
    if (!el) return;
    el.muted = !el.muted;
    const group = el.tagName === "VIDEO" ? "video" : "audio";
    this.el.querySelector(`[data-group="${group}"] [data-action="muteMedia"]`)?.setAttribute("aria-pressed", String(el.muted));
  }

  /** Copies the visible listing, message, or sheet. */
  copyListing(): void {
    const doc = this.doc;
    if (!doc) return;
    const lines: string[] = [];
    let row: string[] = [];
    let y = Number.NaN;
    for (const run of doc.page(0).runs) {
      if (row.length && Math.abs(run.yPt - y) > 1) {
        lines.push(row.join("\t"));
        row = [];
      }
      y = run.yPt;
      row.push(run.text);
    }
    if (row.length) lines.push(row.join("\t"));
    const clip = this.root.ownerDocument.defaultView?.navigator.clipboard;
    if (clip) void clip.writeText(lines.join("\n"));
  }

  private mediaElement(): HTMLMediaElement | undefined {
    const el = this.el.querySelector("audio, video");
    return el instanceof HTMLMediaElement ? el : undefined;
  }

  private releaseMedia(): void {
    if (!this.mediaBlob) return;
    URL.revokeObjectURL(this.mediaBlob.url);
    this.mediaBlob = undefined;
  }

  private mediaSource(): string | undefined {
    const doc = this.doc;
    if (!doc) return undefined;
    const kind = fileKind(doc.format);
    if (kind !== "audio" && kind !== "video") {
      this.releaseMedia();
      return undefined;
    }
    const key = `${doc.name}\0${doc.format}\0${doc.revision}`;
    if (this.mediaBlob?.key === key) return this.mediaBlob.url;
    this.releaseMedia();
    try {
      const bytes = doc.exportBytes();
      const mime = doc.info().exportMime;
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], mime ? { type: mime } : undefined));
      this.mediaBlob = { key, url };
      return url;
    } catch {
      return undefined;
    }
  }

  private openNewFile(): void {
    this.newFileDialog?.destroy();
    this.newFileDialog = openNewFileDialog(this.el, {
      create: (request) => {
        this.newFileDialog?.destroy();
        this.newFileDialog = undefined;
        this.apply({ type: "createDocument", kind: request.kind, layout: request.layout });
      },
      cancel: () => {
        this.newFileDialog?.destroy();
        this.newFileDialog = undefined;
      },
    });
  }

  private editorHost() {
    return {
      document: () => this.doc,
      selection: () => this.sel,
      setSelection: (selection: Selection, options?: { goalX?: number; reveal?: boolean }) => this.setSelection(selection, options),
      move: (move: CaretMove, extend: boolean) => {
        void this.drive({ type: "move", move, extend });
        if (this.sel) this.scrollTo(this.sel.focus);
      },
      goalX: () => this.goalX,
      canEdit: () => this.editable(),
      insert: (text: string) => this.insertText(text).then((result) => result !== undefined),
      delete: (direction: 1 | -1, word: boolean) => this.deleteDirected(direction, word),
      selectedText: () => this.selectedText(),
      toggle: (style: "bold" | "italic" | "underline") => this.toggle(style),
      selectAll: () => this.selectAll(),
      undo: () => this.undo(),
      redo: () => this.redo(),
    };
  }

  private editable(): boolean {
    if (!this.doc || this.viewModeValue === "view" || !this.doc.info().capabilities.editText) return false;
    if (this.doc.info().capabilities.transform) return this.objectEdit() && this.textEditing;
    return true;
  }

  /** Fixed-layout pages: a click can select an element instead of only placing a caret. */
  private objectEdit(): boolean {
    return Boolean(this.doc?.info().capabilities.transform) && this.viewModeValue !== "view" && !this.options.readOnly;
  }

  private selectionKind(): SelectionKind {
    if (!this.picked) return this.sel ? "text" : "none";
    if (this.picked.kind === "text") return "text";
    if (this.picked.kind === "image") return "image";
    if (this.picked.kind === "path" || this.picked.kind === "object") return "shape";
    return "group";
  }

  private clearPick(): void {
    this.picked = undefined;
    this.textEditing = false;
    this.drag = undefined;
    this.gesturePreview = undefined;
    this.marks = [];
    this.showCaret(undefined);
    this.editor.blur();
    this.paintNow("overlay");
    this.syncChrome(false);
  }

  /** Clears the text caret and any selected page element. */
  deselect(): void {
    if (this.picked || this.textEditing) this.clearPick();
    if (this.sel) this.setSelection(null);
    this.showCaret(undefined);
    this.editor.blur();
    this.menu.setOpen(false);
    this.syncChrome(false);
  }

  /** Opens a file picker to replace the selected image. */
  replaceImage(): void {
    if (!this.picked || this.picked.kind !== "image" || this.viewModeValue === "view") return;
    const placed = this.el.querySelector<HTMLInputElement>(
      `[data-component-id] input[type="file"][accept*="image"]`,
    );
    if (placed && this.layer.ids().includes(this.picked.id)) {
      placed.click();
      return;
    }
    this.imageInput.click();
  }

  private applyImageReplace(file: File): void {
    const picked = this.picked;
    if (!picked || picked.kind !== "image") return;
    this.emit("replaceImage", { id: picked.id, page: picked.page, file });
    this.setStatus(`Replace image · ${file.name}`);
  }

  /** Removes the selected element from the page. Typing still deletes characters. */
  private deletePicked(): void {
    const picked = this.picked;
    if (!picked || !this.objectEdit()) return;
    this.textEditing = false;
    this.drag = undefined;
    this.gesturePreview = undefined;
    this.showCaret(undefined);
    if (this.sel && (this.sel.anchor.unit === picked.id || this.sel.focus.unit === picked.id)) {
      this.sel = null;
      this.marks = [];
    }
    this.picked = undefined;
    void this.apply({ type: "deleteObject", id: picked.id });
    this.syncChrome(false);
  }

  private elementOn(page: number, id: string): PdfElement | undefined {
    const doc = this.doc;
    if (!doc) return undefined;
    return pageElements(doc.page(page)).find((element) => element.id === id);
  }

  private insidePicked(point: { index: number; xPt: number; yPt: number }): boolean {
    if (!this.picked || this.picked.page !== point.index) return false;
    const element = this.elementOn(this.picked.page, this.picked.id);
    if (!element) return false;
    // Engine hit-testing uses the uncorrected box; the chrome uses shownBox for text.
    return boxContains(element.kind === "text" ? element.box : elementDisplayBox(element), point.xPt, point.yPt);
  }

  /** A drag from a handle. Typing stays on clicks inside a text line. */
  private beginGesture(event: PointerEvent, mode: "move" | "resize" | "rotate", corner?: string): void {
    if (!this.picked || !this.doc) return;
    const element = this.elementOn(this.picked.page, this.picked.id);
    if (!element) return;
    const shown = this.shownBox(element);
    const point = this.pagePoint(event.clientX, event.clientY);
    const cx = shown.xPt + shown.widthPt / 2;
    const cy = shown.yPt + shown.heightPt / 2;
    this.textEditing = false;
    this.marks = [];
    this.showCaret(undefined);
    this.drag = {
      mode,
      corner,
      startX: event.clientX,
      startY: event.clientY,
      startAngle: point ? Math.atan2(point.yPt - cy, point.xPt - cx) : 0,
      originX: shown.xPt,
      originY: shown.yPt,
      originW: shown.widthPt,
      originH: shown.heightPt,
      originRot: element.rotation,
      x: shown.xPt,
      y: shown.yPt,
      w: shown.widthPt,
      h: shown.heightPt,
      rot: element.rotation,
      moved: false,
    };
    this.gesturePreview = undefined;
    this.pages.container.setPointerCapture?.(event.pointerId);
    this.paintNow("overlay");
  }

  private shownBox(element: PdfElement) {
    if (!this.doc || element.kind !== "text") return elementDisplayBox(element);
    const page = this.doc.page(this.picked?.page ?? 0);
    const line = textElement(page.runs, element.id)?.box ?? element.box;
    return this.shownRect(page.runs, line);
  }

  private gestureFromDrag(drag: NonNullable<DomdocViewer["drag"]>): ElementGesture {
    return {
      mode: drag.mode,
      xPt: drag.x,
      yPt: drag.y,
      widthPt: drag.w,
      heightPt: drag.h,
      rotationDeg: drag.rot,
      originRotationDeg: drag.originRot,
    };
  }

  private applyElementFrame(
    frame: HTMLElement,
    overlay: ReturnType<typeof elementOverlayFrame>,
    opts: { mode?: ElementGesture["mode"]; moved: boolean },
  ): void {
    placeAt(frame, overlay);
    frame.style.setProperty("--rot", `${overlay.cssRotationDeg}deg`);
    if (opts.moved) frame.dataset.moving = "";
    else delete frame.dataset.moving;
    const measure = frame.querySelector<HTMLElement>(".dd-measure");
    if (!measure) return;
    const label =
      opts.moved && opts.mode
        ? gestureMeasure({
            mode: opts.mode,
            widthPt: overlay.widthPt,
            heightPt: overlay.heightPt,
            rotationDeg: overlay.rotationDeg,
          })
        : undefined;
    measure.hidden = !label;
    measure.textContent = label ?? "";
  }

  private async pickElement(point: { index: number; xPt: number; yPt: number }): Promise<void> {
    const doc = this.doc;
    if (!doc) return;
    const element = hitElement(pageElements(doc.page(point.index)), point.xPt, point.yPt);
    if (!element) {
      this.deselect();
      return;
    }
    this.picked = { id: element.id, page: point.index, kind: element.kind };
    if (element.kind !== "text") {
      this.textEditing = false;
      this.marks = [];
      this.showCaret(undefined);
      this.paintNow("overlay");
      this.syncChrome(false);
      if (this.el.tabIndex < 0) this.el.tabIndex = -1;
      this.el.focus({ preventScroll: true });
      return;
    }
    this.textEditing = false;
    await this.drive({ type: "pointer", phase: "down", page: point.index, xPt: point.xPt, yPt: point.yPt });
    this.beginTextEdit();
    this.syncChrome(false);
  }

  /** Whole selected text line when the caret has no character range yet. */
  private pickedTextRanges(): UnitRange[] {
    if (!this.doc || this.picked?.kind !== "text") return [];
    const text = this.doc.unitText(this.picked.id);
    const end = Array.from(text).length;
    return end > 0 ? [{ unit: this.picked.id, start: 0, end }] : [];
  }

  /** Places a caret in the selected line and focuses typing. */
  private beginTextEdit(): void {
    if (!this.picked || this.picked.kind !== "text" || !this.doc || !this.objectEdit()) return;
    this.textEditing = true;
    const offset = this.sel && this.sel.focus.unit === this.picked.id ? this.sel.focus.offset : 0;
    this.setSelection({
      anchor: { unit: this.picked.id, offset },
      focus: { unit: this.picked.id, offset },
    });
    this.editor.focus();
    this.paintNow("overlay");
  }

  /** Word files are a sequence of elements. The Insert menu lists the ones that are not text. */
  private offersContentInsert(): boolean {
    const format = this.doc?.info().format;
    return format === "docx" || format === "doc";
  }

  /** Places the chosen element in the content column, under the caret or after the last line. */
  private insertContentElement(kind: string): void {
    const doc = this.doc;
    if (!doc || this.viewModeValue === "view") return;
    if (!this.offersContentInsert() && doc.info().capabilities.insert) {
      const box = this.insertionBox();
      try {
        doc.apply({ type: "insertElement", kind, page: box?.page ?? 0, xPt: box?.xPt ?? 36, yPt: box?.yPt ?? 36 });
      } catch (error) {
        this.fail(error);
      }
      return;
    }
    const element = contentElement(kind);
    if (!element || !this.offersContentInsert()) return;
    const box = this.insertionBox();
    if (!box) return;
    const size = contentSize(element.kind, box.widthPt);
    const page = doc.page(box.page);
    const height = typeof size.height === "number" ? size.height : 72;
    const limit = page.heightPt - 36;
    const yPt = box.yPt + height > limit ? Math.max(page.content.yPt, limit - height) : box.yPt;
    let id: string;
    try {
      id = this.placeComponent({
        type: CONTENT_COMPONENT,
        label: contentLabel(element.kind),
        position: { mode: "page", page: box.page, x: box.xPt, y: yPt, relativeTo: "page" },
        width: size.width,
        height: size.height,
        props: { kind: element.kind },
      });
    } catch (error) {
      this.fail(error);
      return;
    }
    if (element.kind === "image") {
      this.el.querySelector<HTMLInputElement>(`[data-component-id="${id}"] input[type="file"]`)?.click();
      return;
    }
    this.focusCaret();
  }

  private insertionBox(): { page: number; xPt: number; yPt: number; widthPt: number } | undefined {
    const doc = this.doc;
    if (!doc || doc.info().pageCount < 1) return undefined;
    const anchor = this.sel?.focus ?? this.endOfDocument();
    const located = anchor ? doc.locate(anchor) : undefined;
    const pageIndex = located?.page ?? 0;
    if (pageIndex < 0 || pageIndex >= doc.info().pageCount) return undefined;
    const page = doc.page(pageIndex);
    const yPt = located ? located.yPt + located.heightPt + 8 : page.content.yPt;
    return { page: pageIndex, xPt: page.content.xPt, yPt, widthPt: page.content.widthPt };
  }

  private endOfDocument(): Pos | undefined {
    const doc = this.doc;
    if (!doc || doc.info().pageCount < 1) return undefined;
    const page = doc.page(doc.info().pageCount - 1);
    const last = page.runs[page.runs.length - 1];
    if (!last) return undefined;
    return { unit: last.unit, offset: last.unitStart + Array.from(last.text).length };
  }

  private deleteDirected(direction: 1 | -1, word: boolean): boolean {
    if (!this.sel || !this.doc || !this.editable()) return false;
    if (!isCollapsed(this.sel)) {
      void this.insertText("");
      return true;
    }
    const move: CaretMove = direction < 0 ? (word ? "wordLeft" : "left") : word ? "wordRight" : "right";
    void this.drive({ type: "move", move, extend: true });
    if (!this.sel || isCollapsed(this.sel)) return false;
    void this.insertText("");
    return true;
  }

  private setSelection(selection: Selection | null, options?: { goalX?: number; reveal?: boolean }): void {
    if (!selection) {
      this.sel = null;
      this.marks = [];
      this.goalX = undefined;
      this.showCaret(undefined);
      this.paintNow("overlay");
      this.syncChrome(false);
      this.emit("selection", null);
      return;
    }
    void this.drive({ type: "select", anchor: selection.anchor, focus: selection.focus, goalX: options?.goalX });
    if (options?.reveal !== false && this.sel) this.scrollTo(this.sel.focus);
  }

  private selectionEvent(): SelectionState | null {
    if (!this.sel) return null;
    return { anchor: { ...this.sel.anchor }, focus: { ...this.sel.focus }, text: this.selectedText() };
  }

  private syncChrome(panel = true): void {
    if (this.chromeTimer !== undefined) {
      this.root.ownerDocument.defaultView?.clearTimeout(this.chromeTimer);
      this.chromeTimer = undefined;
    }
    const info = this.doc?.info();
    const layers = info?.layers ?? [];
    const fallbackLayer = layers[0]?.id ?? "layer0";
    const trayAllowed = this.layersTrayAllowed();
    const layersContent = trayAllowed && info ? this.layersContentHint(info) : false;
    this.panel.el.hidden = !this.showHistory();
    this.layersPanel.el.hidden = !this.showLayersTray(layersContent);

    if (!trayAllowed) this.cancelLayersRender();

    this.styleSample = this.collectStyleRuns();
    const format = shownTextFormat(this.styleSample, this.sel && isCollapsed(this.sel) ? this.pending : undefined);
    try {
      this.toolbar?.sync({
        info,
        viewMode: this.viewModeValue,
        modeLocked: Boolean(this.options.readOnly),
        zoom: this.zoomValue,
        bold: this.styleOn("bold"),
        italic: this.styleOn("italic"),
        underline: this.styleOn("underline"),
        strike: this.styleOn("strike"),
        font: format.font,
        sizePt: format.sizePt,
        color: format.color,
        hasSelection: this.activeRanges().length > 0 || this.picked?.kind === "text",
        selectionKind: this.selectionKind(),
        insertKinds: this.offersContentInsert()
          ? ["image", "text-box", "shape"]
          : this.doc?.info().capabilities.insert
            ? ["text-box", "shape"]
            : [],
        isDomdoc: this.doc?.name.toLowerCase().endsWith(".domdoc") ?? false,
        helpOn: this.helpOn,
        toolbarsLocked: this.toolbarsLocked,
        hiddenGroups: this.hiddenGroups,
        availableTrays: this.availableTrays(),
        shownTrays: this.shownTrays(),
      });
      delete this.el.dataset.layout;
      this.el.toggleAttribute("data-toolbars-locked", this.toolbarsLocked);
    } finally {
      this.styleSample = undefined;
    }
    if (panel && !this.panel.el.hidden) {
      this.panel.render(info?.history ?? [], info?.history?.at(-1)?.id ?? null);
    }
    if (!this.layersPanel.el.hidden && info) {
      // First population defers the O(pages×objects) walk + DOM until after paint.
      // Later syncs reuse the cache and update selection immediately.
      if (this.layersPanel.el.childElementCount) {
        const elements = this.cachedLayerElements(info, fallbackLayer);
        this.layersPanel.render(layers, elements, this.picked?.id, (page) => this.slot(page)?.canvas);
      } else {
        this.scheduleLayersRender(layers, fallbackLayer);
      }
    }
    if (this.doc && info) {
      const warnings = info.warnings.length ? ` · ${info.warnings.join(" · ")}` : "";
      this.setStatus(
        `${this.doc.name} · ${info.format.toUpperCase()} · ${info.pageCount} page${info.pageCount === 1 ? "" : "s"}${warnings}`,
      );
    } else if (!this.doc && !this.loading) this.setStatus("");
  }

  private setStatus(message: string, tone: "info" | "error" = "info"): void {
    this.toolbar?.setStatus(message, tone);
  }

  private fail(error: unknown, action?: unknown): DomdocError {
    const failure = DomdocError.from(error);
    if (failure === this.reportedError) return failure;
    this.reportedError = failure;
    this.lastReport = this.captureReport(failure, action ?? this.inflight);
    this.setStatus(failure.message, "error");
    this.emit("error", { error: failure });
    return failure;
  }

  private noteEdit(action: unknown): void {
    this.recentEdits.push(action);
    if (this.recentEdits.length > DEBUG_HISTORY) this.recentEdits.shift();
  }

  private debugReport(): string {
    return buildDebugReport(
      this.lastReport ??
        this.captureReport(new DomdocError("engine", "unknown error")),
    );
  }

  /** State Cursor needs for the error on screen. Collection never hides the original failure. */
  private captureReport(failure: DomdocError, action?: unknown): DebugSnapshot {
    const opening = action && typeof action === "object" && (action as { type?: string }).type === "open";
    const snapshot: DebugSnapshot = {
      error: {
        code: failure.code,
        detail: failure.detail,
        message: failure.message,
        stack: failure.stack,
      },
      opening: this.hideOpenDocument && opening ? String((action as { name?: string }).name ?? "") : undefined,
      viewMode: this.viewModeValue,
      readOnly: Boolean(this.options.readOnly),
      zoom: `${Math.round(this.zoomValue * 100)}%`,
      failedAction: action,
      recent: this.recentEdits.slice(),
      units: [],
      pageMates: [],
      browser: {
        time: new Date().toISOString(),
        userAgent: globalThis.navigator?.userAgent ?? "",
        href: globalThis.location?.href ?? "",
      },
    };
    if (this.hideOpenDocument) return snapshot;
    try {
      this.fillReport(snapshot, failure, action);
    } catch (error) {
      snapshot.captureError = error instanceof Error ? error.message : String(error);
    }
    return snapshot;
  }

  private fillReport(snapshot: DebugSnapshot, failure: DomdocError, action?: unknown): void {
    const doc = this.doc;
    if (!doc) return;
    const stored = doc.fileId ? this.files.get(doc.fileId) : undefined;
    snapshot.file = {
      name: doc.name,
      format: doc.format,
      id: doc.fileId,
      bytes: stored?.bytes.byteLength,
    };
    try {
      const info = doc.info();
      snapshot.info = info;
      snapshot.warnings = info.warnings;
    } catch (error) {
      snapshot.captureError = error instanceof Error ? error.message : String(error);
    }
    snapshot.selection = this.selectionSnapshot();
    const ids = unitsMentioned(failure.detail, [
      ...unitsInAction(action),
      ...(snapshot.selection?.ranges?.map((range) => range.unit) ?? []),
      ...caretUnits(snapshot.selection),
    ]);
    const pages = new Set<number>();
    for (const id of ids) {
      const unit = this.unitSnapshot(id);
      snapshot.units.push(unit);
      if (unit.page !== undefined) pages.add(unit.page);
    }
    for (const page of pages) snapshot.pageMates.push({ page, units: this.pageMates(page, new Set(ids)) });
  }

  private selectionSnapshot(): DebugSnapshot["selection"] {
    if (!this.sel || !this.doc) return null;
    let text = "";
    let ranges: UnitRange[] | undefined;
    try {
      text = clipUnitText(this.selectedText());
    } catch {
      text = "";
    }
    try {
      ranges = this.doc.span(this.sel.anchor, this.sel.focus).ranges;
    } catch {
      ranges = undefined;
    }
    return {
      anchor: `${this.sel.anchor.unit}:${this.sel.anchor.offset}`,
      focus: `${this.sel.focus.unit}:${this.sel.focus.offset}`,
      text,
      ranges,
    };
  }

  private unitSnapshot(unit: string): DebugUnit {
    const found: DebugUnit = { unit, runs: [] };
    const doc = this.doc;
    if (!doc) {
      found.note = "No document is open.";
      return found;
    }
    try {
      found.text = clipUnitText(doc.unitText(unit));
    } catch (error) {
      found.note = error instanceof Error ? error.message : String(error);
    }
    try {
      const loc = doc.locate({ unit, offset: 0 });
      if (!loc) {
        found.note = found.note ?? "Unit is not laid out on a page.";
        return found;
      }
      found.page = loc.page;
      found.location = `x ${roundPt(loc.xPt)} y ${roundPt(loc.yPt)} h ${roundPt(loc.heightPt)}`;
      const runs = doc.page(loc.page).runs.filter((run) => run.unit === unit);
      found.runs = runs.slice(0, 24).map(summarizeRun);
      if (runs.length) found.editable = runs.every((run) => run.editable);
    } catch (error) {
      found.note = error instanceof Error ? error.message : String(error);
    }
    return found;
  }

  private pageMates(page: number, skip: Set<string>): DebugMate[] {
    const doc = this.doc;
    if (!doc) return [];
    try {
      const mates: DebugMate[] = [];
      const seen = new Set<string>();
      for (const run of doc.page(page).runs) {
        if (!run.unit || skip.has(run.unit) || seen.has(run.unit)) continue;
        seen.add(run.unit);
        if (mates.length >= 40) break;
        const same = doc.page(page).runs.filter((item) => item.unit === run.unit);
        mates.push({
          unit: run.unit,
          editable: same.every((item) => item.editable),
          text: clipUnitText(same.map((item) => item.text).join("")),
        });
      }
      return mates;
    } catch (error) {
      return [{ unit: "", text: error instanceof Error ? error.message : String(error) }];
    }
  }

  private emit<K extends keyof ViewerEvents>(type: K, event: ViewerEvents[K]): void {
    for (const handler of this.handlers.get(type) ?? []) handler(event);
  }

  // ---- document ---------------------------------------------------------------------

  private onDocumentChange(change: DocumentChange): void {
    if (change.kind === "command" && change.result.caret && this.doc) {
      const caret = change.result.caret;
      const placed = this.sel && samePos(this.sel.anchor, caret) && samePos(this.sel.focus, caret);
      if (!placed) {
        const view = this.doc.selection();
        if (view) {
          this.sel = { anchor: { ...view.anchor }, focus: { ...view.focus } };
          this.marks = view.rects;
        }
      }
      this.goalX = undefined;
    }
    this.requestRefresh();
    if (change.kind === "command") {
      this.emit("change", { command: change.command, result: change.result });
      if (change.command.type === "highlight") this.emitHighlight(change.command);
    }
  }

  /** Tells the host which passage was highlighted. PDF and Office use the same event. */
  private emitHighlight(command: Extract<Command, { type: "highlight" }>): void {
    const doc = this.doc;
    const ends = passageEnds(command.ranges);
    if (!doc || !ends) return;
    const anchor = this.sel ? { ...this.sel.anchor } : ends.anchor;
    const focus = this.sel ? { ...this.sel.focus } : ends.focus;
    this.emit("highlight", {
      color: command.color,
      text: quoteFromRanges(command.ranges, (unit) => doc.unitText(unit)),
      ranges: command.ranges.map((range) => ({ ...range })),
      anchor,
      focus,
    });
  }

  /** Rebuilds pages and relayouts components. Embeds that add pages schedule another pass. */
  private requestRefresh(): void {
    if (!this.doc) return;
    if (this.inRefresh) {
      this.refreshAgain = true;
      return;
    }
    this.inRefresh = true;
    try {
      this.pages.cancelRescale();
      let guard = 0;
      do {
        this.refreshAgain = false;
        this.rebuild();
        this.layer.layout();
      } while (this.refreshAgain && ++guard < 6);
      this.revealCaret();
      this.paintNow("full");
      this.placeInput();
      this.syncChrome();
    } finally {
      this.inRefresh = false;
    }
  }

  private rebuild(): void {
    const doc = this.doc;
    if (!doc) return;
    const count = doc.info().pageCount;
    this.empty.hidden = true;
    this.pages.setCount(count);
    if (count > 0) {
      const first = doc.page(0);
      for (const slot of this.pages.slots) this.pages.size(slot, first.widthPt, first.heightPt);
    }
    this.showPageImage();
  }

  /**
   * The editable page is the run layout. An HTML preview sits on different coordinates,
   * so a caret or selection drawn from the runs would miss the words and typing would
   * not change the picture the user is looking at.
   */
  private showPageImage(): void {
    for (const slot of this.pages.slots) {
      delete slot.el.dataset.oxide;
      slot.el.hidden = false;
      slot.el.querySelector("iframe.dd-oxide")?.remove();
    }
  }

  /** Scales the oxide page with the viewer and grows the sheet to fit it. */
  private fitPageImage(frame: HTMLIFrameElement): void {
    const doc = this.doc;
    const slot = this.pages.slots[0];
    const body = frame.contentDocument?.body;
    if (!doc || !slot || !body) return;
    body.style.zoom = String(this.zoomValue);
    const heightPx = Math.max(body.scrollHeight, body.getBoundingClientRect().height);
    const view = doc.page(0);
    const heightPt = Math.max(view.heightPt, heightPx / (this.scale || 1));
    this.pages.size(slot, view.widthPt, heightPt);
  }

  private slot(page: number): PageSlot | undefined {
    const slot = this.pages.slots[page];
    if (slot && this.doc && page >= 0 && page < this.doc.info().pageCount) {
      const view = this.doc.page(page);
      this.pages.size(slot, view.widthPt, view.heightPt);
    }
    return slot;
  }

  // ---- painting --------------------------------------------------------------------

  private applyScale(): void {
    this.el.style.setProperty("--dd-zoom", String(this.zoomValue));
    this.el.style.setProperty("--dd-scale", String(this.scale));
    this.el.style.setProperty("--px-per-pt", String(PX_PER_PT));
    const frame = this.pages.slots[0]?.el.querySelector("iframe.dd-oxide");
    if (frame instanceof HTMLIFrameElement) this.fitPageImage(frame);
  }

  private paintTargets(): number[] {
    const targets = new Set<number>(this.pages.visibleIndices());
    if (targets.size === 0 && this.pages.slots.length) targets.add(0);
    const doc = this.doc;
    if (doc && this.sel) {
      const span = doc.span(this.sel.anchor, this.sel.focus);
      const start = doc.locate(span.start);
      const end = doc.locate(span.end);
      if (start && end) for (let page = Math.min(start.page, end.page); page <= Math.max(start.page, end.page); page++) targets.add(page);
      else if (start) targets.add(start.page);
    }
    for (const hit of this.hits) targets.add(hit.page);
    if (this.picked) targets.add(this.picked.page);
    return [...targets].filter((index) => index >= 0 && index < this.pages.slots.length).sort((a, b) => a - b);
  }

  private paintNow(mode: "full" | "overlay"): void {
    this.pages.paintIndices(this.paintTargets(), mode);
    this.placeSelectionMenu();
    this.placeAnnotationCard();
  }

  private canvasKey(view: ReturnType<DomdocDocument["page"]>, scale: number): string {
    const face = this.markup();
    if (!view.rasterized) return `${face}@${flowPaintKey(view, scale)}`;
    return `pdf@${face}@${scale.toFixed(3)}@${this.highlightKey(view)}@${flowPaintKey(view, 1)}@${objectPaintKey(view)}`;
  }

  private highlightKey(view: ReturnType<DomdocDocument["page"]>): string {
    return view.highlights.map((mark) => `${mark.xPt},${mark.yPt},${mark.widthPt},${mark.heightPt},${mark.color}`).join(";");
  }

  private paintSlot(slot: PageSlot, mode: "full" | "overlay"): void {
    const doc = this.doc;
    if (!doc || slot.index >= doc.info().pageCount) return;
    const view = doc.page(slot.index);
    this.pages.size(slot, view.widthPt, view.heightPt);
    if (mode === "full") {
      const dpr = this.root.ownerDocument.defaultView?.devicePixelRatio || 1;
      const scale = rasterScale(view.widthPt, view.heightPt, this.scale, dpr);
      const key = this.canvasKey(view, scale);
      const expectW = Math.max(1, Math.ceil(view.widthPt * scale));
      const expectH = Math.max(1, Math.ceil(view.heightPt * scale));
      if (slot.canvas.width !== expectW || slot.canvas.height !== expectH) slot.painted = undefined;
      const drew = slot.painted !== key && this.drawCanvas(slot, view, scale);
      if (drew) {
        slot.painted = key;
        // List may exist before canvases have pixels; refresh only this page's visible thumbs.
        this.scheduleLayerThumbs(slot.index);
      }
      this.drawText(slot, view);
    }
    placeMedia(slot.el, view, this.doc ? this.mediaSource() : undefined);
    this.drawOverlay(slot, view);
  }

  private drawCanvas(slot: PageSlot, view: ReturnType<DomdocDocument["page"]>, scale: number): boolean {
    const doc = this.doc;
    if (!doc) return false;
    try {
      if (slot.el.dataset.oxide) return true;
      if (view.rasterized) return this.drawRaster(slot, view, scale);
      slot.canvas.width = Math.max(1, Math.ceil(view.widthPt * scale));
      slot.canvas.height = Math.max(1, Math.ceil(view.heightPt * scale));
      const ctx = slot.canvas.getContext("2d");
      if (!ctx) return false;
      paintFlowPage(ctx, view, scale, this.markup());
      return true;
    } catch (error) {
      this.fail(error, { type: "paint", page: slot.index });
      return false;
    }
  }

  /** Paints the PDF page from its own fonts. Edited glyphs are drawn over that raster; the bitmap itself is not shifted, so a picture on the same band stays put. */
  private drawRaster(slot: PageSlot, view: ReturnType<DomdocDocument["page"]>, scale: number): boolean {
    const doc = this.doc;
    if (!doc) return false;
    const raster = doc.raster(slot.index, scale);
    if (!raster) return false;
    paintRaster(slot.canvas, raster);
    const ctx = slot.canvas.getContext("2d");
    if (!ctx) return true;
    if (view.highlights.length) {
      ctx.save();
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.globalAlpha = 0.45;
      for (const mark of view.highlights) {
        ctx.fillStyle = mark.color;
        ctx.fillRect(mark.xPt, mark.yPt, mark.widthPt, mark.heightPt);
      }
      ctx.restore();
    }
    if (view.runs.some((run) => run.redraw)) paintEditedRuns(ctx, view.runs, scale, this.markup());
    return true;
  }

  private drawText(slot: PageSlot, view: ReturnType<DomdocDocument["page"]>): void {
    const markup = this.markup();
    const key = `${markup}:${textLayerKey(view)}`;
    if (slot.textKey === key) return;
    fillTextLayer(slot.text, { ...view, runs: presentedRuns(view.runs, markup) }, this.h);
    slot.textKey = key;
  }

  /** Strike for removed characters and an underline for added ones, on the glyphs themselves. */
  private drawDiff(
    view: ReturnType<DomdocDocument["page"]>,
    add: (rect: { xPt: number; yPt: number; widthPt: number; heightPt: number }, className: string) => HTMLElement,
  ): void {
    for (const run of view.runs) {
      if (!run.revision) continue;
      const mark = add(runBox(run), `dd-rev-${run.revision.kind}`);
      mark.title = `${run.revision.author}: ${run.revision.kind}`;
    }
  }

  private drawOverlay(slot: PageSlot, view: ReturnType<DomdocDocument["page"]>): void {
    const doc = this.doc;
    const marks: HTMLElement[] = [];
    const add = (rect: { xPt: number; yPt: number; widthPt: number; heightPt: number }, className: string) => {
      const mark = this.h("div", `dd-abs dd-mark ${className}`);
      placeAt(mark, rect);
      marks.push(mark);
      return mark;
    };
    if (this.showDiff()) this.drawDiff(view, add);
    if (doc) {
      this.hits.forEach((hit, index) => {
        if (hit.page !== slot.index) return;
        for (const rect of rectsForRange(view.runs, hit)) {
          const mark = add(this.shownRect(view.runs, rect), "dd-hit");
          if (index === this.hitIndex) mark.dataset.current = "";
        }
      });
      for (const rect of this.marks) {
        if (rect.page !== slot.index) continue;
        add(this.shownRect(view.runs, rect), "dd-sel");
      }
      for (const note of this.notes) {
        const box = this.annotationAnchor(note);
        if (!box || box.page !== slot.index) continue;
        const mark = this.h("button", "dd-abs dd-mark dd-note");
        mark.type = "button";
        mark.dataset.note = note.id;
        mark.title = note.text;
        mark.setAttribute("aria-label", `Comment: ${note.text}`);
        mark.append(icon(mark.ownerDocument, "comment"));
        placeAt(mark, box.rect);
        marks.push(mark);
      }
    }
    if (this.objectEdit()) this.drawElement(slot, view, marks);
    slot.overlay.replaceChildren(...marks);
  }

  /** Frame, move grip, resize corners, and rotate handle for the selected element. */
  private drawElement(
    slot: PageSlot,
    view: ReturnType<DomdocDocument["page"]>,
    marks: HTMLElement[],
  ): void {
    if (!this.picked || this.picked.page !== slot.index) return;
    const element = pageElements(view).find((item) => item.id === this.picked?.id);
    if (!element) return;
    const line = element.kind === "text" ? textElement(view.runs, element.id)?.box ?? element.box : elementDisplayBox(element);
    const shown = element.kind === "text" ? this.shownRect(view.runs, line) : line;
    const live = this.drag ? this.gestureFromDrag(this.drag) : this.gesturePreview;
    // After commit the engine box catches up; drop the held preview once it matches.
    if (!this.drag && this.gesturePreview) {
      const caughtUp =
        Math.abs(shown.xPt - this.gesturePreview.xPt) < 0.5 &&
        Math.abs(shown.yPt - this.gesturePreview.yPt) < 0.5 &&
        Math.abs(shown.widthPt - this.gesturePreview.widthPt) < 0.5 &&
        Math.abs(shown.heightPt - this.gesturePreview.heightPt) < 0.5;
      if (caughtUp) this.gesturePreview = undefined;
    }
    const overlay = elementOverlayFrame(shown, element.rotation, live);
    const frame = this.h("div", "dd-abs dd-mark dd-element");
    frame.dataset.kind = element.kind;
    frame.setAttribute("role", "group");
    frame.setAttribute("aria-label", elementLabel(element));
    const move = this.h("button", "dd-move-handle");
    move.type = "button";
    move.dataset.action = "move-element";
    move.title = "Drag to move";
    move.setAttribute("aria-label", "Move");
    frame.append(move);
    for (const corner of ["nw", "ne", "sw", "se"]) {
      const resize = this.h("button", "dd-resize-handle");
      resize.type = "button";
      resize.dataset.action = "resize-element";
      resize.dataset.corner = corner;
      resize.title = "Drag to resize";
      resize.setAttribute("aria-label", `Resize from ${corner}`);
      frame.append(resize);
    }
    const rotate = this.h("button", "dd-rotate-handle");
    rotate.type = "button";
    rotate.dataset.action = "rotate-element";
    rotate.title = "Drag to rotate";
    rotate.setAttribute("aria-label", "Rotate");
    frame.append(rotate);
    if (element.kind === "image") {
      const replace = this.h("button", "dd-replace-handle");
      replace.type = "button";
      replace.dataset.action = "replace-element";
      replace.title = "Replace image";
      replace.textContent = "Replace";
      replace.setAttribute("aria-label", "Replace image");
      frame.append(replace);
    }
    const remove = this.h("button", "dd-delete-handle");
    remove.type = "button";
    remove.dataset.action = "delete-element";
    remove.title = "Delete";
    remove.textContent = "×";
    remove.setAttribute("aria-label", "Delete");
    frame.append(remove);
    const measure = this.h("div", "dd-measure");
    measure.hidden = true;
    frame.append(measure);
    this.applyElementFrame(frame, overlay, {
      mode: this.drag?.mode,
      moved: !!this.drag?.moved,
    });
    marks.push(frame);
  }

  /** Slides the existing caret. Called before page painting so the beam is not waiting on glyphs. */
  private showCaret(loc: { page: number; xPt: number; yPt: number; heightPt: number } | undefined): void {
    if (this.objectEdit() && !this.textEditing) {
      this.caretLoc = undefined;
      this.caretEl?.remove();
      return;
    }
    if (!loc || !this.sel || !isCollapsed(this.sel)) {
      this.caretLoc = undefined;
      this.caretEl?.remove();
      return;
    }
    const slot = this.pages.slots[loc.page];
    if (!slot) return;
    this.caretLoc = loc;
    if (!this.caretEl) this.caretEl = this.h("div", "dd-abs dd-caret");
    const style = this.caretEl.style;
    style.setProperty("--x", String(loc.xPt));
    style.setProperty("--y", String(loc.yPt));
    style.setProperty("--h", String(loc.heightPt));
    if (this.caretEl.parentElement !== slot.el) slot.layer.before(this.caretEl);
  }

  private revealCaret(): void {
    const fresh = this.caretFromEngine;
    this.caretFromEngine = false;
    if (fresh && this.caretEl?.isConnected) return;
    if (fresh && this.caretLoc) {
      this.showCaret(this.caretLoc);
      return;
    }
    if (!this.sel || !isCollapsed(this.sel)) {
      this.showCaret(undefined);
      return;
    }
    this.showCaret(this.located(this.sel.focus));
  }

  private placeInput(): void {
    if (!this.doc || !this.sel) return;
    const loc = this.caretLoc ?? this.located(this.sel.focus);
    const slot = loc && this.pages.slots[loc.page];
    if (!loc || !slot) return;
    this.placeInputAt(slot, loc);
  }

  private placeInputAt(slot: PageSlot, loc: { xPt: number; yPt: number; heightPt: number }): void {
    const scale = this.scale;
    const left = slot.el.offsetLeft + loc.xPt * scale;
    const top = slot.el.offsetTop + loc.yPt * scale;
    this.editor.place(left, top, Math.max(loc.heightPt * scale, 1));
  }

  /** Scrolls the page stack so the picked element sits in the middle of the viewport. */
  private centerOnPicked(): void {
    const picked = this.picked;
    const doc = this.doc;
    if (!picked || !doc) return;
    const element = this.elementOn(picked.page, picked.id);
    const slot = this.slot(picked.page);
    if (!element || !slot) return;
    const page = doc.page(picked.page);
    const pageRect = slot.el.getBoundingClientRect();
    const viewRect = this.pages.container.getBoundingClientRect();
    if (page.widthPt < 1 || page.heightPt < 1 || pageRect.width < 1 || pageRect.height < 1) return;
    if (viewRect.width < 1 || viewRect.height < 1) return;
    const shown = this.shownBox(element);
    const sx = pageRect.width / page.widthPt;
    const sy = pageRect.height / page.heightPt;
    const delta = centerDelta(viewRect, {
      left: pageRect.left + shown.xPt * sx,
      top: pageRect.top + shown.yPt * sy,
      width: shown.widthPt * sx,
      height: shown.heightPt * sy,
    });
    this.pages.container.scrollLeft += delta.x;
    this.pages.container.scrollTop += delta.y;
  }

  private scrollTo(pos: Pos): void {
    const doc = this.doc;
    if (!doc) return;
    const loc = this.caretLoc && this.sel && samePos(this.sel.focus, pos) ? this.caretLoc : this.located(pos);
    const slot = loc && this.pages.slots[loc.page];
    if (!loc || !slot) return;
    const pages = this.pages.container;
    const scale = this.scale;
    const top = slot.el.offsetTop + loc.yPt * scale;
    const bottom = top + loc.heightPt * scale;
    const left = slot.el.offsetLeft + loc.xPt * scale;
    const margin = 24;
    if (top < pages.scrollTop + 8) pages.scrollTop = Math.max(0, top - margin);
    else if (bottom > pages.scrollTop + pages.clientHeight - 8) pages.scrollTop = bottom - pages.clientHeight + margin;
    if (left < pages.scrollLeft + 8) pages.scrollLeft = Math.max(0, left - margin);
    else if (left > pages.scrollLeft + pages.clientWidth - 8) pages.scrollLeft = left - pages.clientWidth + margin;
  }

  /** Toolbar queries walk the page. Let the beam paint before they run. */
  private scheduleChrome(): void {
    const win = this.root.ownerDocument.defaultView;
    if (!win) {
      this.syncChrome(false);
      return;
    }
    if (this.chromeTimer !== undefined) return;
    this.chromeTimer = win.setTimeout(() => {
      this.chromeTimer = undefined;
      this.placeInput();
      this.syncChrome(false);
    }, 0);
  }

  /** Walk pages and build layer rows; cached by document revision. */
  private cachedLayerElements(info: DocInfo, fallbackLayer: string): LayerElementItem[] {
    const doc = this.doc;
    if (!doc) return [];
    const key = layerElementsKey(doc.revision, info.pageCount, fallbackLayer);
    return this.layerElementsCache.get(key, () => {
      const items: LayerElementItem[] = [];
      for (let page = 0; page < info.pageCount; page++) {
        const view = doc.page(page);
        items.push(
          ...layerElementsForPage(page, view.widthPt, pageElements(view), view.objects ?? [], fallbackLayer),
        );
      }
      return items;
    });
  }

  /** Build the layers list after the first page paint frame so open stays responsive. */
  private scheduleLayersRender(layers: LayerView[], fallbackLayer: string): void {
    this.pendingLayersRender = { layers, fallbackLayer };
    const win = this.root.ownerDocument.defaultView;
    if (!win) {
      this.flushLayersRender();
      return;
    }
    if (this.layersRenderRaf !== undefined || this.layersRenderTimer !== undefined) return;
    this.layersRenderRaf = win.requestAnimationFrame(() => {
      this.layersRenderRaf = undefined;
      this.layersRenderTimer = win.setTimeout(() => {
        this.layersRenderTimer = undefined;
        this.flushLayersRender();
      }, 0);
    });
  }

  private flushLayersRender(): void {
    const pending = this.pendingLayersRender;
    this.pendingLayersRender = undefined;
    if (!pending || this.layersPanel.el.hidden || !this.doc) return;
    const info = this.doc.info();
    const elements = this.cachedLayerElements(info, pending.fallbackLayer);
    this.layersPanel.render(pending.layers, elements, this.picked?.id, (page) => this.slot(page)?.canvas);
  }

  private cancelLayersRender(): void {
    const win = this.root.ownerDocument.defaultView;
    if (this.layersRenderRaf !== undefined) {
      win?.cancelAnimationFrame(this.layersRenderRaf);
      this.layersRenderRaf = undefined;
    }
    if (this.layersRenderTimer !== undefined) {
      win?.clearTimeout(this.layersRenderTimer);
      this.layersRenderTimer = undefined;
    }
    this.pendingLayersRender = undefined;
  }

  /** Re-crop visible layer thumbs once after a full-paint batch fills page canvases. */
  private scheduleLayerThumbs(page: number): void {
    if (this.layersPanel.el.hidden) return;
    this.layerThumbPages.add(page);
    const win = this.root.ownerDocument.defaultView;
    if (!win) {
      const pages = [...this.layerThumbPages];
      this.layerThumbPages.clear();
      this.layersPanel.refreshThumbs((index) => this.slot(index)?.canvas, pages);
      return;
    }
    if (this.layerThumbTimer !== undefined) return;
    this.layerThumbTimer = win.setTimeout(() => {
      this.layerThumbTimer = undefined;
      if (this.layersPanel.el.hidden) {
        this.layerThumbPages.clear();
        return;
      }
      const pages = [...this.layerThumbPages];
      this.layerThumbPages.clear();
      this.layersPanel.refreshThumbs((index) => this.slot(index)?.canvas, pages);
    }, 0);
  }

  // ---- pointer and keys -------------------------------------------------------------

  private bindPointer(): void {
    const pages = this.pages.container;
    this.el.addEventListener("pointerdown", (event) => {
      // The selection frame is rebuilt during this same click, which detaches the
      // target. The event path still records the page and the frame.
      if (pointerKeepsSelection(event.composedPath())) return;
      if (this.picked || this.textEditing || this.sel) this.deselect();
    });
    this.toolbar?.el.addEventListener("pointerdown", () => {
      if (!this.textEditing) return;
      this.textEditing = false;
      this.showCaret(undefined);
    });
    pages.addEventListener("pointerdown", (event) => this.onPointerDown(event));
    pages.addEventListener("pointermove", (event) => this.onPointerMove(event));
    pages.addEventListener("pointerup", () => this.onPointerUp());
    pages.addEventListener("pointercancel", () => this.onPointerUp());
    pages.addEventListener("click", (event) => this.onClick(event));
    pages.addEventListener(
      "wheel",
      (event) => {
        if (!event.ctrlKey && !event.metaKey) return;
        event.preventDefault();
        if (this.doc) {
          const zoom = this.engineZoom(this.doc.handle({ type: "zoom", op: "wheel", deltaY: event.deltaY, deltaMode: event.deltaMode }));
          if (zoom !== undefined) this.applyZoom(zoom, { clientX: event.clientX, clientY: event.clientY });
        } else {
          this.setZoom(wheelZoom(this.zoomValue, event.deltaY, event.deltaMode), { clientX: event.clientX, clientY: event.clientY });
        }
      },
      { passive: false },
    );
  }

  private onPointerDown(event: PointerEvent): void {
    const target = event.target as Element | null;
    if (!target?.closest(".dd-note, .dd-note-card")) {
      this.openNote = undefined;
      this.noteCard.show(undefined);
    }
    if (event.button !== 0 || target?.closest(".dd-component, .dd-menu, .dd-note, .dd-note-card")) return;
    const control = target?.closest<HTMLElement>("[data-action]");
    const action = control?.dataset.action;
    if (action === "delete-element") {
      event.preventDefault();
      this.deletePicked();
      return;
    }
    if (action === "replace-element") {
      event.preventDefault();
      this.replaceImage();
      return;
    }
    if (action === "move-element" || action === "resize-element" || action === "rotate-element") {
      event.preventDefault();
      const mode = action === "move-element" ? "move" : action === "rotate-element" ? "rotate" : "resize";
      this.beginGesture(event, mode, control?.dataset.corner);
      return;
    }
    const point = this.enginePoint(this.pagePoint(event.clientX, event.clientY));
    if (this.objectEdit() && !point && (this.picked || this.textEditing || this.sel)) {
      this.deselect();
      return;
    }
    if (this.objectEdit() && point && this.insidePicked(point)) {
      if (this.picked?.kind === "text" && !this.textEditing) {
        event.preventDefault();
        this.beginTextEdit();
        return;
      }
      if (this.picked?.kind !== "text") {
        event.preventDefault();
        this.beginGesture(event, "move");
        return;
      }
    } else if (this.objectEdit() && point) {
      event.preventDefault();
      void this.pickElement(point);
      return;
    }
    if (!point) return;
    const before = this.sel?.focus;
    void this.drive({ type: "pointer", phase: "down", page: point.index, xPt: point.xPt, yPt: point.yPt });
    if (!this.sel) return;
    event.preventDefault();
    this.editor.focus();
    this.dragging = true;
    this.moved = false;
    this.pages.container.setPointerCapture?.(event.pointerId);
    if (before && this.sel && samePos(before, this.sel.focus) && samePos(this.sel.anchor, this.sel.focus)) {
      /* caret placed */
    }
  }

  private onPointerMove(event: PointerEvent): void {
    if (this.drag && this.picked && this.doc) {
      const drag = this.drag;
      const scale = this.scale || 1;
      const dx = (event.clientX - drag.startX) / scale;
      const dy = (event.clientY - drag.startY) / scale;
      drag.moved = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 3;
      if (drag.mode === "resize") {
        const min = 8;
        const corner = drag.corner ?? "se";
        let x = drag.originX;
        let y = drag.originY;
        let w = drag.originW;
        let h = drag.originH;
        if (corner.includes("e")) w = Math.max(min, drag.originW + dx);
        if (corner.includes("s")) h = Math.max(min, drag.originH + dy);
        if (corner.includes("w")) {
          w = Math.max(min, drag.originW - dx);
          x = drag.originX + drag.originW - w;
        }
        if (corner.includes("n")) {
          h = Math.max(min, drag.originH - dy);
          y = drag.originY + drag.originH - h;
        }
        drag.x = x;
        drag.y = y;
        drag.w = w;
        drag.h = h;
      } else if (drag.mode === "rotate") {
        const point = this.pagePoint(event.clientX, event.clientY);
        if (point) {
          const cx = drag.originX + drag.originW / 2;
          const cy = drag.originY + drag.originH / 2;
          const angle = Math.atan2(point.yPt - cy, point.xPt - cx);
          drag.rot = drag.originRot + ((angle - drag.startAngle) * 180) / Math.PI;
        }
      } else {
        drag.x = drag.originX + dx;
        drag.y = drag.originY + dy;
      }
      const gesture = this.gestureFromDrag(drag);
      const overlay = elementOverlayFrame(
        { xPt: drag.originX, yPt: drag.originY, widthPt: drag.originW, heightPt: drag.originH },
        drag.originRot,
        gesture,
      );
      const frame = this.pages.slots[this.picked.page]?.overlay.querySelector<HTMLElement>(".dd-element");
      if (frame) this.applyElementFrame(frame, overlay, { mode: drag.mode, moved: drag.moved });
      else this.paintNow("overlay");
      return;
    }
    if (!this.dragging || !this.sel) return;
    const point = this.enginePoint(this.pagePoint(event.clientX, event.clientY));
    if (!point) return;
    const before = this.sel.focus;
    void this.drive({ type: "pointer", phase: "move", page: point.index, xPt: point.xPt, yPt: point.yPt });
    if (this.sel && !samePos(before, this.sel.focus)) this.moved = true;
  }

  private onPointerUp(): void {
    if (this.drag) {
      const drag = this.drag;
      const picked = this.picked;
      const preview = drag.moved ? this.gestureFromDrag(drag) : undefined;
      this.drag = undefined;
      // Hold resize/move size until the engine box catches up. Rotate changes the AABB, so
      // keeping the pre-rotate box would desync from the new raster; CSS spin ends with the drag.
      this.gesturePreview =
        preview && preview.mode !== "rotate"
          ? { ...preview, originRotationDeg: preview.rotationDeg }
          : undefined;
      const element = picked && this.elementOn(picked.page, picked.id);
      if (drag.moved && element) {
        const dx = drag.x - drag.originX;
        const dy = drag.y - drag.originY;
        if (drag.mode === "move" && element.kind === "text") {
          void this.apply({ type: "moveUnit", unit: element.id, xPt: element.xPt + dx, yPt: element.yPt + dy });
        } else {
          const scaleX = drag.originW > 0.5 ? drag.w / drag.originW : 1;
          const scaleY = drag.originH > 0.5 ? drag.h / drag.originH : 1;
          void this.apply({
            type: "transformObject",
            id: element.id,
            dxPt: drag.x + drag.w / 2 - (drag.originX + drag.originW / 2),
            dyPt: drag.y + drag.h / 2 - (drag.originY + drag.originH / 2),
            scaleX,
            scaleY,
            rotateDeg: drag.rot - drag.originRot,
          });
        }
      } else if (element?.kind === "text") {
        this.gesturePreview = undefined;
        this.beginTextEdit();
      } else {
        this.gesturePreview = undefined;
        this.paintNow("overlay");
      }
      return;
    }
    if (!this.dragging) return;
    this.dragging = false;
    if (this.sel) this.scrollTo(this.sel.focus);
    this.placeSelectionMenu();
  }

  private onClick(event: MouseEvent): void {
    const noteEl = (event.target as Element | null)?.closest<HTMLElement>("[data-note]");
    if (noteEl?.dataset.note) {
      const note = this.notes.find((item) => item.id === noteEl.dataset.note);
      this.openNote = note;
      this.placeAnnotationCard();
      return;
    }
    if (this.objectEdit() && !this.textEditing) return;
    if (this.moved || event.detail < 2 || (event.target as Element | null)?.closest(".dd-component, .dd-menu, .dd-note-card")) return;
    const point = this.enginePoint(this.pagePoint(event.clientX, event.clientY));
    if (!point) return;
    void this.drive({ type: "pointer", phase: "click", page: point.index, xPt: point.xPt, yPt: point.yPt, detail: event.detail });
  }

  private bindDrop(): void {
    this.el.addEventListener("dragover", (event) => {
      if (![...(event.dataTransfer?.items ?? [])].some((item) => item.kind === "file")) return;
      event.preventDefault();
      this.el.dataset.drop = "";
    });
    this.el.addEventListener("dragleave", () => delete this.el.dataset.drop);
    this.el.addEventListener("drop", (event) => {
      event.preventDefault();
      delete this.el.dataset.drop;
      const file = event.dataTransfer?.files[0];
      if (file) void this.open(file);
    });
  }

  /** Follows `prefers-reduced-motion` so the caret blink can be turned off without a stylesheet race. */
  private bindMotion(): void {
    const view = this.root.ownerDocument.defaultView;
    const query = view?.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return;
    const apply = () => {
      if (query.matches) this.el.dataset.motion = "reduce";
      else delete this.el.dataset.motion;
    };
    apply();
    query.addEventListener("change", apply);
    this.motionOff = () => query.removeEventListener("change", apply);
  }

  /** Puts editing focus back on the caret input. */
  private focusCaret(): void {
    this.editor.focus();
  }

  /** Leaving a component returns focus to the caret. */
  private bindFocusReturn(): void {
    this.el.addEventListener("focusout", (event) => {
      const from = event.target;
      if (!(from instanceof Element) || !from.closest(".dd-component")) return;
      const next = event.relatedTarget;
      if (next instanceof Element && next.closest(".dd-component")) return;
      this.focusCaret();
    });
  }

  private bindKeys(): void {
    this.el.addEventListener(
      "copy",
      (event) => {
        const selected = this.el.ownerDocument.getSelection();
        const node = selected?.anchorNode;
        const host = node instanceof Element ? node : node?.parentElement;
        const box = host?.closest<HTMLElement>(".dd-error, .dd-status");
        if (!selected || !box || !event.clipboardData || selected.isCollapsed) return;
        const text = selected.toString() || box.dataset.message || box.querySelector("pre")?.textContent || box.textContent || "";
        if (!text) return;
        event.preventDefault();
        event.stopPropagation();
        event.clipboardData.setData("text/plain", text);
      },
      true,
    );
    this.el.addEventListener("keydown", (event) => {
      if ((event.target as Element | null)?.closest(".dd-menu, .dd-note-card")) return;
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        this.objectEdit() &&
        this.picked &&
        !this.textEditing &&
        !(event.target as Element | null)?.closest("input, textarea, select, .dd-toolbar")
      ) {
        event.preventDefault();
        this.deletePicked();
        return;
      }
      if (event.key === "Escape") {
        if (this.objectEdit() && this.textEditing) {
          this.textEditing = false;
          this.marks = [];
          this.showCaret(undefined);
          this.paintNow("overlay");
          this.syncChrome(false);
          event.preventDefault();
          return;
        }
        if (this.picked || this.sel) {
          this.deselect();
          event.preventDefault();
          return;
        }
      }
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      if (mod && key === "s") {
        event.preventDefault();
        this.download();
        return;
      }
      if (mod && key === "f") {
        event.preventDefault();
        this.toolbar?.focusSearch();
        return;
      }
      if (mod && (event.key === "+" || event.key === "=")) {
        event.preventDefault();
        this.zoomIn();
        return;
      }
      if (mod && event.key === "-" && !event.shiftKey) {
        event.preventDefault();
        this.zoomOut();
        return;
      }
      if (mod && event.key === "0") {
        event.preventDefault();
        this.setZoom(1);
        return;
      }
      if ((event.key === "PageDown" || event.key === "PageUp") && !(event.target as Element | null)?.closest(".dd-component, .dd-toolbar, .dd-panel")) {
        event.preventDefault();
        const pages = this.pages.container;
        pages.scrollBy({ top: (event.key === "PageDown" ? 1 : -1) * Math.max(pages.clientHeight, 1) * 0.9 });
      }
    });
  }

  /** Puts Highlight and Comment on the selection. Hidden while the pointer is still dragging. */
  private placeSelectionMenu(): void {
    const mark = this.marks[this.marks.length - 1];
    const slot = mark && this.pages.slots[mark.page];
    const open = !!mark && !!slot && !this.dragging && this.viewModeValue !== "view" && this.activeRanges().length > 0;
    this.menu.setOpen(open);
    if (!open || !mark || !slot) return;
    if (this.menu.el.parentElement !== slot.el) slot.el.append(this.menu.el);
    const above = mark.yPt - 22;
    placeAt(this.menu.el, {
      xPt: mark.xPt,
      yPt: above >= 4 ? above : mark.yPt + mark.heightPt + 4,
      widthPt: 0,
      heightPt: 0,
    });
  }

  /** Page point where a comment marker sits, at the end of its quote. */
  private annotationAnchor(note: Annotation): { page: number; rect: { xPt: number; yPt: number; widthPt: number; heightPt: number } } | undefined {
    const range = [...note.ranges].reverse().find((item) => item.end > item.start);
    if (!range) return undefined;
    const loc = this.located({ unit: range.unit, offset: range.end });
    if (!loc) return undefined;
    const height = Math.max(loc.heightPt, 14);
    return {
      page: loc.page,
      rect: { xPt: loc.xPt + 2, yPt: loc.yPt, widthPt: 16, heightPt: height },
    };
  }

  private placeAnnotationCard(): void {
    const note = this.openNote;
    const box = note && this.annotationAnchor(note);
    const slot = box && this.pages.slots[box.page];
    if (!note || !box || !slot) {
      this.noteCard.show(undefined);
      return;
    }
    if (this.noteCard.el.parentElement !== slot.el) slot.el.append(this.noteCard.el);
    this.noteCard.show(note);
    placeAt(this.noteCard.el, {
      xPt: box.rect.xPt + box.rect.widthPt + 4,
      yPt: box.rect.yPt,
      widthPt: 0,
      heightPt: 0,
    });
  }

  /** Live view hides deletions, so carets and selections move left by their width. */
  private visualPoint(page: number, xPt: number, yPt: number): number {
    if (this.markup() !== "plain" || !this.doc) return xPt;
    return visualX(this.doc.page(page).runs, xPt, yPt);
  }

  private located(pos: Pos): { page: number; xPt: number; yPt: number; heightPt: number } | undefined {
    const loc = this.doc?.locate(pos);
    if (!loc) return undefined;
    return { ...loc, xPt: this.visualPoint(loc.page, loc.xPt, loc.yPt) };
  }

  private shownRect<T extends { xPt: number; yPt: number; widthPt: number }>(runs: RunView[], rect: T): T {
    if (this.markup() !== "plain") return rect;
    const xPt = visualX(runs, rect.xPt, rect.yPt);
    const right = visualX(runs, rect.xPt + rect.widthPt, rect.yPt);
    return { ...rect, xPt, widthPt: Math.max(0, right - xPt) };
  }

  /** Clicks land on the live page. The engine still measures the hidden deletions. */
  private enginePoint(
    point: { index: number; xPt: number; yPt: number } | undefined,
  ): { index: number; xPt: number; yPt: number } | undefined {
    if (!point || this.markup() !== "plain" || !this.doc) return point;
    return { ...point, xPt: trackX(this.doc.page(point.index).runs, point.xPt, point.yPt) };
  }

  private pagePoint(clientX: number, clientY: number): { index: number; xPt: number; yPt: number } | undefined {
    let best: PageSlot | undefined;
    let bestDist = Infinity;
    for (const slot of this.pages.slots) {
      const rect = slot.el.getBoundingClientRect();
      const dx = clientX < rect.left ? rect.left - clientX : clientX > rect.right ? clientX - rect.right : 0;
      const dy = clientY < rect.top ? rect.top - clientY : clientY > rect.bottom ? clientY - rect.bottom : 0;
      if (dx === 0 && dy === 0) {
        best = slot;
        break;
      }
      const dist = dy * 1000 + dx;
      if (dist < bestDist) {
        bestDist = dist;
        best = slot;
      }
    }
    if (!best) return undefined;
    const rect = best.el.getBoundingClientRect();
    const scale = this.scale || 1;
    return { index: best.index, xPt: (clientX - rect.left) / scale, yPt: (clientY - rect.top) / scale };
  }

  /** Sends one event to the core, attaches a feature it asks for, and applies the result. */
  private async drive(input: EngineInput): Promise<EngineEvent[]> {
    const doc = this.doc;
    if (!doc) return [];
    const action = inputAction(input);
    if (input.type === "text") this.noteEdit(action);
    const previous = this.inflight;
    this.inflight = action;
    try {
      let events = doc.handle(input);
      const need = events.find((event) => event.type === "need");
      if (need && need.type === "need") {
        if (need.module === "edit") {
          await upgradeLazyEdit(doc);
          await this.ensureFonts(doc);
          this.applyViewMode();
          if (this.sel) {
            doc.handle({ type: "select", anchor: this.sel.anchor, focus: this.sel.focus });
          }
        } else {
          doc.attach(need.module);
        }
        events = doc.handle(input);
      }
      this.applyEngine(events);
      return events;
    } catch (error) {
      throw this.fail(error);
    } finally {
      this.inflight = previous;
    }
  }

  private applyEngine(events: EngineEvent[]): void {
    const edited = events.some((event) => event.type === "applied");
    for (const event of events) {
      if (event.type === "selection") {
        const marksBefore = this.marks.length;
        this.sel = event.anchor.unit || event.focus.unit ? { anchor: { ...event.anchor }, focus: { ...event.focus } } : null;
        this.marks = this.objectEdit() && !this.textEditing ? [] : event.rects;
        this.goalX = event.goalX ?? undefined;
        const collapsed = !!this.sel && isCollapsed(this.sel);
        const caret = event.caret
          ? { page: event.caret.page, xPt: event.caret.xPt, yPt: event.caret.yPt, heightPt: event.caret.heightPt }
          : undefined;
        if (collapsed && caret) this.showCaret({ ...caret, xPt: this.visualPoint(caret.page, caret.xPt, caret.yPt) });
        else if (!collapsed) this.showCaret(undefined);
        else if (!edited) this.showCaret(this.located(this.sel!.focus));
        if (edited) this.caretFromEngine = collapsed ? !!caret : true;
        if (!edited && (marksBefore > 0 || event.rects.length > 0)) {
          this.paintNow("overlay");
          this.placeInput();
          this.syncChrome(false);
        } else if (!edited) this.scheduleChrome();
        this.emit("selection", this.selectionEvent());
      } else if (event.type === "error") {
        this.fail(new DomdocError(event.code, event.detail));
      }
    }
  }

  private engineZoom(events: EngineEvent[]): number | undefined {
    const zoom = events.find((event) => event.type === "zoom");
    return zoom?.type === "zoom" ? zoom.zoom : undefined;
  }

  // ---- selection queries ------------------------------------------------------------

  private activeRanges(): UnitRange[] {
    if (!this.doc || !this.sel) return [];
    return this.doc.span(this.sel.anchor, this.sel.focus).ranges.filter((range) => range.end > range.start);
  }

  private paragraphUnits(): string[] {
    if (!this.doc || !this.sel) return [];
    const units = this.doc.span(this.sel.anchor, this.sel.focus).ranges.map((range) => range.unit);
    return [...new Set(units.length ? units : [this.sel.focus.unit])];
  }

  private runsInSelection() {
    const doc = this.doc;
    if (!doc || !this.sel || isCollapsed(this.sel)) return [];
    const span = doc.span(this.sel.anchor, this.sel.focus);
    const ranges = span.ranges.filter((range) => range.end > range.start);
    const start = doc.locate(span.start);
    const end = doc.locate(span.end);
    if (!ranges.length || !start) return [];
    const runs = [];
    const lo = Math.min(start.page, end?.page ?? start.page);
    const hi = Math.max(start.page, end?.page ?? start.page);
    for (let page = lo; page <= hi; page++) {
      for (const run of doc.page(page).runs) {
        if (!isAddressable(run) || visibleLength(run) === 0) continue;
        const range = ranges.find((item) => item.unit === run.unit);
        if (!range) continue;
        const start = run.unitStart;
        const end = start + visibleLength(run);
        if (end > range.start && start < range.end) runs.push(run);
      }
    }
    return runs;
  }

  /** The run whose formatting typing would continue (the character before the caret). */
  private runAt(pos: Pos) {
    const doc = this.doc;
    const loc = doc?.locate(pos);
    if (!doc || !loc) return undefined;
    const runs = doc.page(loc.page).runs.filter((run) => run.unit === pos.unit && isAddressable(run));
    return (
      runs.find((run) => pos.offset > run.unitStart && pos.offset <= run.unitStart + visibleLength(run)) ??
      runs.find((run) => pos.offset >= run.unitStart && pos.offset <= run.unitStart + visibleLength(run))
    );
  }

  private collectStyleRuns(): RunView[] {
    const doc = this.doc;
    if (!doc) return [];
    if (this.sel && !isCollapsed(this.sel)) {
      const runs = this.runsInSelection();
      if (runs.length) return runs;
    }
    if (this.picked?.kind === "text") {
      const runs = doc
        .page(this.picked.page)
        .runs.filter((run) => run.unit === this.picked?.id && isAddressable(run));
      if (runs.length) return runs;
    }
    if (!this.sel) return [];
    const run = this.runAt(this.sel.focus);
    return run ? [run] : [];
  }

  private styleOn(key: "bold" | "italic" | "underline" | "strike"): boolean {
    if (!this.doc) return false;
    if (this.sel && isCollapsed(this.sel) && this.pending?.[key] !== undefined) return !!this.pending[key];
    const sample = this.styleSample ?? this.collectStyleRuns();
    return sample.length > 0 && sample.every((run) => run[key]);
  }
}

export type { Selection };

/** Client rect used to center a box in a scrollport. */
export interface ClientBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * A click on the page, the toolbar, or the selected element's frame and handles.
 * The frame can be detached before this runs, so the check uses the event path.
 */
const selectionSurface =
  ".dd-toolbar, .dd-menu, .dd-note, .dd-note-card, .dd-password, .dd-page, .dd-panel, .dd-input, .dd-element";

/** True when the pointer landed on the document or the selected element's chrome. */
export function pointerKeepsSelection(path: readonly EventTarget[]): boolean {
  return path.some((node) => node instanceof Element && node.matches(selectionSurface));
}

/** How far to scroll so `box` sits in the middle of `viewport`. Both rects share one client space. */
export function centerDelta(viewport: ClientBox, box: ClientBox): { x: number; y: number } {
  return {
    x: box.left + box.width / 2 - (viewport.left + viewport.width / 2),
    y: box.top + box.height / 2 - (viewport.top + viewport.height / 2),
  };
}
