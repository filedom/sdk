import {
  codeCaretPoint,
  LINES_PER_CODE_ELEMENT,
  mountCodeElement,
  offsetInCodeText,
  splitCodeElements,
  type CodeElementSlice,
} from "./code-element.js";
import { defaultDisplayLayout, type DisplayLayout } from "./display-layout.js";
import { elementFactory } from "./dom.js";
import type { Capabilities, DocInfo } from "./engine-types.js";
import { HistoryPanel } from "./history.js";
import { VIEWER_CSS } from "./styles.js";
import {
  themeConfigForPreset,
  themeConfigOf,
  themePresetById,
  themePresetId,
  themeTokenCss,
  themeValues,
  type ThemeConfig,
  type ThemeName,
  type ThemePreference,
} from "./theme.js";
import { Toolbar, type ToolbarLayout, type ViewMode } from "./toolbar.js";
import { clampZoom, stepZoom, wheelZoom, type FitMode } from "./zoom.js";

/**
 * Open code view. Formatting and colors live in this file so a host can
 * change them. Pass `format` and `style` to one mount, or edit `codeFormat`
 * and `codeStyle` for every mount that does not pass its own.
 */
export interface CodeStyle {
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  background: string;
  foreground: string;
  comment: string;
  keyword: string;
  string: string;
  number: string;
  function: string;
  type: string;
  punctuation: string;
}

export interface CodeFormat {
  /** Spaces per indent level. */
  indent: number;
  /** Add a semicolon to a JavaScript statement that does not end with one. */
  semicolons: boolean;
  /** Quote style used when a string literal can be converted safely. */
  quote: "single" | "double";
  /** Keep a trailing comma on the last item of a multiline list. */
  trailingComma: boolean;
}

export const codeStyle: CodeStyle = {
  fontFamily: '"IBM Plex Mono", "SFMono-Regular", ui-monospace, monospace',
  fontSize: "13px",
  lineHeight: "1.55",
  background: "#0c1220",
  foreground: "#e7eef8",
  comment: "#7f8da3",
  keyword: "#8eb6ff",
  string: "#9ddeb4",
  number: "#f0c28a",
  function: "#d7e4ff",
  type: "#c4b5fd",
  punctuation: "#93a0b5",
};

export const codeFormat: CodeFormat = {
  indent: 2,
  semicolons: true,
  quote: "double",
  trailingComma: true,
};

const LANGUAGES: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  mts: "typescript",
  cts: "typescript",
  js: "javascript",
  jsx: "jsx",
  mjs: "javascript",
  cjs: "javascript",
  html: "html",
  htm: "html",
  xhtml: "html",
  css: "css",
  scss: "scss",
  sass: "sass",
  less: "less",
  styl: "css",
  pcss: "css",
  json: "json",
  jsonc: "json",
  json5: "json",
  md: "markdown",
  mdx: "markdown",
  rst: "rst",
  adoc: "asciidoc",
  asciidoc: "asciidoc",
  org: "org",
  tex: "tex",
  latex: "tex",
  bib: "tex",
  xml: "xml",
  xsl: "xml",
  xslt: "xml",
  yml: "yaml",
  yaml: "yaml",
  toml: "toml",
  ini: "ini",
  cfg: "ini",
  conf: "ini",
  properties: "ini",
  env: "ini",
  txt: "text",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  fish: "shell",
  ps1: "powershell",
  bat: "batch",
  cmd: "batch",
  awk: "awk",
  nu: "shell",
  py: "python",
  pyi: "python",
  pyw: "python",
  rb: "ruby",
  php: "php",
  pl: "perl",
  pm: "perl",
  lua: "lua",
  r: "r",
  jl: "julia",
  ex: "elixir",
  exs: "elixir",
  erl: "erlang",
  hrl: "erlang",
  clj: "clojure",
  cljs: "clojure",
  cljc: "clojure",
  hs: "haskell",
  ml: "ocaml",
  mli: "ocaml",
  elm: "elm",
  purs: "purescript",
  gleam: "gleam",
  hx: "haxe",
  coffee: "coffeescript",
  fs: "fsharp",
  fsx: "fsharp",
  scala: "scala",
  kt: "kotlin",
  kts: "kotlin",
  java: "java",
  groovy: "groovy",
  gradle: "groovy",
  swift: "swift",
  dart: "dart",
  cs: "csharp",
  vb: "vb",
  c: "c",
  h: "c",
  cc: "cpp",
  cpp: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  hh: "cpp",
  hxx: "cpp",
  m: "objc",
  mm: "objc",
  go: "go",
  rs: "rust",
  zig: "zig",
  nim: "nim",
  cr: "crystal",
  d: "d",
  v: "v",
  sv: "verilog",
  svh: "verilog",
  pas: "pascal",
  ada: "ada",
  adb: "ada",
  ads: "ada",
  f: "fortran",
  f90: "fortran",
  f95: "fortran",
  cob: "cobol",
  cbl: "cobol",
  lisp: "lisp",
  cl: "lisp",
  lsp: "lisp",
  scm: "scheme",
  rkt: "scheme",
  sql: "sql",
  graphql: "graphql",
  gql: "graphql",
  proto: "protobuf",
  thrift: "thrift",
  prisma: "prisma",
  tf: "terraform",
  tfvars: "terraform",
  hcl: "terraform",
  nix: "nix",
  sol: "solidity",
  asm: "assembly",
  s: "assembly",
  wat: "wat",
  cmake: "cmake",
  mk: "make",
  bzl: "starlark",
  feature: "gherkin",
  ipynb: "notebook",
};

