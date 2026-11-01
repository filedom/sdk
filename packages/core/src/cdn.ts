import { init as initPdfium } from "@embedpdf/pdfium";
import type { BundleImporters } from "./bundles.js";
import type { EngineModule, EngineSession, Format } from "./engine-types.js";
import { bindPdfiumRender } from "./engines/bind-pdfium.js";
import { pdfiumBytes, wasmArrayBuffer } from "./engines/pdfium-section.js";
import { DomdocError } from "./errors.js";

interface GlueModule {
  default: (arg?: unknown) => Promise<unknown>;
  open: (bytes: Uint8Array, password?: string) => EngineSession;
  format?: () => string;
  initialize_pdfium_render?: (module: unknown, rust: unknown, debug: boolean) => boolean;
}

/** Loads one glue module. Tests pass a recorder; the browser uses `import()`. */
export type GlueLoader = (url: string) => Promise<GlueModule>;

const defaultGlueLoad: GlueLoader = async (url) => {
  try {
    return await import(/* @vite-ignore */ url);
  } catch {
    throw new DomdocError("bundle-missing", "The engine bundle could not be loaded. Try opening the file again.");
  }
};

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
  "bmp",
  "tiff",
  "svg",
  "ai",
  "csv",
  "mp3",
  "wav",
  "m4a",
  "mp4",
  "mpeg",
  "webm",
  "zip",
  "gzip",
  "tar",
  "7z",
  "eml",
  "msg",
];

/** Glue module published beside its wasm: `{base}/{format}/domdoc_{format}.js`. */
export function bundleUrl(base: string, format: Format): string {
  const root = base.replace(/\/$/, "");
  return `${root}/${format}/domdoc_${format}.js`;
}

/** Second argument of `bundlesFromCdn`. */
export interface CdnBundleOptions {
  load?: GlueLoader;
}

interface BundleNotice {
  trial: boolean;
}

const notices = new WeakMap<BundleImporters, BundleNotice>();

/** In-memory trial flag for the last wasm response. Not written to storage. */
export function bundleLoadNotice(importers: BundleImporters | undefined): { trial: boolean } {
  if (!importers) return { trial: false };
  return { trial: notices.get(importers)?.trial === true };
}

interface Delivery {
  notice?: BundleNotice;
}

/**
 * Lazy importers for the domdoc bundles on a CDN.
 * Each format loads `{base}/{format}/domdoc_{format}.js` the first time it opens.
 * The PDF renderer is inside the pdf wasm. A PDF open does not fetch a second wasm.
 *
 * Pass a glue loader as the second argument, or `{ load }`.
 * The CDN returns plaintext wasm. A buffer that does not start with `\0asm` is refused.
 */
export function bundlesFromCdn(base: string, load?: GlueLoader): BundleImporters;
export function bundlesFromCdn(base: string, options?: CdnBundleOptions): BundleImporters;
export function bundlesFromCdn(
  base: string,
  loadOrOptions: GlueLoader | CdnBundleOptions = defaultGlueLoad,
): BundleImporters {
  const root = base.replace(/\/$/, "");
  const { load, delivery } = readCdnArgs(loadOrOptions);
  const importers: BundleImporters = {};
  notices.set(importers, delivery.notice ?? { trial: false });
  for (const format of MODULES) {
    const glue = bundleUrl(root, format);
    importers[format] = format === "pdf" ? pdfEngine(glue, load) : formatEngine(glue, load);
  }
  return importers;
}

/** Domdoc PDF bundle. The renderer is a custom section of `domdoc_pdf_bg.wasm`. */
export function pdfEngine(
  glueUrl: string,
  load: GlueLoader = defaultGlueLoad,
): () => Promise<EngineModule> {
  return () => load(glueUrl).then((glue) => wrapPdf(glue, glueUrl));
}

/** One format's glue module. It does not fetch a second renderer wasm. */
export function formatEngine(
  glueUrl: string,
  load: GlueLoader = defaultGlueLoad,
): () => Promise<EngineModule> {
  return () => load(glueUrl).then((glue) => wrapFormat(glue, glueUrl));
}

function readCdnArgs(loadOrOptions: GlueLoader | CdnBundleOptions): {
  load: GlueLoader;
  delivery: Delivery;
} {
  if (typeof loadOrOptions === "function") {
    return { load: loadOrOptions, delivery: { notice: { trial: false } } };
  }
  return {
    load: loadOrOptions.load ?? defaultGlueLoad,
    delivery: { notice: { trial: false } },
  };
}

function wrapFormat(glue: GlueModule, glueUrl: string): EngineModule {
  return {
    format: () => glue.format?.() ?? "domdoc",
    default: () => startModule(glue, glueUrl),
    open: (bytes, password) => glue.open(bytes, password),
  };
}

function wrapPdf(glue: GlueModule, glueUrl: string): EngineModule {
  let ready: Promise<void> | undefined;
  return {
    format: () => "pdf",
    open: (bytes, password) => glue.open(bytes, password),
    default: () => {
      ready ??= bind(glue, glueUrl).catch((error: unknown) => {
        ready = undefined;
        throw error;
      });
      return ready;
    },
  };
}

async function startModule(glue: GlueModule, glueUrl: string): Promise<unknown> {
  const wasm = await fetchWasm(engineWasmUrl(glueUrl));
  return glue.default({ module_or_path: wasm });
}

async function bind(glue: GlueModule, glueUrl: string): Promise<void> {
  const wasm = await fetchWasm(engineWasmUrl(glueUrl));
  // The renderer must be a custom section of this module. A bare rust wasm fails here
  // before the renderer starts, with an actionable bundle-missing detail.
  const wasmBinary = wasmArrayBuffer(pdfiumBytes(wasm));
  const initialize = glue.initialize_pdfium_render;
  if (!initialize) {
    throw new DomdocError(
      "bundle-missing",
      "The PDF engine module is incomplete. Serve the published pdf bundle.",
    );
  }
  const [pdfium, rustModule] = await Promise.all([
    initPdfium({ wasmBinary }),
    glue.default({ module_or_path: wasm }),
  ]);
  bindPdfiumRender(
    pdfium as { pdfium?: { ccall?: never }; PDFiumExt_Init?: () => void },
    initialize,
    rustModule,
  );
}

/** `{base}/{format}/domdoc_{format}.js` sits beside `domdoc_{format}_bg.wasm`. */
function engineWasmUrl(glueUrl: string): string {
  const path = glueUrl.split("#")[0]?.split("?")[0] ?? glueUrl;
  return path.endsWith(".js") ? `${path.slice(0, -3)}_bg.wasm` : `${path}_bg.wasm`;
}

const WASM_MAGIC = [0x00, 0x61, 0x73, 0x6d] as const;

function hasWasmMagic(bytes: Uint8Array): boolean {
  if (bytes.length < WASM_MAGIC.length) return false;
  for (let i = 0; i < WASM_MAGIC.length; i++) if (bytes[i] !== WASM_MAGIC[i]) return false;
  return true;
}

/** Plaintext wasm from the CDN. A buffer that does not start with `\0asm` is refused. */
async function fetchWasm(url: string): Promise<Uint8Array> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new DomdocError("bundle-missing", `wasm: ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!hasWasmMagic(bytes)) throw new DomdocError("bundle-missing", "The engine bundle is not a wasm module.");
  return bytes;
}
