// Session views and commands. The private engine speaks this JSON; keep the two in step.
// Units are PDF points; page coordinates have a top-left origin, y grows down.
// Character offsets count Unicode scalar values (use Array.from(text), not text.length).

/**
 * Distinct kind of file. A document may later be audio, video, image, or vector.
 * Read this from `fileKind` instead of branching on the format name.
 */
export type FileKind = "document" | "image" | "vector" | "audio" | "video" | "archive" | "email";

export type Format =
  | "pdf"
  | "docx"
  | "doc"
  | "xlsx"
  | "pptx"
  | "xls"
  | "ppt"
  | "image"
  | "csv"
  | "ocr"
  | "png"
  | "jpeg"
  | "gif"
  | "webp"
  | "svg"
  | "ai"
  | "bmp"
  | "tiff"
  | "mp3"
  | "wav"
  | "m4a"
  | "mp4"
  | "webm"
  | "mpeg"
  | "eml"
  | "msg"
  | "zip"
  | "gzip"
  | "tar"
  | "7z";

/** Word's manual line break; `\n` in a `replace` command is a paragraph break. */
export const LINE_BREAK = "\u000b";

/** What the open document supports. The UI enables features from these flags only. */
export interface Capabilities {
  /** `replace` inside one unit. */
  editText: boolean;
  /** `replace` across units and with `\n` (paragraph split/merge). */
  editStructure: boolean;
  formatText: boolean;
  formatParagraph: boolean;
  /** `setEmbeds` reserves space in the text flow (block, inline and float modes). */
  flowEmbeds: boolean;
  /** `transformObject` and `deleteObject` on page elements. */
  transform: boolean;
  /** Layer list and `setLayer`. */
  layers: boolean;
  /** `insertElement` for kinds the adapter can place. */
  insert: boolean;
  /** Audio and video timeline: `trimClip`, `setClipSpeed`, and `appendClip`. */
  timeline?: boolean;
}

/** One layer the layers panel can show, hide, or lock. */
export interface LayerView {
  id: string;
  name: string;
  visible: boolean;
  locked?: boolean;
}

/** One undoable edit the track-changes list can restore or revert. */
export interface HistoryEntry {
  id: string;
  label: string;
}

/** Audio or video timeline. Clips on a track play in order. */
export interface TimelineView {
  durationMs: number;
  tracks: TrackView[];
}

/** One track. Clips on it play in order and do not overlap. */
export interface TrackView {
  id: string;
  /** `audio` or `video`. */
  kind: string;
  clips: ClipView[];
}

/** One clip. `outMs` of 0 plays through the end of that source. */
export interface ClipView {
  id: string;
  name: string;
  /** Position on the track, in milliseconds. */
  startMs: number;
  inMs: number;
  outMs: number;
  speed: number;
}

export type DocumentKind = "text" | "image";

/** Page size for a new `.domdoc`. Text uses A4; image uses pixel width and height. */
export type DocumentLayout = { type: "a4" } | { type: "pixels"; width: number; height: number };

export interface CreateDocumentRequest {
  kind: DocumentKind;
  layout: DocumentLayout;
}

export interface DocInfo {
  format: Format;
  pageCount: number;
  trackChanges: boolean;
  author: string;
  pendingRevisions: number;
  /** Extension of the bytes produced by export (a `.doc` exports as `docx`). */
  exportExtension: string;
  exportMime: string;
  canUndo: boolean;
  canRedo: boolean;
  capabilities: Capabilities;
  warnings: string[];
  /** Session edit history for the track-changes list. */
  history?: HistoryEntry[];
  /** Layers for the layers panel. */
  layers?: LayerView[];
  /** Audio or video timeline. Absent for other files. */
  timeline?: TimelineView;
}

export interface Rect {
  xPt: number;
  yPt: number;
  widthPt: number;
  heightPt: number;
}

export interface PageView {
  index: number;
  widthPt: number;
  heightPt: number;
  /** Area inside the page margins (the whole page for fixed-layout formats). */
  content: Rect;
  /** True when the page image comes from raster(). Runs stay for hit-testing and marks. */
  rasterized: boolean;
  runs: RunView[];
  highlights: HighlightRect[];
  /** Space reserved for embeds placed on this page. */
  embeds: EmbedBox[];
  /** Selectable PDF elements. Absent on reflowed pages. */
  objects?: PageObjectView[];
}

