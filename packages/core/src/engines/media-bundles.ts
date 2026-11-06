import type { BundleImporters } from "../bundles.js";
import type { EngineModule, Format } from "../engine-types.js";
import { FiledomError } from "../errors.js";

const MEDIA: Format[] = ["wav", "mp3", "m4a", "mp4", "webm", "mpeg"];

type Glue = EngineModule & {
  initSync?: (input: { module: Uint8Array }) => unknown;
};

/** Format bundles built into `wasm/pkg`. Loaded only when that file is opened. */
export function mediaBundles(): BundleImporters {
  return Object.fromEntries(MEDIA.map((format) => [format, importer(format)])) as BundleImporters;
}

function importer(format: Format): () => Promise<EngineModule> {
  const jsUrl = new URL(`../../../../../wasm/pkg/${format}/filedom_${format}.js`, import.meta.url);
  const wasmUrl = new URL(`../../../../../wasm/pkg/${format}/filedom_${format}_bg.wasm`, import.meta.url);
  return async () => {
    const glue = (await import(/* @vite-ignore */ jsUrl.href)) as Glue;
    let booted: Promise<unknown> | undefined;
    return {
      format: () => format,
      open: (bytes, password) => glue.open(bytes, password),
      default: () => {
        booted ??= boot(glue, wasmUrl);
        return booted;
      },
    };
  };
}

async function boot(glue: Glue, wasmUrl: URL): Promise<unknown> {
  const runtime = globalThis as { process?: { versions?: { node?: string } } };
  const wasm = await wasmBytes(wasmUrl);
  if (runtime.process?.versions?.node) {
    if (!glue.initSync) throw new FiledomError("bundle-missing", "initSync");
    return glue.initSync({ module: wasm });
  }
  return glue.default({ module_or_path: wasm });
}

async function wasmBytes(wasmUrl: URL): Promise<Uint8Array> {
  const runtime = globalThis as { process?: { versions?: { node?: string } } };
  if (runtime.process?.versions?.node) {
    // @ts-expect-error Node builtins are loaded only under Node; the package typecheck has no Node types.
    const { readFile } = await import(/* webpackIgnore: true */ "node:fs/promises");
    return new Uint8Array(await readFile(wasmUrl));
  }
  const response = await fetch(wasmUrl);
  if (!response.ok) throw new FiledomError("bundle-missing", `wasm: ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}
