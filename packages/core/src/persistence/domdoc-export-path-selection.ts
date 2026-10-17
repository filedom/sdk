import {
  describeDomdocExportPolicy,
  type DomdocExportPolicyDescriptor,
  type DomdocExportPolicyRef,
} from "./domdoc-export-policy-stub.js";

/** Demo / host query param values for M1 export path selection (gate not-run for native stubs). */
export type DomdocDemoExportPathParam = "domdoc-package" | "enhanced-native" | "enhanced-native-stub";

export function resolveDomdocDemoExportPathFromParam(
  raw: string | null | undefined,
): DomdocExportPolicyRef {
  const value = (raw ?? "domdoc-package").trim().toLowerCase();
  if (value === "enhanced-native" || value === "enhanced-native-stub") {
    return "enhanced-native-stub";
  }
  return "domdoc-package";
}

export function describeDomdocDemoExportPath(
  raw: string | null | undefined,
): DomdocExportPolicyDescriptor & { usesDomdocPackageEnvelope: boolean } {
  const policy = resolveDomdocDemoExportPathFromParam(raw);
  const descriptor = describeDomdocExportPolicy(policy);
  return {
    ...descriptor,
    usesDomdocPackageEnvelope: policy === "domdoc-package",
  };
}
