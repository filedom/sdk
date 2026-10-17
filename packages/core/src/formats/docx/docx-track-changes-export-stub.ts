import { DocumentSession } from "../../session/document-session.js";
import { DocxStore } from "./docx-store.js";
import { readOpcPackage, writeOpcPackage } from "./opc-package.js";
import { exportDocxFromStoreStub } from "./docx-export-stub.js";

/** G2/M4 — export DOCX while preserving w:ins / w:del markers (gate not-run). */
export const DOCX_TRACK_CHANGES_EXPORT_FEATURE_ID = "F39" as const;

const TRACKED_MARKERS = /<w:(ins|del)\b/i;
const INS_OPEN = /<w:ins\b/gi;
const DEL_OPEN = /<w:del\b/gi;

export interface DocxTrackChangesMarkerSnapshot {
  hasIns: boolean;
  hasDel: boolean;
  insCount: number;
  delCount: number;
}

export function readDocxTrackChangesMarkerSnapshot(documentXml: string): DocxTrackChangesMarkerSnapshot {
  const insMatches = documentXml.match(INS_OPEN);
  const delMatches = documentXml.match(DEL_OPEN);
  const insCount = insMatches?.length ?? 0;
  const delCount = delMatches?.length ?? 0;
  return {
    hasIns: insCount > 0,
    hasDel: delCount > 0,
    insCount,
    delCount,
  };
}

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

export interface DocxTrackChangesExportAfterAcceptResult {
  session: DocumentSession;
  store: DocxStore;
  export: DocxTrackChangesExportStubResult;
  documentXml: string;
  markers: DocxTrackChangesMarkerSnapshot;
}

/** G2/M4: accept one review suggestion on session, then export bytes for marker inspection. */
export function exportDocxTrackChangesFromSessionAfterAcceptStub(
  store: DocxStore,
  session: DocumentSession,
  suggestionId: string,
): DocxTrackChangesExportAfterAcceptResult {
  const pkg = readOpcPackage(store.exportBytes());
  const { session: sessionAfterAccept, patch } = session.applyReviewSuggestionOpcPatch(
    pkg,
    suggestionId,
    "accept",
  );
  const storeAfterAccept = DocxStore.open(writeOpcPackage(patch.pkg));
  const { session: sessionAfterExport, result: exportResult } = exportDocxTrackChangesFromStoreStub(
    storeAfterAccept,
    sessionAfterAccept,
  );
  const reopened = readOpcPackage(exportResult.zipBytes);
  const documentXml = new TextDecoder().decode(
    reopened.members.get("word/document.xml") ?? new Uint8Array(),
  );
  return {
    session: sessionAfterExport,
    store: storeAfterAccept,
    export: exportResult,
    documentXml,
    markers: readDocxTrackChangesMarkerSnapshot(documentXml),
  };
}
