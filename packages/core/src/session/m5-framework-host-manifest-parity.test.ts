import { describe, expect, it } from "vitest";
import { domdocReactAdapterDemoSurface } from "@domdoc/react";
import { domdocVueAdapterDemoSurface } from "@domdoc/vue";
import { domdocLitAdapterDemoSurface } from "@domdoc/lit";
import { domdocAngularAdapterDemoSurface } from "@domdoc/angular";
import { domdocSvelteAdapterDemoSurface } from "@domdoc/svelte";

export const M5_FRAMEWORK_ADAPTER_STUB_SURFACE = "framework-adapter-stub" as const;

/** Shared host manifest fields expected by demo shell dataset attributes. */
export interface M5FrameworkHostManifest {
  sessionId: string;
  surface: typeof M5_FRAMEWORK_ADAPTER_STUB_SURFACE;
}

describe("M5 framework host manifest parity", () => {
  const adapters = [
    ["react", domdocReactAdapterDemoSurface],
    ["vue", domdocVueAdapterDemoSurface],
    ["lit", domdocLitAdapterDemoSurface],
    ["angular", domdocAngularAdapterDemoSurface],
    ["svelte", domdocSvelteAdapterDemoSurface],
  ] as const;

  it.each(adapters)("@domdoc/%s demo surface matches shared manifest", (_label, demoSurface) => {
    const manifest: M5FrameworkHostManifest = demoSurface("demo-sess");
    expect(manifest.sessionId).toBe("demo-sess");
    expect(manifest.surface).toBe(M5_FRAMEWORK_ADAPTER_STUB_SURFACE);
  });
});
