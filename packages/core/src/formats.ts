import { isCodeFile } from "./code-editor.js";
import type { FileKind, Format } from "./engine-types.js";
import { FiledomError } from "./errors.js";
import type { IconName } from "./icons.js";

export const ACCEPT =
  ".pdf,.docx,.doc,.docm,.dot,.dotx,.dotm,.xlsx,.xls,.xlsm,.xlt,.xltx,.xltm,.xlam,.xlsb,.xla,.pptx,.ppt,.pptm,.pot,.potx,.potm,.pps,.ppsx,.ppsm,.png,.jpg,.jpeg,.gif,.webp,.bmp,.tif,.tiff,.svg,.ai,.csv,.mp3,.wav,.m4a,.mp4,.mpeg,.mpg,.webm,.zip,.gz,.tgz,.tar,.7z,.eml,.msg,.rtf,.odt,.ods,.odp,.hwp,.hwpx,.pages,.numbers,.key,.epub,.mobi,.azw3,.fb2,.cbz,.djvu,.djv,.ico,.tga,.pbm,.pgm,.ppm,.pnm,.pam,.hdr,.qoi,.dds,.ff,.exr,.avif,.jxl,.jp2,.j2k,.j2c,.psd,.psb,.flac,.opus,.ogg,.oga,.wv,.mpc,.aiff,.aif,.aifc,.caf,.mp1,.mp2,.mkv,.mov,.bz2,.xz,.zst,.mbox,application/pdf,application/msword,application/vnd.ms-excel,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/png,image/jpeg,image/gif,image/webp,image/bmp,image/tiff,image/svg+xml,text/csv,audio/mpeg,audio/wav,audio/mp4,video/mp4,video/mpeg,video/webm,application/zip,application/gzip,application/x-tar,application/x-7z-compressed,message/rfc822,application/vnd.ms-outlook";

/**
 * Kind of each concrete format. Image and OCR still have no session.
 */
const KIND: Record<Format, FileKind> = {
  pdf: "document",
  doc: "document",
  docx: "document",
  xls: "document",
  xlsx: "document",
  ppt: "document",
  pptx: "document",
  csv: "document",
  ocr: "document",
  image: "image",
  png: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  bmp: "image",
  tiff: "image",
  svg: "vector",
  ai: "vector",
  mp3: "audio",
  wav: "audio",
  m4a: "audio",
  mp4: "video",
  webm: "video",
  mpeg: "video",
  zip: "archive",
  gzip: "archive",
  tar: "archive",
  "7z": "archive",
  eml: "email",
  msg: "email",
};

const UNWIRED: Partial<Record<Format, string>> = {
  image: "image session crate is not wired",
  ocr: "ocr session crate is not wired",
};

/** Office macro and template extensions open as the base package. */
const OFFICE: Record<string, Format> = {
  doc: "doc",
  dot: "doc",
  docx: "docx",
  docm: "docx",
  dotx: "docx",
  dotm: "docx",
  xls: "xls",
  xlt: "xls",
  xla: "xls",
  xlsx: "xlsx",
  xlsm: "xlsx",
  xltx: "xlsx",
  xltm: "xlsx",
  xlam: "xlsx",
  xlsb: "xlsx",
  ppt: "ppt",
  pot: "ppt",
  pps: "ppt",
  pptx: "pptx",
  pptm: "pptx",
  potx: "pptx",
  potm: "pptx",
  ppsx: "pptx",
  ppsm: "pptx",
};

const BY_EXTENSION: Record<string, Format> = {
  ...OFFICE,
  pdf: "pdf",
  png: "png",
  jpg: "jpeg",
  jpeg: "jpeg",
  gif: "gif",
  webp: "webp",
  bmp: "bmp",
  tif: "tiff",
  tiff: "tiff",
  svg: "svg",
  ai: "ai",
  csv: "csv",
  mp3: "mp3",
  mpga: "mp3",
  wav: "wav",
  m4a: "m4a",
  mp4: "mp4",
  m4v: "mp4",
  mpg4: "mp4",
  mp4v: "mp4",
  mpeg: "mpeg",
  mpg: "mpeg",
  mpe: "mpeg",
  m1v: "mpeg",
  m2v: "mpeg",
  webm: "webm",
  eml: "eml",
  msg: "msg",
  zip: "zip",
  gz: "gzip",
  tgz: "gzip",
  tar: "tar",
  "7z": "7z",
};

export function fileKind(format: Format): FileKind {
  return KIND[format];
}

const FILE_ICONS: Partial<Record<FileKind, IconName>> = {
  image: "image",
  vector: "image",
  audio: "audio",
  video: "video",
  archive: "archive",
  email: "mail",
};

/** A drawn icon for this file. Kinds without one use the plain file mark. */
export function fileIconName(name: string, format?: Format): IconName {
  if (isCodeFile(name)) return "code";
  const kind = format ? fileKind(format) : undefined;
  return (kind && FILE_ICONS[kind]) || "file";
}

/** Detail when this format has no session yet. Open formats return `undefined`. */
export function unwiredDetail(format: Format): string | undefined {
  return UNWIRED[format];
}

