import { describe, expect, it } from "vitest";
import { createDocumentSession } from "../session/document-session.js";
import { CollaborationProviderOrderedStub } from "./collaboration-provider-ordered-stub.js";

describe("M3 collaboration provider ordered stub (G6)", () => {
  const base = {
    documentId: "collab-doc",
    kind: "flow" as const,
    revisions: {
      committedRevision: 3,
      persistedRevision: 3,
      materializedRevision: 3,
      exportedRevision: 0,
      sharedRevision: null,
      renderedRevision: 3,
    },
  };

  it("delivers monotonic ordered events without Yjs", () => {
    const provider = new CollaborationProviderOrderedStub();
    const a = provider.deliver("peer-joined", "peer-a", null, "stub join");
    const b = provider.deliver("shared-revision", "peer-a", 4, "broadcast");
    expect(a.seq).toBe(1);
    expect(b.seq).toBe(2);
    const snap = provider.snapshot();
    expect(snap.canonicalModel).toBe("web-session-stub-only");
    expect(snap.events).toHaveLength(2);
  });

  it("updates sharedRevision on DocumentSession via ordered stub", () => {
    const provider = new CollaborationProviderOrderedStub();
    const session = createDocumentSession(base);
    const next = provider.applySharedRevisionToSession(session, 5);
    expect(next.revisions.sharedRevision).toBe(5);
    expect(provider.snapshot().events.at(-1)?.kind).toBe("shared-revision");
  });
});
