/** D04: comment ranges that cross runs/paragraphs (read path). */

export interface CommentRangeStub {
  commentId: string;
  startParagraphIndex: number;
  endParagraphIndex: number;
}

const RANGE_START = /<w:commentRangeStart[^>]*\sw:id="(\d+)"/g;
const RANGE_END = /<w:commentRangeEnd[^>]*\sw:id="(\d+)"/g;

export function parseCommentRangesFromDocumentXml(xml: string): readonly CommentRangeStub[] {
  const paragraphs = [...xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)].map((m) => m[0] ?? "");
  const starts = new Map<string, number>();
  const ends = new Map<string, number>();
  for (const [index, paragraph] of paragraphs.entries()) {
    for (const match of paragraph.matchAll(RANGE_START)) {
      const id = match[1];
      if (id && !starts.has(id)) starts.set(id, index);
    }
    for (const match of paragraph.matchAll(RANGE_END)) {
      const id = match[1];
      if (id) ends.set(id, index);
    }
  }
  return [...starts.entries()].map(([commentId, startParagraphIndex]) => ({
    commentId,
    startParagraphIndex,
    endParagraphIndex: ends.get(commentId) ?? startParagraphIndex,
  }));
}
