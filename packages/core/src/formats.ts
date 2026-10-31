import type { Format } from "./engine-types.js";
import { DomdocError } from "./errors.js";

export const ACCEPT =
  ".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.png,.jpg,.jpeg,.gif,.webp,.svg,.ai,application/pdf,application/msword,application/vnd.ms-excel,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/png,image/jpeg,image/gif,image/webp,image/svg+xml";

const ZIP_EXT = new Set(["docx", "xlsx", "pptx"]);
const OLE_EXT = new Set(["doc", "xls", "ppt"]);

const startsWith = (bytes: Uint8Array, magic: number[]) => magic.every((b, i) => bytes[i] === b);

function extension(name: string): string | undefined {
  return /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase();
}

function indexOf(bytes: Uint8Array, needle: Uint8Array): number {
  if (!needle.length || needle.length > bytes.length) return -1;
  outer: for (let i = 0; i <= bytes.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (bytes[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

function ascii(text: string): Uint8Array {
  return Uint8Array.from(text, (char) => char.charCodeAt(0));
}

function utf16(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length * 2);
  for (let i = 0; i < text.length; i++) bytes[i * 2] = text.charCodeAt(i);
  return bytes;
}

/** ZIP local names are uncompressed, so the part name is visible in the bytes. */
function sniffZip(bytes: Uint8Array): Format | undefined {
  const marks: Array<[string, Format]> = [
    ["word/document", "docx"],
    ["xl/workbook", "xlsx"],
    ["ppt/presentation", "pptx"],
  ];
  let best: { at: number; format: Format } | undefined;
  for (const [needle, format] of marks) {
    const at = indexOf(bytes, ascii(needle));
    if (at >= 0 && (!best || at < best.at)) best = { at, format };
  }
  return best?.format;
}

/** OLE directory entries store the stream name as UTF-16LE. */
function sniffOle(bytes: Uint8Array): Format | undefined {
  const marks: Array<[string, Format]> = [
    ["WordDocument", "doc"],
    ["Workbook", "xls"],
    ["PowerPoint Document", "ppt"],
  ];
  let best: { at: number; format: Format } | undefined;
  for (const [needle, format] of marks) {
    const at = indexOf(bytes, utf16(needle));
    if (at >= 0 && (!best || at < best.at)) best = { at, format };
  }
  return best?.format;
}

function isSvg(bytes: Uint8Array): boolean {
  const head = new TextDecoder("utf-8", { fatal: false })
    .decode(bytes.subarray(0, Math.min(bytes.length, 512)))
    .trimStart()
    .toLowerCase();
  return head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"));
}

/** Adobe Illustrator files are often PDF-compatible and carry this marker. */
function isIllustrator(bytes: Uint8Array, name: string): boolean {
  if (extension(name) === "ai") return true;
  const head = bytes.subarray(0, Math.min(bytes.length, 65_536));
  return indexOf(head, ascii("Adobe Illustrator")) >= 0;
}

function extensionFormat(ext: string | undefined): Format | undefined {
  if (!ext) return undefined;
  if (ext === "jpg" || ext === "jpeg") return "jpeg";
  if (ext === "png" || ext === "gif" || ext === "webp" || ext === "svg" || ext === "ai") return ext;
  if (ext === "pdf" || ZIP_EXT.has(ext) || OLE_EXT.has(ext)) return ext as Format;
  return undefined;
}

/** Detects the format from content first (magic bytes), then the file name. */
export function detectFormat(bytes: Uint8Array, name = ""): Format {
  const ext = extension(name);
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) return "png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpeg";
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return "gif";
  if (bytes.length >= 12 && startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return "webp";
  }
  if (isSvg(bytes)) return "svg";
  if (isIllustrator(bytes, name)) return "ai";
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46])) return "pdf";
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) || startsWith(bytes, [0x50, 0x4b, 0x05, 0x06])) {
    return sniffZip(bytes) ?? (ext && ZIP_EXT.has(ext) ? (ext as Format) : "docx");
  }
  if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    return sniffOle(bytes) ?? (ext && OLE_EXT.has(ext) ? (ext as Format) : "doc");
  }
  const named = extensionFormat(ext);
  if (named) return named;
  throw new DomdocError("unsupported-format", name || "unknown file");
}

/** `report.doc` + `docx` → `report.docx`. */
export function exportName(name: string, extension: string): string {
  const base = name.replace(/\.[^./\\]+$/, "") || "document";
  return `${base}.${extension}`;
}
