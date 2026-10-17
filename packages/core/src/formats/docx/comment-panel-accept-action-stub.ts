import { ANNOTATIONS_FEATURE_REGISTRY_ID } from "./annotations-wire-stub.js";

/** M2/F20: comments panel accept action (stub — records intent, no OPC mutation). */
export const COMMENT_PANEL_ACCEPT_ACTION_FEATURE_ID = ANNOTATIONS_FEATURE_REGISTRY_ID;

export type CommentPanelAcceptActionKind = "accept-stub";

export interface CommentPanelAcceptActionResult {
  featureId: typeof COMMENT_PANEL_ACCEPT_ACTION_FEATURE_ID;
  commentId: string;
  action: CommentPanelAcceptActionKind;
  applied: boolean;
  detail: string;
}

export function dispatchCommentPanelAcceptAction(
  commentId: string,
): CommentPanelAcceptActionResult {
  const trimmed = commentId.trim();
  if (!trimmed) {
    return {
      featureId: COMMENT_PANEL_ACCEPT_ACTION_FEATURE_ID,
      commentId: "",
      action: "accept-stub",
      applied: false,
      detail: "missing-comment-id",
    };
  }
  return {
    featureId: COMMENT_PANEL_ACCEPT_ACTION_FEATURE_ID,
    commentId: trimmed,
    action: "accept-stub",
    applied: true,
    detail: "accept-recorded-no-opc-mutation",
  };
}
