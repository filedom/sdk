import { Schema, type Node as ProseMirrorNode } from "prosemirror-model";
import type { OoxmlNode } from "./ooxml-tree.js";
import { listParagraphNodes } from "./docx-flow-projection.js";
import {
  computeListMarkers,
  listMetaFromParagraph,
} from "./docx-list-numbering-stub.js";

/** MIT prosemirror-model slice for D05 mapping tests (G2-DOCX-03). */
export const docxProjectionSchema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: {
      content: "text*",
      group: "block",
      attrs: {
        ooxmlId: { default: "" },
        listNumId: { default: 0 },
        listIlvl: { default: 0 },
        listMarker: { default: "" },
      },
      parseDOM: [{ tag: "p" }],
      toDOM: () => ["p", 0],
    },
    text: { group: "inline" },
  },
});

function paragraphPlainText(paragraph: OoxmlNode): string {
  return (
    paragraph.children
      ?.filter((c) => c.kind === "text")
      .map((c) => c.text ?? "")
      .join("") ?? ""
  );
}

/** Project OOXML body paragraphs into a ProseMirror document (read-only). */
export function buildProseMirrorDocFromOoxmlBody(body: OoxmlNode): ProseMirrorNode {
  const paragraphNodes = listParagraphNodes(body);
  const metas = paragraphNodes.map((p) => listMetaFromParagraph(p));
  const markers = computeListMarkers(metas);
  const blocks = paragraphNodes.map((paragraph, index) => {
    const text = paragraphPlainText(paragraph);
    const meta = metas[index]!;
    const inline = text ? docxProjectionSchema.text(text) : undefined;
    return docxProjectionSchema.nodes.paragraph.create(
      {
        ooxmlId: paragraph.id,
        listNumId: meta.numId,
        listIlvl: meta.ilvl,
        listMarker: markers[index] ?? "",
      },
      inline,
    );
  });
  return docxProjectionSchema.nodes.doc.create(null, blocks);
}

/** Round-trip paragraph texts in document order (D05-style fixture checks). */
export function proseMirrorParagraphTexts(doc: ProseMirrorNode): string[] {
  const texts: string[] = [];
  doc.forEach((node) => {
    if (node.type.name === "paragraph") {
      texts.push(node.textContent);
    }
  });
  return texts;
}
