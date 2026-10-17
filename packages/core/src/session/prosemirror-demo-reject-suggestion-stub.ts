import type { DocxProsemirrorDemoSessionSlice } from "./docx-prosemirror-demo-session-slice.js";
import { DocxStore } from "../formats/docx/docx-store.js";
import { readOpcPackage, writeOpcPackage } from "../formats/docx/opc-package.js";
import { COMMENT_PANEL_ACCEPT_DEFAULT_SUGGESTION_ID } from "../formats/docx/comment-panel-accept-action-stub.js";
import { REVIEW_SUGGESTION_FEATURE_REGISTRY_ID } from "../formats/docx/review-suggestion-accept-reject-stub.js";

/** M3: ProseMirror demo reject suggestion (OPC patch stub, gate not-run). */
export const PROSEMIRROR_DEMO_REJECT_SUGGESTION_FEATURE_ID = REVIEW_SUGGESTION_FEATURE_REGISTRY_ID;

export interface ProsemirrorDemoRejectSuggestionResult {
  featureId: typeof PROSEMIRROR_DEMO_REJECT_SUGGESTION_FEATURE_ID;
  suggestionId: string;
  applied: boolean;
  detail: string;
  opcPatchApplied: boolean;
  slice: DocxProsemirrorDemoSessionSlice;
  trackedStore?: DocxStore;
}

export interface ProsemirrorDemoRejectSuggestionContext {
  slice: DocxProsemirrorDemoSessionSlice;
  trackedStore: DocxStore;
  suggestionId?: string;
}

/** Reject tracked insert/delete via session OPC patch; updates demo slice session. */
export function dispatchProsemirrorDemoRejectSuggestionStub(
  context: ProsemirrorDemoRejectSuggestionContext,
): ProsemirrorDemoRejectSuggestionResult {
  const suggestionId = context.suggestionId ?? COMMENT_PANEL_ACCEPT_DEFAULT_SUGGESTION_ID;
  const pkg = readOpcPackage(context.trackedStore.exportBytes());
  const { session: nextSession, patch } = context.slice.session.applyReviewSuggestionOpcPatch(
    pkg,
    suggestionId,
    "reject",
  );

  if (!patch.decision.applied) {
    return {
      featureId: PROSEMIRROR_DEMO_REJECT_SUGGESTION_FEATURE_ID,
      suggestionId,
      applied: false,
      detail: "review-opc-patch-not-applied",
      opcPatchApplied: false,
      slice: context.slice,
    };
  }

  const nextStore = DocxStore.open(writeOpcPackage(patch.pkg));
  return {
    featureId: PROSEMIRROR_DEMO_REJECT_SUGGESTION_FEATURE_ID,
    suggestionId,
    applied: true,
    detail: "review-opc-patch-reject-applied",
    opcPatchApplied: true,
    slice: { ...context.slice, session: nextSession },
    trackedStore: nextStore,
  };
}
