import { strFromU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { DocxStore } from "./docx-store.js";
import { OpcLimitError, readOpcPackage } from "./opc-package.js";

function buildMinimalDocx(paragraphText: string): Uint8Array {
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body><w:p><w:r><w:t>${paragraphText}</w:t></w:r></w:p></w:body>
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

describe("opc package", () => {
  it("rejects path traversal members", () => {
    const evil = zipSync({ "../evil.xml": new Uint8Array([1]) });
    expect(() => readOpcPackage(evil)).toThrow(OpcLimitError);
  });
});

describe("docx store D01", () => {
  it("round-trips untouched members after paragraph edit", () => {
    const bytes = buildMinimalDocx("alpha");
    const store = DocxStore.open(bytes);
    const paragraphId = store.getBody().children?.[0]?.id;
    expect(paragraphId).toBeDefined();
    expect(store.patchParagraph(paragraphId!, "beta")).toBe(true);
    expect(store.verifyUntouchedMembers()).toEqual([]);
    const exportedDoc = store.exportBytes();
    DocxStore.open(exportedDoc);
    const pkg = readOpcPackage(exportedDoc);
    const docXml = strFromU8(pkg.members.get("word/document.xml")!);
    expect(docXml).toContain("beta");
    expect(docXml).not.toContain("alpha");
  });
});
