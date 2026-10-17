import type { OoxmlNode } from "./ooxml-tree.js";
import type { RenderProjection } from "../../rendering/engine-client.js";
import { listMetaFromParagraph } from "./docx-list-numbering-stub.js";
import { computeListMarkersFromNumberingXml } from "./docx-numbering-runtime.js";

export interface FlowLineWire {
  line_index: number;
  text: string;
  width_pt: number;
  baseline_y_pt: number;
}

export interface DocxFlowLayoutOptions {
  requestId: string;
  sessionId: string;
  documentGeneration: number;
  pageWidthPt?: number;
  pageHeightPt?: number;
  marginPt?: number;
  maxTextWidthPt?: number;
  fontSizePt?: number;
  layoutParagraph: (input: {
    paragraph_id: string;
    text: string;
    max_width_pt: number;
    font_size_pt: number;
  }) => FlowLineWire[];
  numberingXml?: string;
}

function paragraphText(paragraph: OoxmlNode): string {
  return (
    paragraph.children
      ?.filter((c) => c.kind === "text")
      .map((c) => c.text ?? "")
      .join("") ?? ""
  );
}

export function listParagraphNodes(body: OoxmlNode): OoxmlNode[] {
  return body.children?.filter((c) => c.name === "w:p") ?? [];
}

/** Map DOCX body paragraphs through WASM flow layout into a render wire projection. */
export function buildRenderProjectionFromDocxFlow(
  body: OoxmlNode,
  options: DocxFlowLayoutOptions,
): RenderProjection {
  const pageWidthPt = options.pageWidthPt ?? 612;
  const pageHeightPt = options.pageHeightPt ?? 792;
  const marginPt = options.marginPt ?? 72;
  const maxTextWidthPt = options.maxTextWidthPt ?? pageWidthPt - marginPt * 2;
  const fontSizePt = options.fontSizePt ?? 12;
  const paragraphs = listParagraphNodes(body);
  const markers = computeListMarkersFromNumberingXml(
    paragraphs.map(listMetaFromParagraph),
    options.numberingXml,
  );

  const runs: RenderProjection["pages"][0]["runs"] = [];
  let yCursor = pageHeightPt - marginPt;

  for (const [index, paragraph] of paragraphs.entries()) {
    const text = `${markers[index] ?? ""}${paragraphText(paragraph)}`;
    const lines = options.layoutParagraph({
      paragraph_id: paragraph.id,
      text,
      max_width_pt: maxTextWidthPt,
      font_size_pt: fontSizePt,
    });
    for (const line of lines) {
      runs.push({
        runId: `${paragraph.id}-L${line.line_index}`,
        text: line.text,
        xPt: marginPt,
        yPt: yCursor - line.baseline_y_pt,
        fontSizePt,
      });
    }
    const blockHeight =
      (lines.at(-1)?.baseline_y_pt ?? fontSizePt) + fontSizePt * 0.5;
    yCursor -= blockHeight;
  }

  return {
    header: {
      protocolVersion: 1,
      schemaId: "domdoc://render-wire/v1",
      requestId: options.requestId,
      sessionId: options.sessionId,
      documentGeneration: options.documentGeneration,
      units: "pt",
    },
    pages: [
      {
        pageIndex: 0,
        widthPt: pageWidthPt,
        heightPt: pageHeightPt,
        runs,
      },
    ],
  };
}
