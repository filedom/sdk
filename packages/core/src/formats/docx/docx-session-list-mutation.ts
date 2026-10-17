import type { SessionRevisions } from "../../wire/domain-owned.js";

/** G2-DOCX-05: list renumber slice before OPC numbering.xml mutation. */
export interface DocxListRenumberMutation {
  readonly kind: "docx-list-renumber-stub";
  readonly numId: number;
  readonly markers: readonly string[];
}

export function applyDocxListRenumberStub(
  revisions: SessionRevisions,
  mutation: DocxListRenumberMutation,
): SessionRevisions {
  if (mutation.markers.length === 0) return revisions;
  const nextRevision = revisions.committedRevision + 1;
  return {
    ...revisions,
    committedRevision: nextRevision,
    materializedRevision: Math.max(revisions.materializedRevision, nextRevision),
    renderedRevision: Math.max(revisions.renderedRevision, nextRevision),
  };
}
