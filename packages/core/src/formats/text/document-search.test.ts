import { describe, expect, it } from "vitest";
import {
  nextSearchHit,
  previousSearchHit,
  searchDocumentParagraphs,
} from "./document-search.js";

describe("F11 document search", () => {
  const index = { paragraphTexts: ["Hello world", "world peace", "WORLD"] };

  it("finds case-insensitive matches with snippets", () => {
    const hits = searchDocumentParagraphs(index, "world");
    expect(hits).toHaveLength(3);
    expect(hits[0]?.paragraphIndex).toBe(0);
    expect(hits[0]?.snippet.toLowerCase()).toContain("world");
  });

  it("respects whole-word and case-sensitive options", () => {
    expect(searchDocumentParagraphs(index, "world", { caseSensitive: true })).toHaveLength(2);
    expect(searchDocumentParagraphs({ paragraphTexts: ["worldwide"] }, "world", { wholeWord: true })).toHaveLength(0);
  });

  it("navigates next/previous wrapping", () => {
    const hits = searchDocumentParagraphs(index, "world");
    expect(nextSearchHit(hits, 2)?.paragraphIndex).toBe(0);
    expect(previousSearchHit(hits, 0)?.paragraphIndex).toBe(2);
  });
});
