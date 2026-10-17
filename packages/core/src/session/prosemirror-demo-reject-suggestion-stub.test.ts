import { describe, expect, it } from "vitest";
import { DocxStore } from "../formats/docx/docx-store.js";
import { getMemberUtf8, readOpcPackage } from "../formats/docx/opc-package.js";
import { buildReviewMinimalTrackedDocxZipBytes } from "../formats/docx/review-minimal-docx-fixture.js";
import {
  buildDemoDocxZipBytes,
  openDocxProsemirrorDemoSessionSlice,
} from "./docx-prosemirror-demo-session-slice.js";
import {
  dispatchProsemirrorDemoRejectSuggestionStub,
  PROSEMIRROR_DEMO_REJECT_SUGGESTION_FEATURE_ID,
} from "./prosemirror-demo-reject-suggestion-stub.js";

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

describe("ProseMirror demo reject suggestion (M3/F34)", () => {
  it("rejects tracked insert via OPC patch and stamps decision marker", () => {
    const slice = openDocxProsemirrorDemoSessionSlice(buildDemoDocxZipBytes("start"), sessionStub);
    const trackedStore = DocxStore.open(buildReviewMinimalTrackedDocxZipBytes());
    const result = dispatchProsemirrorDemoRejectSuggestionStub({ slice, trackedStore });
    expect(result.featureId).toBe(PROSEMIRROR_DEMO_REJECT_SUGGESTION_FEATURE_ID);
    expect(result.applied).toBe(true);
    expect(result.opcPatchApplied).toBe(true);
    expect(result.detail).toBe("review-opc-patch-reject-applied");
    const pkg = readOpcPackage(result.trackedStore!.exportBytes());
    const docXml = getMemberUtf8(pkg, "word/document.xml");
    expect(docXml).toContain('domdoc:review-decision id="10" decision="reject"');
    expect(docXml).not.toMatch(/<w:ins\b/);
  });
});
