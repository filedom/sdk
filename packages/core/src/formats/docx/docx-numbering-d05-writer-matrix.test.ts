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
} from "./docx-numbering-ooxml-roundtrip.js";
import type { ListParagraphMeta } from "./docx-list-numbering-stub.js";
import { getMemberUtf8, readOpcPackage } from "./opc-package.js";

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

const plainDocumentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>plain</w:t></w:r></w:p>
  </w:body>
</w:document>`;

/** G2-DOCX-12: writer matrix — session write-back → body numPr + numbering.xml. */
const D05_WRITER_MATRIX: readonly {
  id: string;
  seedDocumentXml: string;
  seedNumberingXml?: string;
  paragraphs: ListParagraphMeta[];
  expectedNumPr: Array<{ numId: number; ilvl: number }>;
  expectedTexts: string[];
}[] = [
  {
    id: "D05-WM-01",
    seedDocumentXml: plainDocumentXml,
    paragraphs: [{ text: "Item", numId: 2, ilvl: 0 }],
    expectedNumPr: [{ numId: 2, ilvl: 0 }],
    expectedTexts: ["Item"],
  },
  {
    id: "D05-WM-02",
    seedDocumentXml: plainDocumentXml.replace(
      "plain",
      "Nested",
    ),
    paragraphs: [{ text: "Nested", numId: 4, ilvl: 1 }],
    expectedNumPr: [{ numId: 4, ilvl: 1 }],
    expectedTexts: ["Nested"],
  },
  {
    id: "D05-WM-03",
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
];

describe("G2-DOCX-12 D05 writer matrix + body numPr write-back", () => {
  it.each(D05_WRITER_MATRIX.map((row) => [row.id, row] as const))(
    "%s round-trips list meta through OPC write-back",
    (_id, row) => {
      const zipBytes = zipDocx(row.seedDocumentXml, row.seedNumberingXml);
      const pkg = readOpcPackage(zipBytes);
      const patched = applyDocxNumberingWriteBackFromSession(pkg, row.paragraphs, {
        seedLevels: [
          { ilvl: 0, numFmt: "decimal", lvlText: "%1.", start: 1 },
          { ilvl: 1, numFmt: "lowerLetter", lvlText: "%2.", start: 1, restartAfterIlvl: 0 },
        ],
      });
      const documentXml = getMemberUtf8(patched, "word/document.xml");
      expect(readBodyNumPrFromDocumentXml(documentXml)).toEqual(row.expectedNumPr);
      const reopened = DocxStore.open(writeZipFromOpc(patched));
      const doc = buildProseMirrorDocFromOoxmlBody(
        reopened.getBody(),
        reopened.tryGetNumberingXml(),
      );
      expect(proseMirrorParagraphTexts(doc)).toEqual(row.expectedTexts);
    },
  );

  it("seeds numbering defs for nested ilvl when numbering.xml absent", () => {
    const patched = applyDocxNumberingWriteBackFromSession(
      readOpcPackage(zipDocx(plainDocumentXml.replace("plain", "Nested"))),
      [
        { text: "Nested", numId: 4, ilvl: 1 },
      ],
    );
    const numberingXml = getMemberUtf8(patched, "word/numbering.xml");
    expect(numberingXml).toContain('w:numId="4"');
    expect(buildWordCompatibleNumberingXml(4, [{ ilvl: 1, numFmt: "lowerLetter", lvlText: "%2.", start: 1 }])).toBeTruthy();
  });
});

function writeZipFromOpc(patched: ReturnType<typeof applyDocxNumberingWriteBackFromSession>): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  for (const [path, bytes] of patched.members) {
    files[path] = bytes;
  }
  return zipSync(files, { level: 0 });
}
