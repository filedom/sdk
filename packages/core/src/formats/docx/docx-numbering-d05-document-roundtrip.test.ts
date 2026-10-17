import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { DocxStore } from "./docx-store.js";
import {
  buildProseMirrorDocFromOoxmlBody,
  proseMirrorParagraphTexts,
} from "./docx-prosemirror-projection.js";
import {
  applyDocxNumberingWriteBackFromSession,
  readBodyNumPrFromDocumentXml,
} from "./docx-numbering-body-writeback.js";
import {
  buildWordCompatibleNumberingXml,
  parseNumberingNumIds,
} from "./docx-numbering-ooxml-roundtrip.js";
import { parseWordNumberingXml } from "./docx-numbering-runtime.js";
import type { ListParagraphMeta } from "./docx-list-numbering-stub.js";
import type { WordNumberingLevelDef } from "./docx-numbering-ooxml-roundtrip.js";
import { getMemberUtf8, readOpcPackage, writeOpcPackage } from "./opc-package.js";

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

/** G2-DOCX-13: full D05 document.xml + numbering.xml writer round-trip matrix. */
const D05_DOCUMENT_ROUNDTRIP: readonly {
  id: string;
  seedDocumentXml: string;
  seedNumberingXml?: string;
  paragraphs: ListParagraphMeta[];
  expectedNumPr: Array<{ numId: number; ilvl: number }>;
  expectedTexts: string[];
  seedLevels?: readonly WordNumberingLevelDef[];
}[] = [
  {
    id: "D05-DRT-01",
    seedDocumentXml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>plain</w:t></w:r></w:p>
  </w:body>
</w:document>`,
    paragraphs: [{ text: "plain", numId: 2, ilvl: 0 }],
    expectedNumPr: [{ numId: 2, ilvl: 0 }],
    expectedTexts: ["plain"],
  },
  {
    id: "D05-DRT-02",
    seedDocumentXml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr></w:pPr>
      <w:r><w:t>Item</w:t></w:r></w:p>
  </w:body>
</w:document>`,
    seedNumberingXml: buildWordCompatibleNumberingXml(2, [
      { ilvl: 0, numFmt: "bullet", lvlText: "•", start: 1 },
    ]),
    paragraphs: [{ text: "Item", numId: 2, ilvl: 0 }],
    expectedNumPr: [{ numId: 2, ilvl: 0 }],
    expectedTexts: ["Item"],
  },
  {
    id: "D05-DRT-03",
    seedDocumentXml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="4"/></w:numPr></w:pPr>
      <w:r><w:t>Nested</w:t></w:r></w:p>
  </w:body>
</w:document>`,
    seedNumberingXml: buildWordCompatibleNumberingXml(4, [
      { ilvl: 0, numFmt: "decimal", lvlText: "%1.", start: 1 },
      { ilvl: 1, numFmt: "lowerLetter", lvlText: "%2.", start: 1, restartAfterIlvl: 0 },
    ]),
    paragraphs: [{ text: "Nested", numId: 4, ilvl: 1 }],
    expectedNumPr: [{ numId: 4, ilvl: 1 }],
    expectedTexts: ["Nested"],
  },
  {
    id: "D05-DRT-04",
    seedDocumentXml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>A</w:t></w:r></w:p>
    <w:p><w:r><w:t>B</w:t></w:r></w:p>
  </w:body>
</w:document>`,
    paragraphs: [
      { text: "A", numId: 2, ilvl: 0 },
      { text: "B", numId: 2, ilvl: 0 },
    ],
    expectedNumPr: [
      { numId: 2, ilvl: 0 },
      { numId: 2, ilvl: 0 },
    ],
    expectedTexts: ["A", "B"],
  },
  {
    id: "D05-DRT-05",
    seedDocumentXml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="6"/></w:numPr></w:pPr>
      <w:r><w:t>Parent</w:t></w:r></w:p>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="6"/></w:numPr></w:pPr>
      <w:r><w:t>Child</w:t></w:r></w:p>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="6"/></w:numPr></w:pPr>
      <w:r><w:t>Restart</w:t></w:r></w:p>
  </w:body>
</w:document>`,
    seedNumberingXml: buildWordCompatibleNumberingXml(6, [
      { ilvl: 0, numFmt: "decimal", lvlText: "%1.", start: 1 },
      { ilvl: 1, numFmt: "lowerLetter", lvlText: "%2.", start: 1, restartAfterIlvl: 0 },
    ]),
    paragraphs: [
      { text: "Parent", numId: 6, ilvl: 0 },
      { text: "Child", numId: 6, ilvl: 1 },
      { text: "Restart", numId: 6, ilvl: 0 },
    ],
    expectedNumPr: [
      { numId: 6, ilvl: 0 },
      { numId: 6, ilvl: 1 },
      { numId: 6, ilvl: 0 },
    ],
    expectedTexts: ["Parent", "Child", "Restart"],
  },
  {
    id: "D05-DRT-06",
    seedDocumentXml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="7"/></w:numPr>
      <w:ind w:left="720" w:hanging="360"/></w:pPr>
      <w:r><w:t>Indented parent</w:t></w:r></w:p>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="7"/></w:numPr>
      <w:ind w:left="1440" w:hanging="360"/></w:pPr>
      <w:r><w:t>Nested child</w:t></w:r></w:p>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="7"/></w:numPr>
      <w:ind w:left="720" w:hanging="360"/></w:pPr>
      <w:r><w:t>Restart after nested</w:t></w:r></w:p>
  </w:body>
</w:document>`,
    seedNumberingXml: buildWordCompatibleNumberingXml(7, [
      {
        ilvl: 0,
        numFmt: "decimal",
        lvlText: "%1.",
        start: 1,
        leftIndentTwips: 720,
        hangingIndentTwips: 360,
      },
      {
        ilvl: 1,
        numFmt: "lowerLetter",
        lvlText: "%2.",
        start: 1,
        restartAfterIlvl: 0,
        leftIndentTwips: 1440,
        hangingIndentTwips: 360,
      },
    ]),
    paragraphs: [
      { text: "Indented parent", numId: 7, ilvl: 0 },
      { text: "Nested child", numId: 7, ilvl: 1 },
      { text: "Restart after nested", numId: 7, ilvl: 0 },
    ],
    expectedNumPr: [
      { numId: 7, ilvl: 0 },
      { numId: 7, ilvl: 1 },
      { numId: 7, ilvl: 0 },
    ],
    expectedTexts: ["Indented parent", "Nested child", "Restart after nested"],
    seedLevels: [
      {
        ilvl: 0,
        numFmt: "decimal",
        lvlText: "%1.",
        start: 1,
        leftIndentTwips: 720,
        hangingIndentTwips: 360,
      },
      {
        ilvl: 1,
        numFmt: "lowerLetter",
        lvlText: "%2.",
        start: 1,
        restartAfterIlvl: 0,
        leftIndentTwips: 1440,
        hangingIndentTwips: 360,
      },
    ],
  },
];

