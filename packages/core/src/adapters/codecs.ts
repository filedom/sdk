import { FiledomError } from "../errors.js";
import type { AdapterAudio, AdapterImage, AdapterMessage } from "./api.js";

function u16be(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0);
}

function u32be(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] ?? 0) * 0x1000000 +
      ((bytes[offset + 1] ?? 0) << 16) +
      ((bytes[offset + 2] ?? 0) << 8) +
      (bytes[offset + 3] ?? 0)) >>>
    0
  );
}

function putU32be(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = (value >>> 24) & 0xff;
  bytes[offset + 1] = (value >>> 16) & 0xff;
  bytes[offset + 2] = (value >>> 8) & 0xff;
  bytes[offset + 3] = value & 0xff;
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  let out = "";
  for (let i = 0; i < length; i += 1) out += String.fromCharCode(bytes[offset + i] ?? 0);
  return out;
}

function fail(detail: string): never {
  throw new FiledomError("unsupported", detail);
}

export function decodeFarbfeld(bytes: Uint8Array): AdapterImage {
  if (ascii(bytes, 0, 8) !== "farbfeld") fail("farbfeld header");
  const width = u32be(bytes, 8);
  const height = u32be(bytes, 12);
  const pixels = new Uint8ClampedArray(width * height * 4);
  let offset = 16;
  for (let i = 0; i < width * height; i += 1) {
    pixels[i * 4] = bytes[offset] ?? 0;
    pixels[i * 4 + 1] = bytes[offset + 2] ?? 0;
    pixels[i * 4 + 2] = bytes[offset + 4] ?? 0;
    pixels[i * 4 + 3] = bytes[offset + 6] ?? 0;
    offset += 8;
  }
  return { width, height, pixels };
}

export function encodeFarbfeld(image: AdapterImage): Uint8Array {
  const out = new Uint8Array(16 + image.width * image.height * 8);
  out.set(new TextEncoder().encode("farbfeld"));
  putU32be(out, 8, image.width);
  putU32be(out, 12, image.height);
  let offset = 16;
  for (let i = 0; i < image.width * image.height; i += 1) {
    out[offset] = image.pixels[i * 4] ?? 0;
    out[offset + 2] = image.pixels[i * 4 + 1] ?? 0;
    out[offset + 4] = image.pixels[i * 4 + 2] ?? 0;
    out[offset + 6] = image.pixels[i * 4 + 3] ?? 255;
    offset += 8;
  }
  return out;
}

export function decodeQoi(bytes: Uint8Array): AdapterImage {
  if (ascii(bytes, 0, 4) !== "qoif") fail("qoi header");
  const width = u32be(bytes, 4);
  const height = u32be(bytes, 8);
  const pixels = new Uint8ClampedArray(width * height * 4);
  const seen = new Uint8Array(64 * 4);
  let r = 0;
  let g = 0;
  let b = 0;
  let a = 255;
  let p = 14;
  const end = bytes.length - 8;
  let px = 0;
  const total = width * height;
  const paint = () => {
    pixels[px * 4] = r;
    pixels[px * 4 + 1] = g;
    pixels[px * 4 + 2] = b;
    pixels[px * 4 + 3] = a;
    px += 1;
  };
  const remember = () => {
    const hash = (r * 3 + g * 5 + b * 7 + a * 11) & 63;
    seen[hash * 4] = r;
    seen[hash * 4 + 1] = g;
    seen[hash * 4 + 2] = b;
    seen[hash * 4 + 3] = a;
  };
  while (px < total) {
    if (p >= end) fail("qoi ended early");
    const op = bytes[p++] ?? 0;
    if (op === 0xfe) {
      r = bytes[p++] ?? 0;
      g = bytes[p++] ?? 0;
      b = bytes[p++] ?? 0;
    } else if (op === 0xff) {
      r = bytes[p++] ?? 0;
      g = bytes[p++] ?? 0;
      b = bytes[p++] ?? 0;
      a = bytes[p++] ?? 0;
    } else if ((op & 0xc0) === 0x00) {
      const i = op & 0x3f;
      r = seen[i * 4] ?? 0;
      g = seen[i * 4 + 1] ?? 0;
      b = seen[i * 4 + 2] ?? 0;
      a = seen[i * 4 + 3] ?? 0;
    } else if ((op & 0xc0) === 0x40) {
      r = (r + ((op >> 4) & 3) - 2) & 255;
      g = (g + ((op >> 2) & 3) - 2) & 255;
      b = (b + (op & 3) - 2) & 255;
    } else if ((op & 0xc0) === 0x80) {
      const next = bytes[p++] ?? 0;
      const dg = (op & 0x3f) - 32;
      r = (r + dg - 8 + ((next >> 4) & 0x0f)) & 255;
      g = (g + dg) & 255;
      b = (b + dg - 8 + (next & 0x0f)) & 255;
    } else {
      const run = (op & 0x3f) + 1;
      for (let i = 0; i < run && px < total; i += 1) paint();
      continue;
    }
    remember();
    paint();
  }
  return { width, height, pixels };
}

