import { init as initPdfium } from "@embedpdf/pdfium";
import { unwrapWasm } from "./bundle-cipher.js";
import type { BundleImporters } from "./bundles.js";
import type { EngineModule, EngineSession, Format } from "./engine-types.js";
import { bindPdfiumRender } from "./engines/bind-pdfium.js";
import { DomdocError } from "./errors.js";

interface GlueModule {
  default: (arg?: unknown) => Promise<unknown>;
  open: (bytes: Uint8Array, password?: string) => EngineSession;
  format?: () => string;
  initialize_pdfium_render?: (module: unknown, rust: unknown, debug: boolean) => boolean;
}

/** Loads one glue module. Tests pass a recorder; the browser uses `import()`. */
export type GlueLoader = (url: string) => Promise<GlueModule>;

const defaultGlueLoad: GlueLoader = (url) => import(/* @vite-ignore */ url);

const MODULES: Format[] = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "png",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "ai",
];

/** Glue module published beside its wasm: `{base}/{format}/domdoc_{format}.js`. */
export function bundleUrl(base: string, format: Format): string {
  const root = base.replace(/\/$/, "");
  return `${root}/${format}/domdoc_${format}.js`;
}

/**
 * `POST /bundle-ticket` body. `wrappedContentKey` is the 32-byte wasm content
 * key, sealed for this ticket. `expiresAt` is recorded by the API and is not
 * checked here.
 */
export interface CdnBundleTicket {
  ticket: string;
  wrappedContentKey: string;
  expiresAt?: number;
}

/** Second argument of `bundlesFromCdn` when the caller has a content key or a ticket. */
export interface CdnBundleOptions {
  load?: GlueLoader;
  /** 32-byte AES-GCM content key. Plain `\0asm` bytes do not need it. */
  key?: CryptoKey | BufferSource;
  /** API ticket. Used when `key` is omitted. */
  ticket?: CdnBundleTicket;
}

type ContentKey = CryptoKey | BufferSource;

/**
 * Lazy importers for the domdoc bundles on a CDN.
 * Each format loads `{base}/{format}/domdoc_{format}.js` the first time it opens.
 * PDF also fetches `pdf/pdfium.wasm` when that module initializes, and nothing else does.
 *
 * Pass a glue loader as the second argument, or `{ key }` / `{ ticket }`.
 * Callers that only pass the CDN base are unchanged. A missing key leaves a
 * plain `\0asm` module to the glue file. Sealed bytes are unwrapped with the
 * content key before compile.
 */
export function bundlesFromCdn(base: string, load?: GlueLoader): BundleImporters;
export function bundlesFromCdn(base: string, options?: CdnBundleOptions): BundleImporters;
export function bundlesFromCdn(
  base: string,
  loadOrOptions: GlueLoader | CdnBundleOptions = defaultGlueLoad,
): BundleImporters {
  const root = base.replace(/\/$/, "");
  const { load, contentKey } = readCdnArgs(loadOrOptions);
  const importers: BundleImporters = {};
  for (const format of MODULES) {
    const glue = bundleUrl(root, format);
    importers[format] =
      format === "pdf"
        ? pdfEngine(glue, `${root}/pdf/pdfium.wasm`, load, contentKey)
        : formatEngine(glue, load, contentKey);
  }
  return importers;
}

/** Domdoc PDF bundle: rust wasm plus the PDFium module it binds. */
export function pdfEngine(
  glueUrl: string,
  pdfiumUrl: string,
  load: GlueLoader = defaultGlueLoad,
  contentKey?: () => Promise<ContentKey | undefined>,
): () => Promise<EngineModule> {
  return () => load(glueUrl).then((glue) => wrapPdf(glue, glueUrl, pdfiumUrl, contentKey));
}

/** One format's glue module. It does not fetch PDFium. */
export function formatEngine(
  glueUrl: string,
  load: GlueLoader = defaultGlueLoad,
  contentKey?: () => Promise<ContentKey | undefined>,
): () => Promise<EngineModule> {
  return () => load(glueUrl).then((glue) => wrapFormat(glue, glueUrl, contentKey));
}

function readCdnArgs(loadOrOptions: GlueLoader | CdnBundleOptions): {
  load: GlueLoader;
  contentKey: () => Promise<ContentKey | undefined>;
} {
  if (typeof loadOrOptions === "function") {
    return { load: loadOrOptions, contentKey: async () => undefined };
  }
  return { load: loadOrOptions.load ?? defaultGlueLoad, contentKey: contentKeySource(loadOrOptions) };
}

function contentKeySource(options: CdnBundleOptions | undefined): () => Promise<ContentKey | undefined> {
  let pending: Promise<ContentKey | undefined> | undefined;
  return () => {
    pending ??= resolveContentKey(options).catch((error: unknown) => {
      pending = undefined;
      throw error;
    });
    return pending;
  };
}

async function resolveContentKey(options: CdnBundleOptions | undefined): Promise<ContentKey | undefined> {
  if (options?.key) return options.key;
  if (options?.ticket) return unwrapTicketKey(options.ticket);
  return undefined;
}

