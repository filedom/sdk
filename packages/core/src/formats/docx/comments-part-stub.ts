/** Read-only comments part awareness (D04 stub; no comment editing). */

export interface CommentsPartStub {
  present: boolean;
  partPath: "word/comments.xml";
  commentCount: number;
}

const COMMENT_OPEN = /<w:comment\b/g;

export function readCommentsPartStub(
  members: ReadonlyMap<string, Uint8Array>,
): CommentsPartStub {
  const partPath = "word/comments.xml" as const;
  const bytes = members.get(partPath);
  if (!bytes) {
    return { present: false, partPath, commentCount: 0 };
  }
  const xml = new TextDecoder().decode(bytes);
  const commentCount = [...xml.matchAll(COMMENT_OPEN)].length;
  return { present: true, partPath, commentCount };
}
