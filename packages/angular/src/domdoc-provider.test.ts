import { describe, expect, it } from "vitest";
import { domdocAngularAdapterDemoSurface, provideDomdocSession } from "./domdoc-provider.js";
import {
  domdocAngularLazyFeatureManifestStub,
  domdocAngularLazyFeatureManifestSchemaVersion,
  listDomdocAngularLazyFeatureHostExamples,
} from "./lazy-feature-manifest.js";

describe("@domdoc/angular framework adapter stub (M5)", () => {
  it("provides session context via Angular provider factory", () => {
    const provider = provideDomdocSession("demo-sess") as {
      provide: unknown;
      useValue: { sessionId: string; surface: string };
    };
    expect(provider.provide).toBeDefined();
    expect(provider.useValue).toEqual({
      sessionId: "demo-sess",
      surface: "framework-adapter-stub",
    });
  });

  it("exposes demo surface metadata for vanilla shell", () => {
    const surface = domdocAngularAdapterDemoSurface("demo-sess");
    expect(surface.surface).toBe("framework-adapter-stub");
    expect(surface.sessionId).toBe("demo-sess");
  });

  it("re-exports lazy feature manifest stub for host parity (M5/G5)", () => {
    expect(domdocAngularLazyFeatureManifestSchemaVersion).toBe(1);
    expect(domdocAngularLazyFeatureManifestStub.gateStatus).toBe("not-run");
    expect(listDomdocAngularLazyFeatureHostExamples()).toContain("angular");
  });
});
