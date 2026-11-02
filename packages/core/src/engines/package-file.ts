/** Store-only ZIP plus the revision ledger each format can carry inside the file. */

const PDF_MARK = "\n% FILEDOM-REVISIONS ";
const ZIP_MARK = "FILEDOM-REVISIONS ";

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

function crc32(data: Uint8Array): number {
  let c = ~0;
  for (const byte of data) {
    c ^= byte;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function u16(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value, true);
}

function u32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value, true);
}

/** A ZIP of stored (uncompressed) entries. Office readers accept this. */
export function storeZip(entries: ZipEntry[]): Uint8Array {
  const parts: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = new TextEncoder().encode(entry.name);
    const crc = crc32(entry.data);
    const local = new Uint8Array(30 + name.length + entry.data.length);
    const view = new DataView(local.buffer);
    u32(view, 0, 0x04034b50);
    u16(view, 8, 0);
    u32(view, 14, crc);
    u32(view, 18, entry.data.length);
    u32(view, 22, entry.data.length);
    u16(view, 26, name.length);
    local.set(name, 30);
    local.set(entry.data, 30 + name.length);
    parts.push(local);

    const central = new Uint8Array(46 + name.length);
    const directory = new DataView(central.buffer);
    u32(directory, 0, 0x02014b50);
    u16(directory, 10, 0);
    u32(directory, 16, crc);
    u32(directory, 20, entry.data.length);
    u32(directory, 24, entry.data.length);
    u16(directory, 28, name.length);
    u32(directory, 42, offset);
    central.set(name, 46);
    centrals.push(central);
    offset += local.length;
  }
  const directorySize = centrals.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const tail = new DataView(end.buffer);
  u32(tail, 0, 0x06054b50);
  u16(tail, 8, entries.length);
  u16(tail, 10, entries.length);
  u32(tail, 12, directorySize);
  u32(tail, 16, offset);
  parts.push(...centrals, end);
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let cursor = 0;
  for (const part of parts) {
    out.set(part, cursor);
    cursor += part.length;
  }
  return out;
}

function findEocd(bytes: Uint8Array): number {
  const start = Math.max(0, bytes.length - 22 - 65535);
  for (let i = bytes.length - 22; i >= start; i--) {
    if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) return i;
  }
  return -1;
}

export function readZipComment(bytes: Uint8Array): string | null {
  const at = findEocd(bytes);
  if (at < 0) return null;
  const length = bytes[at + 20]! | ((bytes[at + 21]! << 8) >>> 0);
  if (!length || at + 22 + length > bytes.length) return null;
  return new TextDecoder().decode(bytes.subarray(at + 22, at + 22 + length));
}

export function setZipComment(bytes: Uint8Array, comment: string): Uint8Array {
  const at = findEocd(bytes);
  if (at < 0) return bytes;
  const payload = new TextEncoder().encode(comment);
  if (payload.length > 65535) throw new Error("open-failed: revision history does not fit in the file");
  const out = new Uint8Array(at + 22 + payload.length);
  out.set(bytes.subarray(0, at + 20), 0);
  out[at + 20] = payload.length & 0xff;
  out[at + 21] = (payload.length >>> 8) & 0xff;
  out.set(payload, at + 22);
  return out;
}

export function encodeLedger(value: unknown): string {
  return ZIP_MARK + JSON.stringify(value);
}

export function decodeZipLedger<T>(bytes: Uint8Array): T | null {
  const comment = readZipComment(bytes);
  if (!comment?.startsWith(ZIP_MARK)) return null;
  return JSON.parse(comment.slice(ZIP_MARK.length)) as T;
}

/** PDF has no revision objects. The history rides in a comment after the file. */
export function readPdfLedger<T>(bytes: Uint8Array): { pdf: Uint8Array; ledger: T | null } {
  const text = new TextDecoder("latin1").decode(bytes);
  const at = text.lastIndexOf(PDF_MARK);
  if (at < 0) return { pdf: bytes, ledger: null };
  try {
    return { pdf: bytes.subarray(0, at), ledger: JSON.parse(text.slice(at + PDF_MARK.length).trim()) as T };
  } catch {
    return { pdf: bytes, ledger: null };
  }
}

export function appendPdfLedger(pdf: Uint8Array, value: unknown): Uint8Array {
  const payload = new TextEncoder().encode(`${PDF_MARK}${JSON.stringify(value)}\n`);
  const out = new Uint8Array(pdf.length + payload.length);
  out.set(pdf, 0);
  out.set(payload, pdf.length);
  return out;
}

export interface DocxParagraph {
  text: string;
  revisions: Array<{ author: string; date: string; start: number; deleted: string; inserted: string }>;
}

function xml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function run(text: string, tag: "t" | "delText"): string {
  if (!text) return "";
  return `<w:r><w:${tag} xml:space="preserve">${xml(text)}</w:${tag}></w:r>`;
}

/** A WordprocessingML package whose insertions and deletions Word can read. */
export function buildDocx(paragraphs: DocxParagraph[]): Uint8Array {
  let nextId = 1;
  const body = paragraphs
    .map((paragraph) => {
      const revision = paragraph.revisions[0];
      if (!revision) return `<w:p>${run(paragraph.text, "t")}</w:p>`;
      const inserted = Array.from(revision.inserted);
      const before = Array.from(paragraph.text).slice(0, revision.start).join("");
      const after = Array.from(paragraph.text).slice(revision.start + inserted.length).join("");
      const deleted = revision.deleted
        ? `<w:del w:id="${nextId++}" w:author="${xml(revision.author)}" w:date="${xml(revision.date)}">${run(revision.deleted, "delText")}</w:del>`
        : "";
      const added = revision.inserted
        ? `<w:ins w:id="${nextId++}" w:author="${xml(revision.author)}" w:date="${xml(revision.date)}">${run(revision.inserted, "t")}</w:ins>`
        : "";
      return `<w:p>${run(before, "t")}${deleted}${added}${run(after, "t")}</w:p>`;
    })
    .join("");
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/></w:sectPr></w:body></w:document>`;
  const types = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  const text = new TextEncoder();
  return storeZip([
    { name: "[Content_Types].xml", data: text.encode(types) },
    { name: "_rels/.rels", data: text.encode(rels) },
    { name: "word/document.xml", data: text.encode(document) },
  ]);
}
