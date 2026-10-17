import {
  PDFIUM_WASM_MODULE_SPEC,
  PDFIUM_RENDER_COMMIT,
  PDFIUM_SOURCE_COMMIT,
} from "../pdfium-pin.js";
import {
  resolvePdfiumWasmModule,
  type PdfiumModuleResolutionSource,
} from "../pdfium-module-resolve.js";
import { classifyPdfProofOperation } from "../pdfium-proof-hooks.js";
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
  resolutionSource?: PdfiumModuleResolutionSource;
  error?: string;
}

/** Attempt to load the pinned PDFium WASM module (none vendored in W1). */
export async function tryLoadPdfiumWasmModule(): Promise<PdfiumWasmLoadResult> {
  const resolved = resolvePdfiumWasmModule();
  const base: PdfiumWasmLoadResult = {
    loaded: false,
    moduleSpec: resolved.spec,
    pdfiumSourceCommit: PDFIUM_SOURCE_COMMIT,
    pdfiumRenderCommit: PDFIUM_RENDER_COMMIT,
    resolutionSource: resolved.source,
  };
  if (resolved.source === "npm-placeholder") {
    return {
      ...base,
      moduleSpec: PDFIUM_WASM_MODULE_SPEC,
      error: "PDFium WASM artifact not vendored",
    };
  }
  try {
    const mod = (await import(/* webpackIgnore: true */ resolved.spec)) as {
      default?: { __domdocNonProductionPdfiumStub?: boolean };
    };
    if (mod.default?.__domdocNonProductionPdfiumStub) {
      return {
        ...base,
        error: "non-production PDFium WASM placeholder (G1-PDF-09)",
      };
    }
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
    const first = operations[0]!;
    const proof = classifyPdfProofOperation(first, this.moduleLoaded);
    return {
      ok: false,
      code: this.moduleLoaded ? "partial-run-not-implemented" : "backend-not-configured",
      message: this.moduleLoaded
        ? `${proof.fixtureId} (${proof.summary}): PDFium WASM loaded; native proof not-run`
        : `${proof.fixtureId}: PDFium WASM artifact not loaded (${PDFIUM_WASM_MODULE_SPEC})`,
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
