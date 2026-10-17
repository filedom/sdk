export {
  createEngineClient,
  type EngineClient,
  type EngineClientOptions,
  type RenderProjection,
} from "./rendering/engine-client.js";
export type { DocumentSessionStub, SessionRevisions } from "./wire/domain-owned.js";
export {
  WIRE_PROTOCOL_VERSION,
  WIRE_SCHEMA_ID,
} from "./wire/generated.js";
export type { RenderWireResponse } from "./wire/generated-response.js";
export {
  createPdfWriterSession,
  sha256 as pdfSourceSha256,
  type PdfWriterSession,
} from "./formats/pdf/writer.js";
export type { PdfWriterCapability, PdfUnsupportedCode } from "./formats/pdf/types.js";
export { DocxStore } from "./formats/docx/docx-store.js";
export { buildRenderProjectionFromDocxFlow } from "./formats/docx/docx-flow-projection.js";
export {
  buildProseMirrorDocFromOoxmlBody,
  docxProjectionSchema,
  proseMirrorParagraphTexts,
} from "./formats/docx/docx-prosemirror-projection.js";
export {
  applyProjectionTransactionStub,
  prosemirrorDocToTransactionStub,
  type DocxProjectionTransactionStub,
} from "./formats/docx/docx-prosemirror-transaction-boundary.js";
export {
  createPdfWriterWorkerClient,
  type PdfWriterWorkerClient,
} from "./formats/pdf/pdf-writer-worker-client.js";
export {
  PdfiumWasmWriterBackend,
  tryLoadPdfiumWasmModule,
} from "./formats/pdf/backends/pdfium-wasm-backend.js";
export {
  PDFIUM_RENDER_COMMIT,
  PDFIUM_SOURCE_COMMIT,
} from "./formats/pdf/pdfium-pin.js";
export {
  createCompositorInputState,
  onGeometryUpdated,
  pointerDown,
  pointerDownWithCaret,
  type CompositorInputState,
} from "./compositor/input-hook.js";
export {
  caretOffsetFromGeometry,
  findGlyphRun,
} from "./editing/caret-map.js";
export {
  beginComposition,
  cancelComposition,
  commitComposition,
  updateCompositionPreedit,
  type CompositionTransaction,
} from "./editing/composition-stub.js";
export {
  validateBreakToken,
  type BreakToken,
  type FragmentId,
} from "./components/fragmentation-types.js";
export {
  measureFragmentFromBounds,
  type FragmentRunBounds,
  type MeasuredFragment,
} from "./components/component-measurement-contract.js";
export {
  assertStableFragmentMeasurements,
  type LayoutStabilityOutcome,
} from "./components/component-measurement-layout-stability.js";
export {
  classifyPdfProofOperation,
  type PdfProofFixtureId,
} from "./formats/pdf/pdfium-proof-hooks.js";
