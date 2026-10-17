import { describe, expect, it } from "vitest";
import {
  createDomdocSvelteSessionContext,
  domdocSvelteAdapterDemoSurface,
} from "./domdoc-context.js";
import {
  domdocSvelteLazyFeatureManifestStub,
  domdocSvelteLazyFeatureManifestSchemaVersion,
  listDomdocSvelteLazyFeatureHostExamples,
} from "./lazy-feature-manifest.js";

describe("@domdoc/svelte framework adapter stub (M5)", () => {
  it("creates session context for Svelte setContext/getContext wiring", () => {
    const ctx = createDomdocSvelteSessionContext("demo-sess");
    expect(ctx).toEqual({ sessionId: "demo-sess", surface: "framework-adapter-stub" });
  });

  it("exposes demo surface metadata for vanilla shell", () => {
    const surface = domdocSvelteAdapterDemoSurface("demo-sess");
    expect(surface.surface).toBe("framework-adapter-stub");
  });

  it("re-exports lazy feature manifest stub for host parity (M5/G5)", () => {
    expect(domdocSvelteLazyFeatureManifestSchemaVersion).toBe(1);
    expect(domdocSvelteLazyFeatureManifestStub.gateStatus).toBe("not-run");
    expect(listDomdocSvelteLazyFeatureHostExamples()).toContain("svelte");
  });
});
