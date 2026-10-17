import { describe, expect, it } from "vitest";
import { parseDocumentBodyXml } from "./ooxml-tree.js";
import { buildProseMirrorDocFromOoxmlBody } from "./docx-prosemirror-projection.js";
import {
  applyProjectionTransactionStub,
  prosemirrorDocToTransactionStub,
} from "./docx-prosemirror-transaction-boundary.js";

describe("G2-DOCX-04 ProseMirror transaction boundary stub", () => {
  it("maps ProseMirror doc to a projection-sync stub", () => {
    const body = parseDocumentBodyXml(`<w:body>
      <w:p><w:r><w:t>One</w:t></w:r></w:p>
      <w:p><w:r><w:t>Two</w:t></w:r></w:p>
    </w:body>`);
    const doc = buildProseMirrorDocFromOoxmlBody(body);
    const stub = prosemirrorDocToTransactionStub(doc, 2);
    expect(stub.kind).toBe("docx-projection-sync");
    expect(stub.paragraphTexts).toEqual(["One", "Two"]);
    expect(stub.listMarkers).toEqual(["", ""]);
    expect(stub.listNumIds).toEqual([0, 0]);
    expect(stub.listIlvls).toEqual([0, 0]);
    expect(stub.targetRevision).toBe(2);
  });

  it("advances session revisions without mutating store", () => {
    const revisions = {
      committedRevision: 1,
      persistedRevision: 1,
      materializedRevision: 1,
      exportedRevision: 0,
      sharedRevision: null,
      renderedRevision: 1,
    };
    const next = applyProjectionTransactionStub(revisions, {
      kind: "docx-projection-sync",
      targetRevision: 3,
      paragraphTexts: ["x"],
      listMarkers: [""],
      listNumIds: [0],
      listIlvls: [0],
    });
    expect(next.committedRevision).toBe(3);
    expect(next.renderedRevision).toBe(3);
  });
});
