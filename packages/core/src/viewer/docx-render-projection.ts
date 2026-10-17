import type { DocxStore } from "../formats/docx/docx-store.js";
import {
  buildRenderProjectionFromDocxFlow,
  type FlowLineWire,
} from "../formats/docx/docx-flow-projection.js";
import type { RenderProjection } from "../rendering/engine-client.js";

export interface DocxLayoutEngine {
  layout_flow_paragraph_json(input: string): string;
}

export interface BuildDocxRenderProjectionOptions {
  store: DocxStore;
  engine: DocxLayoutEngine;
  sessionId: string;
  requestId?: string;
  documentGeneration?: number;
  pageWidthPt?: number;
  pageHeightPt?: number;
  marginPt?: number;
  fontSizePt?: number;
}

/** Build a render-wire projection from an opened DOCX store using WASM flow layout. */
export function buildDocxRenderProjectionFromStore(
  options: BuildDocxRenderProjectionOptions,
): RenderProjection {
  const numberingXml = options.store.tryGetNumberingXml();
  const maxTextWidthPt =
    (options.pageWidthPt ?? 612) - (options.marginPt ?? 72) * 2;
  return buildRenderProjectionFromDocxFlow(options.store.getBody(), {
    requestId: options.requestId ?? "docx-viewer",
    sessionId: options.sessionId,
    documentGeneration: options.documentGeneration ?? 1,
    pageWidthPt: options.pageWidthPt,
    pageHeightPt: options.pageHeightPt,
    marginPt: options.marginPt,
    maxTextWidthPt,
    fontSizePt: options.fontSizePt ?? 12,
    numberingXml,
    layoutParagraph(input) {
      const json = options.engine.layout_flow_paragraph_json(JSON.stringify(input));
      if (typeof json !== "string") throw new Error(String(json));
      return JSON.parse(json) as FlowLineWire[];
    },
  });
}
