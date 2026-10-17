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
export {
  createCompositorInputState,
  onGeometryUpdated,
  pointerDown,
  type CompositorInputState,
} from "./compositor/input-hook.js";
