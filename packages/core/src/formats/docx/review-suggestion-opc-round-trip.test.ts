import { describe, expect, it } from "vitest";
import { zipSync, unzipSync } from "fflate";
import { readOpcPackage, writeOpcPackage } from "./opc-package.js";
import { applyReviewSuggestionDecisionFromDocumentXml } from "./review-suggestion-opc-patch-stub.js";

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

describe("F34 review accept OPC atomic round-trip bytes", () => {
  it("accept review patches document.xml and round-trips zip bytes", () => {
    const beforeBytes = trackedDocxZip();
    const pkg = readOpcPackage(beforeBytes);
    const result = applyReviewSuggestionDecisionFromDocumentXml(pkg, "10", "accept");
    expect(result.decision.applied).toBe(true);
    const afterBytes = writeOpcPackage(result.pkg);
    expect(afterBytes.byteLength).toBeGreaterThan(beforeBytes.byteLength);
    const reopened = readOpcPackage(afterBytes);
    const xml = new TextDecoder().decode(reopened.members.get("word/document.xml")!);
    expect(xml).toContain('domdoc:review-decision id="10" decision="accept"');
    const roundTripAgain = writeOpcPackage(reopened);
    expect(unzipSync(roundTripAgain)["word/document.xml"]).toEqual(
      unzipSync(afterBytes)["word/document.xml"],
    );
  });
});
