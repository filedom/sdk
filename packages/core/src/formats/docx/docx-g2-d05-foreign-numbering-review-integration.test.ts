import { describe, expect, it } from "vitest";
import { readOpcPackage, writeOpcPackage } from "./opc-package.js";
import {
  buildWordCompatibleNumberingXml,
  parseNumberingNumIds,
} from "./docx-numbering-ooxml-roundtrip.js";
import { mergeForeignNumberingPart } from "./docx-numbering-foreign-merge.js";
import { applyDocxNumberingWriteBackFromSession } from "./docx-numbering-body-writeback.js";
import { buildReviewMinimalTrackedDocxZipBytes } from "./review-minimal-docx-fixture.js";
import { applyReviewSuggestionDecisionFromDocumentXml } from "./review-suggestion-opc-patch-stub.js";
import { createDocumentSession } from "../../session/document-session.js";

/** G2 gate-grade slice: D05 foreign numbering merge + F34 review accept on same OPC package. */
describe("G2-DOCX-21 D05 foreign numbering + review accept integration", () => {
  it("D05-DRT-12 foreign merge then review accept round-trips document.xml bytes", () => {
    const baseNumbering = buildWordCompatibleNumberingXml(2, [
      { ilvl: 0, numFmt: "decimal", lvlText: "%1.", start: 1 },
    ]);
    const foreignNumbering = buildWordCompatibleNumberingXml(2, [
      { ilvl: 0, numFmt: "bullet", lvlText: "•", start: 1 },
    ]);
    const merged = mergeForeignNumberingPart(baseNumbering, foreignNumbering);
    expect(parseNumberingNumIds(merged.numberingXml).sort((a, b) => a - b)).toEqual([2, 3]);
    expect(merged.numIdRemap[2]).toBe(3);

    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="3"/></w:numPr></w:pPr>
      <w:r><w:t>merged item</w:t></w:r></w:p>
    <w:p>
      <w:r><w:t>Hello </w:t></w:r>
      <w:ins w:id="10" w:author="Reviewer" w:date="2026-01-01T00:00:00Z">
        <w:r><w:t>world</w:t></w:r>
      </w:ins>
    </w:p>
  </w:body>
</w:document>`;

    let pkg = readOpcPackage(buildReviewMinimalTrackedDocxZipBytes());
    pkg.members.set("word/document.xml", new TextEncoder().encode(documentXml));
    pkg.members.set("word/numbering.xml", new TextEncoder().encode(merged.numberingXml));

    const session = createDocumentSession({
      documentId: "g2-d05-review",
      kind: "flow",
      revisions: {
        committedRevision: 0,
        persistedRevision: 0,
        materializedRevision: 0,
        exportedRevision: 0,
        sharedRevision: null,
        renderedRevision: 0,
      },
    });
    const { session: afterReview, patch } = session.applyReviewSuggestionOpcPatch(pkg, "10", "accept");
    expect(patch.decision.applied).toBe(true);
    expect(patch.documentXml).toContain('domdoc:review-decision id="10" decision="accept"');
    expect(afterReview.revisions.committedRevision).toBe(1);

    expect(patch.documentXml).toContain("domdoc:review-decision");

    const numbered = applyDocxNumberingWriteBackFromSession(patch.pkg, [
      { text: "merged item", numId: 3, ilvl: 0 },
      { text: "Hello world", numId: 0, ilvl: 0 },
    ]);

    const outBytes = writeOpcPackage(numbered);
    const reopened = readOpcPackage(outBytes);
    const xml = new TextDecoder().decode(reopened.members.get("word/document.xml")!);
    expect(xml).toContain("Hello world");
    expect(xml).toContain("<w:numId w:val=\"3\"");
    expect(parseNumberingNumIds(
      new TextDecoder().decode(reopened.members.get("word/numbering.xml")!),
    ).sort((a, b) => a - b)).toEqual([2, 3]);
  });

  it("D05-DRT-13 track changes + numbering combined on one document.xml", () => {
    const numberingXml = buildWordCompatibleNumberingXml(1, [
      { ilvl: 0, numFmt: "decimal", lvlText: "%1.", start: 1 },
    ]);
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>
      <w:r><w:t>Item </w:t></w:r>
      <w:ins w:id="11" w:author="Reviewer" w:date="2026-01-02T00:00:00Z">
        <w:r><w:t>one</w:t></w:r>
      </w:ins>
    </w:p>
    <w:p>
      <w:r><w:t>Body </w:t></w:r>
      <w:del w:id="12" w:author="Reviewer" w:date="2026-01-02T00:00:00Z">
        <w:r><w:delText>old</w:delText></w:r>
      </w:del>
      <w:ins w:id="13" w:author="Reviewer" w:date="2026-01-02T00:00:00Z">
        <w:r><w:t>new</w:t></w:r>
      </w:ins>
    </w:p>
  </w:body>
</w:document>`;

    let pkg = readOpcPackage(buildReviewMinimalTrackedDocxZipBytes());
    pkg.members.set("word/document.xml", new TextEncoder().encode(documentXml));
    pkg.members.set("word/numbering.xml", new TextEncoder().encode(numberingXml));

    const session = createDocumentSession({
      documentId: "g2-d05-drt-13",
      kind: "flow",
      revisions: {
        committedRevision: 0,
        persistedRevision: 0,
        materializedRevision: 0,
        exportedRevision: 0,
        sharedRevision: null,
        renderedRevision: 0,
      },
    });
    const { patch } = session.applyReviewSuggestionOpcPatch(pkg, "11", "accept");
    expect(patch.decision.applied).toBe(true);
    expect(patch.documentXml).toContain('domdoc:review-decision id="11" decision="accept"');

    const numbered = applyDocxNumberingWriteBackFromSession(patch.pkg, [
      { text: "Item one", numId: 1, ilvl: 0 },
      { text: "Body new", numId: 0, ilvl: 0 },
    ]);
    const xml = new TextDecoder().decode(numbered.members.get("word/document.xml")!);
    expect(xml).toContain("<w:numId w:val=\"1\"");
    expect(xml).toContain("Item one");
    expect(xml).not.toContain("w:ins");
  });

  it("review accept on D05 minimal tracked fixture remains compatible with foreign merge registry", () => {
    const zip = buildReviewMinimalTrackedDocxZipBytes();
    const pkg = readOpcPackage(zip);
    const session = createDocumentSession({
      documentId: "g2-d05-tracked",
      kind: "flow",
      revisions: {
        committedRevision: 0,
        persistedRevision: 0,
        materializedRevision: 0,
        exportedRevision: 0,
        sharedRevision: null,
        renderedRevision: 0,
      },
    });
    const { patch } = session.applyReviewSuggestionOpcPatch(pkg, "10", "accept");
    expect(patch.decision.applied).toBe(true);
    const roundTrip = writeOpcPackage(patch.pkg);
    expect(roundTrip.byteLength).toBeGreaterThan(500);
    expect(new TextDecoder().decode(readOpcPackage(roundTrip).members.get("word/document.xml")!)).toContain(
      "Hello",
    );
  });
});
