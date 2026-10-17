import { describe, expect, it } from "vitest";
import {
  createDomdocSvelteSessionContext,
  domdocSvelteAdapterDemoSurface,
} from "./domdoc-context.js";

describe("@domdoc/svelte framework adapter stub (M5)", () => {
  it("creates session context for Svelte setContext/getContext wiring", () => {
    const ctx = createDomdocSvelteSessionContext("demo-sess");
    expect(ctx).toEqual({ sessionId: "demo-sess", surface: "framework-adapter-stub" });
  });

  it("exposes demo surface metadata for vanilla shell", () => {
    const surface = domdocSvelteAdapterDemoSurface("demo-sess");
    expect(surface.surface).toBe("framework-adapter-stub");
  });
});
