import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { DocxStore } from "./docx-store.js";
import {
  buildProseMirrorDocFromOoxmlBody,
  proseMirrorParagraphTexts,
} from "./docx-prosemirror-projection.js";
import { applyListRenumberWithOoxmlDefinitions } from "./docx-numbering-ooxml-roundtrip.js";
import { readOpcPackage, writeOpcPackage } from "./opc-package.js";
import { parseNumberingNumIds } from "./docx-numbering-ooxml-roundtrip.js";
import { DOCX_NUMBERING_PART } from "./docx-numbering-opc-patch.js";

function zipDocx(documentXml: string): Uint8Array {
  const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  return zipSync(
    {
      "[Content_Types].xml": new TextEncoder().encode(contentTypes),
      "_rels/.rels": new TextEncoder().encode(rels),
      "word/document.xml": new TextEncoder().encode(documentXml),
    },
    { level: 0 },
  );
}

describe("G2-DOCX-04 D05 corpus expansion", () => {
  it("preserves tabs and internal spacing in paragraph text order", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Col A\tCol B</w:t></w:r></w:p>
    <w:p><w:r><w:t>wide   spacing</w:t></w:r></w:p>
  </w:body>
</w:document>`;
    const store = DocxStore.open(zipDocx(xml));
    const doc = buildProseMirrorDocFromOoxmlBody(store.getBody());
    expect(proseMirrorParagraphTexts(doc)).toEqual(["Col A\tCol B", "wide   spacing"]);
  });

  it("keeps empty paragraphs between spaced blocks (D05 order)", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Intro</w:t></w:r></w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p><w:r><w:t>After break</w:t></w:r></w:p>
  </w:body>
</w:document>`;
    const store = DocxStore.open(zipDocx(xml));
    const doc = buildProseMirrorDocFromOoxmlBody(store.getBody());
    expect(proseMirrorParagraphTexts(doc)).toEqual(["Intro", "", "After break"]);
  });

  it("preserves numbered list order with stub markers (D05 lists slice)", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>
      <w:r><w:t>Alpha</w:t></w:r></w:p>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>
      <w:r><w:t>Beta</w:t></w:r></w:p>
  </w:body>
</w:document>`;
    const store = DocxStore.open(zipDocx(xml));
    const doc = buildProseMirrorDocFromOoxmlBody(store.getBody());
    expect(proseMirrorParagraphTexts(doc)).toEqual(["Alpha", "Beta"]);
    const markers: string[] = [];
    doc.forEach((node) => {
      if (node.type.name === "paragraph") markers.push(String(node.attrs.listMarker));
    });
    expect(markers).toEqual(["1. ", "2. "]);
  });

  it("D05 list slice survives numbering.xml OOXML round-trip patch (G2-DOCX-07)", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>
      <w:r><w:t>One</w:t></w:r></w:p>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>
      <w:r><w:t>Two</w:t></w:r></w:p>
  </w:body>
</w:document>`;
    const store = DocxStore.open(zipDocx(xml));
    const docBefore = buildProseMirrorDocFromOoxmlBody(store.getBody());
    expect(proseMirrorParagraphTexts(docBefore)).toEqual(["One", "Two"]);

    const pkg = readOpcPackage(store.exportBytes());
    const patched = applyListRenumberWithOoxmlDefinitions(pkg, {
      kind: "docx-list-renumber-stub",
      numId: 1,
      markers: ["1. ", "2. "],
    });
    const numberingXml = new TextDecoder().decode(patched.members.get(DOCX_NUMBERING_PART)!);
    expect(parseNumberingNumIds(numberingXml)).toContain(1);

    const reopened = DocxStore.open(writeOpcPackage(patched));
    const docAfter = buildProseMirrorDocFromOoxmlBody(reopened.getBody());
    expect(proseMirrorParagraphTexts(docAfter)).toEqual(["One", "Two"]);
  });
});
