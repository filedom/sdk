/**
 * What a person can read and email. Library names, engine paths, and stacks stay out.
 */

const INTERNAL =
  /pdfium|embedpdf|office[_ -]?oxide|wasm\/|sdk\/packages|\.rs\b|\.wasm\b|node_modules|rustc|stack trace/i;

const SENTENCE: Record<string, string> = {
  "open-failed": "The file did not open.",
  "pdf-encrypted": "This file needs a password.",
  "pdf-render": "The file did not open.",
  unsupported: "This file cannot do that.",
  "unsupported-format": "This file cannot be opened.",
  "read-only": "This file cannot be changed.",
  "unknown-unit": "That part of the file could not be changed.",
  "not-found": "That part of the file could not be found.",
  engine: "Something went wrong.",
};

export interface ErrorMailContext {
  fileName?: string;
  now?: Date;
  page?: string;
  browser?: string;
}

export interface ErrorMail {
  /** One sentence for the Errors list. */
  summary: string;
  /** Plain text to paste into an email. */
  report: string;
}

export interface ErrorEntry {
  /** One sentence shown in the Errors list. */
  summary: string;
  /** The sentence plus the context captured when the error was thrown. */
  report: string;
}

export function errorMail(raw: string, context: ErrorMailContext = {}): ErrorMail {
  const parsed = parseError(raw);
  const summary = publicSentence(parsed.code, parsed.detail);
  const lines = ["FileDOM", "", summary, "", `Reference: ${safeCode(parsed.code)}`];
  const fileName = safeFileName(context.fileName);
  if (fileName) lines.push(`File: ${fileName}`);
  const note = safeDetail(parsed.detail, summary);
  if (note) lines.push(`Note: ${note}`);
  lines.push(
    "",
    "Send this note with the file. It has what we need to look into the problem.",
    "",
    `Time: ${(context.now ?? new Date()).toISOString()}`,
  );
  const page = context.page ?? readPage();
  const browser = context.browser ?? readBrowser();
  if (page && !INTERNAL.test(page)) lines.push(`Page: ${page}`);
  if (browser && !INTERNAL.test(browser)) lines.push(`Browser: ${browser}`);
  return { summary, report: lines.join("\n") };
}

/** One error, with the debug context an agent needs when that context exists. */
export function errorEntry(raw: string, context: ErrorMailContext = {}, debug = ""): ErrorEntry {
  const mail = errorMail(raw, context);
  const contextText = debug.trim();
  const report = contextText ? [`Summary: ${mail.summary}`, "", "## Context", contextText].join("\n") : mail.report;
  return { summary: mail.summary, report };
}

/** Every stored error, in order, with the context captured for each one. */
export function errorBundle(entries: readonly { report: string }[]): string {
  const count = entries.length;
  const noun = count === 1 ? "1 error" : `${count} errors`;
  const intro = `There ${count === 1 ? "is" : "are"} ${noun} in the filedom workspace (sdk and wasm). Fix each one. Every section has the error and the context captured when it was thrown.`;
  const sections = entries.map((entry, index) => `# Error ${index + 1} of ${count}\n\n${entry.report}`);
  return [intro, ...sections].join("\n\n");
}

function parseError(raw: string): { code: string; detail: string } {
  const text = raw.trim();
  const match = /^([a-z][a-z0-9-]*): ?([\s\S]*)$/.exec(text);
  if (!match) return { code: "engine", detail: text };
  return { code: match[1]!, detail: match[2]!.trim() };
}

function publicSentence(code: string, detail: string): string {
  const sentence = userSentence(detail);
  const readable = Boolean(sentence && (/[.!?]$/.test(sentence) || sentence.length > 24));
  if (readable && sentence) return sentence;
  return SENTENCE[code] ?? (sentence || "Something went wrong.");
}

function safeDetail(detail: string, summary: string): string {
  const sentence = userSentence(detail);
  if (!sentence || sentence === summary) return "";
  return sentence;
}

function userSentence(detail: string): string {
  const text = redact(detail).replace(/^[:\s]+|[:\s]+$/g, "");
  if (!text || INTERNAL.test(text)) return "";
  if (/[A-Z][a-z0-9]+[A-Z]/.test(text)) return "";
  if (/[{}<>]/.test(text)) return "";
  if (text.length > 180) return "";
  return text;
}

function redact(value: string): string {
  return value
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/pdfium[\w.-]*/gi, " ")
    .replace(/embedpdf[\w.-]*/gi, " ")
    .replace(/office[_ -]?oxide[\w.-]*/gi, " ")
    .replace(/\b[\w./-]*wasm\/[\w./-]+/g, " ")
    .replace(/\bsdk\/packages\/[\w./-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function safeCode(code: string): string {
  return /^[a-z][a-z0-9-]*$/.test(code) && !INTERNAL.test(code) ? code : "error";
}

function safeFileName(name: string | undefined): string {
  const leaf = name?.split(/[/\\]/).filter(Boolean).pop()?.trim() ?? "";
  if (!leaf || INTERNAL.test(leaf)) return "";
  return leaf;
}

function readPage(): string {
  try {
    return globalThis.location?.href ?? "";
  } catch {
    return "";
  }
}

function readBrowser(): string {
  try {
    return globalThis.navigator?.userAgent ?? "";
  } catch {
    return "";
  }
}