export function encodeQoi(image: AdapterImage): Uint8Array {
  const out: number[] = [0x71, 0x6f, 0x69, 0x66];
  const push32 = (value: number) => {
    out.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
  };
  push32(image.width);
  push32(image.height);
  out.push(4, 0);
  for (let i = 0; i < image.width * image.height; i += 1) {
    const r = image.pixels[i * 4] ?? 0;
    const g = image.pixels[i * 4 + 1] ?? 0;
    const b = image.pixels[i * 4 + 2] ?? 0;
    const a = image.pixels[i * 4 + 3] ?? 255;
    if (a === 255) out.push(0xfe, r, g, b);
    else out.push(0xff, r, g, b, a);
  }
  out.push(0, 0, 0, 0, 0, 0, 0, 1);
  return Uint8Array.from(out);
}

function netpbmToken(text: string, index: { i: number }): string {
  const src = text;
  while (index.i < src.length) {
    if (src[index.i] === "#") {
      while (index.i < src.length && src[index.i] !== "\n") index.i += 1;
      continue;
    }
    if (/\s/.test(src[index.i] ?? "")) {
      index.i += 1;
      continue;
    }
    break;
  }
  const start = index.i;
  while (index.i < src.length && !/\s/.test(src[index.i] ?? "") && src[index.i] !== "#") index.i += 1;
  return src.slice(start, index.i);
}

export function decodeNetpbm(bytes: Uint8Array): AdapterImage {
  const head = ascii(bytes, 0, Math.min(2, bytes.length));
  if (!/^P[1-7]$/.test(head)) fail("netpbm header");
  if (head === "P7") return decodePam(bytes);
  const binary = head === "P4" || head === "P5" || head === "P6";
  const text = new TextDecoder("latin1").decode(bytes);
  const index = { i: 2 };
  const width = Number(netpbmToken(text, index));
  const height = Number(netpbmToken(text, index));
  const max = head === "P1" || head === "P4" ? 1 : Number(netpbmToken(text, index));
  if (!width || !height || !max) fail("netpbm size");
  const pixels = new Uint8ClampedArray(width * height * 4);
  if (binary) {
    let data = index.i;
    if ((text[data] ?? "") === "\n" || (text[data] ?? "") === " ") data += 1;
    const raw = bytes.subarray(data);
    let bit = 0;
    for (let i = 0; i < width * height; i += 1) {
      let value = 0;
      if (head === "P4") {
        value = ((raw[bit >> 3] ?? 0) & (0x80 >> (bit & 7))) === 0 ? 255 : 0;
        bit += 1;
        if (i % width === width - 1) bit = (bit + 7) & ~7;
      } else if (head === "P5") {
        value = Math.round(((raw[i] ?? 0) * 255) / max);
      } else {
        value = -1;
        const r = Math.round(((raw[i * 3] ?? 0) * 255) / max);
        const g = Math.round(((raw[i * 3 + 1] ?? 0) * 255) / max);
        const b = Math.round(((raw[i * 3 + 2] ?? 0) * 255) / max);
        pixels[i * 4] = r;
        pixels[i * 4 + 1] = g;
        pixels[i * 4 + 2] = b;
        pixels[i * 4 + 3] = 255;
      }
      if (value >= 0 && head !== "P6") {
        pixels[i * 4] = value;
        pixels[i * 4 + 1] = value;
        pixels[i * 4 + 2] = value;
        pixels[i * 4 + 3] = 255;
      }
    }
    return { width, height, pixels };
  }
  for (let i = 0; i < width * height; i += 1) {
    if (head === "P1") {
      const on = netpbmToken(text, index) === "1" ? 0 : 255;
      pixels[i * 4] = on;
      pixels[i * 4 + 1] = on;
      pixels[i * 4 + 2] = on;
    } else if (head === "P2") {
      const value = Math.round((Number(netpbmToken(text, index)) * 255) / max);
      pixels[i * 4] = value;
      pixels[i * 4 + 1] = value;
      pixels[i * 4 + 2] = value;
    } else {
      pixels[i * 4] = Math.round((Number(netpbmToken(text, index)) * 255) / max);
      pixels[i * 4 + 1] = Math.round((Number(netpbmToken(text, index)) * 255) / max);
      pixels[i * 4 + 2] = Math.round((Number(netpbmToken(text, index)) * 255) / max);
    }
    pixels[i * 4 + 3] = 255;
  }
  return { width, height, pixels };
}

