import { describe, expect, it } from "vitest";
import { parseDocumentBodyXml } from "./ooxml-tree.js";
import { buildProseMirrorDocFromOoxmlBody } from "./docx-prosemirror-projection.js";
import { computeListMarkers, listMetaFromParagraph } from "./docx-list-numbering-stub.js";
import { listParagraphNodes } from "./docx-flow-projection.js";

describe("G2-DOCX-05 list numbering stub", () => {
  it("assigns decimal markers per numId/ilvl", () => {
    const markers = computeListMarkers([
      { text: "First", numId: 1, ilvl: 0 },
      { text: "Second", numId: 1, ilvl: 0 },
      { text: "Sub", numId: 1, ilvl: 1 },
    ]);
    expect(markers).toEqual(["1. ", "2. ", "1. "]);
  });

  it("projects list attrs from OOXML numPr", () => {
    const body = parseDocumentBodyXml(`<w:body>
      <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="42"/></w:numPr></w:pPr>
        <w:r><w:t>Item</w:t></w:r></w:p>
    </w:body>`);
    const meta = listMetaFromParagraph(listParagraphNodes(body)[0]!);
    expect(meta.numId).toBe(42);
    const doc = buildProseMirrorDocFromOoxmlBody(body);
    expect(doc.firstChild?.attrs.listMarker).toBe("1. ");
  });
});
