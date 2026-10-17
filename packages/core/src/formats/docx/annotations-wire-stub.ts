import { readCommentsPartStub, type CommentsPartStub } from "./comments-part-stub.js";

/** Feature registry id for comment portability (F20). */
export const ANNOTATIONS_FEATURE_REGISTRY_ID = "F20" as const;

export type AnnotationsWireSurface = "read-only-d04";

/** Wire stub toward F20 — comments part awareness only (no editing). */
export interface AnnotationsWireStub {
  featureId: typeof ANNOTATIONS_FEATURE_REGISTRY_ID;
  comments: CommentsPartStub;
  surface: AnnotationsWireSurface;
}

export function buildAnnotationsWireStubFromOpcMembers(
  members: ReadonlyMap<string, Uint8Array>,
): AnnotationsWireStub {
  return {
    featureId: ANNOTATIONS_FEATURE_REGISTRY_ID,
    comments: readCommentsPartStub(members),
    surface: "read-only-d04",
  };
}