function decodePam(bytes: Uint8Array): AdapterImage {
  const text = new TextDecoder("latin1").decode(bytes);
  const end = text.indexOf("ENDHDR");
  if (end < 0) fail("pam header");
  const header = text.slice(0, end);
  const field = (name: string) => {
    const match = new RegExp(`^${name}\\s+(\\S+)`, "im").exec(header);
    return match?.[1] ?? "";
  };
  const width = Number(field("WIDTH"));
  const height = Number(field("HEIGHT"));
  const depth = Number(field("DEPTH"));
  const max = Number(field("MAXVAL") || "255");
  if (!width || !height || !depth) fail("pam size");
  let data = end + "ENDHDR".length;
  if (text[data] === "\n") data += 1;
  const raw = bytes.subarray(data);
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    const at = i * depth;
    const channel = (n: number) => Math.round(((raw[at + n] ?? 0) * 255) / max);
    pixels[i * 4] = channel(0);
    pixels[i * 4 + 1] = depth > 1 ? channel(1) : channel(0);
    pixels[i * 4 + 2] = depth > 2 ? channel(2) : channel(0);
    pixels[i * 4 + 3] = depth > 3 ? channel(3) : 255;
  }
  return { width, height, pixels };
}

export function encodeNetpbm(image: AdapterImage, kind: "pbm" | "pgm" | "ppm" | "pnm" | "pam"): Uint8Array {
  if (kind === "pam") {
    const header = `P7\nWIDTH ${image.width}\nHEIGHT ${image.height}\nDEPTH 4\nMAXVAL 255\nTUPLTYPE RGB_ALPHA\nENDHDR\n`;
    const body = new Uint8Array(image.width * image.height * 4);
    body.set(image.pixels);
    const head = new TextEncoder().encode(header);
    const out = new Uint8Array(head.length + body.length);
    out.set(head);
    out.set(body, head.length);
    return out;
  }
  const header = `P6\n${image.width} ${image.height}\n255\n`;
  const body = new Uint8Array(image.width * image.height * 3);
  for (let i = 0; i < image.width * image.height; i += 1) {
    body[i * 3] = image.pixels[i * 4] ?? 0;
    body[i * 3 + 1] = image.pixels[i * 4 + 1] ?? 0;
    body[i * 3 + 2] = image.pixels[i * 4 + 2] ?? 0;
  }
  const head = new TextEncoder().encode(header);
  const out = new Uint8Array(head.length + body.length);
  out.set(head);
  out.set(body, head.length);
  return out;
}

