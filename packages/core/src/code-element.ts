/**
 * A source element: line numbers on the left, the text beside them, full width,
 * and no page break. A long file stacks more than one. A document can place the
 * same element among text and images.
 */

/** Lines in one element before the next element starts. */
export const LINES_PER_CODE_ELEMENT = 160;

export interface CodeElementSlice {
  /** 1-based line number of the first line. */
  startLine: number;
  /** UTF-16 offset of `text` in the whole source. */
  startOffset: number;
  text: string;
}

/** Splits source into elements. A file within the limit stays one element. */
export function splitCodeElements(source: string, linesPerElement = LINES_PER_CODE_ELEMENT): CodeElementSlice[] {
  const starts = lineStarts(source);
  const limit = Math.max(1, linesPerElement);
  if (starts.length <= limit) return [{ startLine: 1, startOffset: 0, text: source }];
  const pieces: CodeElementSlice[] = [];
  for (let index = 0; index < starts.length; index += limit) {
    const from = starts[index] ?? 0;
    const next = starts[index + limit];
    pieces.push({
      startLine: index + 1,
      startOffset: from,
      text: next === undefined ? source.slice(from) : source.slice(from, next),
    });
  }
  return pieces;
}

export function lineNumberText(startLine: number, text: string): string {
  const count = Math.max(1, text.split("\n").length);
  return Array.from({ length: count }, (_, index) => String(startLine + index)).join("\n");
}

/** Caret line and visual column inside one element. A tab counts as two columns. */
export function codeCaretPoint(text: string, offset: number): { line: number; column: number } {
  const clamped = Math.max(0, Math.min(offset, text.length));
  const before = text.slice(0, clamped);
  const line = before.split("\n").length - 1;
  const row = before.slice(before.lastIndexOf("\n") + 1);
  let column = 0;
  for (const ch of row) column += ch === "\t" ? 2 : 1;
  return { line, column };
}

/** Offset of a visual column on a line, counted from the start of `text`. */
export function offsetInCodeText(text: string, line: number, column: number): number {
  const lines = text.split("\n");
  const index = Math.max(0, Math.min(line, Math.max(lines.length - 1, 0)));
  let offset = 0;
  for (let row = 0; row < index; row += 1) offset += (lines[row]?.length ?? 0) + 1;
  return offset + columnOnLine(lines[index] ?? "", column);
}

export interface CodeElementOptions {
  /** Highlighted markup for the text. Omitted: plain `slice.text`. */
  html?: string;
  /** The text can be edited in place. The gutter follows the text. */
  editable?: boolean;
  onInput?: (text: string) => void;
}

/** Builds one full-width source element. The caller owns the node. */
export function mountCodeElement(doc: Document, slice: CodeElementSlice, options: CodeElementOptions = {}): HTMLElement {
  const root = doc.createElement("section");
  root.className = "dd-code-element";
  root.dataset.startLine = String(slice.startLine);
  root.dataset.startOffset = String(slice.startOffset);
  const gutter = doc.createElement("div");
  gutter.className = "dd-code-gutter";
  gutter.setAttribute("aria-hidden", "true");
  gutter.textContent = lineNumberText(slice.startLine, slice.text);
  const body = doc.createElement("div");
  body.className = "dd-code-body";
  const pre = doc.createElement("pre");
  pre.className = "dd-code-text";
  if (options.html) pre.innerHTML = options.html;
  else pre.textContent = slice.text;
  const marks = doc.createElement("div");
  marks.className = "dd-code-marks";
  body.append(pre, marks);
  root.append(gutter, body);
  if (options.editable) {
    pre.contentEditable = "true";
    pre.spellcheck = false;
    pre.setAttribute("role", "textbox");
    pre.setAttribute("aria-multiline", "true");
    pre.addEventListener("input", () => {
      const text = pre.textContent ?? "";
      gutter.textContent = lineNumberText(Number(root.dataset.startLine) || 1, text);
      options.onInput?.(text);
    });
  }
  return root;
}

function lineStarts(source: string): number[] {
  const starts = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === "\n") starts.push(index + 1);
  }
  return starts;
}

function columnOnLine(line: string, column: number): number {
  let visual = 0;
  for (let index = 0; index < line.length; index += 1) {
    const width = line[index] === "\t" ? 2 : 1;
    if (column < visual + width / 2) return index;
    visual += width;
  }
  return line.length;
}
