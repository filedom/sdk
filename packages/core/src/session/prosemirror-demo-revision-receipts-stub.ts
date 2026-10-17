import type { SessionRevisions } from "../wire/domain-owned.js";

/** Blueprint §13.1 — separate revision watermarks (stub receipts, not host persist). */
export interface ProsemirrorDemoRevisionReceiptsStub {
  committedRevision: number;
  persistedRevision: number;
  exportedRevision: number;
}

export function revisionReceiptsFromSession(
  revisions: SessionRevisions,
): ProsemirrorDemoRevisionReceiptsStub {
  return {
    committedRevision: revisions.committedRevision,
    persistedRevision: revisions.persistedRevision,
    exportedRevision: revisions.exportedRevision,
  };
}

/** Persist receipt stub — sync persisted watermark to committed without export (§13). */
export function recordProsemirrorDemoPersistReceiptStub(
  revisions: SessionRevisions,
): SessionRevisions {
  const committed = revisions.committedRevision;
  if (revisions.persistedRevision >= committed) {
    return revisions;
  }
  return {
    ...revisions,
    materializedRevision: Math.max(revisions.materializedRevision, committed),
    renderedRevision: Math.max(revisions.renderedRevision, committed),
    persistedRevision: committed,
  };
}

/** Export receipt stub — orthogonal to persistedRevision (§13.1). */
export function recordProsemirrorDemoExportReceiptStub(
  revisions: SessionRevisions,
): SessionRevisions {
  if (revisions.exportedRevision >= revisions.committedRevision) {
    return revisions;
  }
  return {
    ...revisions,
    exportedRevision: revisions.committedRevision,
  };
}
