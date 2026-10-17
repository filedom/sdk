import { describe, expect, it } from "vitest";
import { domdocPreactAdapterDemoSurface } from "./DomdocProvider.js";

describe("@domdoc/preact framework adapter stub (M5)", () => {
  it("exposes demo surface metadata for vanilla shell", () => {
    const surface = domdocPreactAdapterDemoSurface("demo-sess");
    expect(surface.surface).toBe("framework-adapter-stub");
    expect(surface.sessionId).toBe("demo-sess");
  });
});