export function decodeTga(bytes: Uint8Array): AdapterImage {
  if (bytes.length < 18) fail("tga header");
  const idLength = bytes[0] ?? 0;
  const colorType = bytes[2] ?? 0;
  const width = (bytes[12] ?? 0) | ((bytes[13] ?? 0) << 8);
  const height = (bytes[14] ?? 0) | ((bytes[15] ?? 0) << 8);
  const bpp = bytes[16] ?? 0;
  const descriptor = bytes[17] ?? 0;
  if ((colorType !== 2 && colorType !== 10) || (bpp !== 24 && bpp !== 32)) fail("tga pixel format");
  const pixels = new Uint8ClampedArray(width * height * 4);
  let offset = 18 + idLength;
  const top = (descriptor & 0x20) !== 0;
  const channels = bpp / 8;
  const write = (x: number, y: number, b: number, g: number, r: number, a: number) => {
    const row = top ? y : height - 1 - y;
    const i = (row * width + x) * 4;
    pixels[i] = r;
    pixels[i + 1] = g;
    pixels[i + 2] = b;
    pixels[i + 3] = a;
  };
  if (colorType === 2) {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        write(x, y, bytes[offset] ?? 0, bytes[offset + 1] ?? 0, bytes[offset + 2] ?? 0, channels === 4 ? (bytes[offset + 3] ?? 255) : 255);
        offset += channels;
      }
    }
    return { width, height, pixels };
  }
  let x = 0;
  let y = 0;
  while (y < height) {
    const packet = bytes[offset++] ?? 0;
    const count = (packet & 0x7f) + 1;
    const raw = (packet & 0x80) === 0;
    const sample = { b: bytes[offset] ?? 0, g: bytes[offset + 1] ?? 0, r: bytes[offset + 2] ?? 0, a: channels === 4 ? (bytes[offset + 3] ?? 255) : 255 };
    if (raw) {
      for (let n = 0; n < count; n += 1) {
        write(x, y, bytes[offset] ?? 0, bytes[offset + 1] ?? 0, bytes[offset + 2] ?? 0, channels === 4 ? (bytes[offset + 3] ?? 255) : 255);
        offset += channels;
        x += 1;
        if (x === width) {
          x = 0;
          y += 1;
        }
      }
    } else {
      offset += channels;
      for (let n = 0; n < count; n += 1) {
        write(x, y, sample.b, sample.g, sample.r, sample.a);
        x += 1;
        if (x === width) {
          x = 0;
          y += 1;
        }
      }
    }
  }
  return { width, height, pixels };
}

export function decodeIco(bytes: Uint8Array): AdapterImage | { display: Uint8Array; extension: string } {
  if (bytes.length < 6 || bytes[0] !== 0 || bytes[1] !== 0) fail("ico header");
  const count = (bytes[4] ?? 0) | ((bytes[5] ?? 0) << 8);
  let best: { offset: number; size: number; width: number; height: number } | undefined;
  for (let i = 0; i < count; i += 1) {
    const at = 6 + i * 16;
    const width = bytes[at] || 256;
    const height = bytes[at + 1] || 256;
    const size = u32le(bytes, at + 8);
    const offset = u32le(bytes, at + 12);
    if (!best || width * height > best.width * best.height) best = { offset, size, width, height };
  }
  if (!best) fail("ico image");
  const image = bytes.subarray(best.offset, best.offset + best.size);
  if (image[0] === 0x89 && image[1] === 0x50) return { display: image, extension: "png" };
  const dib = u32le(image, 0);
  if (dib < 40) fail("ico bitmap");
  const width = u32le(image, 4);
  const height = Math.floor(u32le(image, 8) / 2);
  const bpp = (image[14] ?? 0) | ((image[15] ?? 0) << 8);
  if (bpp !== 32) fail("ico bit depth");
  const pixels = new Uint8ClampedArray(width * height * 4);
  const start = dib;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const src = start + ((height - 1 - y) * width + x) * 4;
      const i = (y * width + x) * 4;
      pixels[i] = image[src + 2] ?? 0;
      pixels[i + 1] = image[src + 1] ?? 0;
      pixels[i + 2] = image[src] ?? 0;
      pixels[i + 3] = image[src + 3] ?? 255;
    }
  }
  return { width, height, pixels };
}

