import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { DocxStore } from "./docx-store.js";
import { readOpcPackage } from "./opc-package.js";

/** Sanitized synthetic DOCX bytes (D02–D04); no external fixtures. */
function buildDocxWithCommentsAndRels(bodyText: string): Uint8Array {
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body><w:p><w:r><w:t>${bodyText}</w:t></w:r></w:p></w:body>
</w:document>`;
  const commentsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:comment w:id="0" w:author="sanitized" w:date="2026-01-01T00:00:00Z"><w:p/></w:comment>
  <w:comment w:id="1" w:author="sanitized" w:date="2026-01-02T00:00:00Z"><w:p/></w:comment>
</w:comments>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>
</Types>`;
  const rootRels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  const docRels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/>
</Relationships>`;
  return zipSync(
    {
      "[Content_Types].xml": new TextEncoder().encode(contentTypes),
      "_rels/.rels": new TextEncoder().encode(rootRels),
      "word/document.xml": new TextEncoder().encode(documentXml),
      "word/comments.xml": new TextEncoder().encode(commentsXml),
      "word/_rels/document.xml.rels": new TextEncoder().encode(docRels),
    },
    { level: 0 },
  );
}

describe("G2-DOCX-02 opc relationships and preservation", () => {
  it("parses root and document relationship parts", () => {
    const bytes = buildDocxWithCommentsAndRels("hello");
    const store = DocxStore.open(bytes);
    expect(store.getRootRelationships()).toHaveLength(1);
    expect(store.getDocumentRelationships()[0]?.target).toBe("comments.xml");
    expect(store.commentsPartPath()).toBe("word/comments.xml");
  });

  it("D04 comments stub counts sanitized comment elements", () => {
    const store = DocxStore.open(buildDocxWithCommentsAndRels("x"));
    const stub = store.getCommentsStub();
    expect(stub.present).toBe(true);
    expect(stub.commentCount).toBe(2);
  });

  it("D03 preservation bag keeps comments and rels after body edit", () => {
    const bytes = buildDocxWithCommentsAndRels("before");
    const store = DocxStore.open(bytes);
    const paragraphId = store.getBody().children?.[0]?.id;
    expect(store.patchParagraph(paragraphId!, "after")).toBe(true);
    expect(store.verifyUntouchedMembers()).toEqual([]);
    const snap = store.snapshot();
    expect(snap.preservationBagPaths).toContain("word/comments.xml");
    expect(snap.preservationBagPaths).toContain("word/_rels/document.xml.rels");
    const exported = store.exportBytes();
    const pkg = readOpcPackage(exported);
    expect(pkg.members.has("word/comments.xml")).toBe(true);
    const reopened = DocxStore.open(exported);
    expect(reopened.getCommentsStub().commentCount).toBe(2);
  });
});
