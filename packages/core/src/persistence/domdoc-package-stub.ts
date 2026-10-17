import type { DocumentKind, DocumentSessionStub } from "../wire/domain-owned.js";

/** Internal v1 `.domdoc` ZIP manifest stub (blueprint §13.3). */
export const DOMDOC_PACKAGE_SCHEMA_VERSION = 1 as const;

export interface DomdocPackageManifestStub {
  schemaVersion: typeof DOMDOC_PACKAGE_SCHEMA_VERSION;
  documentId: string;
  kind: DocumentKind;
  committedRevision: number;
  nativeCheckpointRevision: number;
  exportPolicy: "domdoc-package";
  memberHashes: Record<string, string>;
}

export function createDomdocPackageManifestStub(
  session: DocumentSessionStub,
): DomdocPackageManifestStub {
  return {
    schemaVersion: DOMDOC_PACKAGE_SCHEMA_VERSION,
    documentId: session.documentId,
    kind: session.kind,
    committedRevision: session.revisions.committedRevision,
    nativeCheckpointRevision: session.revisions.materializedRevision,
    exportPolicy: "domdoc-package",
    memberHashes: {
      "manifest.json": "not-computed",
      "source/": "not-computed",
      "state/": "not-computed",
    },
  };
}