function u32le(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] ?? 0) |
      ((bytes[offset + 1] ?? 0) << 8) |
      ((bytes[offset + 2] ?? 0) << 16) |
      ((bytes[offset + 3] ?? 0) << 24)) >>>
    0
  );
}

export function decodeHdr(bytes: Uint8Array): AdapterImage {
  const text = new TextDecoder("latin1").decode(bytes.subarray(0, Math.min(bytes.length, 4096)));
  if (!text.startsWith("#?RADIANCE") && !text.startsWith("#?RGBE")) fail("hdr header");
  const marker = text.search(/\n-Y |\n\+Y /);
  if (marker < 0) fail("hdr resolution");
  const lineEnd = text.indexOf("\n", marker + 1);
  const line = text.slice(marker + 1, lineEnd);
  const match = /([+-])Y (\d+) ([+-])X (\d+)/.exec(line);
  if (!match) fail("hdr resolution");
  const height = Number(match[2]);
  const width = Number(match[4]);
  let offset = lineEnd + 1;
  const pixels = new Uint8ClampedArray(width * height * 4);
  const write = (index: number, r: number, g: number, b: number, e: number) => {
    const scale = e === 0 ? 0 : Math.pow(2, e - 128) / 256;
    pixels[index] = Math.min(255, Math.round(r * scale * 255));
    pixels[index + 1] = Math.min(255, Math.round(g * scale * 255));
    pixels[index + 2] = Math.min(255, Math.round(b * scale * 255));
    pixels[index + 3] = 255;
  };
  for (let y = 0; y < height; y += 1) {
    if (width < 8 || width > 0x7fff || bytes[offset] !== 2 || bytes[offset + 1] !== 2) {
      for (let x = 0; x < width; x += 1) {
        write((y * width + x) * 4, bytes[offset] ?? 0, bytes[offset + 1] ?? 0, bytes[offset + 2] ?? 0, bytes[offset + 3] ?? 0);
        offset += 4;
      }
      continue;
    }
    offset += 4;
    const channels: number[][] = [[], [], [], []];
    for (let c = 0; c < 4; c += 1) {
      let x = 0;
      while (x < width) {
        const code = bytes[offset++] ?? 0;
        if (code > 128) {
          const count = code - 128;
          const value = bytes[offset++] ?? 0;
          for (let n = 0; n < count; n += 1) channels[c]!.push(value);
          x += count;
        } else {
          for (let n = 0; n < code; n += 1) channels[c]!.push(bytes[offset++] ?? 0);
          x += code;
        }
      }
    }
    for (let x = 0; x < width; x += 1) {
      write((y * width + x) * 4, channels[0]![x] ?? 0, channels[1]![x] ?? 0, channels[2]![x] ?? 0, channels[3]![x] ?? 0);
    }
  }
  return { width, height, pixels };
}

export function decodeDds(bytes: Uint8Array): AdapterImage {
  if (ascii(bytes, 0, 4) !== "DDS ") fail("dds header");
  const height = u32le(bytes, 12);
  const width = u32le(bytes, 16);
  const fourcc = ascii(bytes, 84, 4).replace(/\0/g, "");
  const bitCount = u32le(bytes, 88);
  if (fourcc && fourcc !== "\0\0\0\0") fail("compressed dds");
  if (bitCount !== 32) fail("dds bit depth");
  const pixels = new Uint8ClampedArray(width * height * 4);
  const start = 128;
  for (let i = 0; i < width * height; i += 1) {
    const src = start + i * 4;
    pixels[i * 4] = bytes[src + 2] ?? 0;
    pixels[i * 4 + 1] = bytes[src + 1] ?? 0;
    pixels[i * 4 + 2] = bytes[src] ?? 0;
    pixels[i * 4 + 3] = bytes[src + 3] ?? 255;
  }
  return { width, height, pixels };
}