const startsWith = (bytes: Uint8Array, magic: number[]) => magic.every((b, i) => bytes[i] === b);

function extension(name: string): string | undefined {
  const base = name.split(/[/\\]/).pop() ?? name;
  return /\.([a-z0-9]+)$/i.exec(base)?.[1]?.toLowerCase();
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

function contains(bytes: Uint8Array, needle: Uint8Array): boolean {
  return indexOf(bytes, needle) >= 0;
}

/** ZIP local names are uncompressed, so the part name is visible in the bytes. */
function sniffZip(bytes: Uint8Array, ext: string | undefined): Format {
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
  if (best) return best.format;
  if (ext && OFFICE[ext]) return OFFICE[ext];
  return ext === "zip" ? "zip" : "docx";
}

/** OLE directory entries store the stream name as UTF-16LE. */
function sniffOle(bytes: Uint8Array, ext: string | undefined): Format {
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
  if (best) return best.format;
  if (
    ext === "msg" ||
    contains(bytes, utf16("__nameid_version1.0")) ||
    contains(bytes, utf16("__substg1.0")) ||
    contains(bytes, utf16("__properties_version1.0"))
  ) {
    return "msg";
  }
  if (ext && OFFICE[ext]) return OFFICE[ext];
  return "doc";
}

function isSvg(bytes: Uint8Array): boolean {
  const head = new TextDecoder("utf-8", { fatal: false })
    .decode(bytes.subarray(0, Math.min(bytes.length, 512)))
    .trimStart()
    .toLowerCase();
  return head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"));
}

/** Adobe Illustrator files are often PDF-compatible and carry this marker. */
function isIllustrator(bytes: Uint8Array, ext: string | undefined): boolean {
  if (ext === "ai") return true;
  const head = bytes.subarray(0, Math.min(bytes.length, 65_536));
  return contains(head, ascii("Adobe Illustrator"));
}

function isTiff(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  const le = bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 42 && bytes[3] === 0;
  const be = bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0 && bytes[3] === 42;
  return le || be;
}

function isBmp(bytes: Uint8Array): boolean {
  if (bytes.length < 18 || bytes[0] !== 0x42 || bytes[1] !== 0x4d) return false;
  const dib = (bytes[14] ?? 0) | ((bytes[15] ?? 0) << 8) | ((bytes[16] ?? 0) << 16) | ((bytes[17] ?? 0) << 24);
  return dib === 12 || dib === 40 || dib === 52 || dib === 56 || dib === 64 || dib === 108 || dib === 124;
}

function isWebm(bytes: Uint8Array, ext: string | undefined): boolean {
  if (!startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return false;
  if (ext === "webm") return true;
  return contains(bytes.subarray(0, Math.min(bytes.length, 4096)), ascii("webm"));
}

function isoBmff(bytes: Uint8Array): Format | undefined {
  if (bytes.length < 12 || !contains(bytes.subarray(4, 8), ascii("ftyp"))) return undefined;
  const brand = new TextDecoder().decode(bytes.subarray(8, 12));
  if (brand === "M4A " || brand === "M4B " || brand === "M4P ") return "m4a";
  if (["isom", "iso2", "mp41", "mp42", "avc1", "dash", "M4V ", "MSNV"].includes(brand)) return "mp4";
  return undefined;
}

function isEmail(bytes: Uint8Array, ext: string | undefined): boolean {
  if (ext === "eml") return true;
  const head = new TextDecoder("utf-8", { fatal: false })
    .decode(bytes.subarray(0, Math.min(bytes.length, 512)))
    .trimStart()
    .toLowerCase();
  return head.startsWith("mime-version:") || head.startsWith("received:") || head.startsWith("return-path:");
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
  if (bytes.length >= 12 && startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45) {
    return "wav";
  }
  if (isTiff(bytes)) return "tiff";
  if (isBmp(bytes)) return "bmp";
  if (isSvg(bytes)) return "svg";
  if (isIllustrator(bytes, ext)) return "ai";
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46])) return "pdf";
  if (startsWith(bytes, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])) return "7z";
  if (startsWith(bytes, [0x1f, 0x8b])) return "gzip";
  if (bytes.length >= 262 && contains(bytes.subarray(257, 262), ascii("ustar"))) return "tar";
  if (isWebm(bytes, ext)) return "webm";
  const movie = isoBmff(bytes);
  if (movie) return movie;
  if (startsWith(bytes, [0x49, 0x44, 0x33])) return "mp3";
  if (startsWith(bytes, [0x00, 0x00, 0x01, 0xba]) || startsWith(bytes, [0x00, 0x00, 0x01, 0xb3])) return "mpeg";
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) || startsWith(bytes, [0x50, 0x4b, 0x05, 0x06])) return sniffZip(bytes, ext);
  if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return sniffOle(bytes, ext);
  if (isEmail(bytes, ext)) return "eml";
  if (ext && BY_EXTENSION[ext]) return BY_EXTENSION[ext];
  throw new FiledomError("unsupported-format", name || "unknown file");
}

/** `report.doc` + `docx` → `report.docx`. */
export function exportName(name: string, extension: string): string {
  const base = name.replace(/\.[^./\\]+$/, "") || "document";
  return `${base}.${extension}`;
}
