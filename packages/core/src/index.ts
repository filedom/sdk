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
