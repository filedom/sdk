import { FiledomError } from "../errors.js";

export function extensionOf(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? name;
  return /\.([a-z0-9]+)$/i.exec(base)?.[1]?.toLowerCase() ?? "";
}

export function stemOf(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? name;
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(0, dot) : base || "file";
}

export function asBytes(value: unknown): Uint8Array | undefined {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  return undefined;
}

export function asText(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  return undefined;
}

function numberField(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export interface AdapterPixels {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
}

function floatPlane(samples: Float32Array, channels: 3 | 4, count: number): Uint8ClampedArray | undefined {
  if (samples.length < count * channels) return undefined;
  let peak = 0;
  const sampleCount = Math.min(samples.length, 64);
  for (let i = 0; i < sampleCount; i += 1) peak = Math.max(peak, Math.abs(samples[i] ?? 0));
  const scale = peak <= 1.5 ? 255 : 1;
  const pixels = new Uint8ClampedArray(count * 4);
  for (let i = 0; i < count; i += 1) {
    const base = i * channels;
    pixels[i * 4] = (samples[base] ?? 0) * scale;
    pixels[i * 4 + 1] = (samples[base + 1] ?? 0) * scale;
    pixels[i * 4 + 2] = (samples[base + 2] ?? 0) * scale;
    pixels[i * 4 + 3] = channels === 4 ? (samples[base + 3] ?? 1) * scale : 255;
  }
  return pixels;
}

/** ImageData, byte buffers, and float RGBA or RGB planes. */
export function pixelsFrom(value: unknown): AdapterPixels | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const width = numberField(record, "width") ?? numberField(record, "w");
  const height = numberField(record, "height") ?? numberField(record, "h");
  if (!width || !height || width < 1 || height < 1) return undefined;
  const count = width * height;
  const rgba = record.interleavedRgbaPixels;
  if (rgba instanceof Float32Array) {
    const pixels = floatPlane(rgba, 4, count);
    return pixels ? { width, height, pixels } : undefined;
  }
  const rgb = record.interleavedRgbPixels;
  if (rgb instanceof Float32Array) {
    const pixels = floatPlane(rgb, 3, count);
    return pixels ? { width, height, pixels } : undefined;
  }
  const layers = record.layers;
  const first = Array.isArray(layers) ? (layers[0] as { getInterleavedPixels?: (names: string[]) => unknown } | undefined) : undefined;
  if (typeof first?.getInterleavedPixels === "function") {
    const samples = first.getInterleavedPixels(["R", "G", "B", "A"]);
    if (samples instanceof Float32Array) {
      const pixels = floatPlane(samples, 4, count);
      return pixels ? { width, height, pixels } : undefined;
    }
  }
  const data = record.data ?? record.pixels ?? record.rgba ?? record.buffer;
  const bytes = asBytes(data);
  if (!bytes) return undefined;
  if (bytes.length >= count * 4) {
    return { width, height, pixels: new Uint8ClampedArray(bytes.buffer, bytes.byteOffset, count * 4) };
  }
  if (bytes.length >= count * 3) {
    const pixels = new Uint8ClampedArray(count * 4);
    for (let i = 0; i < count; i += 1) {
      pixels[i * 4] = bytes[i * 3] ?? 0;
      pixels[i * 4 + 1] = bytes[i * 3 + 1] ?? 0;
      pixels[i * 4 + 2] = bytes[i * 3 + 2] ?? 0;
      pixels[i * 4 + 3] = 255;
    }
    return { width, height, pixels };
  }
  return undefined;
}

/** The `{ data, width, height }` record image encoders read. */
export function imageRecord(image: AdapterPixels): { data: Uint8ClampedArray; width: number; height: number; colorSpace: "srgb" } {
  return { data: image.pixels, width: image.width, height: image.height, colorSpace: "srgb" };
}

/** RGBA samples in 0..1, the range OpenEXR encoders take. */
export function rgbaUnitFloats(image: AdapterPixels): Float32Array {
  const out = new Float32Array(image.pixels.length);
  for (let i = 0; i < image.pixels.length; i += 1) out[i] = (image.pixels[i] ?? 0) / 255;
  return out;
}

/** PCM from `{ channelData, sampleRate }` or `{ channels, sampleRate }`. */
export function audioFrom(value: unknown): { sampleRate: number; channels: Float32Array[] } | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const sampleRate = numberField(record, "sampleRate") ?? numberField(record, "sample_rate");
  const channels = record.channelData ?? record.channels ?? record.samples;
  if (!sampleRate || !Array.isArray(channels) || channels.length === 0) return undefined;
  const planes = channels.filter((plane): plane is Float32Array => plane instanceof Float32Array);
  if (planes.length !== channels.length) return undefined;
  return { sampleRate, channels: planes };
}

export function pickFn(mod: Record<string, unknown>, names: readonly string[]): ((...args: unknown[]) => unknown) | undefined {
  for (const name of names) {
    const value = mod[name];
    if (typeof value === "function") return value as (...args: unknown[]) => unknown;
  }
  const fallback = mod.default;
  if (fallback && typeof fallback === "object") {
    const nested = pickFn(fallback as Record<string, unknown>, names);
    if (nested) return nested;
  }
  if (typeof fallback === "function" && names.includes("default")) return fallback as (...args: unknown[]) => unknown;
  return undefined;
}

export async function callBytes(fn: (...args: unknown[]) => unknown, bytes: Uint8Array): Promise<Uint8Array | undefined> {
  const result = await fn(bytes);
  return asBytes(result) ?? asBytes((result as { data?: unknown } | undefined)?.data);
}

export function unsupported(detail: string): FiledomError {
  return new FiledomError("unsupported", detail);
}