/** Source files that have no extension. */
const FILE_NAMES: Record<string, string> = {
  dockerfile: "docker",
  containerfile: "docker",
  makefile: "make",
  gemfile: "ruby",
  rakefile: "ruby",
  procfile: "yaml",
  jenkinsfile: "groovy",
  vagrantfile: "ruby",
  brewfile: "ruby",
  justfile: "make",
};

const HASH_COMMENT = new Set([
  "python",
  "shell",
  "yaml",
  "toml",
  "ruby",
  "perl",
  "r",
  "elixir",
  "docker",
  "make",
  "ini",
  "julia",
  "nim",
  "crystal",
  "powershell",
  "terraform",
  "haskell",
  "cmake",
  "nix",
  "awk",
]);

const KEYWORDS = new Set([
  "const",
  "let",
  "var",
  "function",
  "return",
  "if",
  "else",
  "for",
  "while",
  "class",
  "extends",
  "new",
  "import",
  "export",
  "from",
  "default",
  "async",
  "await",
  "type",
  "interface",
  "enum",
  "public",
  "private",
  "protected",
  "static",
  "readonly",
  "implements",
  "package",
  "fn",
  "let",
  "mut",
  "struct",
  "impl",
  "pub",
  "use",
  "mod",
  "match",
  "def",
  "elif",
  "None",
  "True",
  "False",
  "func",
  "package",
  "in",
  "of",
  "as",
  "typeof",
  "void",
  "null",
  "undefined",
  "true",
  "false",
  "this",
  "super",
]);

export interface CodeToken {
  kind: keyof CodeStyle | "text";
  text: string;
}

export function languageFromName(name: string): string | undefined {
  const base = (name.split(/[/\\]/).pop() ?? name).toLowerCase();
  const named = FILE_NAMES[base];
  if (named) return named;
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return undefined;
  return LANGUAGES[base.slice(dot + 1)];
}

export function isCodeFile(name: string): boolean {
  return languageFromName(name) !== undefined;
}

/** A named source file, or any other text file that is not a document. */
export function canOpenAsCode(name: string, bytes?: Uint8Array): boolean {
  if (isCodeFile(name)) return true;
  if (!bytes) return false;
  return looksLikeText(bytes);
}

function looksLikeText(bytes: Uint8Array): boolean {
  if (bytes.length === 0) return true;
  if (bytes.length >= 2 && ((bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff))) {
    return true;
  }
  const sample = bytes.subarray(0, Math.min(bytes.length, 8192));
  let controls = 0;
  for (let i = 0; i < sample.length; i++) {
    const byte = sample[i] ?? 0;
    if (byte === 0) return false;
    if (byte < 9 || (byte > 13 && byte < 32)) controls += 1;
  }
  if (sample.length > 0 && controls / sample.length > 0.02) return false;
  const text = new TextDecoder("utf-8", { fatal: false }).decode(sample);
  const broken = text.split("\uFFFD").length - 1;
  return text.length === 0 || broken / text.length < 0.02;
}

export function formatCode(source: string, language: string, format: CodeFormat = codeFormat): string {
  const normalized = source.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "");
  if (language === "json") return formatJson(normalized, format);
  if (language === "javascript" || language === "typescript" || language === "tsx" || language === "jsx" || language === "css" || language === "json") {
    return finish(reindent(applyQuotes(normalized, language, format), format));
  }
  return finish(normalized);
}

