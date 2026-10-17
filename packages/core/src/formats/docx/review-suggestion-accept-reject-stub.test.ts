import { describe, expect, it } from "vitest";
import {
  applyReviewSuggestionDecisionStub,
  parseReviewSuggestionMarksFromDocumentXml,
} from "./review-suggestion-accept-reject-stub.js";

const TRACKED_DOC = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r><w:t>Hello </w:t></w:r>
      <w:ins w:id="10"><w:r><w:t>world</w:t></w:r></w:ins>
      <w:del w:id="11"><w:r><w:t>old</w:t></w:r></w:del>
    </w:p>
  </w:body>
</w:document>`;

describe("review suggestion accept/reject stub (F34)", () => {
  it("parses insert/delete suggestion marks", () => {
    const marks = parseReviewSuggestionMarksFromDocumentXml(TRACKED_DOC);
    expect(marks).toHaveLength(2);
    expect(marks.find((m) => m.suggestionId === "10")).toMatchObject({
      kind: "insert",
      text: "world",
    });
  });

  it("accept insert keeps text in resulting plain ledger", () => {
    const marks = parseReviewSuggestionMarksFromDocumentXml(TRACKED_DOC);
    const result = applyReviewSuggestionDecisionStub(marks, "10", "accept");
    expect(result.applied).toBe(true);
    expect(result.remainingMarks.some((m) => m.suggestionId === "10")).toBe(false);
  });

  it("reject insert removes pending insertion mark", () => {
    const marks = parseReviewSuggestionMarksFromDocumentXml(TRACKED_DOC);
    const result = applyReviewSuggestionDecisionStub(marks, "10", "reject");
    expect(result.applied).toBe(true);
    expect(result.remainingMarks.some((m) => m.suggestionId === "10")).toBe(false);
  });
});
