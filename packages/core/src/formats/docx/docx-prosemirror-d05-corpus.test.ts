import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { DocxStore } from "./docx-store.js";
import {
  buildProseMirrorDocFromOoxmlBody,
  proseMirrorParagraphTexts,
} from "./docx-prosemirror-projection.js";

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
});
