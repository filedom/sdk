import { describe, expect, it } from "vitest";
import { DocumentSession } from "../../session/document-session.js";
import { DocxStore } from "./docx-store.js";
import { buildReviewMinimalTrackedDocxZipBytes } from "./review-minimal-docx-fixture.js";
import { exportDocxTrackChangesFromStoreStub } from "./docx-track-changes-export-stub.js";

describe("F34 DOCX track-changes export stub", () => {
  it("preserves w:ins markers on export", () => {
    const store = DocxStore.open(buildReviewMinimalTrackedDocxZipBytes());
    const session = new DocumentSession({
      documentId: "review-doc",
      kind: "flow",
      revisions: {
        committedRevision: 1,
        persistedRevision: 1,
        materializedRevision: 1,
        exportedRevision: 0,
        sharedRevision: null,
        renderedRevision: 1,
      },
    });
    const { session: after, result } = exportDocxTrackChangesFromStoreStub(store, session);
    expect(result.trackedMarkersPreserved).toBe(true);
    expect(result.zipBytes.byteLength).toBeGreaterThan(100);
    expect(after.revisions.exportedRevision).toBe(1);
  });
});
