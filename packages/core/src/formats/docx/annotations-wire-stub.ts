import { readCommentsPartStub, type CommentsPartStub } from "./comments-part-stub.js";
import {
  buildReviewThreadsFromCommentsXml,
  type ReviewThreadStub,
} from "./review-thread-stub.js";

/** Feature registry id for comment portability (F20). */
export const ANNOTATIONS_FEATURE_REGISTRY_ID = "F20" as const;

export type AnnotationsWireSurface = "read-only-d04";

/** Wire stub toward F20 — comments part awareness only (no editing). */
export interface AnnotationsWireStub {
  featureId: typeof ANNOTATIONS_FEATURE_REGISTRY_ID;
  comments: CommentsPartStub;
  /** F18 read-only thread grouping from comments.xml when present. */
  reviewThreads: ReviewThreadStub[];
  surface: AnnotationsWireSurface;
}

export function buildAnnotationsWireStubFromOpcMembers(
  members: ReadonlyMap<string, Uint8Array>,
): AnnotationsWireStub {
  const comments = readCommentsPartStub(members);
  const partBytes = members.get("word/comments.xml");
  const reviewThreads =
    partBytes && comments.present
      ? buildReviewThreadsFromCommentsXml(new TextDecoder().decode(partBytes))
      : [];
  return {
    featureId: ANNOTATIONS_FEATURE_REGISTRY_ID,
    comments,
    reviewThreads,
    surface: "read-only-d04",
  };
}
