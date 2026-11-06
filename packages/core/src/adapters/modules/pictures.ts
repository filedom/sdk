import { FiledomError } from "../../errors.js";
import type { AdapterModule } from "../api.js";
import { tryPackage } from "../load.js";
import { openedFile } from "../session.js";
import { AVIF_ADAPTERS, EXR_ADAPTERS, JPEG2000_ADAPTERS, JXL_ADAPTERS, PSD_ADAPTERS } from "../suffixes.js";
import { asBytes, imageRecord, pixelsFrom, rgbaUnitFloats } from "../variation.js";

async function prepare(mod: Record<string, unknown>): Promise<void> {
  if (typeof mod.init === "function") await (mod.init as () => Promise<unknown>)();
}

async function decodeImage(specifier: string, names: readonly string[], bytes: Uint8Array, name: string): Promise<ReturnType<typeof openedFile>> {
  const opened = await tryPackage(specifier, async (mod) => {
    await prepare(mod);
    const named = names.map((key) => mod[key]).find((value) => typeof value === "function") as ((data: Uint8Array) => unknown) | undefined;
    const decode = (named ?? mod.decode ?? mod.default) as ((data: Uint8Array) => Promise<unknown> | unknown) | undefined;
    if (typeof decode !== "function") return undefined;
    const image = pixelsFrom(await decode(bytes));
    return image ? openedFile(name, bytes, "image", { image }) : undefined;
  });
  if (!opened) throw new FiledomError("unsupported", `${specifier} is not loaded`);
  return opened;
}

async function encodeImage(specifier: string, opened: { image?: { width: number; height: number; pixels: Uint8ClampedArray }; source: Uint8Array }): Promise<Uint8Array> {
  const written = await tryPackage(specifier, async (mod) => {
    await prepare(mod);
    const image = opened.image;
    const encodeRgba = mod.encodeRgbaExr as ((data: unknown) => unknown) | undefined;
    if (typeof encodeRgba === "function" && image) {
      return asBytes(await encodeRgba({ width: image.width, height: image.height, interleavedRgbaPixels: rgbaUnitFloats(image) }));
    }
    const encode = (mod.encode ?? mod.default) as ((data: unknown) => Promise<unknown> | unknown) | undefined;
    if (typeof encode !== "function" || !image) return undefined;
    return asBytes(await encode(imageRecord(image)));
  });
  if (!written) throw new FiledomError("unsupported", `${specifier} is not loaded`);
  return written;
}

export const exrModule: AdapterModule = {
  id: "exr",
  role: "both",
  extensions: EXR_ADAPTERS,
  async open(bytes, name) {
    return decodeImage("exrs", ["decodeRgbaExr", "decodeRgbExr", "decodeExr"], bytes, name);
  },
  async write(opened) {
    return encodeImage("exrs", opened);
  },
};

export const avifOpen: AdapterModule = {
  id: "avif-open",
  role: "open",
  extensions: AVIF_ADAPTERS,
  async open(bytes, name) {
    return decodeImage("@jsquash/avif/decode.js", ["decode"], bytes, name);
  },
};

export const avifEdit: AdapterModule = {
  id: "avif-edit",
  role: "edit",
  extensions: AVIF_ADAPTERS,
  writes: ["avif"],
  async write(opened) {
    return encodeImage("@jsquash/avif/encode.js", opened);
  },
};

export const jxlOpen: AdapterModule = {
  id: "jxl-open",
  role: "open",
  extensions: JXL_ADAPTERS,
  async open(bytes, name) {
    return decodeImage("@jsquash/jxl/decode.js", ["decode"], bytes, name);
  },
};

export const jxlEdit: AdapterModule = {
  id: "jxl-edit",
  role: "edit",
  extensions: JXL_ADAPTERS,
  writes: ["jxl"],
  async write(opened) {
    return encodeImage("@jsquash/jxl/encode.js", opened);
  },
};

interface Jpeg2000Decoder {
  getEncodedBuffer: (length: number) => ArrayBuffer | Uint8Array;
  decode: () => void;
  getDecodedBuffer: () => ArrayBuffer | Uint8Array;
  getFrameInfo: () => { width: number; height: number };
}

