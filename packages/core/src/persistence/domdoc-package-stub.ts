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

/** §13.2 crash-safe persist ordering: verified blob before manifest commit. */
export const DOMDOC_CRASH_SAFE_COMMIT_STEPS = [
  "write-content-addressed-blob",
  "verify-blob-bytes",
  "prepare-manifest-with-blob-reference",
  "commit-indexeddb-manifest-transaction",
  "garbage-collect-unreferenced-blobs-after-grace",
] as const;

export type DomdocCrashSafeCommitStep = (typeof DOMDOC_CRASH_SAFE_COMMIT_STEPS)[number];

export interface DomdocPackagePersistPlanStub {
  documentId: string;
  schemaVersion: typeof DOMDOC_PACKAGE_SCHEMA_VERSION;
  /** Ordered steps the host must follow; no cross-API IDB/OPFS transaction. */
  commitSteps: readonly DomdocCrashSafeCommitStep[];
  /** Recovery reads only committed manifests (§13.2). */
  recoveryPolicy: "committed-manifest-only";
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

export function createDomdocPackagePersistPlanStub(
  session: DocumentSessionStub,
): DomdocPackagePersistPlanStub {
  return {
    documentId: session.documentId,
    schemaVersion: DOMDOC_PACKAGE_SCHEMA_VERSION,
    commitSteps: [...DOMDOC_CRASH_SAFE_COMMIT_STEPS],
    recoveryPolicy: "committed-manifest-only",
  };
}

/** G5/M1: verify crash-safe ordering — blob verified before manifest commit. */
export interface DomdocStagedWriteSimulationStep {
  step: DomdocCrashSafeCommitStep;
  status: "completed" | "aborted";
}

export interface DomdocStagedWriteSimulationResult {
  ok: boolean;
  steps: readonly DomdocStagedWriteSimulationStep[];
  committedManifest: boolean;
  detail?: string;
}

/** G5: minimal staged write simulation — blob verified before manifest commit. */
export function simulateDomdocCrashSafeStagedWrite(
  plan: DomdocPackagePersistPlanStub,
  blobBytes: Uint8Array,
  manifestBytes: Uint8Array,
  options?: { abortAfterStep?: DomdocCrashSafeCommitStep },
): DomdocStagedWriteSimulationResult {
  const ordering = validateDomdocCrashSafeCommitPlan(plan);
  if (!ordering.ok) {
    return { ok: false, steps: [], committedManifest: false, detail: ordering.detail };
  }
  const steps: DomdocStagedWriteSimulationStep[] = [];
  for (const step of plan.commitSteps) {
    if (options?.abortAfterStep === step) {
      steps.push({ step, status: "aborted" });
      return { ok: false, steps, committedManifest: false, detail: `aborted-at-${step}` };
    }
    if (step === "verify-blob-bytes" && blobBytes.length === 0) {
      steps.push({ step, status: "aborted" });
      return { ok: false, steps, committedManifest: false, detail: "empty-blob-rejected" };
    }
    if (step === "commit-indexeddb-manifest-transaction" && manifestBytes.length === 0) {
      steps.push({ step, status: "aborted" });
      return { ok: false, steps, committedManifest: false, detail: "empty-manifest-rejected" };
    }
    steps.push({ step, status: "completed" });
  }
  return { ok: true, steps, committedManifest: true };
}

export function validateDomdocCrashSafeCommitPlan(
  plan: DomdocPackagePersistPlanStub,
): { ok: true } | { ok: false; detail: string } {
  const verifyIdx = plan.commitSteps.indexOf("verify-blob-bytes");
  const commitIdx = plan.commitSteps.indexOf("commit-indexeddb-manifest-transaction");
  if (verifyIdx < 0 || commitIdx < 0) {
    return { ok: false, detail: "missing required commit steps" };
  }
  if (verifyIdx >= commitIdx) {
    return { ok: false, detail: "manifest commit must follow blob verification" };
  }
  const writeIdx = plan.commitSteps.indexOf("write-content-addressed-blob");
  if (writeIdx < 0 || writeIdx > verifyIdx) {
    return { ok: false, detail: "blob write must precede verification" };
  }
  return { ok: true };
}

/** M1: UTF-8 manifest.json bytes for host write stub (§13.3). */
export function serializeDomdocPackageManifestStub(session: DocumentSessionStub): Uint8Array {
  const manifest = createDomdocPackageManifestStub(session);
  return new TextEncoder().encode(`${JSON.stringify(manifest, null, 2)}\n`);
}

/** M1/G5: parse manifest.json stub bytes (minimal round-trip). */
export function parseDomdocPackageManifestStub(bytes: Uint8Array): DomdocPackageManifestStub {
  const parsed = JSON.parse(new TextDecoder().decode(bytes)) as DomdocPackageManifestStub;
  if (parsed.schemaVersion !== DOMDOC_PACKAGE_SCHEMA_VERSION) {
    throw new Error(`unsupported domdoc manifest schemaVersion: ${String(parsed.schemaVersion)}`);
  }
  if (!parsed.documentId || typeof parsed.documentId !== "string") {
    throw new Error("domdoc manifest missing documentId");
  }
  return parsed;
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
