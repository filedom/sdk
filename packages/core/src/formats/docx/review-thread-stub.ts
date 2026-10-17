/** F18 review threads — read-only stub from word/comments.xml (no editing). */

export interface ReviewCommentStub {
  commentId: string;
  author: string | null;
  parentCommentId: string | null;
}

export interface ReviewThreadStub {
  threadId: string;
  rootCommentId: string;
  commentIds: string[];
  replyCount: number;
  resolved: boolean;
}

const COMMENT_TAG = /<w:comment\b([^>]*)>/g;

function readAttr(attrs: string, localName: string): string | null {
  for (const prefix of [`w:${localName}="`, `${localName}="`]) {
    const idx = attrs.indexOf(prefix);
    if (idx === -1) continue;
    const start = idx + prefix.length;
    const end = attrs.indexOf('"', start);
    if (end === -1) continue;
    return attrs.slice(start, end);
  }
  return null;
}

/** Parse minimal comment metadata for thread grouping (D04 read path). */
export function parseReviewCommentsFromXml(xml: string): ReviewCommentStub[] {
  const comments: ReviewCommentStub[] = [];
  for (const match of xml.matchAll(COMMENT_TAG)) {
    const attrs = match[1] ?? "";
    const commentId = readAttr(attrs, "id");
    if (!commentId) continue;
    comments.push({
      commentId,
      author: readAttr(attrs, "author"),
      parentCommentId:
        readAttr(attrs, "paraIdParent") ?? readAttr(attrs, "parentId"),
    });
  }
  return comments;
}

function findRoot(
  comments: readonly ReviewCommentStub[],
  start: ReviewCommentStub,
): ReviewCommentStub {
  let current = start;
  const byId = new Map(comments.map((c) => [c.commentId, c]));
  for (let guard = 0; guard < 32; guard++) {
    const parentId = current.parentCommentId;
    if (!parentId) return current;
    const parent = byId.get(parentId);
    if (!parent) return current;
    current = parent;
  }
  return current;
}

/** Group comments into thread stubs (one thread per root comment). */
export function buildReviewThreadsFromComments(comments: readonly ReviewCommentStub[]): ReviewThreadStub[] {
  if (comments.length === 0) return [];
  const byRoot = new Map<string, ReviewCommentStub[]>();
  for (const comment of comments) {
    const root = findRoot(comments, comment);
    const bucket = byRoot.get(root.commentId) ?? [];
    bucket.push(comment);
    byRoot.set(root.commentId, bucket);
  }
  const threads: ReviewThreadStub[] = [];
  for (const [rootId, bucket] of byRoot) {
    const commentIds = [...new Set(bucket.map((c) => c.commentId))].sort();
    threads.push({
      threadId: `thread-${rootId}`,
      rootCommentId: rootId,
      commentIds,
      replyCount: Math.max(0, commentIds.length - 1),
      resolved: false,
    });
  }
  return threads.sort((a, b) => a.rootCommentId.localeCompare(b.rootCommentId));
}

export function buildReviewThreadsFromCommentsXml(xml: string): ReviewThreadStub[] {
  return buildReviewThreadsFromComments(parseReviewCommentsFromXml(xml));
}
