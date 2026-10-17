import { describe, expect, it } from "vitest";
import {
  domdocAstroHostAdapterDemoSurface,
  resolveDomdocAstroHostClientBoundary,
} from "./client-boundary.js";

describe("@domdoc/astro-host client boundary stub (M5)", () => {
  it("exposes framework-adapter-stub surface", () => {
    const manifest = domdocAstroHostAdapterDemoSurface("demo-sess");
    expect(manifest.sessionId).toBe("demo-sess");
    expect(manifest.surface).toBe("framework-adapter-stub");
    expect(manifest.host).toBe("astro-client-boundary-stub");
  });

  it("resolves client boundary hint", () => {
    const boundary = resolveDomdocAstroHostClientBoundary("demo-sess");
    expect(boundary.clientModuleHint).toBe("@domdoc/astro-host/client-boundary");
    expect(boundary.sessionContext.sessionId).toBe("demo-sess");
  });
});
