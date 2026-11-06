import { FiledomError } from "../errors.js";

type Importer = (specifier: string) => Promise<Record<string, unknown>>;

const loaders = new Map<string, () => Promise<Record<string, unknown>>>();
let override: Importer | undefined;
let loadersReady: Promise<void> | undefined;

/** A test supplies the library module so the suite does not download wasm. */
export function setPackageImporter(next: Importer | undefined): void {
  override = next;
}

export function registerLoader(specifier: string, load: () => Promise<Record<string, unknown>>): void {
  loaders.set(specifier, load);
}

async function ensureLoaders(): Promise<void> {
  if (override || loaders.size > 0) return;
  if (!loadersReady) {
    loadersReady = import("./loaders.js")
      .then((mod) => {
        mod.installLoaders();
      })
      .catch(() => {
        // The package list is optional. A missing loader returns unsupported.
      });
  }
  await loadersReady;
}

/** Loads one library the first time its suffix is opened. A missing package is `unsupported`. */
export async function loadPackage(specifier: string): Promise<Record<string, unknown>> {
  if (override) return override(specifier);
  await ensureLoaders();
  const load = loaders.get(specifier);
  if (!load) throw new FiledomError("unsupported", `${specifier} is not loaded`);
  try {
    return await load();
  } catch {
    throw new FiledomError("unsupported", `${specifier} is not loaded`);
  }
}

export function isUnsupported(error: unknown): boolean {
  return error instanceof FiledomError && error.code === "unsupported";
}

/** Uses the library when it is installed. A missing package returns `undefined` so the module can use its own reader. */
export async function tryPackage<T>(
  specifier: string,
  read: (mod: Record<string, unknown>) => Promise<T | undefined>,
): Promise<T | undefined> {
  try {
    return await read(await loadPackage(specifier));
  } catch (error) {
    if (isUnsupported(error)) return undefined;
    throw error;
  }
}
