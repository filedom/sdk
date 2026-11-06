import type { Format } from "../engine-types.js";
import { FiledomError } from "../errors.js";
import { detectFormat } from "../formats.js";
import type { AdapterModule, OpenedAdapterFile } from "./api.js";
import { materialize } from "./materialize.js";
import { audioModules } from "./modules/audio.js";
import { bookModules } from "./modules/books.js";
import { convertModules, sourceFile } from "./modules/convert.js";
import { documentModules } from "./modules/documents.js";
import { mailModules } from "./modules/mail.js";
import { mediaModules } from "./modules/media.js";
import { pictureModules } from "./modules/pictures.js";
import { rasterModules } from "./modules/raster.js";
import { extensionOf } from "./variation.js";

const MODULES: readonly AdapterModule[] = [
  ...documentModules,
  ...bookModules,
  ...rasterModules,
  ...pictureModules,
  ...audioModules,
  ...mediaModules,
  ...mailModules,
  ...convertModules,
];

export function adapterModules(): readonly AdapterModule[] {
  return MODULES;
}

export function adapterExtensions(): string[] {
  const found = new Set<string>();
  for (const module of MODULES) {
    if (module.role === "edit" || !module.open) continue;
    for (const extension of module.extensions) found.add(extension);
  }
  return [...found];
}

export function hasOpenAdapter(name: string): boolean {
  const extension = extensionOf(name);
  return MODULES.some((module) => module.open && module.role !== "edit" && module.extensions.includes(extension));
}

function openModule(extension: string): AdapterModule | undefined {
  return MODULES.find((module) => module.open && module.role !== "edit" && module.extensions.includes(extension));
}

function editModule(extension: string, target: string): AdapterModule | undefined {
  return MODULES.find((module) => {
    if (!module.write || !module.extensions.includes(extension)) return false;
    return (module.writes ?? module.extensions).includes(target);
  });
}

const cache = new Map<string, { bytes: Uint8Array; displayName: string; opened: OpenedAdapterFile }>();

function cacheKey(bytes: Uint8Array, name: string): string {
  let hash = 2166136261;
  const step = Math.max(1, Math.floor(bytes.length / 4096));
  for (let i = 0; i < bytes.length; i += step) hash = Math.imul(hash ^ (bytes[i] ?? 0), 16777619);
  return `${name}:${bytes.length}:${hash >>> 0}`;
}

export async function presentAdapter(
  bytes: Uint8Array,
  name: string,
): Promise<{ bytes: Uint8Array; displayName: string; opened: OpenedAdapterFile }> {
  const module = openModule(extensionOf(name));
  if (!module?.open) throw new FiledomError("unsupported-format", name || "unknown file");
  const opened = await module.open(bytes, name);
  const presented = materialize(opened);
  return { bytes: presented.bytes, displayName: presented.displayName, opened };
}

/** When the suffix has an adapter, returns engine bytes. Otherwise `undefined`. */
export async function adaptForEngine(
  bytes: Uint8Array,
  name: string,
): Promise<{ bytes: Uint8Array; displayName: string; opened: OpenedAdapterFile } | undefined> {
  if (!hasOpenAdapter(name)) return undefined;
  const key = cacheKey(bytes, name);
  const hit = cache.get(key);
  if (hit) return hit;
  const presented = await presentAdapter(bytes, name);
  cache.set(key, presented);
  return presented;
}

export async function engineFormatFor(bytes: Uint8Array, name: string): Promise<Format | undefined> {
  if (!hasOpenAdapter(name)) return undefined;
  const adapted = await adaptForEngine(bytes, name);
  if (!adapted) return undefined;
  return detectFormat(adapted.bytes, adapted.displayName);
}

export async function writeAdapter(
  opened: OpenedAdapterFile,
  target: string,
  edited?: Uint8Array,
): Promise<Uint8Array | undefined> {
  const module = editModule(opened.extension, target);
  if (!module?.write) return undefined;
  return module.write(opened, target, edited);
}

export { rememberAdapter, adapterForDocument } from "./session.js";
export { setPackageImporter, registerLoader } from "./load.js";

export async function convertWithAdapter(bytes: Uint8Array, name: string, target: string): Promise<Uint8Array> {
  const opened = hasOpenAdapter(name) ? (await presentAdapter(bytes, name)).opened : sourceFile(bytes, name);
  const written = await writeAdapter(opened, target);
  if (!written) throw new FiledomError("unsupported", `${extensionOf(name) || name} to ${target}`);
  return written;
}
