import { DocumentSession } from "../../session/document-session.js";
import type { DocxStore } from "./docx-store.js";
import { readOpcPackage } from "./opc-package.js";
import { exportDocxFromStoreStub } from "./docx-export-stub.js";

/** G2/M4 — export DOCX while preserving w:ins / w:del markers (gate not-run). */
export const DOCX_TRACK_CHANGES_EXPORT_FEATURE_ID = "F34" as const;

const TRACKED_MARKERS = /<w:(ins|del)\b/i;

export interface DocxTrackChangesExportStubResult {
  featureId: typeof DOCX_TRACK_CHANGES_EXPORT_FEATURE_ID;
  zipBytes: Uint8Array;
  exportedRevision: number;
  /** True when document.xml still contains tracked-change tags after export. */
  trackedMarkersPreserved: boolean;
  memberCount: number;
}

/** Export bytes and report whether tracked-change markup survived the OPC round-trip. */
export function exportDocxTrackChangesFromStoreStub(
  store: DocxStore,
  session: DocumentSession,
): { session: DocumentSession; result: DocxTrackChangesExportStubResult } {
  const { session: sessionAfterExport, result: base } = exportDocxFromStoreStub(store, session);
  let trackedMarkersPreserved = false;
  try {
    const reopened = readOpcPackage(base.zipBytes);
    const documentXml = reopened.members.get("word/document.xml");
    if (documentXml) {
      const text = new TextDecoder().decode(documentXml);
      trackedMarkersPreserved = TRACKED_MARKERS.test(text);
    }
  } catch {
    trackedMarkersPreserved = false;
  }
  return {
    session: sessionAfterExport,
    result: {
      featureId: DOCX_TRACK_CHANGES_EXPORT_FEATURE_ID,
      zipBytes: base.zipBytes,
      exportedRevision: base.exportedRevision,
      trackedMarkersPreserved,
      memberCount: base.memberCount,
    },
  };
}