export function highlightCode(source: string, language: string): CodeToken[] {
  const tokens: CodeToken[] = [];
  const text = source;
  let index = 0;
  while (index < text.length) {
    const rest = text.slice(index);
    const comment = matchComment(rest, language);
    if (comment) {
      tokens.push({ kind: "comment", text: comment });
      index += comment.length;
      continue;
    }
    const string = matchString(rest);
    if (string) {
      tokens.push({ kind: "string", text: string });
      index += string.length;
      continue;
    }
    const number = rest.match(/^(?:0x[\da-fA-F]+|\d+(?:\.\d+)?)/);
    if (number) {
      tokens.push({ kind: "number", text: number[0] });
      index += number[0].length;
      continue;
    }
    const word = rest.match(/^[A-Za-z_$][\w$]*/);
    if (word) {
      const value = word[0];
      const after = text.slice(index + value.length);
      const kind = KEYWORDS.has(value) ? "keyword" : /^[A-Z]/.test(value) ? "type" : /^\s*\(/.test(after) ? "function" : "text";
      tokens.push({ kind, text: value });
      index += value.length;
      continue;
    }
    const punct = rest.match(/^[^\s\w$]+/);
    if (punct) {
      tokens.push({ kind: "punctuation", text: punct[0] });
      index += punct[0].length;
      continue;
    }
    tokens.push({ kind: "text", text: rest[0] ?? "" });
    index += 1;
  }
  return tokens;
}

export function renderCodeHtml(source: string, language: string, style: CodeStyle = codeStyle): string {
  return highlightCode(source, language)
    .map((token) => {
      const color = token.kind === "text" ? style.foreground : style[token.kind];
      return `<span style="color:${color}">${escapeHtml(token.text)}</span>`;
    })
    .join("");
}

/** Colors that stay readable on the white document page. */
const PAGE_INK: Pick<CodeStyle, "foreground" | "comment" | "keyword" | "string" | "number" | "function" | "type" | "punctuation"> = {
  foreground: "#07131c",
  comment: "#4c6072",
  keyword: "#3564d9",
  string: "#0b7a4b",
  number: "#9a5b00",
  function: "#07131c",
  type: "#3b4b8a",
  punctuation: "#4c6072",
};

/** A dark editor palette is remapped. The element itself stays on the page color. */
function colorsForPage(style: CodeStyle): CodeStyle {
  return darkBackground(style.background) ? { ...style, ...PAGE_INK } : style;
}

function darkBackground(color: string): boolean {
  const hex = color.trim().match(/^#([\da-f]{6})$/i)?.[1];
  if (!hex) return false;
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.45;
}

export interface CodeEditorOptions {
  name: string;
  source: string;
  language?: string;
  style?: CodeStyle;
  format?: CodeFormat;
  readOnly?: boolean;
  onChange?: (value: string, name: string) => void;
  /** Close control. Omitted: Close does nothing. */
  onClose?: () => void;
  /** File › Open. The host decides how the chosen file is opened. */
  onOpenFile?: (file: File) => void;
  /** Document chrome theme. Omitted: light. */
  theme?: ThemePreference;
  /** Side rails. Omitted: the document default. */
  toolbarLayout?: Partial<ToolbarLayout>;
  onToolbarLayout?: (layout: ToolbarLayout) => void;
}

export interface CodeEditor {
  getValue(): string;
  format(): string;
  /** Opens a file as the first tab. A file already open is shown instead. */
  open(name: string, source: string): void;
  destroy(): void;
}

interface CodeTab {
  id: string;
  name: string;
  language: string;
  value: string;
  past: string[];
  future: string[];
  changes: { id: string; label: string; before: string; after: string }[];
  changeId: number;
  display: DisplayLayout;
  zoom: number;
  scrollTop: number;
  query: string;
  hitIndex: number;
}

function createCodeTab(name: string, source: string, format: CodeFormat, explicit: string | undefined, seq: number): CodeTab {
  const language = explicit ?? languageFromName(name) ?? "text";
  return {
    id: `code-${seq}`,
    name,
    language,
    value: formatCode(source, language, format),
    past: [],
    future: [],
    changes: [],
    changeId: 0,
    display: defaultDisplayLayout(name),
    zoom: 1,
    scrollTop: 0,
    query: "",
    hitIndex: -1,
  };
}

interface Metric {
  padL: number;
  padT: number;
  lineHeight: number;
  charWidth: number;
}

/** Mounts source as full-width elements. Line numbers sit on the left. The caret stays in the hidden field. */
export function mountCodeEditor(host: HTMLElement, options: CodeEditorOptions): CodeEditor {
  const style = options.style ?? codeStyle;
  const format = options.format ?? codeFormat;
  const h = elementFactory(host.ownerDocument);
  let tabSeq = 1;
  const tabs: CodeTab[] = [createCodeTab(options.name, options.source, format, options.language, tabSeq)];
  let active = tabs[0]!;
  let language = active.language;
  let value = active.value;
  let viewMode: ViewMode = options.readOnly ? "view" : "live";
  let display: DisplayLayout = active.display;
  let zoom = active.zoom;
  let query = active.query;
  let hitIndex = active.hitIndex;
  let helpOn = false;
  let toolbarsLocked = false;
  let historyVisible = false;
  let themeConfig: ThemeConfig = themeConfigOf(options.theme ?? "light");
  const hiddenGroups: string[] = [];
  let past = active.past;
  let future = active.future;
  let changes = active.changes;
  let changeId = active.changeId;
  const capabilities: Capabilities = {
    editText: true,
    editStructure: true,
    formatText: false,
    formatParagraph: false,
    flowEmbeds: false,
    transform: false,
    layers: false,
    insert: false,
  };

  host.replaceChildren();
  host.classList.add("fd-code", "dd-viewer");
  host.dataset.dd = "code";
  host.dataset.display = display;
  host.classList.toggle("fd-code-readonly", options.readOnly === true);
  const css = host.ownerDocument.createElement("style");
  css.textContent = codeCss();
  const viewerCss = host.ownerDocument.createElement("style");
  viewerCss.textContent = VIEWER_CSS;
  const themeStyle = host.ownerDocument.createElement("style");
  const pagesEl = h("div", "dd-pages");
  const input = h("textarea", "dd-input") as HTMLTextAreaElement;
  pagesEl.append(input);
  input.value = value;
  input.spellcheck = false;
  input.readOnly = options.readOnly === true;
  input.setAttribute("aria-label", options.name);
  let pieces: CodeElementSlice[] = splitCodeElements(value);

  const history = new HistoryPanel(h, {
    restoreHistory: (id) => restoreChange(id),
    revertHistory: (id) => revertChange(id),
    hideTray: () => setTrayVisible("history", false),
  });
  history.el.hidden = true;

  const toolbar = new Toolbar(h, actions(), "#fff59d", options.toolbarLayout);

  const body = h("div", "dd-body");
  const historyHost = toolbar.reviewHost("history");
  if (historyHost) historyHost.replaceChildren(history.el);
  body.append(pagesEl);
  if (!historyHost) body.append(history.el);
  const workspace = h("div", "dd-workspace");
  workspace.append(toolbar.leftRail, body, toolbar.rightRail);
  host.append(css, viewerCss, themeStyle, toolbar.el, workspace);
  writeZoom();
  paintTheme(themeConfig);
  paint();
  renderHistory();
  sync();

  const onInput = () => {
    if (input.value === value) return;
    commit(input.value, true);
  };
  const onSelect = () => {
    paintMarks();
    placeInput();
    if (input.selectionStart === input.selectionEnd) revealOffset(input.selectionStart);
    sync();
  };
  const onWheel = (event: WheelEvent) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    applyZoom(wheelZoom(zoom, event.deltaY, event.deltaMode));
  };
  let dragAnchor = 0;
  const onPointerDown = (event: PointerEvent) => {
    const target = event.target as Element | null;
    if (target?.closest("button, a, input, textarea")) return;
    const offset = offsetAt(event.clientX, event.clientY);
    if (offset === undefined) return;
    event.preventDefault();
    pagesEl.setPointerCapture?.(event.pointerId);
    input.focus();
    dragAnchor = event.shiftKey ? input.selectionStart : offset;
    input.setSelectionRange(Math.min(dragAnchor, offset), Math.max(dragAnchor, offset));
    onSelect();
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!pagesEl.hasPointerCapture?.(event.pointerId)) return;
    const offset = offsetAt(event.clientX, event.clientY);
    if (offset === undefined) return;
    input.setSelectionRange(Math.min(dragAnchor, offset), Math.max(dragAnchor, offset));
    onSelect();
  };
  const onComposeStart = () => input.classList.add("dd-composing");
  const onCompose = () => input.classList.remove("dd-composing");
  input.addEventListener("input", onInput);
  input.addEventListener("select", onSelect);
  input.addEventListener("keyup", onSelect);
  input.addEventListener("compositionstart", onComposeStart);
  input.addEventListener("compositionend", onCompose);
  pagesEl.addEventListener("wheel", onWheel, { passive: false });
  pagesEl.addEventListener("pointerdown", onPointerDown);
  pagesEl.addEventListener("pointermove", onPointerMove);

  const editor: CodeEditor = {
    getValue: () => value,
    open: (name, source) => openBuffer(name, source),
    format: () => {
      commit(formatCode(value, language, format), true);
      return value;
    },
    destroy: () => {
      input.removeEventListener("input", onInput);
      input.removeEventListener("select", onSelect);
      input.removeEventListener("keyup", onSelect);
      input.removeEventListener("compositionstart", onComposeStart);
      input.removeEventListener("compositionend", onCompose);
      pagesEl.removeEventListener("wheel", onWheel);
      pagesEl.removeEventListener("pointerdown", onPointerDown);
      pagesEl.removeEventListener("pointermove", onPointerMove);
      toolbar.destroy();
      host.replaceChildren();
    },
  };
  return editor;

  function storeTab(): void {
    active.value = value;
    active.language = language;
    active.past = past;
    active.future = future;
    active.changes = changes;
    active.changeId = changeId;
    active.display = display;
    active.zoom = zoom;
    active.scrollTop = pagesEl.scrollTop;
    active.query = query;
    active.hitIndex = hitIndex;
  }

  function showTab(tab: CodeTab): void {
    active = tab;
    language = tab.language;
    value = tab.value;
    past = tab.past;
    future = tab.future;
    changes = tab.changes;
    changeId = tab.changeId;
    display = tab.display;
    zoom = tab.zoom;
    query = tab.query;
    hitIndex = tab.hitIndex;
    input.value = value;
    input.setAttribute("aria-label", tab.name);
    host.dataset.display = display;
    writeZoom();
    paint();
    pagesEl.scrollTop = tab.scrollTop;
    renderHistory();
    sync();
  }

  function openBuffer(name: string, source: string): void {
    const found = tabs.find((tab) => tab.name === name);
    if (found) {
      if (found.id !== active.id) {
        storeTab();
        showTab(found);
      }
      return;
    }
    storeTab();
    tabSeq += 1;
    const tab = createCodeTab(name, source, format, undefined, tabSeq);
    tabs.unshift(tab);
    showTab(tab);
  }

  function selectCodeTab(id: string): void {
    if (id === active.id) return;
    const tab = tabs.find((item) => item.id === id);
    if (!tab) return;
    storeTab();
    showTab(tab);
  }

  function closeActive(): void {
    storeTab();
    const index = tabs.findIndex((tab) => tab.id === active.id);
    if (index >= 0) tabs.splice(index, 1);
    const next = tabs[0];
    if (!next) {
      options.onClose?.();
      return;
    }
    showTab(next);
  }

  function reorderCodeTabs(ids: readonly string[]): void {
    if (ids.length !== tabs.length) return;
    const byId = new Map(tabs.map((tab) => [tab.id, tab]));
    const next: CodeTab[] = [];
    for (const id of ids) {
      const tab = byId.get(id);
      if (!tab) return;
      next.push(tab);
    }
    if (next.every((tab, index) => tab === tabs[index])) return;
    tabs.splice(0, tabs.length, ...next);
    sync();
  }

  function paint() {
    const paginated = display === "paginated";
    pieces = splitCodeElements(value, paginated ? LINES_PER_PAGE : LINES_PER_CODE_ELEMENT);
    const ink = colorsForPage(style);
    for (const node of [...pagesEl.children]) {
      if (node !== input) node.remove();
    }
    pieces.forEach((piece, index) => {
      const el = mountCodeElement(host.ownerDocument, piece, {
        html: renderCodeHtml(piece.text, language, ink),
      });
      if (!paginated) {
        pagesEl.insertBefore(el, input);
        return;
      }
      const page = h("div", "dd-page");
      page.dataset.page = String(index);
      page.style.setProperty("--pw", "612");
      page.style.setProperty("--ph", "792");
      page.append(el);
      pagesEl.insertBefore(page, input);
    });
    paintMarks();
    placeInput();
  }

  function paintMarks() {
    const nodes = [...pagesEl.querySelectorAll<HTMLElement>(".dd-code-element")];
    nodes.forEach((node, index) => {
      const piece = pieces[index];
      const marks = node.querySelector<HTMLElement>(".dd-code-marks");
      const pre = node.querySelector<HTMLElement>(".dd-code-text");
      if (!piece || !marks || !pre) return;
      marks.replaceChildren();
      const metric = measure(pre);
      if (query) {
        for (const [hit, at] of matchIndexes(value, query).entries()) {
          drawRange(marks, piece, metric, at, at + query.length, "dd-code-hit", hit === hitIndex);
        }
      }
      const start = input.selectionStart;
      const end = input.selectionEnd;
      if (end > start) drawRange(marks, piece, metric, start, end, "dd-code-sel");
      else if (viewMode !== "view" && owns(start, piece, index === pieces.length - 1)) {
        const point = codeCaretPoint(piece.text, start - piece.startOffset);
        const beam = h("div", "dd-code-caret");
        beam.style.left = `${metric.padL + point.column * metric.charWidth}px`;
        beam.style.top = `${metric.padT + point.line * metric.lineHeight}px`;
        beam.style.height = `${metric.lineHeight}px`;
        marks.append(beam);
      }
    });
  }

  function drawRange(
    marks: HTMLElement,
    piece: CodeElementSlice,
    metric: Metric,
    start: number,
    end: number,
    className: string,
    current = false,
  ) {
    const from = piece.startOffset;
    const to = from + piece.text.length;
    const localStart = Math.max(start, from) - from;
    const localEnd = Math.min(end, to) - from;
    if (localEnd <= localStart) return;
    const lines = piece.text.split("\n");
    let offset = 0;
    for (let line = 0; line < lines.length; line += 1) {
      const row = lines[line] ?? "";
      const rowEnd = offset + row.length;
      const a = Math.max(localStart, offset);
      const b = Math.min(localEnd, rowEnd);
      if (b > a) {
        const startCol = codeCaretPoint(piece.text, a).column;
        const endCol = codeCaretPoint(piece.text, b).column;
        const mark = h("div", className);
        if (current) mark.dataset.current = "";
        mark.style.left = `${metric.padL + startCol * metric.charWidth}px`;
        mark.style.top = `${metric.padT + line * metric.lineHeight}px`;
        mark.style.width = `${Math.max((endCol - startCol) * metric.charWidth, 2)}px`;
        mark.style.height = `${metric.lineHeight}px`;
        marks.append(mark);
      }
      offset = rowEnd + 1;
    }
  }

  function owns(offset: number, piece: CodeElementSlice, last: boolean): boolean {
    const to = piece.startOffset + piece.text.length;
    if (offset < piece.startOffset) return false;
    if (offset < to) return true;
    return last && offset === to;
  }

  function measure(pre: HTMLElement): Metric {
    const computed = getComputedStyle(pre);
    const fontSize = Number.parseFloat(computed.fontSize) || 13 * zoom;
    const lineHeight = Number.parseFloat(computed.lineHeight) || fontSize * 1.55;
    const padL = Number.parseFloat(computed.paddingLeft) || 0;
    const padT = Number.parseFloat(computed.paddingTop) || 0;
    let charWidth = fontSize * 0.6;
    const probe = h("span");
    probe.textContent = "0000000000";
    probe.style.font = computed.font;
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    pre.append(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    if (width > 0) charWidth = width / 10;
    return { padL, padT, lineHeight, charWidth };
  }

  function caretBox(offset: number): { top: number; left: number; height: number } | undefined {
    const found = pieceAt(offset);
    if (!found) return undefined;
    const pre = found.node.querySelector<HTMLElement>(".dd-code-text");
    if (!pre) return undefined;
    const metric = measure(pre);
    const point = codeCaretPoint(found.piece.text, Math.max(0, offset - found.piece.startOffset));
    const preBox = pre.getBoundingClientRect();
    const view = pagesEl.getBoundingClientRect();
    return {
      top: preBox.top - view.top + pagesEl.scrollTop + metric.padT + point.line * metric.lineHeight,
      left: preBox.left - view.left + pagesEl.scrollLeft + metric.padL + point.column * metric.charWidth,
      height: metric.lineHeight,
    };
  }

  function pieceAt(offset: number): { node: HTMLElement; piece: CodeElementSlice } | undefined {
    const nodes = [...pagesEl.querySelectorAll<HTMLElement>(".dd-code-element")];
    for (let index = 0; index < pieces.length; index += 1) {
      const piece = pieces[index];
      const node = nodes[index];
      if (!piece || !node) continue;
      if (owns(offset, piece, index === pieces.length - 1)) return { node, piece };
    }
    return undefined;
  }

  function placeInput() {
    const box = caretBox(input.selectionStart);
    if (!box) return;
    input.style.top = `${box.top}px`;
    input.style.left = `${box.left}px`;
  }

  function revealOffset(offset: number) {
    const box = caretBox(offset);
    if (!box) return;
    const bottom = box.top + box.height;
    if (box.top < pagesEl.scrollTop) pagesEl.scrollTop = Math.max(0, box.top - 28);
    else if (bottom > pagesEl.scrollTop + pagesEl.clientHeight) pagesEl.scrollTop = bottom - pagesEl.clientHeight + 28;
  }

  function offsetAt(clientX: number, clientY: number): number | undefined {
    const node = pagesEl.ownerDocument.elementFromPoint(clientX, clientY)?.closest<HTMLElement>(".dd-code-element");
    if (!node) return undefined;
    const nodes = [...pagesEl.querySelectorAll(".dd-code-element")];
    const index = nodes.indexOf(node);
    const piece = pieces[index];
    const pre = node.querySelector<HTMLElement>(".dd-code-text");
    if (!piece || !pre) return undefined;
    const metric = measure(pre);
    const rect = pre.getBoundingClientRect();
    if (rect.height <= 0 || metric.lineHeight <= 0) return piece.startOffset;
    const lines = piece.text.split("\n");
    const line = Math.max(0, Math.min(lines.length - 1, Math.floor((clientY - rect.top - metric.padT) / metric.lineHeight)));
    const column = Math.max(0, Math.round((clientX - rect.left - metric.padL) / metric.charWidth));
    return piece.startOffset + offsetInCodeText(piece.text, line, column);
  }

  function setDisplayLayout(layout: DisplayLayout) {
    display = layout;
    host.dataset.display = layout;
    paint();
    sync();
  }

  function commit(next: string, record: boolean, track = record) {
    if (next === value) return;
    if (record) {
      past.push(value);
      future.length = 0;
      if (track && viewMode === "track") {
        changeId += 1;
        changes.push({ id: `c${changeId}`, label: changeLabel(value, next), before: value, after: next });
      }
    }
    value = next;
    if (input.value !== next) input.value = next;
    paint();
    options.onChange?.(value, active.name);
    renderHistory();
    sync();
  }

  function undo() {
    if (viewMode === "view" || past.length === 0) return;
    const previous = past.pop();
    if (previous === undefined) return;
    future.push(value);
    value = previous;
    input.value = previous;
    paint();
    options.onChange?.(value, active.name);
    sync();
  }

  function redo() {
    if (viewMode === "view" || future.length === 0) return;
    const next = future.pop();
    if (next === undefined) return;
    past.push(value);
    value = next;
    input.value = next;
    paint();
    options.onChange?.(value, active.name);
    sync();
  }

  function save() {
    const blob = new Blob([input.value], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = host.ownerDocument.createElement("a");
    link.href = url;
    link.download = active.name.split(/[/\\]/).pop() || "file.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  function pick() {
    const picker = host.ownerDocument.createElement("input");
    picker.type = "file";
    picker.addEventListener("change", () => {
      const chosen = picker.files?.[0];
      if (!chosen) return;
      void chosen.arrayBuffer().then((buffer) => {
        openBuffer(chosen.name, new TextDecoder().decode(buffer));
        options.onOpenFile?.(chosen);
      });
    });
    picker.click();
  }

  function setViewMode(mode: ViewMode) {
    if (options.readOnly) return;
    viewMode = mode;
    input.readOnly = mode === "view";
    host.classList.toggle("fd-code-readonly", input.readOnly);
    paintMarks();
    if (mode === "track" && !hiddenGroups.includes("trackHistory")) {
      historyVisible = true;
      toolbar.showActivity("right", "history");
    }
    if (mode !== "track") historyVisible = false;
    renderHistory();
    sync();
  }

  function renderHistory() {
    const shown = viewMode === "track" && historyVisible;
    history.el.hidden = !shown;
    if (!shown) return;
    history.render(
      changes.map((change) => ({ id: change.id, label: change.label })),
      changes.at(-1)?.id ?? null,
    );
  }

  function restoreChange(id: string) {
    const change = changes.find((item) => item.id === id);
    if (!change || viewMode === "view") return;
    commit(change.after, true, false);
  }

  function revertChange(id: string) {
    const index = changes.findIndex((item) => item.id === id);
    if (index < 0 || viewMode === "view") return;
    const before = changes[index]?.before ?? value;
    changes.splice(index);
    commit(before, true, false);
  }

  function setTrayVisible(trayId: string, visible: boolean) {
    if (trayId !== "history") return;
    historyVisible = visible;
    renderHistory();
    sync();
  }

  function search(next: string) {
    query = next;
    const found = matchIndexes(value, query);
    hitIndex = found.length ? 0 : -1;
    if (hitIndex >= 0) reveal(found[hitIndex] ?? 0);
  }

  function nextHit(step: number) {
    const found = matchIndexes(value, query);
    if (!found.length) return;
    const size = found.length;
    hitIndex = hitIndex < 0 ? 0 : (hitIndex + step + size) % size;
    reveal(found[hitIndex] ?? 0);
  }

  function reveal(index: number) {
    input.focus();
    input.setSelectionRange(index, index + query.length);
    paintMarks();
    revealOffset(index);
    sync();
  }

  function replaceMatch(text: string) {
    if (viewMode === "view" || !query) return;
    const found = matchIndexes(value, query);
    if (!found.length) return;
    if (hitIndex < 0 || hitIndex >= found.length) hitIndex = 0;
    const at = found[hitIndex] ?? 0;
    commit(`${value.slice(0, at)}${text}${value.slice(at + query.length)}`, true);
  }

  function replaceAll(text: string) {
    if (viewMode === "view" || !query) return;
    const found = matchIndexes(value, query);
    if (!found.length) return;
    let next = value;
    for (let i = found.length - 1; i >= 0; i -= 1) {
      const at = found[i] ?? 0;
      next = `${next.slice(0, at)}${text}${next.slice(at + query.length)}`;
    }
    commit(next, true);
  }

  function writeZoom() {
    zoom = clampZoom(zoom);
    host.style.setProperty("--dd-zoom", String(zoom));
    host.style.setProperty("--dd-code-size", `${13 * zoom}px`);
  }

  function applyZoom(next: number) {
    zoom = clampZoom(next);
    writeZoom();
    paintMarks();
    placeInput();
    sync();
  }

  function fit(mode: FitMode) {
    if (mode === "width") {
      applyZoom(1);
      return;
    }
    const first = pagesEl.querySelector<HTMLElement>(".dd-code-element");
    const height = Math.max(first?.scrollHeight ?? 1, 1);
    const box = Math.max(pagesEl.clientHeight - 32, 1);
    applyZoom(box / height);
  }

  function resolveTheme(preference: ThemeConfig["preference"]): ThemeName {
    if (preference === "dark") return "dark";
    if (preference === "system") {
      return host.ownerDocument.defaultView?.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  }

  function paintTheme(config: ThemeConfig, presetId?: string) {
    themeConfig = config;
    const shown = resolveTheme(config.preference);
    host.dataset.theme = shown;
    if (config.preference === "system") host.dataset.scheme = "system";
    else delete host.dataset.scheme;
    themeStyle.textContent = themeTokenCss(config, `.fd-code[data-dd="code"]`);
    toolbar.setThemePreset(presetId ?? themePresetId(config, shown));
    toolbar.showThemeValues(themeValues(shown, config));
  }

  function documentInfo(): DocInfo {
    return {
      format: "docx",
      pageCount: pieces.length,
      trackChanges: viewMode === "track",
      author: "",
      pendingRevisions: changes.length,
      exportExtension: "txt",
      exportMime: "text/plain",
      canUndo: past.length > 0,
      canRedo: future.length > 0,
      capabilities,
      warnings: [],
    };
  }

  function sync() {
    toolbar.sync({
      info: documentInfo(),
      viewMode,
      modeLocked: options.readOnly === true,
      zoom,
      bold: false,
      italic: false,
      underline: false,
      strike: false,
      hasSelection: input.selectionStart !== input.selectionEnd,
      selectionKind: "none",
      insertKinds: [],
      isFiledom: active.name.toLowerCase().endsWith(".filedom"),
      helpOn,
      toolbarsLocked,
      hiddenGroups,
      availableTrays: viewMode === "track" ? ["history"] : [],
      shownTrays: viewMode === "track" && historyVisible ? ["history"] : [],
      fileName: active.name,
      tabs: tabs.map((tab) => ({ id: tab.id, name: tab.name, active: tab.id === active.id })),
      displayLayout: display,
      searchQuery: query,
      searchHitCount: query ? matchIndexes(value, query).length : 0,
      searchHitIndex: hitIndex,
    });
    host.toggleAttribute("data-toolbars-locked", toolbarsLocked);
  }

  function actions() {
    const idle = () => undefined;
    return {
      pick,
      newFile: () => commit("", true),
      download: save,
      closeFile: () => closeActive(),
      selectTab: (id: string) => selectCodeTab(id),
      reorderTabs: (ids: readonly string[]) => reorderCodeTabs(ids),
      storeFiledom: save,
      exportFile: save,
      undo,
      redo,
      toggle: idle,
      setColor: idle,
      setFont: idle,
      setSize: idle,
      highlight: idle,
      clearHighlight: idle,
      setHighlightColor: idle,
      comment: idle,
      align: idle,
      indent: idle,
      setLineSpacing: idle,
      setViewMode,
      setDisplayLayout,
      search,
      nextHit,
      replaceMatch,
      replaceAll,
      zoomIn: () => applyZoom(stepZoom(zoom, 1)),
      zoomOut: () => applyZoom(stepZoom(zoom, -1)),
      setZoom: (next: number) => applyZoom(next),
      fit,
      insertElement: idle,
      setThemePreset: (id: string) => {
        const preset = themePresetById(id);
        if (preset) paintTheme(themeConfigForPreset(preset), id);
      },
      setThemeColors: (patch: { ui?: ThemeConfig["ui"]; document?: ThemeConfig["document"] }) => {
        paintTheme({
          ...themeConfig,
          ui: { ...themeConfig.ui, ...patch.ui },
          document: { ...themeConfig.document, ...patch.document },
        });
      },
      setHelp: (on: boolean) => {
        helpOn = on;
        sync();
      },
      setToolbarVisible: (groupId: string, visible: boolean) => {
        const next = hiddenGroups.filter((id) => id !== groupId);
        if (!visible) next.push(groupId);
        hiddenGroups.splice(0, hiddenGroups.length, ...next);
        sync();
      },
      setTrayVisible,
      lockToolbars: (locked: boolean) => {
        toolbarsLocked = locked;
        sync();
      },
      moveToolbar: idle,
      replaceImage: idle,
      deleteElement: idle,
      deselect: () => {
        const caret = input.selectionStart;
        input.setSelectionRange(caret, caret);
        sync();
      },
      paintShape: idle,
      debugReport: () => active.name,
      playMedia: idle,
      pauseMedia: idle,
      muteMedia: idle,
      setClipSpeed: idle,
      appendClip: idle,
      copyListing: idle,
      layoutChanged: (layout: ToolbarLayout) => options.onToolbarLayout?.(layout),
    };
  }
}

function changeLabel(before: string, after: string): string {
  if (after.length > before.length) return "Inserted text";
  if (after.length < before.length) return "Deleted text";
  return "Edited";
}

function matchIndexes(source: string, needle: string): number[] {
  if (!needle) return [];
  const found: number[] = [];
  const hay = source.toLowerCase();
  const look = needle.toLowerCase();
  let from = 0;
  while (from <= hay.length) {
    const at = hay.indexOf(look, from);
    if (at < 0) break;
    found.push(at);
    from = at + Math.max(look.length, 1);
  }
  return found;
}

function formatJson(source: string, format: CodeFormat): string {
  try {
    return `${JSON.stringify(JSON.parse(source), null, format.indent)}\n`;
  } catch {
    return finish(source);
  }
}

function applyQuotes(source: string, language: string, format: CodeFormat): string {
  if (language === "css" || language === "json") return source;
  const wanted = format.quote === "single" ? "'" : '"';
  const other = format.quote === "single" ? '"' : "'";
  return source.replace(new RegExp(`${other}([^${other}\\n\\\\]*)${other}`, "g"), (literal, body: string) => {
    if (body.includes(wanted)) return literal;
    return `${wanted}${body}${wanted}`;
  });
}

function reindent(source: string, format: CodeFormat): string {
  const pad = " ".repeat(Math.max(0, format.indent));
  let level = 0;
  const lines = source.split("\n").map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return "";
    const leading = trimmed.match(/^[}\])]+/)?.[0].length ?? 0;
    let next = `${pad.repeat(Math.max(0, level - leading))}${trimmed}`;
    if (
      format.semicolons &&
      /^(?:const|let|var|return|import|export)\b/.test(trimmed) &&
      !/[,;{:([\]+\-*/%=<>&|\\.?]$/.test(trimmed)
    ) {
      next += ";";
    }
    const opens = (trimmed.match(/[{[(]/g) ?? []).length;
    const closes = (trimmed.match(/[}\])]/g) ?? []).length;
    level = Math.max(0, level + opens - closes);
    return next;
  });
  return applyTrailingCommas(lines, format).join("\n");
}

