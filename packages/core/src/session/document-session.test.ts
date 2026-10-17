import { describe, expect, it } from "vitest";
import { createDocumentSession } from "./document-session.js";
import { createDomdocPackageManifestStub } from "../persistence/domdoc-package-stub.js";

describe("M1 DocumentSession skeleton", () => {
  const base = {
    documentId: "doc-1",
    kind: "flow" as const,
    revisions: {
      committedRevision: 1,
      persistedRevision: 0,
      materializedRevision: 1,
      exportedRevision: 0,
      sharedRevision: null,
      renderedRevision: 1,
    },
  };

  it("commits projection stub revisions", () => {
    const session = createDocumentSession(base);
    const next = session.commitDocxProjectionStub({
      kind: "docx-projection-sync",
      targetRevision: 2,
      paragraphTexts: ["a"],
      listMarkers: [""],
    });
    expect(next.revisions.committedRevision).toBe(2);
  });

  it("builds domdoc package manifest stub", () => {
    const manifest = createDomdocPackageManifestStub(base);
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.documentId).toBe("doc-1");
  });
});
