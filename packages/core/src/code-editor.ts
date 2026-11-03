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
  json: "json",
  css: "css",
  html: "html",
  htm: "html",
  md: "markdown",
  rs: "rust",
  py: "python",
  go: "go",
  toml: "toml",
  yml: "yaml",
  yaml: "yaml",
  sh: "shell",
  bash: "shell",
};

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
  const base = name.split(/[/\\]/).pop() ?? name;
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return undefined;
  return LANGUAGES[base.slice(dot + 1).toLowerCase()];
}

export function isCodeFile(name: string): boolean {
  return languageFromName(name) !== undefined;
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

export interface CodeEditorOptions {
  name: string;
  source: string;
  language?: string;
  style?: CodeStyle;
  format?: CodeFormat;
  readOnly?: boolean;
  onChange?: (value: string) => void;
}

export interface CodeEditor {
  getValue(): string;
  format(): string;
  destroy(): void;
}

/** Mounts an editable, highlighted view. The host owns the element. */
export function mountCodeEditor(host: HTMLElement, options: CodeEditorOptions): CodeEditor {
  const language = options.language ?? languageFromName(options.name) ?? "text";
  const style = options.style ?? codeStyle;
  const format = options.format ?? codeFormat;
  let value = formatCode(options.source, language, format);
  host.replaceChildren();
  host.classList.add("fd-code");
  const css = host.ownerDocument.createElement("style");
  css.textContent = codeCss(style);
  const bar = element(host, "div", "fd-code-bar");
  bar.append(element(host, "span", "fd-code-name", options.name));
  const button = element(host, "button", "fd-code-format", "Format") as HTMLButtonElement;
  button.type = "button";
  bar.append(button);
  const view = element(host, "div", "fd-code-view");
  const code = element(host, "pre", "fd-code-text");
  const input = element(host, "textarea", "fd-code-input") as HTMLTextAreaElement;
  view.append(code, input);
  input.value = value;
  input.spellcheck = false;
  input.readOnly = options.readOnly === true;
  input.setAttribute("aria-label", options.name);
  host.prepend(css);
  paint();
  const onInput = () => {
    value = input.value;
    paint();
    options.onChange?.(value);
  };
  input.addEventListener("input", onInput);
  const onScroll = () => {
    code.scrollTop = input.scrollTop;
    code.scrollLeft = input.scrollLeft;
  };
  input.addEventListener("scroll", onScroll);
  button.addEventListener("click", () => {
    editor.format();
  });
  const editor: CodeEditor = {
    getValue: () => value,
    format: () => {
      value = formatCode(value, language, format);
      input.value = value;
      paint();
      options.onChange?.(value);
      return value;
    },
    destroy: () => {
      input.removeEventListener("input", onInput);
      input.removeEventListener("scroll", onScroll);
      host.replaceChildren();
    },
  };
  return editor;

  function paint() {
    code.innerHTML = renderCodeHtml(value, language, style);
  }
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
  if ((language === "python" || language === "shell" || language === "yaml" || language === "toml") && rest.startsWith("#")) {
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

function element(host: HTMLElement, tag: string, className: string, text?: string): HTMLElement {
  const node = host.ownerDocument.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  host.append(node);
  return node;
}

function codeCss(style: CodeStyle): string {
  return `.fd-code{display:flex;flex-direction:column;min-height:16rem;background:${style.background};color:${style.foreground};font:${style.fontSize}/${style.lineHeight} ${style.fontFamily};border:1px solid color-mix(in srgb, ${style.foreground} 16%, transparent)}
.fd-code-bar{display:flex;justify-content:space-between;gap:1rem;align-items:center;padding:0.45rem 0.75rem;color:${style.punctuation};border-bottom:1px solid color-mix(in srgb, ${style.foreground} 12%, transparent)}
.fd-code-format{font:inherit;color:${style.keyword};background:transparent;border:1px solid color-mix(in srgb, ${style.keyword} 45%, transparent);padding:0.15rem 0.55rem;cursor:pointer}
.fd-code-view{position:relative;margin:0;min-height:14rem}
.fd-code-text,.fd-code-input{margin:0;padding:0.85rem 0.95rem;font:inherit;line-height:inherit;white-space:pre;tab-size:2}
.fd-code-text{overflow:auto;pointer-events:none}
.fd-code-input{position:absolute;inset:0;width:100%;height:100%;color:transparent;caret-color:${style.foreground};background:transparent;border:0;resize:none;overflow:auto}`;
}
