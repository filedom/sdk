import { zipSync, unzipSync } from "fflate";
import {
  createDomdocPackagePersistPlanStub,
  MemoryDomdocBlobStoreStub,
  parseDomdocPackageManifestStub,
  serializeDomdocPackageManifestStub,
  type DomdocStagedWriteSimulationResult,
} from "../persistence/domdoc-package-stub.js";
import { DocumentSession } from "./document-session.js";
import {
  openDocxProsemirrorDemoSessionSlice,
  type DocxProsemirrorDemoSessionSlice,
} from "./docx-prosemirror-demo-session-slice.js";

/** Embedded DOCX OPC bytes inside `.domdoc` stub package (M1/M3 demo). */
export const DOMDOC_DEMO_DOCX_BLOB_KEY = "source/docx-package.zip" as const;

export interface ProsemirrorDomdocPackageRoundTripResult {
  simulation: DomdocStagedWriteSimulationResult;
  manifestBytes: Uint8Array;
  packageZipBytes: Uint8Array;
}

/** Persist demo slice as minimal `.domdoc` ZIP (manifest + journal + embedded DOCX). */
export function saveProsemirrorDemoDomdocPackageStub(
  slice: DocxProsemirrorDemoSessionSlice,
  store: MemoryDomdocBlobStoreStub,
): ProsemirrorDomdocPackageRoundTripResult {
  const session = slice.session;
  const plan = createDomdocPackagePersistPlanStub(session.stub);
  const manifestBytes = serializeDomdocPackageManifestStub(session.stub);
  const docxBytes = slice.store.exportBytes();
  const journalBytes = new TextEncoder().encode(
    `{"feature":"F21","documentId":"${session.documentId}","rev":${session.revisions.committedRevision}}\n`,
  );
  const simulation = store.applyMultiBlobStagedWrite(
    {
      [DOMDOC_DEMO_DOCX_BLOB_KEY]: docxBytes,
      "source/native-checkpoint.bin": new TextEncoder().encode("native-checkpoint-stub"),
      "state/semantic-journal.jsonl": journalBytes,
    },
    plan,
    manifestBytes,
  );
  const packageZipBytes = buildDomdocPackageZipFromStore(store, manifestBytes);
  return { simulation, manifestBytes, packageZipBytes };
}

function buildDomdocPackageZipFromStore(
  store: MemoryDomdocBlobStoreStub,
  manifestBytes: Uint8Array,
): Uint8Array {
  const members: Record<string, Uint8Array> = {
    "manifest.json": manifestBytes,
  };
  for (const key of store.lastCommittedBlobKeys) {
    const bytes = store.readBlob(key);
    if (bytes) members[key] = bytes;
  }
  return zipSync(members, { level: 0 });
}

/** Reopen `.domdoc` stub ZIP written by saveProsemirrorDemoDomdocPackageStub. */
export function loadProsemirrorDemoDomdocPackageStub(
  packageZipBytes: Uint8Array,
): DocxProsemirrorDemoSessionSlice | null {
  const raw = unzipSync(packageZipBytes);
  const manifestBytes = raw["manifest.json"];
  const docxBytes = raw[DOMDOC_DEMO_DOCX_BLOB_KEY];
  if (!manifestBytes || !docxBytes) return null;
  const manifest = parseDomdocPackageManifestStub(manifestBytes);
  const session = DocumentSession.openFromDomdocManifestStub(manifestBytes);
  return openDocxProsemirrorDemoSessionSlice(docxBytes, session.stub);
}
