import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { detectDocumentKind } from "./detect-document-kind.js";

describe("F02 detectDocumentKind", () => {
  it("detects PDF magic", () => {
    const bytes = new TextEncoder().encode("%PDF-1.4\n1 0 obj\n");
    expect(detectDocumentKind(bytes).kind).toBe("pdf");
  });

  it("detects encrypted PDF as unsupported", () => {
    const bytes = new TextEncoder().encode("%PDF-1.4\n/Encrypt 4 0 R\n");
    expect(detectDocumentKind(bytes).kind).toBe("encrypted-unsupported");
  });

  it("detects DOCX zip with document.xml", () => {
    const bytes = zipSync({
      "[Content_Types].xml": new TextEncoder().encode("<Types/>"),
      "word/document.xml": new TextEncoder().encode("<w:document/>"),
    });
    expect(detectDocumentKind(bytes).kind).toBe("docx");
  });

  it("uses filename hint when magic is empty", () => {
    expect(detectDocumentKind(new Uint8Array(), { filename: "a.docx" }).kind).toBe("docx");
  });

  it("treats .doc extension as legacy-doc hint (F165)", () => {
    expect(detectDocumentKind(new Uint8Array(), { filename: "legacy.doc" }).kind).toBe("legacy-doc");
  });

  it("classifies OLE with WordDocument as legacy-doc", () => {
    const bytes = new Uint8Array(64);
    bytes.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    const label = new TextEncoder().encode("WordDocument");
    bytes.set(label, 16);
    expect(detectDocumentKind(bytes).kind).toBe("legacy-doc");
  });

  it("classifies OLE with EncryptedPackage as encrypted-ooxml (F03)", () => {
    const bytes = new Uint8Array(128);
    bytes.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    const label = new TextEncoder().encode("EncryptedPackage");
    bytes.set(label, 24);
    expect(detectDocumentKind(bytes).kind).toBe("encrypted-ooxml");
  });

  it("marks unknown OLE compound as encrypted-unsupported (F03)", () => {
    const bytes = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    expect(detectDocumentKind(bytes).kind).toBe("encrypted-unsupported");
  });
});
