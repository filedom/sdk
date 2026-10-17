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
import type { DomdocPdfiumApi, PdfiumModuleDefault } from "../pdfium-native-api.js";
import type {
  PdfApplyOutcome,
  PdfCheckpointRef,
  PdfEditOperation,
  PdfPreflightOutcome,
  PdfSaveOutcome,
  PdfWriterBackend,
} from "../types.js";

export interface PdfiumWasmLoadResult {
  /** Dynamic import succeeded (includes render-only probe adapter). */
  loaded: boolean;
  /** C24 domdoc-pdfium-wasm writer exports present (G1 production path). */
  writerExportsReady: boolean;
  moduleSpec: string;
  pdfiumSourceCommit: string;
  pdfiumRenderCommit: string;
  resolutionSource?: PdfiumModuleResolutionSource;
  api?: DomdocPdfiumApi;
  error?: string;
}

type ContextState = {
  checkpoint: PdfCheckpointRef;
  originalBytes?: Uint8Array;
  scratch?: number;
  pendingRevision: number;
};

function classifyLoadedModule(mod: PdfiumModuleDefault | undefined): {
  loaded: boolean;
  writerExportsReady: boolean;
  error?: string;
} {
  if (!mod) {
    return {
      loaded: false,
      writerExportsReady: false,
      error: "PDFium WASM module default export missing",
    };
  }
  if (typeof mod === "function") {
    return { loaded: true, writerExportsReady: true };
  }
  if ("__domdocNonProductionPdfiumStub" in mod && mod.__domdocNonProductionPdfiumStub) {
    return {
      loaded: false,
      writerExportsReady: false,
      error: "non-production PDFium WASM placeholder (G1-PDF-09)",
    };
  }
  if ("__domdocPdfiumLibProbeAdapter" in mod && mod.__domdocPdfiumLibProbeAdapter) {
    return {
      loaded: true,
      writerExportsReady: false,
    };
  }
  if ("__domdocPdfiumContractScaffold" in mod && mod.__domdocPdfiumContractScaffold) {
    return {
      loaded: true,
      writerExportsReady: false,
      error: "domdoc-pdfium-wasm contract scaffold (C24 writer build pending)",
    };
  }
  if ("c24WriterExports" in mod && mod.c24WriterExports === false) {
    return {
      loaded: true,
      writerExportsReady: false,
      error: "PDFium module missing C24 writer exports",
    };
  }
  return { loaded: true, writerExportsReady: true };
}

