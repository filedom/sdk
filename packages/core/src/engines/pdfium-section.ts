import { FiledomError } from "../errors.js";

/** Custom section appended by the pdf bundle build. */
export const PDFIUM_SECTION = "filedom-pdfium";

/** Shown when the pdf engine wasm is missing its embedded renderer. Raised before the file opens. */
export const PDFIUM_MISSING_DETAIL =
  "The PDF engine bundle is incomplete. Rebuild it with wasm/scripts/build-bundles.mjs, then publish that wasm into the bundle directory.";

/**
 * Renderer bytes carried inside the pdf engine wasm.
 * The bytes are one wasm module (`\0asm` …). A missing section is `bundle-missing`
 * with {@link PDFIUM_MISSING_DETAIL}.
 */
export function pdfiumBytes(wasm: Uint8Array): Uint8Array {
  if (!hasMagic(wasm)) throw new FiledomError("bundle-missing", PDFIUM_MISSING_DETAIL);
  let found: Uint8Array | undefined;
  for (const section of walk(wasm)) {
    if (section.id !== 0) continue;
    const [length, nameAt] = uleb(wasm, section.start);
    const nameEnd = nameAt + length;
    if (nameEnd > section.end) throw new FiledomError("bundle-missing", PDFIUM_MISSING_DETAIL);
    if (ascii(wasm.subarray(nameAt, nameEnd)) !== PDFIUM_SECTION) continue;
    found = wasm.subarray(nameEnd, section.end);
  }
  if (!found || !hasMagic(found)) throw new FiledomError("bundle-missing", PDFIUM_MISSING_DETAIL);
  return found;
}

/** A standalone ArrayBuffer of `bytes`, so a view into the engine module is not shared. */
export function wasmArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const { buffer, byteOffset, byteLength } = bytes;
  if (buffer instanceof ArrayBuffer && byteOffset === 0 && byteLength === buffer.byteLength) return buffer;
  const copy = new ArrayBuffer(byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

function hasMagic(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0 && bytes[1] === 0x61 && bytes[2] === 0x73 && bytes[3] === 0x6d;
}

function ascii(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]!);
  return out;
}

interface Section {
  id: number;
  start: number;
  end: number;
}

function walk(wasm: Uint8Array): Section[] {
  const out: Section[] = [];
  let i = 8;
  while (i < wasm.length) {
    const id = wasm[i]!;
    const [size, start] = uleb(wasm, i + 1);
    const end = start + size;
    if (end > wasm.length) throw new FiledomError("bundle-missing", PDFIUM_MISSING_DETAIL);
    out.push({ id, start, end });
    i = end;
  }
  if (i !== wasm.length) throw new FiledomError("bundle-missing", PDFIUM_MISSING_DETAIL);
  return out;
}

function uleb(buf: Uint8Array, at: number): [number, number] {
  let value = 0;
  let shift = 0;
  let i = at;
  while (i < buf.length && shift <= 28) {
    const byte = buf[i++]!;
    value += (byte & 0x7f) * 2 ** shift;
    if (byte < 128) return [value, i];
    shift += 7;
  }
  throw new FiledomError("bundle-missing", PDFIUM_MISSING_DETAIL);
}
