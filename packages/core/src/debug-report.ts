import type { Command, EngineInput, Pos, RunView, UnitRange } from "./engine-types.js";

const TEXT_LIMIT = 240;
const UNIT_TEXT_LIMIT = 500;
const RUN_TEXT_LIMIT = 160;
export const DEBUG_HISTORY = 8;

/** Shortens `text` on Unicode scalar boundaries. Truncated values keep the full length. */
export function clipText(text: string, max = TEXT_LIMIT): string {
  const chars = Array.from(text);
  if (chars.length <= max) return text;
  return `${chars.slice(0, max).join("")}… (${chars.length} chars)`;
}

export function commandAction(command: Command): Command {
  if (command.type !== "replace") return command;
  return { ...command, text: clipText(command.text) };
}

/** A JSON-sized description of one input event. Text is clipped. */
export function inputAction(input: EngineInput): unknown {
  switch (input.type) {
    case "text":
      return { type: "text", text: clipText(input.text) };
    case "pointer":
      return {
        type: "pointer",
        phase: input.phase,
        page: input.page,
        xPt: roundPt(input.xPt),
        yPt: roundPt(input.yPt),
      };
    case "move":
      return { type: "move", move: input.move, extend: Boolean(input.extend) };
    case "select":
      return { type: "select", anchor: input.anchor, focus: input.focus };
    case "selectAll":
    case "scan":
      return { type: input.type };
    case "zoom":
      return input.op === "wheel" ? { type: "zoom", op: input.op, deltaY: input.deltaY } : input;
  }
}

export interface DebugRun {
  id: string;
  unitStart: number;
  text: string;
  editable: boolean;
  font?: string;
  fontSizePt: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  color?: string;
  revision?: string;
}

export interface DebugUnit {
  unit: string;
  text?: string;
  page?: number;
  location?: string;
  /** True when every laid-out run of this unit is editable. Absent when it is not on a page. */
  editable?: boolean;
  runs: DebugRun[];
  note?: string;
}

export interface DebugMate {
  unit: string;
  editable?: boolean;
  text: string;
}

export interface DebugSnapshot {
  error: { code: string; detail: string; message: string; stack?: string };
  /** Set when the failure is opening a file, before that file replaces the current one. */
  opening?: string;
  file?: { name: string; format: string; id?: string; bytes?: number };
  viewMode: string;
  readOnly: boolean;
  zoom: string;
  info?: unknown;
  warnings?: string[];
  selection?: { anchor: string; focus: string; text: string; ranges?: UnitRange[] } | null;
  failedAction?: unknown;
  recent: unknown[];
  units: DebugUnit[];
  pageMates: Array<{ page: number; units: DebugMate[] }>;
  browser?: { userAgent: string; href: string; time: string };
  captureError?: string;
}

/** Paragraph and unit ids named by an engine error, plus any explicit ids. */
export function unitsMentioned(detail: string, extra: string[] = []): string[] {
  const found: string[] = [];
  const add = (id: string) => {
    const clean = id.replace(/[.,;:)]+$/g, "");
    if (clean && !found.includes(clean)) found.push(clean);
  };
  for (const match of detail.matchAll(/\b(?:paragraph|unit|operator)\s+([^\s,.;:]+)/g)) add(match[1]!);
  for (const match of detail.matchAll(/\bt\d+r\d+\b/g)) add(match[0]);
  for (const id of extra) add(id);
  return found;
}

/** Units from `unit:offset` caret labels. The unit itself may contain colons (`0:42:3`). */
export function caretUnits(selection: { anchor: string; focus: string } | null | undefined): string[] {
  if (!selection) return [];
  const ids: string[] = [];
  for (const end of [selection.anchor, selection.focus]) {
    const cut = end.lastIndexOf(":");
    const unit = cut > 0 ? end.slice(0, cut) : end;
    if (unit && !ids.includes(unit)) ids.push(unit);
  }
  return ids;
}

