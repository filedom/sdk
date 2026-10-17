import { describe, expect, it } from "vitest";
import {
  attachM2DemoSessionBindingToManifestStub,
  createDomdocPackageManifestStub,
} from "../persistence/domdoc-package-stub.js";

/** F05 common shell: demo toolbar session binding on manifest stub (not authoritative session). */
describe("F05 M2 toolbar shell contract", () => {
  const session = {
    documentId: "doc-shell",
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

  it("binds toolbarSessionId to the same demo session id as the host shell", () => {
    const manifest = createDomdocPackageManifestStub(session);
    const bound = attachM2DemoSessionBindingToManifestStub(manifest, {
      sessionId: "demo-sess",
      toolbarSessionId: "demo-sess",
    });
    expect(bound.m2DemoSessionBinding?.sessionId).toBe("demo-sess");
    expect(bound.m2DemoSessionBinding?.toolbarSessionId).toBe("demo-sess");
  });
});
