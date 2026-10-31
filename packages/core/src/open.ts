import type { BundleLoader } from "./bundles.js";
import { DomdocDocument } from "./document.js";
import type { DocInfo, EngineModule, Format } from "./engine-types.js";
import { DomdocError } from "./errors.js";
import type { FileStore, StoredFile } from "./file-store.js";
import { detectFormat } from "./formats.js";
import type { CoreLoader } from "./modules.js";
import type { PasswordHint } from "./password-prompt.js";

/**
 * Anything a host can open: a picked/dropped `File`, a `Blob`, raw bytes, a URL, a
 * `FileStore` id, or a `StoredFile`.
 */
export type OpenSource = File | Blob | ArrayBuffer | Uint8Array | string | StoredFile | { url: string };

export interface OpenOptions {
  name?: string;
  /** When given, the opened bytes are registered so components can read them. */
  files?: FileStore;
  /** PDF user password. When omitted, encrypted PDFs may call `getPassword`. */
  password?: string;
  /**
   * Called when the engine returns `pdf-encrypted`. Return the password to retry,
   * or `null` / `undefined` to stop (the open is refused; any document already open stays open).
   */
  getPassword?: (hint: PasswordHint) => Promise<string | null | undefined>;
  /**
   * When set, the core loads the PDF engine or office_oxide from
   * the host switches. The format bundles on `loader` are not fetched.
   */
  core?: CoreLoader;
}

function isStored(source: OpenSource): source is StoredFile {
  return typeof source === "object" && "bytes" in source && "id" in source;
}

async function resolve(source: OpenSource, options: OpenOptions): Promise<StoredFile> {
  const { files } = options;
  if (isStored(source)) return source;
  if (typeof source === "string" && files?.get(source)) return files.get(source)!;
  if (typeof source === "string" || (typeof source === "object" && "url" in source)) {
    const url = typeof source === "string" ? source : source.url;
    if (files) return files.fetch(url);
    const response = await fetch(url);
    if (!response.ok) throw new DomdocError("open-failed", `${url}: ${response.status}`);
    const name = decodeURIComponent(url.split(/[?#]/)[0]!.split("/").pop() || "document");
    return {
      id: "",
      name: options.name ?? name,
      type: response.headers.get("content-type") ?? "",
      bytes: new Uint8Array(await response.arrayBuffer()),
      source: "url",
      updatedAt: Date.now(),
    };
  }
  if (files) return files.add(source, { name: options.name });
  const bytes =
    source instanceof Uint8Array
      ? source
      : source instanceof ArrayBuffer
        ? new Uint8Array(source)
        : new Uint8Array(await source.arrayBuffer());
  const name = options.name ?? (typeof File !== "undefined" && source instanceof File ? source.name : "document");
  return { id: "", name, type: "", bytes, source: "app", updatedAt: Date.now() };
}

function needsPassword(code: string, format: Format): boolean {
  return code === "pdf-encrypted" && format === "pdf";
}

function openSession(format: Format, engine: Awaited<ReturnType<BundleLoader["load"]>>, bytes: Uint8Array, password?: string) {
  try {
    return format === "pdf" ? engine.open(bytes, password) : engine.open(bytes);
  } catch (error) {
    throw DomdocError.from(error);
  }
}

/** Detects the format, lazily loads only that format's bundle and opens a session. */
export async function openDocument(loader: BundleLoader, source: OpenSource, options: OpenOptions = {}) {
  const file = await resolve(source, options);
  const name = options.name ?? file.name;
  const prepared = options.core ? await options.core.prepare(file.bytes, name) : undefined;
  const sniffed = prepared?.plan.format ?? detectFormat(file.bytes, name);
  const engine: EngineModule = prepared?.engine ?? (await loader.load(sniffed));
  let password = options.password;
  let attempt = 0;

  for (;;) {
    try {
      const session = openSession(sniffed, engine, prepared?.original ?? file.bytes, password);
      if (prepared?.trackChanges) {
        const revisions = prepared.plan.modules.find((module) => module.id === "track-changes");
        if (revisions && revisions.id === "track-changes") {
          prepared.trackChanges.attach({
            format: prepared.plan.format,
            original: prepared.original,
            visibleIn: revisions.visibleIn,
            session,
          });
        }
      }
      const format = (JSON.parse(session.info()) as DocInfo).format;
      return new DomdocDocument(session, name, format, file.id || undefined);
    } catch (error) {
      const failure = DomdocError.from(error);
      if (!needsPassword(failure.code, sniffed)) throw failure;
      if (!options.getPassword) throw failure;
      const hint: PasswordHint = {
        code: "pdf-encrypted",
        format: sniffed,
        name,
        attempt,
      };
      const next = await options.getPassword(hint);
      if (next == null || next === "") throw failure;
      password = next;
      attempt += 1;
    }
  }
}
