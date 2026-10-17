/**
 * Web-owned domain types (not generated from engine schema).
 * Render projections are derived from committed session state in format adapters.
 */

export type DocumentKind = "flow" | "fixed" | "raster" | "grid";

/** Semantic revision watermark — authoritative in web only (blueprint §13.1). */
export interface SessionRevisions {
  committedRevision: number;
  persistedRevision: number;
  materializedRevision: number;
  exportedRevision: number;
  sharedRevision: number | null;
  /** Optional remote provider acknowledgement watermark (§13.1 stub). */
  remoteAcknowledgementRevision?: number | null;
  renderedRevision: number;
}

export interface DocumentSessionStub {
  readonly documentId: string;
  readonly kind: DocumentKind;
  readonly revisions: SessionRevisions;
}