export function decodeRaster(extension: string, bytes: Uint8Array): AdapterImage | { display: Uint8Array; extension: string } {
  if (extension === "ff") return decodeFarbfeld(bytes);
  if (extension === "qoi") return decodeQoi(bytes);
  if (extension === "pbm" || extension === "pgm" || extension === "ppm" || extension === "pnm" || extension === "pam") {
    return decodeNetpbm(bytes);
  }
  if (extension === "tga") return decodeTga(bytes);
  if (extension === "ico") return decodeIco(bytes);
  if (extension === "hdr") return decodeHdr(bytes);
  if (extension === "dds") return decodeDds(bytes);
  fail(extension);
}

export function encodeRaster(extension: string, image: AdapterImage): Uint8Array {
  if (extension === "ff") return encodeFarbfeld(image);
  if (extension === "qoi") return encodeQoi(image);
  if (extension === "pbm" || extension === "pgm" || extension === "ppm" || extension === "pnm" || extension === "pam") {
    return encodeNetpbm(image, extension === "pam" ? "pam" : "ppm");
  }
  fail(`${extension} write`);
}

function extended80(bytes: Uint8Array, offset: number): number {
  const exp = ((bytes[offset]! & 0x7f) << 8) | bytes[offset + 1]!;
  let mantissa = 0;
  for (let i = 0; i < 8; i += 1) mantissa = mantissa * 256 + (bytes[offset + 2 + i] ?? 0);
  if (exp === 0 && mantissa === 0) return 0;
  const value = mantissa * 2 ** (exp - 16383 - 63);
  return bytes[offset]! & 0x80 ? -value : value;
}

export function decodeAiff(bytes: Uint8Array): AdapterAudio {
  if (ascii(bytes, 0, 4) !== "FORM" || (ascii(bytes, 8, 4) !== "AIFF" && ascii(bytes, 8, 4) !== "AIFC")) fail("aiff header");
  let channels = 1;
  let frames = 0;
  let bits = 16;
  let sampleRate = 44100;
  let sound: Uint8Array | undefined;
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const id = ascii(bytes, offset, 4);
    const size = u32be(bytes, offset + 4);
    const body = bytes.subarray(offset + 8, offset + 8 + size);
    if (id === "COMM" && body.length >= 18) {
      channels = u16be(body, 0);
      frames = u32be(body, 2);
      bits = u16be(body, 6);
      sampleRate = extended80(body, 8) || sampleRate;
    } else if (id === "SSND") {
      const blockOffset = u32be(body, 0);
      sound = body.subarray(8 + blockOffset);
    }
    offset += 8 + size + (size & 1);
  }
  if (!sound) fail("aiff audio");
  return pcm(sound, channels, frames, bits, sampleRate);
}

export function decodeCaf(bytes: Uint8Array): AdapterAudio {
  if (ascii(bytes, 0, 4) !== "caff") fail("caf header");
  let channels = 1;
  let bits = 16;
  let sampleRate = 44100;
  let little = false;
  let sound: Uint8Array | undefined;
  let frames = 0;
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const id = ascii(bytes, offset, 4);
    const size = Number(readI64(bytes, offset + 4));
    const body = bytes.subarray(offset + 12, offset + 12 + size);
    if (id === "desc" && body.length >= 32) {
      sampleRate = readF64(body, 0) || sampleRate;
      const format = ascii(body, 8, 4);
      if (format !== "lpcm") fail("caf format");
      little = (u32be(body, 12) & 2) !== 0;
      channels = u32be(body, 24) || 1;
      bits = u32be(body, 28) || 16;
    } else if (id === "data") {
      sound = body.subarray(4);
      const bytesPerFrame = Math.max(1, (bits / 8) * channels);
      frames = Math.floor(sound.length / bytesPerFrame);
    }
    if (!Number.isFinite(size) || size < 0) break;
    offset += 12 + size;
  }
  if (!sound) fail("caf audio");
  return pcm(sound, channels, frames, bits, sampleRate, little);
}

function readI64(bytes: Uint8Array, offset: number): number {
  let value = 0;
  for (let i = 0; i < 8; i += 1) value = value * 256 + (bytes[offset + i] ?? 0);
  return value;
}

