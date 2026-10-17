/* eslint-disable */
/** Generated from domdoc-wasm/schema — do not edit by hand. */

export type PaintItem =
  | {
      kind: "fillRect";
      pageIndex: number;
      rect: RectPt;
      /**
       * @minItems 4
       * @maxItems 4
       */
      colorRgba: [number, number, number, number];
    }
  | {
      kind: "glyphRun";
      pageIndex: number;
      runId: string;
      glyphs: {
        char: string;
        xPt: number;
        yPt: number;
        advancePt: number;
      }[];
    };

export interface RenderWireResponse {
  header: {
    protocolVersion: 1;
    schemaId: "domdoc://render-wire/v1";
    requestId: string;
    documentGeneration: number;
    engineBuild: string;
  };
  geometry: {
    pages: {
      pageIndex: number;
      runBounds: RectPt[];
    }[];
  };
  paint: {
    items: PaintItem[];
  };
}
export interface RectPt {
  id: string;
  xPt: number;
  yPt: number;
  widthPt: number;
  heightPt: number;
}
