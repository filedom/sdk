import { describe, expect, it } from "vitest";
import {
  domdocSvelteKitHostAdapterDemoSurface,
  resolveDomdocSvelteKitHostClientBoundary,
} from "./client-boundary.js";

describe("@domdoc/sveltekit-host client boundary stub (M5)", () => {
  it("exposes framework-adapter-stub surface", () => {
    const manifest = domdocSvelteKitHostAdapterDemoSurface("demo-sess");
    expect(manifest.sessionId).toBe("demo-sess");
    expect(manifest.surface).toBe("framework-adapter-stub");
    expect(manifest.host).toBe("sveltekit-client-boundary-stub");
  });

  it("resolves client boundary hint", () => {
    const boundary = resolveDomdocSvelteKitHostClientBoundary("demo-sess");
    expect(boundary.clientModuleHint).toBe("@domdoc/sveltekit-host/client-boundary");
    expect(boundary.sessionContext.sessionId).toBe("demo-sess");
  });
});