/** One PDF element that can be selected, moved, resized, and rotated. */
export interface PageObjectView {
  /** A text unit id, or `p{page}o{index}` for an image, path, or other object. */
  id: string;
  /** `text`, `image`, `path`, `shading`, `form`, `object`, `audio`, or `video`. */
  kind: string;
  xPt: number;
  yPt: number;
  widthPt: number;
  heightPt: number;
  /** Clockwise degrees, y growing down. */
  rotation: number;
  /** Paint order. A higher value is on top. */
  z: number;
  /** Layer this object belongs to. Absent when the file has no layers. */
  layerId?: string;
}

export type RevisionKind = "insert" | "delete" | "replace";

export interface RunRevision {
  id: string;
  kind: RevisionKind;
  author: string;
}

export interface RunView {
  id: string;
  /** Edit address: a DOCX/DOC paragraph id or a PDF text-show op (`page:op`). */
  unit: string;
  /** Offset of this run inside the unit's visible text. */
  unitStart: number;
  text: string;
  /** Baseline origin of the first glyph. */
  xPt: number;
  yPt: number;
  widthPt: number;
  fontSizePt: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  color?: string;
  font?: string;
  /** One advance per character of `text`. */
  advances: number[];
  editable: boolean;
  revision?: RunRevision;
  /** Paint this run over the page raster after an edit. */
  redraw?: boolean;
  /** Raster ink to cover before painting, in points. */
  clearPt?: number;
}

export interface HighlightRect extends Rect {
  color: string;
}

export interface RevisionView {
  id: string;
  kind: RevisionKind;
  author: string;
  date: string;
  unit: string;
  inserted: string;
  deleted: string;
}

export interface SearchHit {
  unit: string;
  start: number;
  end: number;
  page: number;
}

export interface UnitRange {
  unit: string;
  start: number;
  end: number;
}

/** A caret position: offset into the unit's visible text. */
export interface Pos {
  unit: string;
  offset: number;
}

/** Ordered text between two carets; one range per unit, empty units included. */
export interface TextSpan {
  start: Pos;
  end: Pos;
  ranges: UnitRange[];
}

/** Page and line box of a caret position. */
export interface Location {
  page: number;
  xPt: number;
  /** Top of the line box. */
  yPt: number;
  heightPt: number;
}

export type VertAlign = "baseline" | "superscript" | "subscript";

/** Character formatting to apply; omitted fields are left unchanged. `color: ""` is automatic. */
export interface TextStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  vertAlign?: VertAlign;
  sizePt?: number;
  color?: string;
  font?: string;
}

export type Align = "left" | "center" | "right" | "justify";

/** Paragraph formatting to apply; omitted fields are left unchanged. */
export interface ParagraphPatch {
  align?: Align;
  indentLeftPt?: number;
  /** Added to the left indent (Increase/Decrease Indent); clamped at 0. */
  indentByPt?: number;
  indentRightPt?: number;
  /** Positive: first-line indent; negative: hanging indent. */
  indentFirstLinePt?: number;
  spaceBeforePt?: number;
  spaceAfterPt?: number;
  /** Line height multiplier (1 = single, 2 = double). */
  lineSpacing?: number;
}

