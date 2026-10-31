import { init as initPdfium } from "@embedpdf/pdfium";
import init, { initSync, initialize_pdfium_render, open as openPdf } from "../../../../../domdoc-wasm/pkg/pdf/domdoc_pdf.js";
import type { EngineSession } from "../engine-types.js";
import { bindPdfiumRender } from "./bind-pdfium.js";

let ready: Promise<unknown> | undefined;

/**
 * The domdoc PDF bundle. Loads the PDFium module, then binds it to this wasm
 * with `initialize_pdfium_render` before any page is opened.
 */
export default async function initDomdocPdf(arg?: unknown): Promise<void> {
  const wasmBinary = (arg as { wasmBinary?: ArrayBuffer } | undefined)?.wasmBinary;
  const [pdfium, rust] = await Promise.all([
    initPdfium(wasmBinary ? { wasmBinary } : {}),
    rustModule(),
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

function rustModule(): Promise<unknown> {
  if (!ready) {
    ready = boot().catch((error: unknown) => {
      ready = undefined;
      throw error;
    });
  }
  return ready;
}

async function boot(): Promise<unknown> {
  const runtime = globalThis as { process?: { versions?: { node?: string } } };
  if (runtime.process?.versions?.node) {
    // @ts-expect-error Node builtins are loaded only under Node; the package typecheck has no Node types.
    const { readFile } = await import("node:fs/promises");
    const wasm = await readFile(new URL("../../../../../domdoc-wasm/pkg/pdf/domdoc_pdf_bg.wasm", import.meta.url));
    return initSync({ module: wasm });
  }
  return init();
}
