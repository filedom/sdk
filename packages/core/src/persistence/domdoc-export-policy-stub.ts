import type { DomdocPackageManifestStub } from "./domdoc-package-stub.js";

/** Manifest export policy (implemented M1 reopen stub). */
export type DomdocExportPolicyManifest = DomdocPackageManifestStub["exportPolicy"];

/** Blueprint §7 labels for policies not yet wired to persist (honest stubs). */
export type DomdocExportPolicyStubLabel = "enhanced-native-stub" | "portable-native-stub";

export type DomdocExportPolicyRef =
  | DomdocExportPolicyManifest
  | DomdocExportPolicyStubLabel;

export interface DomdocExportPolicyDescriptor {
  policy: DomdocExportPolicyRef;
  implemented: boolean;
  envelope: string;
  nativeCheckpoint: string;
}

const DESCRIPTORS: Record<DomdocExportPolicyRef, DomdocExportPolicyDescriptor> = {
  "domdoc-package": {
    policy: "domdoc-package",
    implemented: true,
    envelope: ".domdoc ZIP (manifest, source/, state/, assets/, fallbacks/)",
    nativeCheckpoint: "optional embedded bytes",
  },
  "enhanced-native-stub": {
    policy: "enhanced-native-stub",
    implemented: false,
    envelope: "native OPC/PDF + domdoc sidecar diagnostics (stub label only)",
    nativeCheckpoint: "authoritative native bytes + revision ledger (not wired)",
  },
  "portable-native-stub": {
    policy: "portable-native-stub",
    implemented: false,
    envelope: "native file only (stub label only)",
    nativeCheckpoint: "same as enhanced without domdoc envelope (not wired)",
  },
};

/** Resolve export policy metadata for manifest or stub labels (G5/M1 — gate not-run). */
export function describeDomdocExportPolicy(
  policy: DomdocExportPolicyRef,
): DomdocExportPolicyDescriptor {
  return DESCRIPTORS[policy];
}

/** F49 / G5: enhanced-native export path label (stub — gate not-run). */
export function createEnhancedNativeExportStubDescriptor(): DomdocExportPolicyDescriptor {
  return describeDomdocExportPolicy("enhanced-native-stub");
}

/** Default reopen path exercised in tests: domdoc-package manifest exportPolicy. */
export function readDomdocExportPolicyFromManifestStub(
  manifest: DomdocPackageManifestStub,
): DomdocExportPolicyDescriptor {
  if (manifest.exportPolicy !== "domdoc-package") {
    throw new Error(`unsupported manifest exportPolicy: ${String(manifest.exportPolicy)}`);
  }
  return describeDomdocExportPolicy("domdoc-package");
}
