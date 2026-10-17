import { describe, expect, it } from "vitest";
import { MemoryDomdocBlobStoreStub } from "../persistence/domdoc-package-stub.js";
import { buildDemoDocxZipBytes } from "./docx-prosemirror-demo-session-slice.js";
import { openDocxProsemirrorDemoSessionSlice } from "./docx-prosemirror-demo-session-slice.js";
import {
  loadProsemirrorDemoDomdocPackageStub,
  saveProsemirrorDemoDomdocPackageStub,
} from "./docx-prosemirror-domdoc-package-stub.js";

const sessionStub = {
  documentId: "domdoc-demo",
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

describe("prosemirror domdoc package stub (F21/G5)", () => {
  it("round-trips embedded DOCX through .domdoc stub zip", () => {
    const slice = openDocxProsemirrorDemoSessionSlice(
      buildDemoDocxZipBytes("hello domdoc"),
      sessionStub,
    );
    const store = new MemoryDomdocBlobStoreStub();
    const saved = saveProsemirrorDemoDomdocPackageStub(slice, store);
    expect(saved.simulation.ok).toBe(true);
    const reopened = loadProsemirrorDemoDomdocPackageStub(saved.packageZipBytes);
    expect(reopened).not.toBeNull();
    expect(reopened!.session.documentId).toBe("domdoc-demo");
    expect(reopened!.store.getBody().children.length).toBeGreaterThan(0);
  });
});