/** Unit ids carried on a command or input description. */
export function unitsInAction(action: unknown): string[] {
  const ids: string[] = [];
  const add = (id: unknown) => {
    if (typeof id === "string" && id && !ids.includes(id)) ids.push(id);
  };
  const pos = (value: unknown) => {
    if (value && typeof value === "object" && "unit" in value) add((value as Pos).unit);
  };
  if (!action || typeof action !== "object") return ids;
  const record = action as Record<string, unknown>;
  pos(record.from);
  pos(record.to);
  pos(record.anchor);
  pos(record.focus);
  if (Array.isArray(record.units)) for (const unit of record.units) add(unit);
  if (Array.isArray(record.ranges)) for (const range of record.ranges) pos(range);
  return ids;
}

export function summarizeRun(run: RunView): DebugRun {
  return {
    id: run.id,
    unitStart: run.unitStart,
    text: clipText(run.text, RUN_TEXT_LIMIT),
    editable: run.editable,
    font: run.font,
    fontSizePt: run.fontSizePt,
    bold: run.bold,
    italic: run.italic,
    underline: run.underline,
    strike: run.strike,
    color: run.color,
    revision: run.revision ? `${run.revision.kind} ${run.revision.id} by ${run.revision.author}` : undefined,
  };
}

export function clipUnitText(text: string): string {
  return clipText(text, UNIT_TEXT_LIMIT);
}

/**
 * Where this error is raised. The detail string is still the thing to search for;
 * these paths only start the lookup.
 */
export function debugHints(code: string, detail: string): string[] {
  const hints = [`Search the workspace for this exact text: ${JSON.stringify(detail)}`];
  if (detail.includes("native content that is preserved but not editable")) {
    hints.push(
      "That sentence is built in domdoc-wasm/crates/core/src/flow/edit.rs when a newline crosses a paragraph with mergeable set to false, and in domdoc-wasm/crates/core/src/flow/mod.rs editable_index when editable is false.",
      "Office text is read by office_oxide in domdoc-wasm/crates/open/src/office.rs. Drawings and fields stay in the extracted paragraph text.",
      "Page runs expose editable only. mergeable is not in the view. If every listed run is editable and the failed action is a newline across more than one unit, the edit.rs check is the one that fired.",
    );
  } else if (code === "unsupported" && (detail === "text formatting" || detail === "paragraph formatting")) {
    hints.push(
      "The viewer raises this in domdoc-sdk/packages/core/src/viewer.ts when capabilities.formatText or capabilities.formatParagraph is false.",
    );
  } else if (code === "unknown-unit") {
    hints.push(
      "unknown-unit is raised by domdoc-wasm/crates/open/src/flow.rs when the caret names a unit that is not in the open document.",
    );
  } else if (code === "read-only") {
    hints.push("Read-only mode refuses edits from the shell in domdoc-wasm/crates/core/src/shell.rs.");
  } else if (code === "pdf-encrypted" || (code === "pdf-render" && /Decryption|PasswordProtected/.test(detail))) {
    hints.push(
      "Encrypted PDFs fail in domdoc-wasm/crates/open/src/pdf.rs when PDFium rejects the password.",
      "The SDK should prompt via openDocument getPassword or pass password in OpenOptions; domdoc-sdk/packages/core/src/password-prompt.ts is the viewer dialog.",
    );
  }
  return hints;
}

