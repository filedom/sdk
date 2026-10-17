import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { DocxStore } from "./docx-store.js";
import {
  createDocumentSession,
  DocumentSession,
} from "../../session/document-session.js";
import {
  MemoryDomdocBlobStoreStub,
  parseDomdocPackageManifestStub,
} from "../../persistence/domdoc-package-stub.js";

function buildMinimalDocx(paragraphText: string): Uint8Array {
  return zipSync({
    "[Content_Types].xml": new TextEncoder().encode(
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>`,
    ),
    "_rels/.rels": new TextEncoder().encode(
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`,
    ),
    "word/document.xml": new TextEncoder().encode(
      `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${paragraphText}</w:t></w:r></w:p></w:body></w:document>`,
    ),
  });
}

describe("D16 save/reopen recovery", () => {
  it("reopens native DOCX bytes after edit and restores session from committed manifest", () => {
    const store = DocxStore.open(buildMinimalDocx("alpha"));
    const paragraphId = store.getBody().children?.[0]?.id;
    expect(store.patchParagraph(paragraphId!, "beta")).toBe(true);
    const exported = store.exportBytes();
    const reopened = DocxStore.open(exported);
    expect(reopened.getBody().children?.[0]?.children?.[0]?.text).toBe("beta");

    const session = createDocumentSession({
      documentId: "d16-doc",
      kind: "flow",
      revisions: {
        committedRevision: 3,
        persistedRevision: 2,
        materializedRevision: 3,
        exportedRevision: 0,
        sharedRevision: null,
        renderedRevision: 3,
      },
    });
    const mem = new MemoryDomdocBlobStoreStub();
    const saved = session.saveDomdocPackageStubToStore(mem, {
      checkpointBytes: exported,
    });
    expect(saved.simulation.ok).toBe(true);
    const restored = DocumentSession.openFromDomdocManifestStub(saved.manifestBytes);
    expect(restored.documentId).toBe("d16-doc");
    expect(restored.revisions.committedRevision).toBe(3);
    const parsed = parseDomdocPackageManifestStub(saved.manifestBytes);
    expect(parsed.schemaVersion).toBe(1);
    expect(mem.readBlob("source/native-checkpoint.bin")).toEqual(exported);
  });
});
