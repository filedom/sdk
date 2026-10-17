import { createHash, randomUUID } from "node:crypto";
import { StubPdfWriterBackend } from "./backends/stub-backend.js";
import type {
  PdfApplyOutcome,
  PdfCheckpointRef,
  PdfEditOperation,
  PdfPreflightOutcome,
  PdfSaveOutcome,
  PdfWriterBackend,
} from "./types.js";

export interface PdfWriterSessionOptions {
  backend?: PdfWriterBackend;
  /** Committed semantic revision captured when materializing (§13.1). */
  expectedRevision: number;
}

export interface PdfWriterSession {
  readonly contextId: string;
  readonly checkpoint: PdfCheckpointRef;
  preflight(bytes: Uint8Array): Promise<PdfPreflightOutcome>;
  apply(operations: readonly PdfEditOperation[]): Promise<PdfApplyOutcome>;
  save(): Promise<PdfSaveOutcome>;
  dispose(): Promise<void>;
}

export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function createPdfWriterSession(
  sourceBytes: Uint8Array,
  options: PdfWriterSessionOptions,
): Promise<PdfWriterSession> {
  const backend = options.backend ?? new StubPdfWriterBackend();
  const checkpoint: PdfCheckpointRef = {
    revision: options.expectedRevision,
    sourceSha256: sha256(sourceBytes),
    byteLength: sourceBytes.byteLength,
  };
  const contextId = randomUUID();
  if (backend instanceof StubPdfWriterBackend) {
    backend.registerContext(contextId, checkpoint);
  }

  let disposed = false;

  return {
    contextId,
    checkpoint,
    async preflight(bytes) {
      if (disposed) {
        return {
          ok: false,
          code: "invalid-bytes",
          message: "Writer context disposed",
        };
      }
      return backend.preflight(bytes, checkpoint);
    },
    async apply(operations) {
      if (disposed) {
        return {
          ok: false,
          code: "cancelled",
          message: "Writer context disposed",
          rolledBack: true,
        };
      }
      const mismatch = operations.find(
        (op) => op.expectedRevision !== checkpoint.revision,
      );
      if (mismatch) {
        return {
          ok: false,
          code: "revision-mismatch",
          message: "Operation expected revision does not match checkpoint",
          rolledBack: true,
        };
      }
      return backend.apply(contextId, operations);
    },
    async save() {
      if (disposed) {
        return {
          ok: false,
          code: "nothing-to-save",
          message: "Writer context disposed",
        };
      }
      return backend.save(contextId);
    },
    async dispose() {
      if (disposed) return;
      disposed = true;
      await backend.disposeContext(contextId);
    },
  };
}
