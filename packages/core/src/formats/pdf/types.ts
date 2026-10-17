/** Web-owned PDF writer types (blueprint §3, §13.1). */

export type PdfWriterBackendId = "none" | "pdfium-wasm";

export type PdfUnsupportedCode =
  | "backend-not-configured"
  | "encrypted-document"
  | "signed-document"
  | "unmapped-text-object"
  | "partial-run-not-implemented"
  | "render-only-probe-adapter"
  | "writer-exports-absent"
  | "font-subset-missing-glyph";

export interface PdfWriterCapability {
  nativeTextReplace: "native" | "unsupported";
  nativeTextDelete: "native" | "unsupported";
  nativeImageReplace: "native" | "unsupported";
  reason?: PdfUnsupportedCode;
}

export interface PdfCheckpointRef {
  revision: number;
  sourceSha256: string;
  byteLength: number;
}

export interface PdfEditOperation {
  kind: "replaceTextRun" | "deleteTextObject" | "replaceImage" | "movePage";
  pageIndex: number;
  objectId: string;
  /** UTF-16 scalar string for replace; ignored for delete. */
  newText?: string;
  destPageIndex?: number;
  imageWidth?: number;
  imageHeight?: number;
  imageRgba?: Uint8Array;
  expectedRevision: number;
}

export interface PdfPreflightResult {
  ok: true;
  capabilities: PdfWriterCapability;
  checkpoint: PdfCheckpointRef;
  pageCount: number;
}

export interface PdfPreflightFailure {
  ok: false;
  code: PdfUnsupportedCode | "invalid-bytes" | "revision-mismatch";
  message: string;
}

export type PdfPreflightOutcome = PdfPreflightResult | PdfPreflightFailure;

export interface PdfApplySuccess {
  ok: true;
  pendingRevision: number;
  operationsApplied: number;
}

export interface PdfApplyFailure {
  ok: false;
  code: PdfUnsupportedCode | "revision-mismatch" | "cancelled";
  message: string;
  /** Scratch context unchanged when false (P11). */
  rolledBack: boolean;
}

export type PdfApplyOutcome = PdfApplySuccess | PdfApplyFailure;

export interface PdfSaveSuccess {
  ok: true;
  bytes: Uint8Array;
  materializedRevision: number;
}

export interface PdfSaveFailure {
  ok: false;
  code: PdfUnsupportedCode | "nothing-to-save" | "serialization-failed";
  message: string;
}

export type PdfSaveOutcome = PdfSaveSuccess | PdfSaveFailure;

export interface PdfWriterBackend {
  readonly id: PdfWriterBackendId;
  preflight(
    bytes: Uint8Array,
    checkpoint: PdfCheckpointRef,
  ): Promise<PdfPreflightOutcome>;
  apply(
    contextId: string,
    operations: readonly PdfEditOperation[],
  ): Promise<PdfApplyOutcome>;
  save(contextId: string): Promise<PdfSaveOutcome>;
  disposeContext(contextId: string): Promise<void>;
}