export type Command =
  /** Replaces the visible text between two carets (either order). */
  | { type: "replace"; from: Pos; to: Pos; text: string }
  | { type: "format"; ranges: UnitRange[]; style: TextStyle }
  | { type: "setParagraph"; units: string[]; style: ParagraphPatch }
  /** `color: null` removes highlighting. */
  | { type: "highlight"; ranges: UnitRange[]; color: string | null }
  | { type: "setTrackChanges"; enabled: boolean; author?: string }
  | { type: "accept"; id: string }
  | { type: "reject"; id: string }
  | { type: "acceptAll" }
  | { type: "rejectAll" }
  | { type: "undo" }
  | { type: "redo" }
  /** Moves one anchored line. Baseline origin, page points, top-left, y down. */
  | { type: "moveUnit"; unit: string; xPt: number; yPt: number }
  /** Moves, resizes, or rotates one PDF element around its center. */
  | {
      type: "transformObject";
      id: string;
      dxPt: number;
      dyPt: number;
      scaleX: number;
      scaleY: number;
      rotateDeg: number;
    }
  /** Removes one PDF element: a text line, image, path, or other page object. */
  | { type: "deleteObject"; id: string }
  /** Shows, hides, or locks one layer. Omitted fields stay unchanged. */
  | { type: "setLayer"; id: string; visible?: boolean | null; locked?: boolean | null }
  /** Restores the document to the named history entry. Later entries stay available. */
  | { type: "restoreHistory"; id: string }
  /** Places an image, text box, or shape. */
  | { type: "insertElement"; kind: string; page: number; xPt?: number; yPt?: number }
  /** Creates an empty `.domdoc` of the given kind and layout. */
  | { type: "createDocument"; kind: DocumentKind; layout: DocumentLayout }
  /** Writes the open native session as a generic `.domdoc` snapshot. */
  | { type: "storeDomdoc" }
  /** Display only. The file stays unchanged until accept or reject. */
  | { type: "setView"; view: ReviewView }
  | { type: "deletePage"; index: number }
  | { type: "markup"; ranges: UnitRange[]; kind: MarkupKind; color?: string; author?: string }
  | {
      type: "shape";
      id?: string;
      kind: ShapeKind;
      page: number;
      points?: PagePoint[];
      text?: string;
      locked?: boolean;
    }
  | { type: "setAnnotationStatus"; id: string; status: AnnotationStatus }
  | { type: "moveAnnotation"; id: string; xPt: number; yPt: number }
  | { type: "resizeAnnotation"; id: string; widthPt: number; heightPt: number }
  /** `scale` is page points per `unit`. */
  | { type: "measure"; kind: MeasureKind; page: number; points?: PagePoint[]; scale: number; unit: string }
  | { type: "setFieldValue"; name: string; value: string }
  | { type: "createField"; name: string; kind: FieldKind; page: number; rect: Rect; required?: boolean }
  | { type: "setFormValidation"; enforceRequired: boolean }
  | {
      type: "redact";
      op: RedactOp;
      ranges?: UnitRange[];
      page?: number;
      rect?: Rect;
      pattern?: string;
      prompt?: string;
    }
  | { type: "placeAppearance"; page: number; rect: Rect; source: AppearanceSource; label?: string }
  | { type: "addComment"; ranges: UnitRange[]; text: string; quote?: string }
  | { type: "replyComment"; id: string; text: string }
  | { type: "resolveComment"; id: string; resolved: boolean }
  | { type: "checkpoint"; id: string; op: CheckpointOp }
  /** Trims one timeline clip. `endMs` of 0 keeps the source through its end. */
  | { type: "trimClip"; id: string; startMs: number; endMs: number }
  /** Playback and export speed for one clip. `1` is the original speed. */
  | { type: "setClipSpeed"; id: string; speed: number }
  /** Appends another file of the same kind onto a track, after the last clip. `bytes` is a JSON number array. */
  | { type: "appendClip"; track: string; name: string; bytes: number[] };

export type ReviewView = "original" | "final" | "markup";
export type MarkupKind = "underline" | "strikeout" | "squiggle";
export type ShapeKind = "ink" | "line" | "arrow" | "rectangle" | "ellipse" | "freeText" | "stamp" | "image";
export type AnnotationStatus = "none" | "accepted" | "rejected" | "cancelled" | "completed";
export type MeasureKind = "distance" | "perimeter" | "polygonArea" | "rectangleArea" | "ellipseArea";
export type FieldKind = "text" | "checkbox" | "radio" | "choice" | "signature";
export type RedactOp = "mark" | "preview" | "apply" | "purge";
export type AppearanceSource = "drawn" | "typed" | "uploaded";
export type CheckpointOp = "save" | "restore";

export interface PagePoint {
  xPt: number;
  yPt: number;
}

export interface CommandResult {
  /** Where the caret belongs after the command. */
  caret?: Pos;
}

export interface LogEntry {
  author: string;
  clock: string;
  command: Command;
  caret?: Pos;
}

export interface CommandLog {
  entries: LogEntry[];
}

/** Flags for `searchQuery`. `search(query)` remains the plain substring search. */
export interface SearchQuery {
  text: string;
  wholeWord?: boolean;
  caseSensitive?: boolean;
  regex?: boolean;
}

export interface OutlineEntry {
  title: string;
  page: number;
  children?: OutlineEntry[];
}

export interface PackageComponent {
  id: string;
  componentType: string;
  props: unknown;
}

export interface PackageManifest {
  nativeName: string;
  components: PackageComponent[];
}

export interface Conflict {
  unit: string;
  left: string;
  right: string;
}

export interface Citation {
  page: number;
  unit: string;
  start: number;
  end: number;
}

