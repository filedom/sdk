import type { DocumentSessionStub, SessionRevisions } from "../wire/domain-owned.js";
import { DocumentSession } from "../session/document-session.js";

/** M3/G6 ordered delivery stub — no Yjs canonical model. */
export const COLLABORATION_ORDERED_STUB_FEATURE_ID = "G6-COLLAB-01" as const;

export type CollaborationOrderedStubEventKind =
  | "peer-joined"
  | "shared-revision"
  | "projection-echo";

export interface CollaborationOrderedStubEvent {
  seq: number;
  kind: CollaborationOrderedStubEventKind;
  peerId: string;
  sharedRevision: number | null;
  note: string;
}

export interface CollaborationProviderOrderedStubState {
  readonly featureId: typeof COLLABORATION_ORDERED_STUB_FEATURE_ID;
  readonly events: readonly CollaborationOrderedStubEvent[];
  readonly canonicalModel: "web-session-stub-only";
}

/** Deterministic ordered fan-out for collaboration feasibility (stub). */
export class CollaborationProviderOrderedStub {
  private seq = 0;
  private readonly log: CollaborationOrderedStubEvent[] = [];

  deliver(
    kind: CollaborationOrderedStubEventKind,
    peerId: string,
    sharedRevision: number | null,
    note: string,
  ): CollaborationOrderedStubEvent {
    const event: CollaborationOrderedStubEvent = {
      seq: ++this.seq,
      kind,
      peerId,
      sharedRevision,
      note,
    };
    this.log.push(event);
    return event;
  }

  snapshot(): CollaborationProviderOrderedStubState {
    return {
      featureId: COLLABORATION_ORDERED_STUB_FEATURE_ID,
      events: [...this.log],
      canonicalModel: "web-session-stub-only",
    };
  }

  /** Apply shared revision watermark on session stub (ordered stub path). */
  applySharedRevisionToSession(
    session: DocumentSession,
    sharedRevision: number,
  ): DocumentSession {
    this.deliver("shared-revision", "local", sharedRevision, "session watermark");
    const stub: DocumentSessionStub = {
      documentId: session.documentId,
      kind: session.stub.kind,
      revisions: withSharedRevision(session.stub.revisions, sharedRevision),
    };
    return new DocumentSession(stub);
  }
}

function withSharedRevision(revisions: SessionRevisions, sharedRevision: number): SessionRevisions {
  return { ...revisions, sharedRevision };
}
