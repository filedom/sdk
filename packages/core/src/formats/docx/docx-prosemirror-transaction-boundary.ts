import type { Node as ProseMirrorNode } from "prosemirror-model";
import type { SessionRevisions } from "../../wire/domain-owned.js";
import { proseMirrorParagraphTexts } from "./docx-prosemirror-projection.js";

/** G2-DOCX-04: read-only boundary stub before real DocumentSession transactions. */
export interface DocxProjectionTransactionStub {
  readonly kind: "docx-projection-sync";
  readonly targetRevision: number;
  readonly paragraphTexts: readonly string[];
}

export function prosemirrorDocToTransactionStub(
  doc: ProseMirrorNode,
  targetRevision: number,
): DocxProjectionTransactionStub {
  return {
    kind: "docx-projection-sync",
    targetRevision,
    paragraphTexts: proseMirrorParagraphTexts(doc),
  };
}

/** Records that a projection sync would advance committed revision (no OPC mutation). */
export function applyProjectionTransactionStub(
  revisions: SessionRevisions,
  stub: DocxProjectionTransactionStub,
): SessionRevisions {
  if (stub.targetRevision <= revisions.committedRevision) {
    return revisions;
  }
  return {
    ...revisions,
    committedRevision: stub.targetRevision,
    materializedRevision: Math.max(revisions.materializedRevision, stub.targetRevision),
    renderedRevision: Math.max(revisions.renderedRevision, stub.targetRevision),
  };
}
