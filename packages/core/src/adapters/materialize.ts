import { detectFormat } from "../formats.js";
import type { OpenedAdapterFile } from "./api.js";
import { stemOf } from "./variation.js";
import { writeZip } from "./zip-bytes.js";

export interface PresentedFile {
  bytes: Uint8Array;
  displayName: string;
}

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) crc = CRC_TABLE[(crc ^ (bytes[i] ?? 0)) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function adler32(bytes: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (let i = 0; i < bytes.length; i += 1) {
    a = (a + (bytes[i] ?? 0)) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function zlibStore(data: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [Uint8Array.of(0x78, 0x01)];
  let offset = 0;
  while (offset < data.length || data.length === 0) {
    const size = Math.min(65535, data.length - offset);
    const final = offset + size >= data.length;
    const header = new Uint8Array(5);
    header[0] = final ? 1 : 0;
    header[1] = size & 0xff;
    header[2] = (size >> 8) & 0xff;
    header[3] = ~size & 0xff;
    header[4] = (~size >> 8) & 0xff;
    parts.push(header, data.subarray(offset, offset + size));
    offset += size;
    if (final) break;
  }
  const sum = adler32(data);
  parts.push(Uint8Array.of((sum >>> 24) & 0xff, (sum >>> 16) & 0xff, (sum >>> 8) & 0xff, sum & 0xff));
  return concat(parts);
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  out[0] = (data.length >>> 24) & 0xff;
  out[1] = (data.length >>> 16) & 0xff;
  out[2] = (data.length >>> 8) & 0xff;
  out[3] = data.length & 0xff;
  out[4] = type.charCodeAt(0);
  out[5] = type.charCodeAt(1);
  out[6] = type.charCodeAt(2);
  out[7] = type.charCodeAt(3);
  out.set(data, 8);
  const crc = crc32(out.subarray(4, 8 + data.length));
  out[8 + data.length] = (crc >>> 24) & 0xff;
  out[9 + data.length] = (crc >>> 16) & 0xff;
  out[10 + data.length] = (crc >>> 8) & 0xff;
  out[11 + data.length] = crc & 0xff;
  return out;
}

export function encodePng(width: number, height: number, pixels: Uint8ClampedArray): Uint8Array {
  const raw = new Uint8Array((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    raw.set(pixels.subarray(y * width * 4, (y + 1) * width * 4), row + 1);
  }
  const ihdr = new Uint8Array(13);
  ihdr[0] = (width >>> 24) & 0xff;
  ihdr[1] = (width >>> 16) & 0xff;
  ihdr[2] = (width >>> 8) & 0xff;
  ihdr[3] = width & 0xff;
  ihdr[4] = (height >>> 24) & 0xff;
  ihdr[5] = (height >>> 16) & 0xff;
  ihdr[6] = (height >>> 8) & 0xff;
  ihdr[7] = height & 0xff;
  ihdr[8] = 8;
  ihdr[9] = 6;
  return concat([
    Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlibStore(raw)),
    chunk("IEND", new Uint8Array()),
  ]);
}

export function encodeWav(sampleRate: number, channels: Float32Array[]): Uint8Array {
  const count = channels[0]?.length ?? 0;
  const data = new Uint8Array(count * channels.length * 2);
  const view = new DataView(data.buffer);
  for (let frame = 0; frame < count; frame += 1) {
    for (let channel = 0; channel < channels.length; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channels[channel]?.[frame] ?? 0));
      view.setInt16((frame * channels.length + channel) * 2, Math.round(sample * 32767), true);
    }
  }
  const out = new Uint8Array(44 + data.length);
  const header = new DataView(out.buffer);
  out.set(new TextEncoder().encode("RIFF"), 0);
  header.setUint32(4, 36 + data.length, true);
  out.set(new TextEncoder().encode("WAVEfmt "), 8);
  header.setUint32(16, 16, true);
  header.setUint16(20, 1, true);
  header.setUint16(22, channels.length, true);
  header.setUint32(24, sampleRate, true);
  header.setUint32(28, sampleRate * channels.length * 2, true);
  header.setUint16(32, channels.length * 2, true);
  header.setUint16(34, 16, true);
  out.set(new TextEncoder().encode("data"), 36);
  header.setUint32(40, data.length, true);
  out.set(data, 44);
  return out;
}

function pdfEscape(text: string): string {
  return text
    .replace(/[^\u0020-\u007e]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

export function encodePdf(text: string): Uint8Array {
  const lines = text.replace(/\r\n/g, "\n").split("\n").flatMap((line) => {
    const chunks: string[] = [];
    const value = line || " ";
    for (let i = 0; i < value.length; i += 90) chunks.push(value.slice(i, i + 90));
    return chunks.length ? chunks : [" "];
  });
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += 46) pages.push(lines.slice(i, i + 46));
  if (pages.length === 0) pages.push([" "]);
  const objects: string[] = [];
  const pageIds: number[] = [];
  let next = 3;
  const fontId = 3 + pages.length * 2;
  for (const page of pages) {
    const pageId = next;
    const contentId = next + 1;
    next += 2;
    pageIds.push(pageId);
    const commands = page
      .map((line, index) => `${index === 0 ? "72 760 Td" : "0 -16 Td"} (${pdfEscape(line)}) Tj`)
      .join("\n");
    const stream = `BT /F1 11 Tf\n${commands}\nET`;
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`;
    objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  }
  objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
  objects[2] = `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`;
  objects[fontId] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`;
  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (let id = 1; id <= fontId; id += 1) {
    offsets[id] = body.length;
    body += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref = body.length;
  body += `xref\n0 ${fontId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= fontId; id += 1) body += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  body += `trailer << /Size ${fontId + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(body);
}

function named(name: string, extension: string): string {
  return `${stemOf(name)}.${extension}`;
}

function readable(opened: OpenedAdapterFile): string {
  if (opened.text?.trim()) return opened.text;
  if (opened.pages?.length) return opened.pages.map((page, index) => `Page ${index + 1}\n${page.text}`).join("\n\n");
  if (opened.messages?.length) {
    return opened.messages
      .map((message) => `From: ${message.from}\nSubject: ${message.subject}\n\n${message.body}`)
      .join("\n\n");
  }
  if (opened.entries?.length) return opened.entries.map((entry) => entry.name).join("\n");
  return "This file has no text.";
}

/** Turns every adapter result into PNG, WAV, PDF, or ZIP bytes the engine already opens. */
export function materialize(opened: OpenedAdapterFile): PresentedFile {
  if (opened.display) return { bytes: opened.display.bytes, displayName: named(opened.name, opened.display.extension) };
  if (opened.image) {
    return {
      bytes: encodePng(opened.image.width, opened.image.height, opened.image.pixels),
      displayName: named(opened.name, "png"),
    };
  }
  if (opened.audio && opened.audio.channels.length > 0) {
    return { bytes: encodeWav(opened.audio.sampleRate, opened.audio.channels), displayName: named(opened.name, "wav") };
  }
  if (opened.entries?.length === 1) {
    const only = opened.entries[0]!;
    try {
      detectFormat(only.bytes, only.name);
      return { bytes: only.bytes, displayName: only.name };
    } catch {
      // A single inner file the engine does not know stays in a zip with the rest.
    }
  }
  if (opened.entries && opened.entries.length > 0) {
    return { bytes: writeZip(opened.entries), displayName: named(opened.name, "zip") };
  }
  return { bytes: encodePdf(readable(opened)), displayName: named(opened.name, "pdf") };
}
