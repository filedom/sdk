import { describe, expect, it } from "vitest";
import {
  createDomdocPackageManifestStub,
  DOMDOC_REQUIRED_MEMBER_PREFIXES,
} from "./domdoc-package-stub.js";
import {
  describeDomdocExportPolicy,
  readDomdocExportPolicyFromManifestStub,
} from "./domdoc-export-policy-stub.js";

/** M1 export policy on domdoc package manifest (blueprint §13.3 / export-policy-m1). */
describe("domdoc export policy stub", () => {
  const session = {
    documentId: "doc-export",
    kind: "flow" as const,
    revisions: {
      committedRevision: 1,
      persistedRevision: 0,
      materializedRevision: 1,
      exportedRevision: 0,
      sharedRevision: null,
      renderedRevision: 1,
    },
  };

  it("defaults exportPolicy to domdoc-package with required member prefixes", () => {
    const manifest = createDomdocPackageManifestStub(session);
    expect(manifest.exportPolicy).toBe("domdoc-package");
    expect(manifest.requiredMembers).toEqual([...DOMDOC_REQUIRED_MEMBER_PREFIXES]);
  });

  it("labels enhanced-native vs portable-native as unimplemented stubs", () => {
    const enhanced = describeDomdocExportPolicy("enhanced-native-stub");
    const portable = describeDomdocExportPolicy("portable-native-stub");
    expect(enhanced.implemented).toBe(false);
    expect(portable.implemented).toBe(false);
    expect(enhanced.envelope).toContain("sidecar");
    expect(portable.envelope).toContain("native file only");
  });

  it("reads implemented domdoc-package policy from manifest stub", () => {
    const manifest = createDomdocPackageManifestStub(session);
    const descriptor = readDomdocExportPolicyFromManifestStub(manifest);
    expect(descriptor.implemented).toBe(true);
    expect(descriptor.policy).toBe("domdoc-package");
  });
});
