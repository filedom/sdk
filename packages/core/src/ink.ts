/**
 * Poppler-matched glyph ink. FreeType is fetched only when a serif face is needed;
 * Helvetica and Arial stay on canvas `fillText` and never load this module.
 *
 * Placement follows Splash: floor the device pen, quarter-pixel x only, no hinting.
 * At 40px and above the quarter-pixel shift disagrees with the reference, so the
 * origin stays on the integer pixel.
 */

export interface InkGlyph {
  width: number;
  rows: number;
  pitch: number;
  bitmapLeft: number;
  bitmapTop: number;
  buffer: Uint8Array;
}

export interface InkFace {
  ptr: number;
  module: InkModule;
  setPixelSize(px: number): unknown;
  charIndex(code: number): number;
  loadGlyph(options: {
    index?: number;
    char?: number;
    flags?: number;
    render?: boolean;
    renderMode?: number;
  }): InkGlyph;
}

export interface InkModule {
  cwrap(name: string, ret: string | null, args: string[]): (...args: unknown[]) => unknown;
  _malloc(size: number): number;
  setValue(ptr: number, value: number, type: string): void;
  HEAPU8: Uint8Array;
}

export interface InkLibrary {
  module: InkModule;
  newFace(bytes: Uint8Array): InkFace;
}

interface InkSlot {
  regular: InkFace;
  italic: InkFace;
  bold: InkFace;
}

const NO_HINT = 0x2 | 0x8;

let slots: InkSlot | null = null;
let generation = 0;
let setTransform: ((face: number, matrix: number, delta: number) => void) | null = null;
let nameIndex: ((face: number, name: string) => number) | null = null;
let matrixPtr = 0;
let deltaPtr = 0;
interface Cached {
  image: HTMLCanvasElement;
  left: number;
  top: number;
}

const cache = new Map<string, Cached | null>();

export function inkGeneration(): number {
  return generation;
}

export function bindInk(library: InkLibrary, faces: InkSlot): void {
  const module = library.module;
  setTransform = module.cwrap("FT_Set_Transform", null, ["number", "number", "number"]) as (
    face: number,
    matrix: number,
    delta: number,
  ) => void;
  nameIndex = module.cwrap("FT_Get_Name_Index", "number", ["number", "string"]) as (
    face: number,
    name: string,
  ) => number;
  matrixPtr = module._malloc(16);
  deltaPtr = module._malloc(8);
  module.setValue(matrixPtr, 65536, "i32");
  module.setValue(matrixPtr + 4, 0, "i32");
  module.setValue(matrixPtr + 8, 0, "i32");
  module.setValue(matrixPtr + 12, 65536, "i32");
  slots = faces;
  cache.clear();
  generation += 1;
  (globalThis as typeof globalThis & { __filedomInkGeneration?: () => number }).__filedomInkGeneration =
    inkGeneration;
}

function faceFor(bold: boolean, italic: boolean): InkFace | null {
  if (!slots) return null;
  if (bold) return slots.bold;
  if (italic) return slots.italic;
  return slots.regular;
}

function ligaName(cluster: string): string {
  return cluster[0] + cluster.slice(1).split("").map((ch) => `_${ch}`).join("");
}

function glyphIndex(face: InkFace, cluster: string): number {
  if (cluster.length > 1 && nameIndex) {
    const named = nameIndex(face.ptr, ligaName(cluster));
    if (named) return named;
  }
  const code = cluster.codePointAt(0) ?? 0;
  return face.charIndex(code);
}

function stamp(glyph: InkGlyph, color: string): HTMLCanvasElement | null {
  if (!glyph.width || !glyph.rows) return null;
  const canvas = document.createElement("canvas");
  canvas.width = glyph.width;
  canvas.height = glyph.rows;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const image = ctx.createImageData(glyph.width, glyph.rows);
  const rgb = parseColor(color);
  const pitch = Math.abs(glyph.pitch) || glyph.width;
  for (let row = 0; row < glyph.rows; row += 1) {
    for (let col = 0; col < glyph.width; col += 1) {
      const coverage = glyph.buffer[row * pitch + col] ?? 0;
      if (!coverage) continue;
      const at = (row * glyph.width + col) * 4;
      image.data[at] = rgb[0];
      image.data[at + 1] = rgb[1];
      image.data[at + 2] = rgb[2];
      image.data[at + 3] = coverage;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

function parseColor(text: string): [number, number, number] {
  const hex = text.trim().replace("#", "");
  if (hex.length === 3) {
    return [parseInt(hex[0] + hex[0], 16), parseInt(hex[1] + hex[1], 16), parseInt(hex[2] + hex[2], 16)];
  }
  if (hex.length === 6) {
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  }
  return [0, 0, 0];
}

/** Draws one cluster. Returns false when this run should use canvas text instead. */
export function paintInkCluster(
  ctx: CanvasRenderingContext2D,
  bold: boolean,
  italic: boolean,
  cluster: string,
  sizePx: number,
  xPx: number,
  yPx: number,
  color: string,
): boolean {
  const face = faceFor(bold, italic);
  if (!face || !setTransform || !cluster) return false;
  const size = Math.max(1, Math.round(sizePx));
  // Advance sums in f32 sit a few millionths of a device pixel short of Poppler's
  // quarter-pixel boundaries. Floor would drop those glyphs into the previous bin.
  const snapped = xPx + 1e-4;
  const x0 = Math.floor(snapped);
  let xFrac = Math.floor((snapped - x0) * 4);
  if (xFrac < 0) xFrac = 0;
  if (xFrac > 3) xFrac = 3;
  if (size >= 40) xFrac = 0;
  const key = `${bold ? "b" : italic ? "i" : "r"}:${size}:${xFrac}:${cluster}:${color}`;
  let cached = cache.get(key);
  if (cached === undefined) {
    face.setPixelSize(size);
    face.module.setValue(deltaPtr, Math.round(xFrac * 0.25 * 64), "i32");
    face.module.setValue(deltaPtr + 4, 0, "i32");
    setTransform(face.ptr, matrixPtr, deltaPtr);
    const index = glyphIndex(face, cluster);
    if (!index) {
      cache.set(key, null);
      return false;
    }
    const glyph = face.loadGlyph({ index, flags: NO_HINT, render: true, renderMode: 0 });
    const image = stamp(glyph, color);
    cached = image ? { image, left: glyph.bitmapLeft, top: glyph.bitmapTop } : null;
    cache.set(key, cached);
  }
  if (!cached) return false;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(cached.image, x0 + cached.left, Math.floor(yPx) - cached.top);
  ctx.restore();
  return true;
}