// `POST /bundle-ticket` and the Cloudflare worker share this ticket string:
// `base64url(json).base64url(hmac)`, json `{sub, guest, exp, path}`, exp in milliseconds.
// `wrappedContentKey` is base64(iv || ciphertext || tag). AES-256-GCM key = SHA-256(ticket string).
// Plaintext is the 32-byte content key. The worker checks the HMAC, expiry, and path.
// This loader only unwraps `wrappedContentKey`. It does not check the signature.
async function unwrapTicketKey(source: CdnBundleTicket): Promise<ArrayBuffer> {
  if (!source.ticket || !source.wrappedContentKey) {
    throw new Error("bundle ticket is missing wrappedContentKey");
  }
  const raw = decodeBase64(source.wrappedContentKey);
  if (raw.length < 12 + 16) throw new Error("wrapped content key is too short");
  const iv = raw.slice(0, 12);
  const data = raw.slice(12);
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source.ticket));
  const aes = await crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["decrypt"]);
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, aes, data);
    if (plain.byteLength !== 32) throw new Error("wasm content key must be 32 bytes");
    return plain;
  } catch (error) {
    if (error instanceof Error && error.message === "wasm content key must be 32 bytes") throw error;
    throw new Error("bundle ticket did not unwrap");
  }
}

function decodeBase64(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text);
  const out = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function wrapFormat(
  glue: GlueModule,
  glueUrl: string,
  contentKey?: () => Promise<ContentKey | undefined>,
): EngineModule {
  return {
    format: () => glue.format?.() ?? "domdoc",
    default: () => startModule(glue, glueUrl, contentKey),
    open: (bytes, password) => glue.open(bytes, password),
  };
}

function wrapPdf(
  glue: GlueModule,
  glueUrl: string,
  pdfiumUrl: string,
  contentKey?: () => Promise<ContentKey | undefined>,
): EngineModule {
  let ready: Promise<void> | undefined;
  return {
    format: () => "pdf",
    open: (bytes, password) => glue.open(bytes, password),
    default: (arg) => {
      ready ??= bind(glue, glueUrl, pdfiumUrl, contentKey, arg).catch((error: unknown) => {
        ready = undefined;
        throw error;
      });
      return ready;
    },
  };
}

async function startModule(
  glue: GlueModule,
  glueUrl: string,
  contentKey?: () => Promise<ContentKey | undefined>,
): Promise<unknown> {
  const key = await contentKey?.();
  if (!key) return glue.default();
  const wasm = await fetchWasm(engineWasmUrl(glueUrl), key, "wasm");
  return glue.default({ module_or_path: wasm });
}

async function bind(
  glue: GlueModule,
  glueUrl: string,
  pdfiumUrl: string,
  contentKey: (() => Promise<ContentKey | undefined>) | undefined,
  arg: unknown,
): Promise<void> {
  const key = await contentKey?.();
  const passed = (arg as { wasmBinary?: ArrayBuffer } | undefined)?.wasmBinary;
  const wasmBinary = passed ?? asArrayBuffer(await fetchWasm(pdfiumUrl, key, "pdfium"));
  const initialize = glue.initialize_pdfium_render;
  if (!initialize) throw new DomdocError("bundle-missing", "initialize_pdfium_render");
  const rust = key
    ? fetchWasm(engineWasmUrl(glueUrl), key, "wasm").then((wasm) => glue.default({ module_or_path: wasm }))
    : glue.default();
  const [pdfium, rustModule] = await Promise.all([initPdfium({ wasmBinary }), rust]);
  bindPdfiumRender(
    pdfium as { pdfium?: { ccall?: never }; PDFiumExt_Init?: () => void },
    initialize,
    rustModule,
  );
}

/** `{base}/{format}/domdoc_{format}.js` sits beside `domdoc_{format}_bg.wasm`. */
function engineWasmUrl(glueUrl: string): string {
  return glueUrl.endsWith(".js") ? `${glueUrl.slice(0, -3)}_bg.wasm` : `${glueUrl}_bg.wasm`;
}

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const { buffer, byteOffset, byteLength } = bytes;
  if (buffer instanceof ArrayBuffer && byteOffset === 0 && byteLength === buffer.byteLength) return buffer;
  const copy = new ArrayBuffer(byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

/** Fetched wasm bytes. Plain `\0asm` is returned unchanged. Sealed `DDW1` bytes need `key`. */
async function fetchWasm(url: string, key: ContentKey | undefined, missing: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) throw new DomdocError("bundle-missing", `${missing}: ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const plainWasm = bytes.length >= 4 && bytes[0] === 0x00 && bytes[1] === 0x61 && bytes[2] === 0x73 && bytes[3] === 0x6d;
  if (!key && !plainWasm) throw new DomdocError("bundle-missing", "sealed wasm needs a content key");
  return unwrapWasm(bytes, key ?? new Uint8Array(new ArrayBuffer(32)));
}
