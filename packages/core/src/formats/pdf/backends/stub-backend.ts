import type {
  PdfApplyOutcome,
  PdfCheckpointRef,
  PdfEditOperation,
  PdfPreflightOutcome,
  PdfSaveOutcome,
  PdfWriterBackend,
} from "../types.js";

/** Honest backend: no native PDFium module loaded (G1 blocked on WASM pin). */
export class StubPdfWriterBackend implements PdfWriterBackend {
  readonly id = "none" as const;

  private contexts = new Map<string, { checkpoint: PdfCheckpointRef }>();

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
        reason: "backend-not-configured",
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
      code: "backend-not-configured",
      message:
        "Native PDF edit requires pinned PDFium WASM writer; overlay edits are not supported",
      rolledBack: true,
    };
  }

  async save(_contextId: string): Promise<PdfSaveOutcome> {
    return {
      ok: false,
      code: "backend-not-configured",
      message: "Cannot serialize without native writer backend",
    };
  }

  registerContext(contextId: string, checkpoint: PdfCheckpointRef): void {
    this.contexts.set(contextId, { checkpoint });
  }

  async disposeContext(contextId: string): Promise<void> {
    this.contexts.delete(contextId);
  }
}