/** A prompt the user can paste into Cursor: the error, the edit that hit it, and the units involved. */
export function buildDebugReport(snapshot: DebugSnapshot): string {
  const { error } = snapshot;
  const lines: string[] = [
    "Debug and fix this error in the domdoc workspace (domdoc-sdk and domdoc-wasm). The viewer raised it while a document was open. Reproduce it from the failed action, the selection, and the unit snapshot below. Search the workspace for the error text, then change the engine or the SDK so this edit either applies or is refused before the command with a reason the user can act on. Keep native content lossless.",
    "",
    "## Error",
    `code: ${error.code}`,
    `detail: ${error.detail || error.message}`,
  ];
  if (error.stack) {
    lines.push("stack:", "```", trimStack(error.stack), "```");
  }
  lines.push("", "## Where to look", ...debugHints(error.code, error.detail || error.message));

  lines.push("", "## Document");
  if (snapshot.opening !== undefined) {
    lines.push(`opening: ${snapshot.opening || "(unnamed file)"}`);
    lines.push("This failed before the file became the open document.");
  }
  if (snapshot.file) {
    const file = snapshot.file;
    lines.push(`name: ${file.name}`);
    lines.push(`format: ${file.format}`);
    if (file.id) lines.push(`file id: ${file.id}`);
    if (file.bytes !== undefined) lines.push(`stored bytes: ${file.bytes}`);
  } else if (snapshot.opening === undefined) {
    lines.push("No document is open.");
  }
  lines.push(`view mode: ${snapshot.viewMode}`);
  lines.push(`host read-only: ${snapshot.readOnly}`);
  lines.push(`zoom: ${snapshot.zoom}`);
  if (snapshot.warnings) {
    lines.push(`warnings: ${snapshot.warnings.length ? snapshot.warnings.join("; ") : "none"}`);
  }
  if (snapshot.info !== undefined) {
    lines.push("info:", "```json", JSON.stringify(snapshot.info, null, 2), "```");
  }
  if (snapshot.file) {
    lines.push(
      "The file is still open in the viewer. Use Download and attach that file with this report when the unit snapshot is not enough to reproduce the edit.",
    );
  }

  lines.push("", "## Failed action");
  lines.push(snapshot.failedAction === undefined ? "No edit was in progress." : fence(snapshot.failedAction));

  if (snapshot.recent.length) {
    lines.push("", "## Recent edits", fence(snapshot.recent));
  }

  lines.push("", "## Selection");
  if (!snapshot.selection) lines.push("No selection.");
  else {
    lines.push(`anchor: ${snapshot.selection.anchor}`);
    lines.push(`focus: ${snapshot.selection.focus}`);
    lines.push("text:", "```", snapshot.selection.text, "```");
    if (snapshot.selection.ranges?.length) lines.push("ranges:", fence(snapshot.selection.ranges));
  }

  lines.push("", "## Units");
  if (!snapshot.units.length) lines.push("No paragraph id was named by the error or the selection.");
  for (const unit of snapshot.units) {
    lines.push(`### ${unit.unit}`);
    if (unit.page !== undefined) lines.push(`page: ${unit.page}`);
    if (unit.location) lines.push(`location: ${unit.location}`);
    if (unit.editable !== undefined) lines.push(`editable: ${unit.editable}`);
    if (unit.note) lines.push(`note: ${unit.note}`);
    if (unit.text !== undefined) lines.push("text:", "```", unit.text, "```");
    if (unit.runs.length) {
      lines.push("runs:");
      for (const run of unit.runs) lines.push(`- ${runLine(run)}`);
    }
  }

  if (snapshot.pageMates.length) {
    lines.push("", "## Other units on the same page");
    for (const group of snapshot.pageMates) {
      lines.push(`page ${group.page}:`);
      for (const mate of group.units) {
        const flag = mate.editable === undefined ? "" : ` editable=${mate.editable}`;
        lines.push(`- ${mate.unit}${flag} ${JSON.stringify(mate.text)}`);
      }
    }
  }

  if (snapshot.captureError) {
    lines.push("", "## Snapshot", snapshot.captureError);
  }

  if (snapshot.browser) {
    lines.push("", "## Environment");
    lines.push(`time: ${snapshot.browser.time}`);
    if (snapshot.browser.href) lines.push(`url: ${snapshot.browser.href}`);
    if (snapshot.browser.userAgent) lines.push(`user agent: ${snapshot.browser.userAgent}`);
  }

  return lines.join("\n");
}

export function roundPt(value: number): number {
  return Math.round(value * 10) / 10;
}

function fence(value: unknown): string {
  return ["```json", JSON.stringify(value, null, 2), "```"].join("\n");
}

function trimStack(stack: string): string {
  return stack.split("\n").slice(0, 30).join("\n");
}

function runLine(run: DebugRun): string {
  const style = [
    run.bold ? "bold" : "",
    run.italic ? "italic" : "",
    run.underline ? "underline" : "",
    run.strike ? "strike" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const face = [run.font, Number.isFinite(run.fontSizePt) ? `${run.fontSizePt}pt` : ""].filter(Boolean).join(" ");
  return [
    `editable=${run.editable}`,
    `start=${run.unitStart}`,
    face,
    style,
    run.color ?? "",
    run.revision ?? "",
    JSON.stringify(run.text),
  ]
    .filter(Boolean)
    .join(" ");
}
