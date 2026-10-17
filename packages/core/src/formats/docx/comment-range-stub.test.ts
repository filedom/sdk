import { describe, expect, it } from "vitest";
import { parseCommentRangesFromDocumentXml } from "./comment-range-stub.js";

describe("D04 comment ranges crossing paragraphs", () => {
  it("records start/end paragraph indices for a range spanning two paragraphs", () => {
    const xml = `<w:body>
      <w:p><w:commentRangeStart w:id="7"/><w:r><w:t>a</w:t></w:r></w:p>
      <w:p><w:r><w:t>b</w:t></w:r><w:commentRangeEnd w:id="7"/></w:p>
    </w:body>`;
    const ranges = parseCommentRangesFromDocumentXml(xml);
    expect(ranges).toEqual([
      { commentId: "7", startParagraphIndex: 0, endParagraphIndex: 1 },
    ]);
  });
});
