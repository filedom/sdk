import { describe, expect, it } from "vitest";
import { DocumentSession } from "../../session/document-session.js";
import { DocxStore } from "./docx-store.js";
import { readOpcPackage } from "./opc-package.js";
import { buildReviewMinimalTrackedDocxZipBytes } from "./review-minimal-docx-fixture.js";
import {
  exportDocxTrackChangesFromSessionAfterAcceptStub,
  exportDocxTrackChangesFromStoreStub,
  readDocxTrackChangesMarkerSnapshot,
} from "./docx-track-changes-export-stub.js";

describe("F39 DOCX track-changes export stub", () => {
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

  it("after accept, exported bytes drop w:ins and keep plain text", () => {
    const store = DocxStore.open(buildReviewMinimalTrackedDocxZipBytes());
    const priorPkg = readOpcPackage(store.exportBytes());
    const priorXml = new TextDecoder().decode(priorPkg.members.get("word/document.xml")!);
    expect(readDocxTrackChangesMarkerSnapshot(priorXml).hasIns).toBe(true);

    const session = new DocumentSession({
      documentId: "review-doc",
      kind: "flow",
      revisions: {
        committedRevision: 0,
        persistedRevision: 0,
        materializedRevision: 0,
        exportedRevision: 0,
        sharedRevision: null,
        renderedRevision: 0,
      },
    });
    const { markers, documentXml, export: exportResult, session: after } =
      exportDocxTrackChangesFromSessionAfterAcceptStub(store, session, "10");
    expect(exportResult.zipBytes.byteLength).toBeGreaterThan(100);
    expect(documentXml).toContain("Hello ");
    expect(documentXml).toContain("world");
    expect(markers.hasIns).toBe(false);
    expect(markers.insCount).toBe(0);
    expect(documentXml).toContain('domdoc:review-decision id="10" decision="accept"');
    expect(after.revisions.exportedRevision).toBe(1);
    expect(after.revisions.committedRevision).toBe(1);
  });
});
