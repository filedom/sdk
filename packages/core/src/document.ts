import type {
  Command,
  CommandResult,
  DocInfo,
  Embed,
  EmbedBox,
  EngineEvent,
  EngineInput,
  EngineSession,
  Format,
  Location,
  PageView,
  Pos,
  RevisionView,
  SearchHit,
  TextSpan,
} from "./engine-types.js";
import { FiledomError } from "./errors.js";
import { exportName } from "./formats.js";

export interface PageRaster {
  width: number;
  height: number;
  rgba: Uint8ClampedArray<ArrayBuffer>;
}

/** A content change (`command`) or a layout-only change (`embeds`). */
export type DocumentChange =
  | { kind: "command"; command: Command; result: CommandResult }
  | { kind: "embeds" };

type Listener = (change: DocumentChange) => void;

function call<T>(fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    throw FiledomError.from(error);
  }
}

/**
 * One open file backed by its format bundle's wasm session. All state (content, undo
 * history, highlights, revisions) lives in Rust; this wrapper caches views per version.
 */
export class FiledomDocument {
  private version = 0;
  /** Views and queries of the current version; cleared on every change. */
  private readonly cache = new Map<string, unknown>();
  private readonly listeners = new Set<Listener>();
  private embeds: Embed[] = [];
  private disposed = false;

  constructor(
    private session: EngineSession,
    readonly name: string,
    readonly format: Format,
    /** FileStore id this document was opened from, if any. */
    readonly fileId?: string,
  ) {}

  /** Increments on every change; views fetched at an older version are stale. */
  get revision(): number {
    return this.version;
  }

  info(): DocInfo {
    return this.cached("info", () => JSON.parse(this.live().info()) as DocInfo);
  }

  page(index: number): PageView {
    return this.cached(`page:${index}`, () => JSON.parse(this.live().page(index)) as PageView);
  }

  /**
   * HTML `office_oxide` rendered for this file. Absent for PDF, and after the first
   * edit, when the flow model draws the page instead.
   */
  pageImage(): string | undefined {
    return this.cached("page-image", () => {
      const live = this.live() as EngineSession & { pageImage?: () => string | undefined };
      if (typeof live.pageImage !== "function") return "";
      return call(() => live.pageImage?.() ?? "") ?? "";
    }) || undefined;
  }

  /** RGBA pixels of one page. Both fixed-layout and reflowable pages rasterize in wasm. */
  raster(index: number, scale: number): PageRaster | undefined {
    const image = call(() => this.live().raster(index, scale));
    if (!image) return undefined;
    try {
      const rgba = image.takeRgba();
      return {
        width: image.width,
        height: image.height,
        rgba: new Uint8ClampedArray(rgba.buffer as ArrayBuffer, rgba.byteOffset, rgba.byteLength),
      };
    } finally {
      image.free();
    }
  }

  unitText(unit: string): string {
    return this.cached(`text:${unit}`, () => this.live().unitText(unit));
  }

  /** Orders two carets and lists the unit ranges between them. */
  span(a: Pos, b: Pos): TextSpan {
    return this.cached(`span:${a.unit}:${a.offset}:${b.unit}:${b.offset}`, () =>
      JSON.parse(this.live().span(a.unit, a.offset, b.unit, b.offset)) as TextSpan,
    );
  }

  /** Page and line box of a caret position, `undefined` when it is not laid out. */
  locate(pos: Pos): Location | undefined {
    return this.cached(`at:${pos.unit}:${pos.offset}`, () => {
      const found = JSON.parse(this.live().locate(pos.unit, pos.offset)) as Location | null;
      return found ?? undefined;
    });
  }

  apply(command: Command): CommandResult {
    const result = call(() => JSON.parse(this.live().apply(JSON.stringify(command))) as CommandResult);
    this.bump({ kind: "command", command, result });
    return result;
  }