function readF64(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 8).getFloat64(0, false);
}

function pcm(
  sound: Uint8Array,
  channels: number,
  frames: number,
  bits: number,
  sampleRate: number,
  little = false,
): AdapterAudio {
  const planes = Array.from({ length: Math.max(1, channels) }, () => new Float32Array(frames));
  const view = new DataView(sound.buffer, sound.byteOffset, sound.byteLength);
  for (let frame = 0; frame < frames; frame += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const index = (frame * channels + channel) * (bits / 8);
      let sample = 0;
      if (bits === 8) sample = ((sound[index] ?? 128) - 128) / 128;
      else if (bits === 16) sample = view.getInt16(index, little) / 32768;
      else if (bits === 24) {
        const raw = ((sound[index] ?? 0) << 16) | ((sound[index + 1] ?? 0) << 8) | (sound[index + 2] ?? 0);
        const signed = raw & 0x800000 ? raw - 0x1000000 : raw;
        sample = signed / 8388608;
      } else if (bits === 32) sample = view.getInt32(index, little) / 2147483648;
      else fail("pcm width");
      planes[channel]![frame] = sample;
    }
  }
  return { sampleRate: Math.round(sampleRate), channels: planes };
}

export function xmlText(bytes: Uint8Array): string {
  const xml = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  return xml
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, value: string) => String.fromCodePoint(Number(value)))
    .replace(/\s+/g, " ")
    .trim();
}

export function rtfText(bytes: Uint8Array): string {
  const raw = new TextDecoder("latin1").decode(bytes);
  let out = "";
  let i = 0;
  const skipGroup = (start: number) => {
    let depth = 0;
    let at = start;
    while (at < raw.length) {
      if (raw[at] === "\\") {
        at += 2;
        continue;
      }
      if (raw[at] === "{") depth += 1;
      if (raw[at] === "}") {
        depth -= 1;
        if (depth === 0) return at + 1;
      }
      at += 1;
    }
    return raw.length;
  };
  while (i < raw.length) {
    if (raw.startsWith("{\\", i) && /\{(\\\*|\\fonttbl|\\colortbl|\\stylesheet|\\info)/.test(raw.slice(i, i + 16))) {
      i = skipGroup(i);
      continue;
    }
    const ch = raw[i] ?? "";
    if (ch === "\\") {
      const next = raw[i + 1] ?? "";
      if (next === "\\" || next === "{" || next === "}") {
        out += next;
        i += 2;
        continue;
      }
      if (next === "'") {
        out += String.fromCharCode(Number.parseInt(raw.slice(i + 2, i + 4), 16));
        i += 4;
        continue;
      }
      i += 1;
      let word = "";
      while (i < raw.length && /[a-zA-Z]/.test(raw[i] ?? "")) {
        word += raw[i];
        i += 1;
      }
      if (raw[i] === "-") i += 1;
      while (i < raw.length && /[0-9]/.test(raw[i] ?? "")) i += 1;
      if (raw[i] === " ") i += 1;
      if (word === "par" || word === "line") out += "\n";
      continue;
    }
    if (ch === "{" || ch === "}" || ch === "\r") {
      i += 1;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out.replace(/[ \t]+\n/g, "\n").trim();
}

export function mboxMessages(bytes: Uint8Array): AdapterMessage[] {
  const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  const parts = text.split(/\n(?=From )/).filter((part) => part.trim().length > 0);
  return parts.map((part) => {
    const lines = part.replace(/\r\n/g, "\n").split("\n");
    const headerEnd = lines.findIndex((line, index) => index > 0 && line === "");
    const headers = lines.slice(0, headerEnd < 0 ? lines.length : headerEnd);
    const body = headerEnd < 0 ? "" : lines.slice(headerEnd + 1).join("\n").trim();
    const header = (name: string) =>
      headers.find((line) => line.toLowerCase().startsWith(`${name.toLowerCase()}:`))?.slice(name.length + 1).trim() ?? "";
    return { subject: header("subject"), from: header("from"), body };
  });
}
