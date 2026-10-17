import { describe, expect, it } from "vitest";
import {
  domdocNuxtHostAdapterDemoSurface,
  resolveDomdocNuxtHostClientBoundary,
} from "./client-boundary.js";
import {
  domdocNuxtHostLazyFeatureManifestStub,
  domdocNuxtHostLazyFeatureManifestSchemaVersion,
  listDomdocNuxtHostLazyFeatureHostExamples,
} from "./lazy-feature-manifest.js";

describe("@domdoc/nuxt-host client boundary stub (M5)", () => {
  it("exposes framework-adapter-stub surface", () => {
    const manifest = domdocNuxtHostAdapterDemoSurface("demo-sess");
    expect(manifest.sessionId).toBe("demo-sess");
    expect(manifest.surface).toBe("framework-adapter-stub");
    expect(manifest.host).toBe("nuxt-client-boundary-stub");
  });

  it("resolves client boundary hint", () => {
    const boundary = resolveDomdocNuxtHostClientBoundary("demo-sess");
    expect(boundary.clientModuleHint).toBe("@domdoc/nuxt-host/client-boundary");
    expect(boundary.sessionContext.sessionId).toBe("demo-sess");
  });

  it("re-exports lazy feature manifest stub for host parity (M5/G5)", () => {
    expect(domdocNuxtHostLazyFeatureManifestSchemaVersion).toBe(1);
    expect(domdocNuxtHostLazyFeatureManifestStub.gateStatus).toBe("not-run");
    expect(listDomdocNuxtHostLazyFeatureHostExamples()).toContain("nuxt-host");
  });
});
