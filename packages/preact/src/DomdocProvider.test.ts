import { describe, expect, it } from "vitest";
import { domdocPreactAdapterDemoSurface } from "./DomdocProvider.js";
import {
  domdocPreactLazyFeatureManifestStub,
  domdocPreactLazyFeatureManifestSchemaVersion,
  listDomdocPreactLazyFeatureHostExamples,
} from "./lazy-feature-manifest.js";

describe("@domdoc/preact framework adapter stub (M5)", () => {
  it("exposes demo surface metadata for vanilla shell", () => {
    const surface = domdocPreactAdapterDemoSurface("demo-sess");
    expect(surface.surface).toBe("framework-adapter-stub");
    expect(surface.sessionId).toBe("demo-sess");
  });

  it("re-exports lazy feature manifest stub for host parity (M5/G5)", () => {
    expect(domdocPreactLazyFeatureManifestSchemaVersion).toBe(1);
    expect(domdocPreactLazyFeatureManifestStub.gateStatus).toBe("not-run");
    expect(listDomdocPreactLazyFeatureHostExamples()).toContain("preact");
  });
});
