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
  buildWordCompatibleMultiNumNumberingXml,
  buildWordCompatibleNumberingXml,
  buildWordCompatibleSharedAbstractNumberingXml,
  parseNumberingAbstractNumIds,
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
  numIdAbstractRemap?: Readonly<Record<number, number>>;
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
  {
    id: "D05-DRT-07",
    seedDocumentXml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="8"/></w:numPr>
      <w:ind w:left="720" w:hanging="360"/></w:pPr>
      <w:r><w:t>Outline one</w:t></w:r></w:p>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="8"/></w:numPr>
      <w:ind w:left="1440" w:hanging="360"/></w:pPr>
      <w:r><w:t>Sub point</w:t></w:r></w:p>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="2"/><w:numId w:val="8"/></w:numPr>
      <w:ind w:left="2160" w:hanging="360"/></w:pPr>
      <w:r><w:t>Roman detail</w:t></w:r></w:p>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="8"/></w:numPr>
      <w:ind w:left="720" w:hanging="360"/></w:pPr>
      <w:r><w:t>Outline two</w:t></w:r></w:p>
  </w:body>
</w:document>`,
    seedNumberingXml: buildWordCompatibleNumberingXml(8, [
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
      {
        ilvl: 2,
        numFmt: "upperRoman",
        lvlText: "%3.",
        start: 1,
        restartAfterIlvl: 1,
        leftIndentTwips: 2160,
        hangingIndentTwips: 360,
      },
    ]),
    paragraphs: [
      { text: "Outline one", numId: 8, ilvl: 0 },
      { text: "Sub point", numId: 8, ilvl: 1 },
      { text: "Roman detail", numId: 8, ilvl: 2 },
      { text: "Outline two", numId: 8, ilvl: 0 },
    ],
    expectedNumPr: [
      { numId: 8, ilvl: 0 },
      { numId: 8, ilvl: 1 },
      { numId: 8, ilvl: 2 },
      { numId: 8, ilvl: 0 },
    ],
    expectedTexts: ["Outline one", "Sub point", "Roman detail", "Outline two"],
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
      {
        ilvl: 2,
        numFmt: "upperRoman",
        lvlText: "%3.",
        start: 1,
        restartAfterIlvl: 1,
        leftIndentTwips: 2160,
        hangingIndentTwips: 360,
      },
    ],
  },
  {
    id: "D05-DRT-08",
    seedDocumentXml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="9"/></w:numPr>
      <w:ind w:left="720" w:hanging="360"/></w:pPr>
      <w:r><w:t>Roman section</w:t></w:r></w:p>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="9"/></w:numPr>
      <w:ind w:left="1440" w:hanging="360"/></w:pPr>
      <w:r><w:t>Decimal child</w:t></w:r></w:p>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="2"/><w:numId w:val="9"/></w:numPr>
      <w:ind w:left="2160" w:hanging="360"/></w:pPr>
      <w:r><w:t>Bullet leaf</w:t></w:r></w:p>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="9"/></w:numPr>
      <w:ind w:left="720" w:hanging="360"/></w:pPr>
      <w:r><w:t>Second section</w:t></w:r></w:p>
  </w:body>
</w:document>`,
    seedNumberingXml: buildWordCompatibleNumberingXml(9, [
      {
        ilvl: 0,
        numFmt: "upperRoman",
        lvlText: "%1.",
        start: 1,
        leftIndentTwips: 720,
        hangingIndentTwips: 360,
      },
      {
        ilvl: 1,
        numFmt: "decimal",
        lvlText: "%2.",
        start: 1,
        restartAfterIlvl: 0,
        leftIndentTwips: 1440,
        hangingIndentTwips: 360,
      },
      {
        ilvl: 2,
        numFmt: "bullet",
        lvlText: "•",
        start: 1,
        restartAfterIlvl: 1,
        leftIndentTwips: 2160,
        hangingIndentTwips: 360,
      },
    ]),
    paragraphs: [
      { text: "Roman section", numId: 9, ilvl: 0 },
      { text: "Decimal child", numId: 9, ilvl: 1 },
      { text: "Bullet leaf", numId: 9, ilvl: 2 },
      { text: "Second section", numId: 9, ilvl: 0 },
    ],
    expectedNumPr: [
      { numId: 9, ilvl: 0 },
      { numId: 9, ilvl: 1 },
      { numId: 9, ilvl: 2 },
      { numId: 9, ilvl: 0 },
    ],
    expectedTexts: ["Roman section", "Decimal child", "Bullet leaf", "Second section"],
    seedLevels: [
      {
        ilvl: 0,
        numFmt: "upperRoman",
        lvlText: "%1.",
        start: 1,
        leftIndentTwips: 720,
        hangingIndentTwips: 360,
      },
      {
        ilvl: 1,
        numFmt: "decimal",
        lvlText: "%2.",
        start: 1,
        restartAfterIlvl: 0,
        leftIndentTwips: 1440,
        hangingIndentTwips: 360,
      },
      {
        ilvl: 2,
        numFmt: "bullet",
        lvlText: "•",
        start: 1,
        restartAfterIlvl: 1,
        leftIndentTwips: 2160,
        hangingIndentTwips: 360,
      },
    ],
  },
  {
    id: "D05-DRT-09",
    seedDocumentXml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="10"/></w:numPr></w:pPr>
      <w:r><w:t>List A one</w:t></w:r></w:p>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="11"/></w:numPr></w:pPr>
      <w:r><w:t>List B starts at five</w:t></w:r></w:p>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="10"/></w:numPr></w:pPr>
      <w:r><w:t>List A two</w:t></w:r></w:p>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="11"/></w:numPr></w:pPr>
      <w:r><w:t>List B nested</w:t></w:r></w:p>
  </w:body>
</w:document>`,
    seedNumberingXml: buildWordCompatibleMultiNumNumberingXml([
      {
        numId: 10,
        levels: [{ ilvl: 0, numFmt: "decimal", lvlText: "%1.", start: 1 }],
      },
      {
        numId: 11,
        levels: [
          { ilvl: 0, numFmt: "upperRoman", lvlText: "%1.", start: 5 },
          { ilvl: 1, numFmt: "lowerLetter", lvlText: "%2.", start: 1, restartAfterIlvl: 0 },
        ],
      },
    ]),
    paragraphs: [
      { text: "List A one", numId: 10, ilvl: 0 },
      { text: "List B starts at five", numId: 11, ilvl: 0 },
      { text: "List A two", numId: 10, ilvl: 0 },
      { text: "List B nested", numId: 11, ilvl: 1 },
    ],
    expectedNumPr: [
      { numId: 10, ilvl: 0 },
      { numId: 11, ilvl: 0 },
      { numId: 10, ilvl: 0 },
      { numId: 11, ilvl: 1 },
    ],
    expectedTexts: ["List A one", "List B starts at five", "List A two", "List B nested"],
    seedLevels: [
      { ilvl: 0, numFmt: "decimal", lvlText: "%1.", start: 1 },
      { ilvl: 0, numFmt: "upperRoman", lvlText: "%1.", start: 5 },
      { ilvl: 1, numFmt: "lowerLetter", lvlText: "%2.", start: 1, restartAfterIlvl: 0 },
    ],
  },
  {
    id: "D05-DRT-10",
    seedDocumentXml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="12"/></w:numPr></w:pPr>
      <w:r><w:t>Shared A</w:t></w:r></w:p>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="13"/></w:numPr></w:pPr>
      <w:r><w:t>Shared B</w:t></w:r></w:p>
  </w:body>
</w:document>`,
    seedNumberingXml: buildWordCompatibleSharedAbstractNumberingXml(
      3,
      [{ ilvl: 0, numFmt: "decimal", lvlText: "%1.", start: 1 }],
      [12, 13],
    ),
    paragraphs: [
      { text: "Shared A", numId: 12, ilvl: 0 },
      { text: "Shared B", numId: 13, ilvl: 0 },
    ],
    expectedNumPr: [
      { numId: 12, ilvl: 0 },
      { numId: 13, ilvl: 0 },
    ],
    expectedTexts: ["Shared A", "Shared B"],
    seedLevels: [{ ilvl: 0, numFmt: "decimal", lvlText: "%1.", start: 1 }],
  },
  {
    id: "D05-DRT-11",
    seedDocumentXml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="20"/></w:numPr></w:pPr>
      <w:r><w:t>Remap one</w:t></w:r></w:p>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="21"/></w:numPr></w:pPr>
      <w:r><w:t>Remap two</w:t></w:r></w:p>
  </w:body>
</w:document>`,
    seedNumberingXml: buildWordCompatibleSharedAbstractNumberingXml(
      50,
      [{ ilvl: 0, numFmt: "upperRoman", lvlText: "%1.", start: 2 }],
      [20],
    ),
    paragraphs: [
      { text: "Remap one", numId: 20, ilvl: 0 },
      { text: "Remap two", numId: 21, ilvl: 0 },
    ],
    expectedNumPr: [
      { numId: 20, ilvl: 0 },
      { numId: 21, ilvl: 0 },
    ],
    expectedTexts: ["Remap one", "Remap two"],
    seedLevels: [{ ilvl: 0, numFmt: "upperRoman", lvlText: "%1.", start: 2 }],
    numIdAbstractRemap: { 21: 50 },
  },
];

const DEFAULT_D05_SEED_LEVELS: readonly WordNumberingLevelDef[] = [
  { ilvl: 0, numFmt: "decimal", lvlText: "%1.", start: 1 },
  { ilvl: 1, numFmt: "lowerLetter", lvlText: "%2.", start: 1, restartAfterIlvl: 0 },
];

describe("G2-DOCX-18 D05 document.xml numbering round-trip", () => {
  it.each(D05_DOCUMENT_ROUNDTRIP.map((row) => [row.id, row] as const))(
    "%s preserves document.xml numPr through OPC export/reopen",
    (_id, row) => {
      const pkg = readOpcPackage(zipDocx(row.seedDocumentXml, row.seedNumberingXml));
      const patched = applyDocxNumberingWriteBackFromSession(pkg, row.paragraphs, {
        seedLevels: row.seedLevels ?? DEFAULT_D05_SEED_LEVELS,
        numIdAbstractRemap: "numIdAbstractRemap" in row ? row.numIdAbstractRemap : undefined,
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
      if (row.id === "D05-DRT-07") {
        const parsed = parseWordNumberingXml(numberingXml);
        const abstractId = parsed.numToAbstract.get(8);
        expect(abstractId).toBeDefined();
        const levels = parsed.abstractNums.get(abstractId!);
        expect(levels?.find((l) => l.ilvl === 2)?.numFmt).toBe("upperRoman");
        expect(levels?.find((l) => l.ilvl === 2)?.restartAfterIlvl).toBe(1);
      }
      if (row.id === "D05-DRT-08") {
        const parsed = parseWordNumberingXml(numberingXml);
        const abstractId = parsed.numToAbstract.get(9);
        expect(abstractId).toBeDefined();
        const levels = parsed.abstractNums.get(abstractId!);
        expect(levels?.find((l) => l.ilvl === 0)?.numFmt).toBe("upperRoman");
        expect(levels?.find((l) => l.ilvl === 2)?.numFmt).toBe("bullet");
        expect(levels?.find((l) => l.ilvl === 2)?.restartAfterIlvl).toBe(1);
      }
      if (row.id === "D05-DRT-09") {
        const numIds = parseNumberingNumIds(numberingXml);
        expect(numIds.sort((a, b) => a - b)).toEqual([10, 11]);
        const parsed = parseWordNumberingXml(numberingXml);
        const levelsB = parsed.abstractNums.get(parsed.numToAbstract.get(11)!);
        expect(levelsB?.find((l) => l.ilvl === 0)?.start).toBe(5);
        expect(levelsB?.find((l) => l.ilvl === 1)?.restartAfterIlvl).toBe(0);
      }
      if (row.id === "D05-DRT-10") {
        const parsed = parseWordNumberingXml(numberingXml);
        expect(parsed.numToAbstract.get(12)).toBe(3);
        expect(parsed.numToAbstract.get(13)).toBe(3);
        expect(parseNumberingAbstractNumIds(numberingXml)).toEqual([3]);
      }
      if (row.id === "D05-DRT-11") {
        const parsed = parseWordNumberingXml(numberingXml);
        expect(parsed.numToAbstract.get(20)).toBe(50);
        expect(parsed.numToAbstract.get(21)).toBe(50);
        expect(parsed.abstractNums.get(50)?.[0]?.start).toBe(2);
      }

      const doc = buildProseMirrorDocFromOoxmlBody(
        reopenedStore.getBody(),
        reopenedStore.tryGetNumberingXml(),
      );
      expect(proseMirrorParagraphTexts(doc)).toEqual(row.expectedTexts);
    },
  );
});
