import { describe, expect, it } from "vitest";
import { domdocSolidAdapterDemoSurface } from "./domdoc-context.js";
import {
  domdocSolidLazyFeatureManifestStub,
  domdocSolidLazyFeatureManifestSchemaVersion,
  listDomdocSolidLazyFeatureHostExamples,
} from "./lazy-feature-manifest.js";

describe("@domdoc/solid framework adapter stub (M5)", () => {
  it("exposes demo surface metadata for vanilla shell", () => {
    const surface = domdocSolidAdapterDemoSurface("demo-sess");
    expect(surface.surface).toBe("framework-adapter-stub");
    expect(surface.sessionId).toBe("demo-sess");
  });

  it("re-exports lazy feature manifest stub for host parity (M5/G5)", () => {
    expect(domdocSolidLazyFeatureManifestSchemaVersion).toBe(1);
    expect(domdocSolidLazyFeatureManifestStub.gateStatus).toBe("not-run");
    expect(listDomdocSolidLazyFeatureHostExamples()).toContain("solid");
  });
});
