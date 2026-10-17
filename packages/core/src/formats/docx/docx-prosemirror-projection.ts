import { Schema, type Node as ProseMirrorNode } from "prosemirror-model";
import type { OoxmlNode } from "./ooxml-tree.js";
import { listParagraphNodes } from "./docx-flow-projection.js";

/** MIT prosemirror-model slice for D05 mapping tests (G2-DOCX-03). */
export const docxProjectionSchema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: {
      content: "text*",
      group: "block",
      attrs: { ooxmlId: { default: "" } },
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
  const blocks = listParagraphNodes(body).map((paragraph) => {
    const text = paragraphPlainText(paragraph);
    const inline = text ? docxProjectionSchema.text(text) : undefined;
    return docxProjectionSchema.nodes.paragraph.create({ ooxmlId: paragraph.id }, inline);
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
