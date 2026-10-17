import { describe, expect, it } from "vitest";
import {
  buildReviewThreadsFromCommentsXml,
  parseReviewCommentsFromXml,
} from "./review-thread-stub.js";

describe("F18 review thread stub", () => {
  it("parses standalone comments as single-comment threads", () => {
    const xml = `
      <w:comments>
        <w:comment w:id="0" w:author="Alice"/>
        <w:comment w:id="1" w:author="Bob"/>
      </w:comments>`;
    const threads = buildReviewThreadsFromCommentsXml(xml);
    expect(threads).toHaveLength(2);
    expect(threads[0]?.replyCount).toBe(0);
    expect(threads[1]?.rootCommentId).toBe("1");
  });

  it("groups replies under root when parent id is present", () => {
    const xml = `
      <w:comments>
        <w:comment w:id="10" w:author="Alice"/>
        <w:comment w:id="11" w:author="Bob" w:parentId="10"/>
      </w:comments>`;
    const comments = parseReviewCommentsFromXml(xml);
    expect(comments[1]?.parentCommentId).toBe("10");
    const threads = buildReviewThreadsFromCommentsXml(xml);
    expect(threads).toHaveLength(1);
    expect(threads[0]?.commentIds).toEqual(["10", "11"]);
    expect(threads[0]?.replyCount).toBe(1);
  });
});
