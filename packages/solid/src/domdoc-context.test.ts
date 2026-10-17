import { describe, expect, it } from "vitest";
import { domdocSolidAdapterDemoSurface } from "./domdoc-context.js";

describe("@domdoc/solid framework adapter stub (M5)", () => {
  it("exposes demo surface metadata for vanilla shell", () => {
    const surface = domdocSolidAdapterDemoSurface("demo-sess");
    expect(surface.surface).toBe("framework-adapter-stub");
    expect(surface.sessionId).toBe("demo-sess");
  });
});