function applyTrailingCommas(lines: string[], format: CodeFormat): string[] {
  return lines.map((line, index) => {
    const trimmed = line.trim();
    const next = lines.slice(index + 1).find((item) => item.trim());
    const beforeCloser = Boolean(next && /^[}\]]/.test(next.trim()));
    if (!beforeCloser || !trimmed || /^[}\])]/.test(trimmed)) return line;
    if (format.trailingComma) {
      if (/[,;{:[(]$/.test(trimmed)) return line;
      return line.replace(/\s*$/, ",");
    }
    return line.replace(/,\s*$/, "");
  });
}

function finish(source: string): string {
  const body = source.replace(/\n{3,}/g, "\n\n").replace(/^\n+/, "");
  return body.endsWith("\n") ? body : `${body}\n`;
}

function matchComment(rest: string, language: string): string | undefined {
  if (rest.startsWith("//")) {
    const end = rest.indexOf("\n");
    return end === -1 ? rest : rest.slice(0, end);
  }
  if (rest.startsWith("/*")) {
    const end = rest.indexOf("*/");
    return end === -1 ? rest : rest.slice(0, end + 2);
  }
  if ((language === "sql" || language === "haskell" || language === "lua" || language === "ada") && rest.startsWith("--")) {
    const end = rest.indexOf("\n");
    return end === -1 ? rest : rest.slice(0, end);
  }
  if (HASH_COMMENT.has(language) && rest.startsWith("#")) {
    const end = rest.indexOf("\n");
    return end === -1 ? rest : rest.slice(0, end);
  }
  return undefined;
}

function matchString(rest: string): string | undefined {
  const quote = rest[0];
  if (quote !== '"' && quote !== "'" && quote !== "`") return undefined;
  let index = 1;
  while (index < rest.length) {
    if (rest[index] === "\\") {
      index += 2;
      continue;
    }
    if (rest[index] === quote) return rest.slice(0, index + 1);
    if (rest[index] === "\n" && quote !== "`") return undefined;
    index += 1;
  }
  return undefined;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Source lines on one letter page at the default code size. */
const LINES_PER_PAGE = 42;

function codeCss(): string {
  return `.fd-code{display:flex;flex-direction:column;height:100%;min-height:16rem;min-width:0}
.fd-code .dd-workspace,.fd-code .dd-body{min-width:0}
.fd-code .dd-pages{align-items:stretch;padding:16px;gap:16px}
.fd-code[data-display="paginated"] .dd-pages{align-items:center}
.fd-code[data-display="paginated"] .dd-page{overflow:hidden}
.fd-code[data-display="paginated"] .dd-code-element{width:100%;height:100%;border:0;box-sizing:border-box}
.fd-code:not([data-display="numbered"]) .dd-code-gutter{display:none}`;
}
