import { describe, expect, it } from "vitest";
import { readOpcPackage } from "./opc-package.js";
import { zipSync } from "fflate";
import {
  applyReviewSuggestionDecisionFromDocumentXml,
  patchDocumentXmlForReviewSuggestionDecision,
} from "./review-suggestion-opc-patch-stub.js";

const TRACKED_DOC = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:ins w:id="10"><w:r><w:t>world</w:t></w:r></w:ins>
    </w:p>
  </w:body>
</w:document>`;

function trackedDocxZip(): Uint8Array {
  return zipSync({
    "word/document.xml": new TextEncoder().encode(TRACKED_DOC),
  });
}

describe("review suggestion OPC patch stub (F34)", () => {
  it("stamps review-decision marker into document.xml", () => {
    const patched = patchDocumentXmlForReviewSuggestionDecision(TRACKED_DOC, "10", "accept");
    expect(patched).toContain('domdoc:review-decision id="10" decision="accept"');
  });

  it("writes patched document.xml into OPC package on accept", () => {
    const pkg = readOpcPackage(trackedDocxZip());
    const result = applyReviewSuggestionDecisionFromDocumentXml(pkg, "10", "accept");
    expect(result.decision.applied).toBe(true);
    expect(result.documentXml).toContain("domdoc:review-decision");
    expect(result.pkg.members.get("word/document.xml")).toBeDefined();
  });
});
