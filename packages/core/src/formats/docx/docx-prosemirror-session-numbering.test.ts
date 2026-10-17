import { describe, expect, it } from "vitest";
import { parseDocumentBodyXml } from "./ooxml-tree.js";
import {
  buildProseMirrorDocFromOoxmlBody,
} from "./docx-prosemirror-projection.js";
import {
  applyProjectionTransactionStub,
  prosemirrorDocToTransactionStub,
} from "./docx-prosemirror-transaction-boundary.js";
import { buildWordCompatibleMultiNumNumberingXml } from "./docx-numbering-ooxml-roundtrip.js";

/** G2-DOCX-18: ProseMirror projection → session transaction stub carries list numId/ilvl. */
describe("G2-DOCX-18 ProseMirror session numbering binding", () => {
  it("maps multi-numId body into transaction stub list metadata", () => {
    const numberingXml = buildWordCompatibleMultiNumNumberingXml([
      { numId: 10, levels: [{ ilvl: 0, numFmt: "decimal", lvlText: "%1.", start: 1 }] },
      {
        numId: 11,
        levels: [
          { ilvl: 0, numFmt: "upperRoman", lvlText: "%1.", start: 5 },
          { ilvl: 1, numFmt: "lowerLetter", lvlText: "%2.", start: 1, restartAfterIlvl: 0 },
        ],
      },
    ]);
    const body = parseDocumentBodyXml(`<w:body>
      <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="10"/></w:numPr></w:pPr>
        <w:r><w:t>A</w:t></w:r></w:p>
      <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="11"/></w:numPr></w:pPr>
        <w:r><w:t>B</w:t></w:r></w:p>
    </w:body>`);
    const doc = buildProseMirrorDocFromOoxmlBody(body, numberingXml);
    const stub = prosemirrorDocToTransactionStub(doc, 4);
    expect(stub.listNumIds).toEqual([10, 11]);
    expect(stub.listIlvls).toEqual([0, 0]);
    expect(stub.listMarkers[0]).toMatch(/^1\./);
    expect(stub.listMarkers[1]).toMatch(/^V\./);

    const next = applyProjectionTransactionStub(
      {
        committedRevision: 1,
        persistedRevision: 1,
        materializedRevision: 1,
        exportedRevision: 0,
        sharedRevision: null,
        renderedRevision: 1,
      },
      stub,
    );
    expect(next.committedRevision).toBe(4);
  });
});
