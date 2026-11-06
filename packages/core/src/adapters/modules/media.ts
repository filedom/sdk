import { FiledomError } from "../../errors.js";
import type { AdapterModule } from "../api.js";
import { tryPackage } from "../load.js";
import { openedFile } from "../session.js";
import { ARCHIVE_ADAPTERS, CONTAINER_ADAPTERS } from "../suffixes.js";
import { asBytes, stemOf } from "../variation.js";

const DECODERS: Record<string, string> = {
  bz2: "seek-bzip",
  xz: "xz-decompress",
  zst: "fzstd",
};

async function readStream(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const step = await reader.read();
    if (step.done) break;
    if (!step.value) continue;
    parts.push(step.value);
    size += step.value.byteLength;
  }
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}

async function decompress(specifier: string, bytes: Uint8Array): Promise<Uint8Array | undefined> {
  return tryPackage(specifier, async (mod) => {
    if (typeof mod.decompress === "function") return asBytes(await (mod.decompress as (data: Uint8Array) => unknown)(bytes));
    const owner = (typeof mod.default === "function" ? mod.default : undefined) as { decode?: (data: Uint8Array) => unknown } | undefined;
    if (typeof owner?.decode === "function") return asBytes(owner.decode(bytes));
    const Stream = mod.XzReadableStream as (new (stream: ReadableStream) => ReadableStream<Uint8Array>) | undefined;
    if (typeof Stream === "function") return readStream(new Stream(new Blob([new Uint8Array(bytes)]).stream()));
    if (typeof mod.decode === "function") return asBytes(await (mod.decode as (data: Uint8Array) => unknown)(bytes));
    return undefined;
  });
}

export const archiveOpens: AdapterModule[] = ARCHIVE_ADAPTERS.map((extension) => ({
  id: `${extension}-open`,
  role: "open" as const,
  extensions: [extension],
  async open(bytes, name) {
    const inner = await decompress(DECODERS[extension] ?? extension, bytes);
    if (!inner) throw new FiledomError("unsupported", `${DECODERS[extension]} is not loaded`);
    const innerName = stemOf(name);
    return openedFile(name, bytes, "archive", { entries: [{ name: innerName.includes(".") ? innerName : `${innerName}.bin`, bytes: inner }] });
  },
}));

export const containers: AdapterModule = {
  id: "containers",
  role: "both",
  extensions: CONTAINER_ADAPTERS,
  writes: ["mp4", "webm", "mkv", "mov", "wav"],
  async open(bytes, name) {
    const mp4 = await remux(bytes, "mp4");
    if (!mp4) throw new FiledomError("unsupported", "mediabunny is not loaded");
    return openedFile(name, bytes, "video", { display: { extension: "mp4", bytes: mp4 } });
  },
  async write(opened, target) {
    const written = await remux(opened.source, target);
    if (!written) throw new FiledomError("unsupported", `mediabunny cannot write .${target}`);
    return written;
  },
};

async function remux(bytes: Uint8Array, target: string): Promise<Uint8Array | undefined> {
  return tryPackage("mediabunny", async (mod) => {
    const Input = mod.Input as (new (options: unknown) => unknown) | undefined;
    const Output = mod.Output as (new (options: unknown) => unknown) | undefined;
    const BufferSource = mod.BufferSource as (new (data: Uint8Array) => unknown) | undefined;
    const BufferTarget = mod.BufferTarget as (new () => { buffer?: ArrayBuffer }) | undefined;
    const Conversion = mod.Conversion as { init?: (options: unknown) => Promise<{ execute: () => Promise<void> }> } | undefined;
    const formats: Record<string, unknown> = {
      mp4: mod.Mp4OutputFormat,
      webm: mod.WebMOutputFormat,
      mkv: mod.MkvOutputFormat,
      mov: mod.MovOutputFormat,
      wav: mod.WavOutputFormat,
    };
    const Format = formats[target] as (new () => unknown) | undefined;
    if (!Input || !Output || !BufferSource || !BufferTarget || !Conversion?.init || !Format) return undefined;
    const targetBuffer = new BufferTarget();
    const output = new Output({ format: new Format(), target: targetBuffer });
    const input = new Input({ source: new BufferSource(bytes), formats: mod.ALL_FORMATS });
    const conversion = await Conversion.init({ input, output });
    await conversion.execute();
    return targetBuffer.buffer ? new Uint8Array(targetBuffer.buffer) : undefined;
  });
}

export const mediaModules = [...archiveOpens, containers];
