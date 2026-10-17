import {
  PDFIUM_WASM_MODULE_SPEC,
  PDFIUM_RENDER_COMMIT,
  PDFIUM_SOURCE_COMMIT,
} from "../pdfium-pin.js";
import type {
  PdfApplyOutcome,
  PdfCheckpointRef,
  PdfEditOperation,
  PdfPreflightOutcome,
  PdfSaveOutcome,
  PdfWriterBackend,
} from "../types.js";

export interface PdfiumWasmLoadResult {
  loaded: boolean;
  moduleSpec: string;
  pdfiumSourceCommit: string;
  pdfiumRenderCommit: string;
  error?: string;
}

/** Attempt to load the pinned PDFium WASM module (none vendored in W1). */
export async function tryLoadPdfiumWasmModule(): Promise<PdfiumWasmLoadResult> {
  const base: PdfiumWasmLoadResult = {
    loaded: false,
    moduleSpec: PDFIUM_WASM_MODULE_SPEC,
    pdfiumSourceCommit: PDFIUM_SOURCE_COMMIT,
    pdfiumRenderCommit: PDFIUM_RENDER_COMMIT,
  };
  try {
    await import(/* webpackIgnore: true */ PDFIUM_WASM_MODULE_SPEC);
    return { ...base, loaded: true };
  } catch (err) {
    return {
      ...base,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Web-owned backend id `pdfium-wasm`. Native edits stay unsupported until a
 * vendored PDFium WASM artifact is linked (G1 gate still not-run).
 */
export class PdfiumWasmWriterBackend implements PdfWriterBackend {
  readonly id = "pdfium-wasm" as const;

  private contexts = new Map<string, { checkpoint: PdfCheckpointRef }>();
  private readonly moduleLoaded: boolean;

  constructor(load: PdfiumWasmLoadResult) {
    this.moduleLoaded = load.loaded;
  }

  static async create(): Promise<PdfiumWasmWriterBackend> {
    const load = await tryLoadPdfiumWasmModule();
    return new PdfiumWasmWriterBackend(load);
  }

  async preflight(
    bytes: Uint8Array,
    checkpoint: PdfCheckpointRef,
  ): Promise<PdfPreflightOutcome> {
    if (bytes.byteLength < 5) {
      return {
        ok: false,
        code: "invalid-bytes",
        message: "PDF header missing",
      };
    }
    const header = String.fromCharCode(...bytes.subarray(0, 5));
    if (!header.startsWith("%PDF-")) {
      return {
        ok: false,
        code: "invalid-bytes",
        message: "Not a PDF file",
      };
    }
    return {
      ok: true,
      capabilities: {
        nativeTextReplace: "unsupported",
        nativeTextDelete: "unsupported",
        nativeImageReplace: "unsupported",
        reason: this.moduleLoaded ? "partial-run-not-implemented" : "backend-not-configured",
      },
      checkpoint,
      pageCount: 1,
    };
  }

  async apply(
    contextId: string,
    operations: readonly PdfEditOperation[],
  ): Promise<PdfApplyOutcome> {
    if (!this.contexts.has(contextId)) {
      return {
        ok: false,
        code: "cancelled",
        message: "Unknown writer context",
        rolledBack: true,
      };
    }
    if (operations.length === 0) {
      return { ok: true, pendingRevision: 0, operationsApplied: 0 };
    }
    return {
      ok: false,
      code: this.moduleLoaded ? "partial-run-not-implemented" : "backend-not-configured",
      message: this.moduleLoaded
        ? "PDFium WASM module present but native edit path not implemented (P01–P05 not-run)"
        : `PDFium WASM artifact not loaded (${PDFIUM_WASM_MODULE_SPEC})`,
      rolledBack: true,
    };
  }

  async save(_contextId: string): Promise<PdfSaveOutcome> {
    return {
      ok: false,
      code: "backend-not-configured",
      message: "Cannot serialize without completed PDFium writer integration",
    };
  }

  registerContext(contextId: string, checkpoint: PdfCheckpointRef): void {
    this.contexts.set(contextId, { checkpoint });
  }

  async disposeContext(contextId: string): Promise<void> {
    this.contexts.delete(contextId);
  }
}
