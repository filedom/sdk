import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { createDocumentSession } from "../../session/document-session.js";
import { DocxStore } from "./docx-store.js";
import {
  buildProseMirrorDocFromOoxmlBody,
  proseMirrorParagraphTexts,
} from "./docx-prosemirror-projection.js";
import { exportDocxFromStoreStub } from "./docx-export-stub.js";

function minimalDocx(text: string): Uint8Array {
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body>
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

describe("docx export stub (F02)", () => {
  it("exports zip bytes and advances exportedRevision", () => {
    const store = DocxStore.open(minimalDocx("export-me"));
    const session = createDocumentSession({
      documentId: "doc-1",
      kind: "flow",
      revisions: {
        committedRevision: 3,
        persistedRevision: 3,
        materializedRevision: 3,
        exportedRevision: 0,
        sharedRevision: null,
        renderedRevision: 3,
      },
    });
    const { session: after, result } = exportDocxFromStoreStub(store, session);
    expect(result.roundTripOpcOk).toBe(true);
    expect(result.memberCount).toBeGreaterThan(0);
    expect(result.exportedRevision).toBe(3);
    expect(after.revisions.exportedRevision).toBe(3);
    const reopened = DocxStore.open(result.zipBytes);
    const texts = proseMirrorParagraphTexts(buildProseMirrorDocFromOoxmlBody(reopened.getBody()));
    expect(texts).toEqual(["export-me"]);
  });
});
