import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { DocxStore } from "./docx-store.js";
import {
  buildProseMirrorDocFromOoxmlBody,
  proseMirrorParagraphTexts,
} from "./docx-prosemirror-projection.js";
import { parseDocumentBodyXml } from "./ooxml-tree.js";

function buildMultiParagraphDocx(): Uint8Array {
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>First paragraph</w:t></w:r></w:p>
    <w:p><w:r><w:t>Second with tabs\tand spacing</w:t></w:r></w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
  </w:body>
</w:document>`;
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

describe("G2-DOCX-03 ProseMirror projection (D05 slice)", () => {
  it("maps synthetic OOXML body paragraphs to prosemirror-model doc", () => {
    const body = parseDocumentBodyXml(`<w:body>
      <w:p><w:r><w:t>Alpha</w:t></w:r></w:p>
      <w:p><w:r><w:t>Beta</w:t></w:r></w:p>
    </w:body>`);
    const doc = buildProseMirrorDocFromOoxmlBody(body);
    expect(proseMirrorParagraphTexts(doc)).toEqual(["Alpha", "Beta"]);
    expect(doc.childCount).toBe(2);
    expect(doc.child(0).attrs.ooxmlId).toMatch(/^n\d+/);
  });

  it("preserves paragraph order from DocxStore body (D05-style)", () => {
    const store = DocxStore.open(buildMultiParagraphDocx());
    const doc = buildProseMirrorDocFromOoxmlBody(store.getBody());
    expect(proseMirrorParagraphTexts(doc)).toEqual([
      "First paragraph",
      "Second with tabs\tand spacing",
      "",
    ]);
  });
});