/** Attempt to load the pinned PDFium WASM module (none vendored in W1). */
export async function tryLoadPdfiumWasmModule(): Promise<PdfiumWasmLoadResult> {
  const resolved = resolvePdfiumWasmModule();
  const base: PdfiumWasmLoadResult = {
    loaded: false,
    writerExportsReady: false,
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
      default?: PdfiumModuleDefault;
    };
    const classified = classifyLoadedModule(mod.default);
    let api: DomdocPdfiumApi | undefined;
    if (classified.writerExportsReady && typeof mod.default === "function") {
      api = await mod.default();
    }
    return {
      ...base,
      loaded: classified.loaded,
      writerExportsReady: classified.writerExportsReady && Boolean(api),
      api,
      error: classified.writerExportsReady && !api
        ? "C24 writer factory did not return an API"
        : classified.error,
    };
  } catch (err) {
    return {
      ...base,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Web-owned backend id `pdfium-wasm`. Native edits run through C24 writer
 * exports when vendored; otherwise capabilities stay unsupported.
 */
export class PdfiumWasmWriterBackend implements PdfWriterBackend {
  readonly id = "pdfium-wasm" as const;

  private contexts = new Map<string, ContextState>();
  private readonly moduleLoaded: boolean;
  private readonly writerExportsReady: boolean;
  private readonly api: DomdocPdfiumApi | undefined;

  constructor(load: PdfiumWasmLoadResult) {
    this.moduleLoaded = load.loaded;
    this.writerExportsReady = load.writerExportsReady && Boolean(load.api);
    this.api = load.api;
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

    let pageCount = 1;
    if (this.writerExportsReady && this.api) {
      try {
        const doc = this.api.loadDocument(bytes);
        try {
          pageCount = this.api.pageCount(doc);
        } finally {
          this.api.close(doc);
        }
      } catch (err) {
        return {
          ok: false,
          code: "invalid-bytes",
          message: err instanceof Error ? err.message : String(err),
        };
      }
    }

    const native = this.writerExportsReady;
    return {
      ok: true,
      capabilities: {
        nativeTextReplace: native ? "native" : "unsupported",
        nativeTextDelete: native ? "native" : "unsupported",
        nativeImageReplace: native ? "native" : "unsupported",
        reason: native
          ? undefined
          : this.moduleLoaded
            ? "render-only-probe-adapter"
            : "backend-not-configured",
      },
      checkpoint,
      pageCount,
    };
  }

  async apply(
    contextId: string,
    operations: readonly PdfEditOperation[],
  ): Promise<PdfApplyOutcome> {
    const ctx = this.contexts.get(contextId);
    if (!ctx) {
      return {
        ok: false,
        code: "cancelled",
        message: "Unknown writer context",
        rolledBack: true,
      };
    }
    if (operations.length === 0) {
      return { ok: true, pendingRevision: ctx.pendingRevision, operationsApplied: 0 };
    }
    const first = operations[0]!;
    const proof = classifyPdfProofOperation(first, this.writerExportsReady);

    if (!this.writerExportsReady || !this.api) {
      return {
        ok: false,
        code: this.moduleLoaded ? "writer-exports-absent" : "backend-not-configured",
        message: this.moduleLoaded
          ? `${proof.fixtureId}: render-only probe adapter (C24 writer exports absent)`
          : `${proof.fixtureId}: PDFium WASM artifact not loaded (${PDFIUM_WASM_MODULE_SPEC})`,
        rolledBack: true,
      };
    }

    const original = ctx.originalBytes;
    if (!original) {
      return {
        ok: false,
        code: "cancelled",
        message: "Writer context has no source bytes",
        rolledBack: true,
      };
    }

    try {
      this.resetScratch(ctx, original);
      for (const op of operations) {
        const ok = this.applyOne(ctx.scratch!, op);
        if (!ok) {
          this.resetScratch(ctx, original);
          return {
            ok: false,
            code: "unmapped-text-object",
            message: `${proof.fixtureId}: native operation failed; scratch discarded`,
            rolledBack: true,
          };
        }
      }
      ctx.pendingRevision += 1;
      return {
        ok: true,
        pendingRevision: ctx.pendingRevision,
        operationsApplied: operations.length,
      };
    } catch (err) {
      try {
        this.resetScratch(ctx, original);
      } catch {
        ctx.scratch = undefined;
      }
      return {
        ok: false,
        code: "unmapped-text-object",
        message: err instanceof Error ? err.message : String(err),
        rolledBack: true,
      };
    }
  }

  async save(contextId: string): Promise<PdfSaveOutcome> {
    const ctx = this.contexts.get(contextId);
    if (!ctx || !this.api) {
      return {
        ok: false,
        code: "backend-not-configured",
        message: "Cannot serialize without completed PDFium writer integration",
      };
    }
    if (!ctx.scratch) {
      return {
        ok: false,
        code: "nothing-to-save",
        message: "No scratch document to serialize",
      };
    }
    try {
      const bytes = this.api.save(ctx.scratch);
      return {
        ok: true,
        bytes,
        materializedRevision: ctx.pendingRevision,
      };
    } catch (err) {
      return {
        ok: false,
        code: "serialization-failed",
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  registerContext(
    contextId: string,
    checkpoint: PdfCheckpointRef,
    bytes?: Uint8Array,
  ): void {
    this.contexts.set(contextId, {
      checkpoint,
      originalBytes: bytes ? Uint8Array.from(bytes) : undefined,
      pendingRevision: checkpoint.revision,
    });
  }

  async disposeContext(contextId: string): Promise<void> {
    const ctx = this.contexts.get(contextId);
    if (ctx?.scratch && this.api) {
      this.api.close(ctx.scratch);
    }
    this.contexts.delete(contextId);
  }

  private resetScratch(ctx: ContextState, bytes: Uint8Array): void {
    if (!this.api) return;
    if (ctx.scratch) this.api.close(ctx.scratch);
    ctx.scratch = this.api.loadDocument(bytes);
  }

  private applyOne(doc: number, op: PdfEditOperation): boolean {
    const api = this.api!;
    switch (op.kind) {
      case "replaceTextRun":
        return api.setText(doc, op.pageIndex, op.objectId, op.newText ?? "");
      case "deleteTextObject":
        return api.deleteObject(doc, op.pageIndex, op.objectId);
      case "replaceImage":
        return api.replaceImageRgb(
          doc,
          op.pageIndex,
          op.objectId,
          op.imageWidth ?? 24,
          op.imageHeight ?? 24,
          op.imageRgba,
        );
      case "movePage":
        return api.movePage(doc, op.pageIndex, op.destPageIndex ?? 0);
      default:
        return false;
    }
  }
}