interface Jpeg2000Encoder {
  getDecodedBuffer: (length?: number) => ArrayBuffer | Uint8Array;
  encode: () => void;
  getEncodedBuffer: () => ArrayBuffer | Uint8Array;
}

async function jpeg2000Library(mod: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  const factory = mod.default ?? mod.OpenJPEGJS;
  if (typeof factory === "function") {
    const loaded = await (factory as () => Promise<unknown>)();
    return loaded && typeof loaded === "object" ? (loaded as Record<string, unknown>) : undefined;
  }
  return typeof factory === "object" && factory ? (factory as Record<string, unknown>) : mod;
}

export const jpeg2000Open: AdapterModule = {
  id: "jpeg2000-open",
  role: "open",
  extensions: JPEG2000_ADAPTERS,
  async open(bytes, name) {
    const opened = await tryPackage("@cornerstonejs/codec-openjpeg/decode", async (mod) => {
      const lib = await jpeg2000Library(mod);
      const Ctor = (lib?.J2KDecoder ?? mod.J2KDecoder) as (new () => Jpeg2000Decoder) | undefined;
      if (typeof Ctor !== "function") return undefined;
      const decoder = new Ctor();
      const encoded = decoder.getEncodedBuffer(bytes.length);
      const target = encoded instanceof Uint8Array ? encoded : new Uint8Array(encoded);
      target.set(bytes.subarray(0, target.length));
      decoder.decode();
      const frame = decoder.getFrameInfo();
      const image = pixelsFrom({ width: frame.width, height: frame.height, data: decoder.getDecodedBuffer() });
      return image ? openedFile(name, bytes, "image", { image }) : undefined;
    });
    if (!opened) throw new FiledomError("unsupported", "@cornerstonejs/codec-openjpeg is not loaded");
    return opened;
  },
};

export const jpeg2000Edit: AdapterModule = {
  id: "jpeg2000-edit",
  role: "edit",
  extensions: JPEG2000_ADAPTERS,
  writes: ["j2k"],
  async write(opened) {
    const written = await tryPackage("@cornerstonejs/codec-openjpeg", async (mod) => {
      const lib = await jpeg2000Library(mod);
      const Ctor = (lib?.J2KEncoder ?? mod.J2KEncoder) as (new () => Jpeg2000Encoder) | undefined;
      const image = opened.image;
      if (typeof Ctor !== "function" || !image) return undefined;
      const encoder = new Ctor();
      const decoded = encoder.getDecodedBuffer(image.pixels.length);
      const target = decoded instanceof Uint8Array ? decoded : new Uint8Array(decoded);
      target.set(image.pixels.subarray(0, target.length));
      encoder.encode();
      return asBytes(encoder.getEncodedBuffer());
    });
    if (!written) throw new FiledomError("unsupported", "@cornerstonejs/codec-openjpeg is not loaded");
    return written;
  },
};

export const psdOpen: AdapterModule = {
  id: "psd-open",
  role: "open",
  extensions: PSD_ADAPTERS,
  async open(bytes, name) {
    const opened = await tryPackage("@webtoon/psd", async (mod) => {
      const parse = ((mod.default as { parse?: (data: ArrayBuffer) => { composite: () => Promise<Uint8ClampedArray>; width: number; height: number } } | undefined)?.parse ??
        (mod.parse as ((data: ArrayBuffer) => { composite: () => Promise<Uint8ClampedArray>; width: number; height: number }) | undefined));
      if (!parse) return undefined;
      const copy = new Uint8Array(bytes);
      const psd = parse(copy.buffer);
      const pixels = await psd.composite();
      const image = pixelsFrom({ width: psd.width, height: psd.height, data: pixels });
      return image ? openedFile(name, bytes, "image", { image }) : undefined;
    });
    if (!opened) throw new FiledomError("unsupported", "@webtoon/psd is not loaded");
    return opened;
  },
};

export const pictureModules = [exrModule, avifOpen, avifEdit, jxlOpen, jxlEdit, jpeg2000Open, jpeg2000Edit, psdOpen];
