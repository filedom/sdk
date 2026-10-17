import { DocumentSession } from "../../session/document-session.js";
import type { DocxStore } from "./docx-store.js";
import { readOpcPackage } from "./opc-package.js";

/** G5/M2 — export DOCX bytes from store via fflate-backed OPC writer (gate not-run). */
export const DOCX_EXPORT_FEATURE_REGISTRY_ID = "F02" as const;

export interface DocxExportStubResult {
  featureId: typeof DOCX_EXPORT_FEATURE_REGISTRY_ID;
  zipBytes: Uint8Array;
  memberCount: number;
  exportedRevision: number;
  /** True when reopened package still parses as OPC. */
  roundTripOpcOk: boolean;
}

/** Record export on session by advancing exportedRevision to committedRevision. */
export function recordDocxExportRevision(session: DocumentSession): DocumentSession {
  const rev = session.revisions;
  if (rev.exportedRevision >= rev.committedRevision) {
    return session;
  }
  return new DocumentSession({
    documentId: session.documentId,
    kind: session.stub.kind,
    revisions: {
      ...rev,
      exportedRevision: rev.committedRevision,
    },
  });
}

/** Export store bytes and bind exported revision on the session stub. */
export function exportDocxFromStoreStub(
  store: DocxStore,
  session: DocumentSession,
): { session: DocumentSession; result: DocxExportStubResult } {
  const zipBytes = store.exportBytes();
  let roundTripOpcOk = false;
  let memberCount = 0;
  try {
    const reopened = readOpcPackage(zipBytes);
    memberCount = reopened.members.size;
    roundTripOpcOk = reopened.members.has("word/document.xml");
  } catch {
    roundTripOpcOk = false;
  }
  const sessionAfterExport = recordDocxExportRevision(session);
  return {
    session: sessionAfterExport,
    result: {
      featureId: DOCX_EXPORT_FEATURE_REGISTRY_ID,
      zipBytes,
      memberCount,
      exportedRevision: sessionAfterExport.revisions.exportedRevision,
      roundTripOpcOk,
    },
  };
}
