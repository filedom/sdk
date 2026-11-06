import { init as initPdfium } from "@embedpdf/pdfium";
import init, { initSync, initialize_pdfium_render, open as openPdf } from "../../../../../wasm/pkg/pdf/filedom_pdf.js";
import type { EngineSession } from "../engine-types.js";
import { applyDeviceHeader } from "../device-id.js";
import { FiledomError } from "../errors.js";
import { bindPdfiumRender } from "./bind-pdfium.js";
import { pdfiumBytes, wasmArrayBuffer } from "./pdfium-section.js";

const wasmUrl = new URL("../../../../../wasm/pkg/pdf/filedom_pdf_bg.wasm", import.meta.url);

let ready: Promise<unknown> | undefined;

/**
 * The filedom PDF bundle. The renderer is a custom section of this wasm.
 * The bundle's setup export binds that module before any page is opened.
 */
export default async function initFiledomPdf(): Promise<void> {
  const wasm = await rustWasmBytes();
  const [pdfium, rust] = await Promise.all([
    initPdfium({ wasmBinary: wasmArrayBuffer(pdfiumBytes(wasm)) }),
    rustModule(wasm),
  ]);
  bindPdfiumRender(
    pdfium as { pdfium?: { ccall?: PdfiumCall }; PDFiumExt_Init?: () => void },
    initialize_pdfium_render,
    rust,
  );
}

type PdfiumCall = (ident: string, returnType: string | null, argTypes: string[] | null, args?: unknown[]) => unknown;

export function format(): string {
  return "pdf";
}

export function open(bytes: Uint8Array, password?: string): EngineSession {
  return openPdf(bytes, password) as EngineSession;
}

function rustModule(wasm: Uint8Array): Promise<unknown> {
  if (!ready) {
    ready = boot(wasm).catch((error: unknown) => {
      ready = undefined;
      throw error;
    });
  }
  return ready;
}

async function rustWasmBytes(): Promise<Uint8Array> {
  const runtime = globalThis as { process?: { versions?: { node?: string } } };
  if (runtime.process?.versions?.node) {
    // @ts-expect-error Node builtins are loaded only under Node; the package typecheck has no Node types.
    const { readFile } = await import("node:fs/promises");
    return new Uint8Array(await readFile(wasmUrl));
  }
  const headers = new Headers();
  applyDeviceHeader(headers);
  const response = await fetch(wasmUrl, { headers });
  if (!response.ok) throw new FiledomError("bundle-missing", `wasm: ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

async function boot(wasm: Uint8Array): Promise<unknown> {
  const runtime = globalThis as { process?: { versions?: { node?: string } } };
  if (runtime.process?.versions?.node) return initSync({ module: wasm });
  // pkg/ has no package.json, so NodeNext reads the glue typings as CommonJS and types the default import as the namespace.
  return (init as unknown as (arg: { module_or_path: Uint8Array }) => Promise<unknown>)({ module_or_path: wasm });
}
