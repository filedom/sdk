import { describe, expect, it } from "vitest";
import {
  domdocNextHostAdapterDemoSurface,
  resolveDomdocNextHostClientBoundary,
} from "./client-boundary.js";

describe("@domdoc/next-host client boundary stub (M5)", () => {
  it("exposes demo surface metadata aligned with other adapters", () => {
    const surface = domdocNextHostAdapterDemoSurface("demo-sess");
    expect(surface.surface).toBe("framework-adapter-stub");
    expect(surface.sessionId).toBe("demo-sess");
    expect(surface.host).toBe("next-app-router-client-boundary-stub");
  });

  it("resolves client boundary hint without importing Next.js", () => {
    const boundary = resolveDomdocNextHostClientBoundary("demo-sess");
    expect(boundary.clientModuleHint).toBe("@domdoc/next-host/client-boundary");
    expect(boundary.sessionContext.sessionId).toBe("demo-sess");
  });
});