  /** Forwards one event to the core and returns the events the page should apply. */
  handle(input: EngineInput): EngineEvent[] {
    const events = call(() => JSON.parse(this.live().handle(JSON.stringify(input))) as EngineEvent[]);
    if (events.some((event) => event.type === "applied")) {
      this.cache.clear();
      this.version += 1;
    }
    return events;
  }

  attach(module: string): void {
    this.live().attach(module);
  }

  /** Relayouts flow text with substitution metrics. No-op for formats that ignore them. */
  loadFontMetrics(data: Uint8Array): void {
    const session = this.live();
    if (typeof session.loadFontMetrics !== "function") return;
    call(() => session.loadFontMetrics(data));
    this.cache.clear();
    this.version += 1;
  }

  /** Outline bytes for one raster face. A session without the method keeps the built-in face. */
  loadFontFace(slot: string, data: Uint8Array): void {
    const session = this.live();
    if (typeof session.loadFontFace !== "function") return;
    call(() => session.loadFontFace(slot, data));
  }

  setReadOnly(readOnly: boolean): void {
    this.live().setReadOnly(readOnly);
  }

  /** Caret and selection rectangles the core currently holds. */
  selection(): Extract<EngineEvent, { type: "selection" }> | undefined {
    const event = call(() => JSON.parse(this.live().selection()) as EngineEvent | null);
    return event?.type === "selection" ? event : undefined;
  }

  /** Space reserved for host components in flow layouts (ignored by fixed layouts). */
  setEmbeds(embeds: Embed[]): void {
    if (JSON.stringify(embeds) === JSON.stringify(this.embeds)) return;
    call(() => this.live().setEmbeds(JSON.stringify(embeds)));
    this.embeds = embeds.map((e) => ({ ...e }));
    this.bump({ kind: "embeds" });
  }

  embedBoxes(): EmbedBox[] {
    return this.cached("embeds", () => JSON.parse(this.live().embedBoxes()) as EmbedBox[]);
  }

  revisions(): RevisionView[] {
    return this.cached("revisions", () => JSON.parse(this.live().revisions()) as RevisionView[]);
  }

  search(query: string): SearchHit[] {
    return call(() => JSON.parse(this.live().search(query)) as SearchHit[]);
  }

  exportBytes(): Uint8Array {
    return call(() => this.live().export());
  }

  /** The edited file in its export format (`.doc` sources export as `.docx`). */
  export(): { blob: Blob; name: string; bytes: Uint8Array } {
    const info = this.info();
    const bytes = this.exportBytes();
    return {
      bytes,
      blob: new Blob([bytes as BlobPart], { type: info.exportMime }),
      name: exportName(this.name, info.exportExtension),
    };
  }

  /** Notifies listeners that `handle` already applied `command` and dropped cached views. */
  emitCommand(command: Command, result: CommandResult): void {
    for (const listener of this.listeners) listener({ kind: "command", command, result });
  }

  /** Called after every change. Returns an unsubscribe function. */
  onChange(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Bytes passed to `open`, when the engine kept them for a lazy edit reload. */
  sourceBytes(): Uint8Array | undefined {
    const session = this.live();
    if (typeof session.sourceBytes !== "function") return undefined;
    return call(() => session.sourceBytes!());
  }

  /** Swaps the wasm session after a lazy edit bundle reload. */
  replaceSession(session: EngineSession): void {
    if (this.disposed) throw new FiledomError("disposed", this.name);
    this.session.free();
    this.session = session;
    this.cache.clear();
    this.version += 1;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.listeners.clear();
    this.cache.clear();
    this.session.free();
  }

  private bump(change: DocumentChange): void {
    this.version += 1;
    this.cache.clear();
    for (const listener of this.listeners) listener(change);
  }

  private cached<T>(key: string, load: () => T): T {
    if (this.cache.has(key)) return this.cache.get(key) as T;
    const value = call(load);
    this.cache.set(key, value);
    return value;
  }

  private live(): EngineSession {
    if (this.disposed) throw new FiledomError("disposed", this.name);
    return this.session;
  }
}
