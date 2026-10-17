import { ANNOTATIONS_FEATURE_REGISTRY_ID } from "./annotations-wire-stub.js";
import { DocxStore } from "./docx-store.js";
import { readOpcPackage, writeOpcPackage } from "./opc-package.js";
import type { ReviewSuggestionOpcPatchResult } from "./review-suggestion-opc-patch-stub.js";
import type { DocumentSession } from "../../session/document-session.js";

/** M2/F20: comments panel accept → review OPC patch on minimal tracked fixture. */
export const COMMENT_PANEL_ACCEPT_ACTION_FEATURE_ID = ANNOTATIONS_FEATURE_REGISTRY_ID;

export const COMMENT_PANEL_ACCEPT_DEFAULT_SUGGESTION_ID = "10" as const;

export type CommentPanelAcceptActionKind = "accept-review-opc-patch";

export interface CommentPanelAcceptActionResult {
  featureId: typeof COMMENT_PANEL_ACCEPT_ACTION_FEATURE_ID;
  commentId: string;
  action: CommentPanelAcceptActionKind;
  applied: boolean;
  detail: string;
  reviewSuggestionId?: string;
  opcPatchApplied?: boolean;
  resultingPlainText?: string;
  nextSession?: DocumentSession;
  nextStore?: DocxStore;
}

export interface CommentPanelAcceptReviewOpcContext {
  session: DocumentSession;
  trackedStore: DocxStore;
  /** Defaults to minimal fixture insert id `10`. */
  reviewSuggestionId?: string;
}

/** Accept comment panel action: apply review suggestion OPC patch when store context provided. */
export function dispatchCommentPanelAcceptAction(
  commentId: string,
  reviewContext?: CommentPanelAcceptReviewOpcContext,
): CommentPanelAcceptActionResult {
  const trimmed = commentId.trim();
  if (!trimmed) {
    return {
      featureId: COMMENT_PANEL_ACCEPT_ACTION_FEATURE_ID,
      commentId: "",
      action: "accept-review-opc-patch",
      applied: false,
      detail: "missing-comment-id",
    };
  }

  if (!reviewContext) {
    return {
      featureId: COMMENT_PANEL_ACCEPT_ACTION_FEATURE_ID,
      commentId: trimmed,
      action: "accept-review-opc-patch",
      applied: false,
      detail: "missing-review-opc-context",
    };
  }

  const suggestionId = reviewContext.reviewSuggestionId ?? COMMENT_PANEL_ACCEPT_DEFAULT_SUGGESTION_ID;
  const pkg = readOpcPackage(reviewContext.trackedStore.exportBytes());
  const { session: nextSession, patch } = reviewContext.session.applyReviewSuggestionOpcPatch(
    pkg,
    suggestionId,
    "accept",
  );

  if (!patch.decision.applied) {
    return {
      featureId: COMMENT_PANEL_ACCEPT_ACTION_FEATURE_ID,
      commentId: trimmed,
      action: "accept-review-opc-patch",
      applied: false,
      detail: "review-opc-patch-not-applied",
      reviewSuggestionId: suggestionId,
      opcPatchApplied: false,
    };
  }

  const nextStore = DocxStore.open(writeOpcPackage(patch.pkg));
  return {
    featureId: COMMENT_PANEL_ACCEPT_ACTION_FEATURE_ID,
    commentId: trimmed,
    action: "accept-review-opc-patch",
    applied: true,
    detail: "review-opc-patch-applied",
    reviewSuggestionId: suggestionId,
    opcPatchApplied: true,
    resultingPlainText: patch.decision.resultingPlainText,
    nextSession,
    nextStore,
  };
}

export type CommentPanelAcceptReviewOpcPatchResult = ReviewSuggestionOpcPatchResult;
