import { describe, expect, it } from "vitest";
import { createDocumentSession } from "../../session/document-session.js";
import { DocxStore } from "./docx-store.js";
import { getMemberUtf8, readOpcPackage } from "./opc-package.js";
import { buildReviewMinimalTrackedDocxZipBytes } from "./review-minimal-docx-fixture.js";
import {
  COMMENT_PANEL_ACCEPT_ACTION_FEATURE_ID,
  COMMENT_PANEL_ACCEPT_DEFAULT_SUGGESTION_ID,
  dispatchCommentPanelAcceptAction,
} from "./comment-panel-accept-action-stub.js";

const sessionStub = {
  documentId: "demo",
  kind: "flow" as const,
  revisions: {
    committedRevision: 0,
    persistedRevision: 0,
    materializedRevision: 0,
    exportedRevision: 0,
    sharedRevision: null,
    renderedRevision: 0,
  },
};

describe("M2/F20 comment panel accept → review OPC patch", () => {
  it("applies accept on minimal tracked DOCX via session.applyReviewSuggestionOpcPatch", () => {
    const session = createDocumentSession(sessionStub);
    const store = DocxStore.open(buildReviewMinimalTrackedDocxZipBytes());
    const result = dispatchCommentPanelAcceptAction("0", { session, trackedStore: store });
    expect(result.featureId).toBe(COMMENT_PANEL_ACCEPT_ACTION_FEATURE_ID);
    expect(result.applied).toBe(true);
    expect(result.opcPatchApplied).toBe(true);
    expect(result.reviewSuggestionId).toBe(COMMENT_PANEL_ACCEPT_DEFAULT_SUGGESTION_ID);
    expect(result.detail).toBe("review-opc-patch-applied");
    expect(result.resultingPlainText).toBe("");
    expect(result.nextStore!.getBody().children?.[0]?.children?.[0]?.text).toBe("Hello world");
    expect(result.nextStore).toBeDefined();
    expect(result.nextSession?.revisions.committedRevision).toBe(1);
    const pkg = readOpcPackage(result.nextStore!.exportBytes());
    const docXml = getMemberUtf8(pkg, "word/document.xml");
    expect(docXml).toContain('domdoc:review-decision id="10" decision="accept"');
  });

  it("rejects empty comment id", () => {
    const result = dispatchCommentPanelAcceptAction("  ");
    expect(result.applied).toBe(false);
    expect(result.detail).toBe("missing-comment-id");
  });

  it("requires review context for OPC patch", () => {
    const result = dispatchCommentPanelAcceptAction("0");
    expect(result.applied).toBe(false);
    expect(result.detail).toBe("missing-review-opc-context");
  });
});
