/* eslint-disable */
/** Generated from domdoc-wasm/schema — do not edit by hand. */

/**
 * Engine-owned immutable projection in, paint and geometry out. Web domain/editing types are not part of this schema.
 */
export interface DomdocRenderWireProtocolV1 {
  header: WireHeader;
  /**
   * @minItems 1
   */
  pages: [ProjectionPage, ...ProjectionPage[]];
}
export interface WireHeader {
  protocolVersion: 1;
  schemaId: "domdoc://render-wire/v1";
  requestId: string;
  sessionId: string;
  documentGeneration: number;
  units: "pt";
  fontEpoch?: number;
}
export interface ProjectionPage {
  pageIndex: number;
  widthPt: number;
  heightPt: number;
  runs: StubTextRun[];
}
export interface StubTextRun {
  runId: string;
  text: string;
  xPt: number;
  yPt: number;
  fontSizePt: number;
}
