import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { DocxStore } from "./docx-store.js";
import {
  buildProseMirrorDocFromOoxmlBody,
  proseMirrorParagraphTexts,
} from "./docx-prosemirror-projection.js";
import {
  buildWordCompatibleNumberingXml,
  parseNumberingAbstractNumIds,
  parseNumberingNumIds,
} from "./docx-numbering-ooxml-roundtrip.js";

function zipDocx(documentXml: string, numberingXml?: string): Uint8Array {
  const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": new TextEncoder().encode(contentTypes),
    "_rels/.rels": new TextEncoder().encode(rels),
    "word/document.xml": new TextEncoder().encode(documentXml),
  };
  if (numberingXml) {
    files["word/numbering.xml"] = new TextEncoder().encode(numberingXml);
  }
  return zipSync(files, { level: 0 });
}

/** G2-DOCX-08: external D05 reader matrix (projection + numbering defs). */
const D05_READER_MATRIX: readonly {
  id: string;
  documentXml: string;
  numberingXml?: string;
  expectedTexts: string[];
  expectedMarkers?: string[];
}[] = [
  {
    id: "D05-RM-01",
    documentXml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>plain</w:t></w:r></w:p>
  </w:body>
</w:document>`,
    expectedTexts: ["plain"],
  },
  {
    id: "D05-RM-02",
    documentXml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr></w:pPr>
      <w:r><w:t>Item</w:t></w:r></w:p>
  </w:body>
</w:document>`,
    numberingXml: buildWordCompatibleNumberingXml(2, [
      { ilvl: 0, numFmt: "bullet", lvlText: "•", start: 1 },
    ]),
    expectedTexts: ["Item"],
    expectedMarkers: ["• "],
  },
  {
    id: "D05-RM-03",
    documentXml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="4"/></w:numPr></w:pPr>
      <w:r><w:t>Nested</w:t></w:r></w:p>
  </w:body>
</w:document>`,
    numberingXml: buildWordCompatibleNumberingXml(4, [
      { ilvl: 0, numFmt: "decimal", lvlText: "%1.", start: 1 },
      { ilvl: 1, numFmt: "lowerLetter", lvlText: "%2.", start: 1, restartAfterIlvl: 0 },
    ]),
    expectedTexts: ["Nested"],
    expectedMarkers: ["a. "],
  },
];

describe("G2-DOCX-08 D05 reader matrix", () => {
  it.each(D05_READER_MATRIX.map((row) => [row.id, row] as const))(
    "%s projection matches expected reader output",
    (_id, row) => {
      if (row.numberingXml) {
        expect(parseNumberingNumIds(row.numberingXml).length).toBeGreaterThan(0);
        expect(parseNumberingAbstractNumIds(row.numberingXml).length).toBeGreaterThan(0);
      }
      const store = DocxStore.open(zipDocx(row.documentXml, row.numberingXml));
      const doc = buildProseMirrorDocFromOoxmlBody(store.getBody(), store.tryGetNumberingXml());
      expect(proseMirrorParagraphTexts(doc)).toEqual(row.expectedTexts);
      if (row.expectedMarkers) {
        const markers: string[] = [];
        doc.forEach((node) => {
          if (node.type.name === "paragraph") markers.push(String(node.attrs.listMarker));
        });
        expect(markers).toEqual(row.expectedMarkers);
      }
    },
  );
});
