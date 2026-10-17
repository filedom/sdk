export {
  createEngineClient,
  type EngineClient,
  type EngineClientOptions,
  type RenderProjection,
} from "./rendering/engine-client.js";
export type { DocumentSessionStub, SessionRevisions } from "./wire/domain-owned.js";
export { DocumentSession, createDocumentSession } from "./session/document-session.js";
export {
  createDomdocPackageBlobIndexStub,
  createDomdocPackageManifestStub,
  createDomdocPackagePersistPlanStub,
  DOMDOC_CRASH_SAFE_COMMIT_STEPS,
  DOMDOC_PACKAGE_SCHEMA_VERSION,
  DOMDOC_REQUIRED_MEMBER_PREFIXES,
  type DomdocPackageBlobIndexStub,
  type DomdocPackageManifestStub,
  type DomdocPackageMemberStub,
  type DomdocPackagePersistPlanStub,
} from "./persistence/domdoc-package-stub.js";
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
  fragmentsEquivalent,
  runFragmentationConvergenceOracle,
  type FragmentationEquivalenceVerdict,
  type FragmentationLayoutPass,
} from "./components/fragmentation-equivalence-oracle.js";
export { resolvePdfiumWasmModule } from "./formats/pdf/pdfium-module-resolve.js";
export {
  classifyPdfProofOperation,
  type PdfProofFixtureId,
} from "./formats/pdf/pdfium-proof-hooks.js";
export {
  collectP01P05VendorProofEvidence,
  P01_P05_FIXTURE_ORDER,
  type P01P05VendorProofEvidence,
} from "./formats/pdf/pdfium-p01-p05-runner.js";
export {
  applyListRenumberToOpcPackage,
  DOCX_NUMBERING_PART,
  patchNumberingXmlForListRenumber,
} from "./formats/docx/docx-numbering-opc-patch.js";
export {
  applyListRenumberWithOoxmlDefinitions,
  buildNumberingXmlWithListDef,
  parseNumberingNumIds,
} from "./formats/docx/docx-numbering-ooxml-roundtrip.js";
export {
  INPUT_EVIDENCE_FORMAT_VERSION,
  validateImeEvidenceFile,
  validateSrEvidenceFile,
} from "./input/input-evidence-scaffold.js";
export {
  AF_BROWSER_CORPUS,
  afCorpusAllConverged,
  evaluateAfBrowserCorpus,
  type AfBrowserCorpusEntry,
} from "./components/fragmentation-af-browser-corpus.js";
export {
  afIncrementalAllEquivalent,
  evaluateAfIncrementalVsFullEquivalence,
  type AfIncrementalEquivalenceVerdict,
} from "./components/fragmentation-af-incremental-equivalence.js";
