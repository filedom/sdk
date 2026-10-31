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
 * `POST /bundle-ticket` body. The API decrypts the sealed wasm for one request.
 * This ticket does not carry a content key.
 */
export interface CdnBundleTicket {
  ticket: string;
  expiresAt?: number;
  version?: string;
}

/** Second argument of `bundlesFromCdn`. */
export interface CdnBundleOptions {
  load?: GlueLoader;
  /** API ticket string, or the ticket JSON. Sent on the wasm request. Not a content key. */
  ticket?: string | CdnBundleTicket;
  /**
   * Dev and tests only. Plaintext wasm (a buffer starting with `\0asm`) is
   * refused when this is unset, unless the response is a one-request delivery
   * (`x-domdoc-license: trial` or `licensed`). The website must not set it.
   */
  allowUnsealed?: boolean;
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
  ticket: string;
  notice?: BundleNotice;
}

/**
 * Lazy importers for the domdoc bundles on a CDN.
 * Each format loads `{base}/{format}/domdoc_{format}.js` the first time it opens.
 * The PDF renderer is inside the pdf wasm. A PDF open does not fetch a second wasm.
 *
 * Pass a glue loader as the second argument, or `{ ticket }`.
 * The API returns plaintext wasm for that request. This loader does not unwrap
 * a long-lived content key. A buffer that starts with `\0asm` is refused unless
 * `allowUnsealed` is set or the response says the load is `trial` or `licensed`.
 */
export function bundlesFromCdn(base: string, load?: GlueLoader): BundleImporters;
export function bundlesFromCdn(base: string, options?: CdnBundleOptions): BundleImporters;
export function bundlesFromCdn(
  base: string,
  loadOrOptions: GlueLoader | CdnBundleOptions = defaultGlueLoad,
): BundleImporters {
  const root = base.replace(/\/$/, "");
  const { load, delivery, allowUnsealed } = readCdnArgs(loadOrOptions);
  const importers: BundleImporters = {};
  notices.set(importers, delivery.notice ?? { trial: false });
  for (const format of MODULES) {
    // import() cannot set headers. The ticket rides on the glue URL.
    const glue = ticketedUrl(bundleUrl(root, format), delivery.ticket);
    importers[format] =
      format === "pdf"
        ? pdfEngine(glue, load, delivery, allowUnsealed)
        : formatEngine(glue, load, delivery, allowUnsealed);
  }
  return importers;
}

/** Domdoc PDF bundle. The renderer is a custom section of `domdoc_pdf_bg.wasm`. */
export function pdfEngine(
  glueUrl: string,
  load: GlueLoader = defaultGlueLoad,
  delivery: Delivery = { ticket: "" },
  allowUnsealed = false,
): () => Promise<EngineModule> {
  return () => load(glueUrl).then((glue) => wrapPdf(glue, glueUrl, delivery, allowUnsealed));
}

/** One format's glue module. It does not fetch a second renderer wasm. */
export function formatEngine(
  glueUrl: string,
  load: GlueLoader = defaultGlueLoad,
  delivery: Delivery = { ticket: "" },
  allowUnsealed = false,
): () => Promise<EngineModule> {
  return () => load(glueUrl).then((glue) => wrapFormat(glue, glueUrl, delivery, allowUnsealed));
}

function readCdnArgs(loadOrOptions: GlueLoader | CdnBundleOptions): {
  load: GlueLoader;
  delivery: Delivery;
  allowUnsealed: boolean;
} {
  if (typeof loadOrOptions === "function") {
    return { load: loadOrOptions, delivery: { ticket: "", notice: { trial: false } }, allowUnsealed: false };
  }
  const notice = { trial: false };
  return {
    load: loadOrOptions.load ?? defaultGlueLoad,
    delivery: { ticket: ticketString(loadOrOptions.ticket), notice },
    allowUnsealed: loadOrOptions.allowUnsealed === true,
  };
}

function ticketString(ticket: CdnBundleOptions["ticket"]): string {
  if (!ticket) return "";
  if (typeof ticket === "string") return ticket;
  return ticket.ticket;
}

function wrapFormat(
  glue: GlueModule,
  glueUrl: string,
  delivery: Delivery,
  allowUnsealed: boolean,
): EngineModule {
  return {
    format: () => glue.format?.() ?? "domdoc",
    default: () => startModule(glue, glueUrl, delivery, allowUnsealed),
    open: (bytes, password) => glue.open(bytes, password),
  };
}

function wrapPdf(
  glue: GlueModule,
  glueUrl: string,
  delivery: Delivery,
  allowUnsealed: boolean,
): EngineModule {
  let ready: Promise<void> | undefined;
  return {
    format: () => "pdf",
    open: (bytes, password) => glue.open(bytes, password),
    default: () => {
      ready ??= bind(glue, glueUrl, delivery, allowUnsealed).catch((error: unknown) => {
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
  delivery: Delivery,
  allowUnsealed: boolean,
): Promise<unknown> {
  if (allowUnsealed && !delivery.ticket) return glue.default();
  const wasm = await fetchWasm(engineWasmUrl(glueUrl), delivery, allowUnsealed);
  return glue.default({ module_or_path: wasm });
}

async function bind(
  glue: GlueModule,
  glueUrl: string,
  delivery: Delivery,
  allowUnsealed: boolean,
): Promise<void> {
  const wasm = await fetchWasm(engineWasmUrl(glueUrl), delivery, allowUnsealed);
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

/** Query form so `import()` carries the ticket. Wasm fetch sends the header instead. */
function ticketedUrl(url: string, ticket: string): string {
  if (!ticket) return url;
  const hashAt = url.indexOf("#");
  const before = hashAt === -1 ? url : url.slice(0, hashAt);
  const hash = hashAt === -1 ? "" : url.slice(hashAt);
  const join = before.includes("?") ? "&" : "?";
  return `${before}${join}ticket=${encodeURIComponent(ticket)}${hash}`;
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

/**
 * Fetched wasm bytes. The API has already decrypted them for this request.
 * Plain `\0asm` is refused unless `allowUnsealed` is set or the response is a
 * one-request delivery. Sealed bytes are not unwrapped here.
 */
async function fetchWasm(url: string, delivery: Delivery, allowUnsealed: boolean): Promise<Uint8Array> {
  const headers = new Headers();
  if (delivery.ticket) headers.set("x-domdoc-ticket", delivery.ticket);
  const response = await fetch(url, { headers, cache: "no-store" });
  if (!response.ok) throw new DomdocError("bundle-missing", `wasm: ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const license = response.headers.get("x-domdoc-license")?.trim() ?? "";
  const delivered = license === "trial" || license === "licensed";
  if (delivery.notice && delivered) delivery.notice.trial = license === "trial";
  if (hasWasmMagic(bytes)) {
    if (allowUnsealed || delivered) return bytes;
    throw new DomdocError("bundle-sealed", "plaintext wasm is refused");
  }
  throw new DomdocError("bundle-missing", "sealed wasm is decrypted for one request");
}