export interface CompareChange {
  before: string;
  after: string;
}

export interface CompareReport {
  changes: CompareChange[];
  refused: string[];
}

export interface SignatureByteRange {
  offset: number;
  length: number;
}

export type PdfConformance = "pdfA2" | "pdfUa";

export interface PdfExportRequest {
  conformance?: PdfConformance;
}

export interface XfaDiagnostic {
  dynamic: boolean;
  hasStaticAppearance: boolean;
  detail: string;
}

export type EmbedMode = "block" | "inline" | "floatLeft" | "floatRight";

/** Space a host component reserves in the flow layout (layout input, never exported). */
export interface Embed {
  id: string;
  unit: string;
  offset: number;
  mode: EmbedMode;
  widthPt: number;
  heightPt: number;
  gapPt: number;
}

export interface EmbedBox extends Rect {
  id: string;
  page: number;
}

/** Caret motion the page forwards. The core resolves it to a position. */
export type CaretMove =
  | "left"
  | "right"
  | "wordLeft"
  | "wordRight"
  | "up"
  | "down"
  | "lineStart"
  | "lineEnd"
  | "docStart"
  | "docEnd";

/** Input the page forwards. The core decides what it means. */
export type EngineInput =
  | { type: "pointer"; phase: "down" | "move" | "up" | "click"; page: number; xPt: number; yPt: number; detail?: number }
  | { type: "move"; move: CaretMove; extend?: boolean }
  | { type: "select"; anchor: Pos; focus: Pos; goalX?: number }
  | { type: "selectAll" }
  | { type: "zoom"; op: "set"; zoom: number }
  | { type: "zoom"; op: "step"; direction: 1 | -1 }
  | { type: "zoom"; op: "wheel"; deltaY: number; deltaMode?: number }
  | { type: "zoom"; op: "fit"; mode: "width" | "page"; viewportWidth: number; viewportHeight: number; pageWidthPt: number; pageHeightPt: number }
  | { type: "scan" }
  | { type: "text"; text: string };

export type EngineEvent =
  | { type: "handled" }
  | {
      type: "selection";
      anchor: Pos;
      focus: Pos;
      rects: Array<Rect & { page: number }>;
      caret: { page: number; xPt: number; yPt: number; heightPt: number; pos: Pos } | null;
      goalX: number | null;
    }
  | { type: "zoom"; zoom: number }
  | { type: "need"; module: string }
  | { type: "applied"; result: CommandResult }
  | { type: "error"; code: string; detail: string };

/** Shape of the wasm-bindgen `DomdocSession` class exported by every format bundle. */
export interface EngineSession {
  info(): string;
  page(index: number): string;
  raster(index: number, scale: number): EngineRaster | undefined;
  /** HTML page image from `office_oxide`, or `null` for PDF and after an edit. */
  pageImage?(): string | undefined;
  unitText(unit: string): string;
  span(aUnit: string, aOffset: number, bUnit: string, bOffset: number): string;
  locate(unit: string, offset: number): string;
  apply(commandJson: string): string;
  /** One input event in, output events out. */
  handle(inputJson: string): string;
  /** Marks a lazy feature (`edit`, `fonts`) as loaded. */
  attach(module: string): void;
  /** Times substitution metrics, fetched only after `need: fonts`. */
  loadFontMetrics(data: Uint8Array): void;
  /** Outline face for a reflowable page raster. Ignored by fixed-layout sessions. */
  loadFontFace(slot: string, data: Uint8Array): void;
  setReadOnly(readOnly: boolean): void;
  /** JSON selection event, or `null` when the core holds no caret. */
  selection(): string;
  setEmbeds(embedsJson: string): void;
  embedBoxes(): string;
  revisions(): string;
  search(query: string): string;
  export(): Uint8Array;
  /** Original bytes at open when the format keeps them (lazy edit reload). */
  sourceBytes?(): Uint8Array | undefined;
  free(): void;
}

export interface EngineRaster {
  readonly width: number;
  readonly height: number;
  takeRgba(): Uint8Array;
  free(): void;
}

/** A per-format engine module loaded from the CDN (`{base}/{format}/domdoc_{format}.js`). */
export interface EngineModule {
  default: (init?: unknown) => Promise<unknown>;
  /** PDF bundles accept an optional user password; other formats ignore it. */
  open(bytes: Uint8Array, password?: string): EngineSession;
  format(): string;
}