const DEFAULT_D05_SEED_LEVELS: readonly WordNumberingLevelDef[] = [
  { ilvl: 0, numFmt: "decimal", lvlText: "%1.", start: 1 },
  { ilvl: 1, numFmt: "lowerLetter", lvlText: "%2.", start: 1, restartAfterIlvl: 0 },
];

describe("G2-DOCX-15 D05 document.xml numbering round-trip", () => {
  it.each(D05_DOCUMENT_ROUNDTRIP.map((row) => [row.id, row] as const))(
    "%s preserves document.xml numPr through OPC export/reopen",
    (_id, row) => {
      const pkg = readOpcPackage(zipDocx(row.seedDocumentXml, row.seedNumberingXml));
      const patched = applyDocxNumberingWriteBackFromSession(pkg, row.paragraphs, {
        seedLevels: row.seedLevels ?? DEFAULT_D05_SEED_LEVELS,
      });
      const documentXmlFirst = getMemberUtf8(patched, "word/document.xml");
      expect(readBodyNumPrFromDocumentXml(documentXmlFirst)).toEqual(row.expectedNumPr);

      const exported = writeOpcPackage(patched);
      const reopenedPkg = readOpcPackage(exported);
      const documentXmlSecond = getMemberUtf8(reopenedPkg, "word/document.xml");
      expect(readBodyNumPrFromDocumentXml(documentXmlSecond)).toEqual(row.expectedNumPr);

      const reopenedStore = DocxStore.open(exported);

      const numberingXml = getMemberUtf8(patched, "word/numbering.xml");
      expect(parseNumberingNumIds(numberingXml).length).toBeGreaterThan(0);
      if (row.id === "D05-DRT-06") {
        const parsed = parseWordNumberingXml(numberingXml);
        const abstractId = parsed.numToAbstract.get(7);
        expect(abstractId).toBeDefined();
        const levels = parsed.abstractNums.get(abstractId!);
        expect(levels?.find((l) => l.ilvl === 0)?.leftIndentTwips).toBe(720);
        expect(levels?.find((l) => l.ilvl === 1)?.restartAfterIlvl).toBe(0);
      }

      const doc = buildProseMirrorDocFromOoxmlBody(
        reopenedStore.getBody(),
        reopenedStore.tryGetNumberingXml(),
      );
      expect(proseMirrorParagraphTexts(doc)).toEqual(row.expectedTexts);
    },
  );
});
