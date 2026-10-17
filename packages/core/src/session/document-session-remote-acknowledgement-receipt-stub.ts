import type { SessionRevisions } from "../wire/domain-owned.js";
import { DocumentSession } from "./document-session.js";

/** Blueprint §13.1 — optional remote acknowledgement is distinct from persist/export/shared watermarks (stub). */
export interface DocumentSessionRemoteAcknowledgementReceiptStub {
  receiptKind: "remote-acknowledgement-stub";
  remoteAcknowledgementRevision: number;
  receiptId: string;
  gateStatus: "not-run";
}

export function recordRemoteAcknowledgementReceiptStub(
  revisions: SessionRevisions,
  remoteAcknowledgementRevision: number,
): SessionRevisions {
  const current = revisions.remoteAcknowledgementRevision ?? null;
  if (current !== null && current >= remoteAcknowledgementRevision) {
    return revisions;
  }
  return {
    ...revisions,
    remoteAcknowledgementRevision,
  };
}

/** Record remote provider acknowledgement on session (no network; gate not-run). */
export function applyDocumentSessionRemoteAcknowledgementReceiptStub(
  session: DocumentSession,
  receipt: Pick<DocumentSessionRemoteAcknowledgementReceiptStub, "remoteAcknowledgementRevision" | "receiptId">,
): { session: DocumentSession; receipt: DocumentSessionRemoteAcknowledgementReceiptStub } {
  const nextRevisions = recordRemoteAcknowledgementReceiptStub(
    session.revisions,
    receipt.remoteAcknowledgementRevision,
  );
  return {
    session: new DocumentSession({
      ...session.stub,
      revisions: nextRevisions,
    }),
    receipt: {
      receiptKind: "remote-acknowledgement-stub",
      remoteAcknowledgementRevision: receipt.remoteAcknowledgementRevision,
      receiptId: receipt.receiptId,
      gateStatus: "not-run",
    },
  };
}
