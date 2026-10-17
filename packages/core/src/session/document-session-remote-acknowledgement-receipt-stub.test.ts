import { describe, expect, it } from "vitest";
import { createDocumentSession } from "./document-session.js";
import { applyDocumentSessionRemoteAcknowledgementReceiptStub } from "./document-session-remote-acknowledgement-receipt-stub.js";

describe("DocumentSession remote acknowledgement receipt stub (§13.1)", () => {
  const base = {
    documentId: "doc-remote-ack",
    kind: "flow" as const,
    revisions: {
      committedRevision: 3,
      persistedRevision: 2,
      materializedRevision: 2,
      exportedRevision: 1,
      sharedRevision: null,
      renderedRevision: 3,
    },
  };

  it("advances remoteAcknowledgementRevision without mutating committedRevision", () => {
    const session = createDocumentSession(base);
    const { session: next, receipt } = applyDocumentSessionRemoteAcknowledgementReceiptStub(
      session,
      { remoteAcknowledgementRevision: 3, receiptId: "remote-stub-1" },
    );
    expect(next.revisions.committedRevision).toBe(3);
    expect(next.revisions.remoteAcknowledgementRevision).toBe(3);
    expect(receipt.gateStatus).toBe("not-run");
  });

  it("ignores stale remote acknowledgement revisions", () => {
    const session = createDocumentSession({
      ...base,
      revisions: { ...base.revisions, remoteAcknowledgementRevision: 5 },
    });
    const { session: next } = applyDocumentSessionRemoteAcknowledgementReceiptStub(session, {
      remoteAcknowledgementRevision: 4,
      receiptId: "remote-stub-stale",
    });
    expect(next.revisions.remoteAcknowledgementRevision).toBe(5);
  });
});
