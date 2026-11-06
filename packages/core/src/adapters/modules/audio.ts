import { FiledomError } from "../../errors.js";
import type { AdapterModule } from "../api.js";
import { decodeAiff, decodeCaf } from "../codecs.js";
import { encodeWav } from "../materialize.js";
import { tryPackage } from "../load.js";
import { openedFile } from "../session.js";
import { MPEG_AUDIO_ADAPTERS, PCM_ADAPTERS, PCM_CONTAINER_ADAPTERS } from "../suffixes.js";
import { audioFrom, extensionOf } from "../variation.js";

const AUDIO = [
  ["flac-open", "flac", "@wasm-audio-decoders/flac"],
  ["opus-open", "opus", "ogg-opus-decoder"],
  ["vorbis-open", "ogg", "@wasm-audio-decoders/ogg-vorbis"],
  ["vorbis-open", "oga", "@wasm-audio-decoders/ogg-vorbis"],
  ["wavpack-open", "wv", "@audio/decode-wavpack"],
  ["mpc-open", "mpc", "@audio/decode-mpc"],
] as const;

async function decodeDecoder(specifier: string, bytes: Uint8Array) {
  return tryPackage(specifier, async (mod) => {
    const direct = mod.decode ?? (typeof mod.default === "function" && mod.default.prototype === undefined ? mod.default : undefined);
    if (typeof direct === "function") {
      const audio = audioFrom(await (direct as (data: Uint8Array) => unknown)(bytes));
      if (audio) return audio;
    }
    const Ctor = Object.values(mod).find((value) => typeof value === "function" && /Decoder/.test((value as { name?: string }).name ?? "")) as
      | (new () => { ready?: Promise<unknown>; decode: (data: Uint8Array) => Promise<unknown>; free?: () => void })
      | undefined;
    if (!Ctor) return undefined;
    const decoder = new Ctor();
    await decoder.ready;
    const audio = audioFrom(await decoder.decode(bytes));
    decoder.free?.();
    return audio;
  });
}

export const pcmOpens: AdapterModule[] = PCM_ADAPTERS.map((extension) => {
  const row = AUDIO.find((item) => item[1] === extension)!;
  return {
    id: row[0],
    role: "open" as const,
    extensions: extension === "ogg" ? [extension, "oga"] : [extension],
    async open(bytes: Uint8Array, name: string) {
      const audio = await decodeDecoder(row[2], bytes);
      if (!audio) throw new FiledomError("unsupported", `${row[2]} is not loaded`);
      return openedFile(name, bytes, "audio", { audio });
    },
  };
}).filter((module, index, all) => all.findIndex((item) => item.id === module.id) === index);

export const pcmContainers: AdapterModule = {
  id: "pcm-containers",
  role: "open",
  extensions: PCM_CONTAINER_ADAPTERS,
  async open(bytes, name) {
    const extension = extensionOf(name);
    const audio = extension === "caf" ? decodeCaf(bytes) : decodeAiff(bytes);
    return openedFile(name, bytes, "audio", { audio });
  },
};

export const mpegAudioOpen: AdapterModule = {
  id: "mpa-open",
  role: "open",
  extensions: MPEG_AUDIO_ADAPTERS,
  async open(bytes, name) {
    const audio = await decodeDecoder("filedom-symphonia", bytes);
    if (!audio) throw new FiledomError("unsupported", "filedom-symphonia is not loaded");
    return openedFile(name, bytes, "audio", { audio });
  },
};

export const pcmWav: AdapterModule = {
  id: "pcm-wav",
  role: "edit",
  extensions: [...PCM_ADAPTERS, ...PCM_CONTAINER_ADAPTERS, ...MPEG_AUDIO_ADAPTERS],
  writes: ["wav"],
  async write(opened) {
    if (!opened.audio) throw new FiledomError("unsupported", "pcm has no samples");
    return encodeWav(opened.audio.sampleRate, opened.audio.channels);
  },
};

export const audioModules = [...pcmOpens, pcmContainers, mpegAudioOpen, pcmWav];
