import type { DocumentKind, DocumentSessionStub } from "../wire/domain-owned.js";

/** Internal v1 `.domdoc` ZIP manifest stub (blueprint §13.3). */
export const DOMDOC_PACKAGE_SCHEMA_VERSION = 1 as const;

export const DOMDOC_REQUIRED_MEMBER_PREFIXES = [
  "manifest.json",
  "source/",
  "state/",
  "assets/",
  "fallbacks/",
] as const;

export type DomdocPackageMemberRole =
  | "manifest"
  | "source"
  | "state"
  | "asset"
  | "fallback";

export interface DomdocPackageMemberStub {
  path: string;
  role: DomdocPackageMemberRole;
  /** Placeholder until content-addressing is wired (RFC 8785 hashes). */
  contentHash: "not-computed";
}

export interface DomdocPackageManifestStub {
  schemaVersion: typeof DOMDOC_PACKAGE_SCHEMA_VERSION;
  documentId: string;
  kind: DocumentKind;
  committedRevision: number;
  nativeCheckpointRevision: number;
  exportPolicy: "domdoc-package";
  requiredMembers: readonly string[];
  componentSchemaVersions: Record<string, number>;
  memberHashes: Record<string, string>;
}

export interface DomdocPackageBlobIndexStub {
  documentId: string;
  members: readonly DomdocPackageMemberStub[];
}

export function createDomdocPackageBlobIndexStub(
  session: DocumentSessionStub,
): DomdocPackageBlobIndexStub {
  const base = session.documentId;
  return {
    documentId: base,
    members: [
      { path: "manifest.json", role: "manifest", contentHash: "not-computed" },
      { path: "source/native-checkpoint.bin", role: "source", contentHash: "not-computed" },
      { path: "state/semantic-journal.jsonl", role: "state", contentHash: "not-computed" },
      { path: "assets/.keep", role: "asset", contentHash: "not-computed" },
      { path: "fallbacks/components/.keep", role: "fallback", contentHash: "not-computed" },
    ],
  };
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
    requiredMembers: [...DOMDOC_REQUIRED_MEMBER_PREFIXES],
    componentSchemaVersions: {},
    memberHashes: {
      "manifest.json": "not-computed",
      "source/": "not-computed",
      "state/": "not-computed",
      "assets/": "not-computed",
      "fallbacks/": "not-computed",
    },
  };
}
