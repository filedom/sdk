import { describe, expect, it } from "vitest";
import { domdocAngularAdapterDemoSurface, provideDomdocSession } from "./domdoc-provider.js";

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
});
