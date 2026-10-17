import { describe, expect, it } from "vitest";
import { domdocReactAdapterDemoSurface } from "@domdoc/react";
import { domdocVueAdapterDemoSurface } from "@domdoc/vue";
import { domdocLitAdapterDemoSurface } from "@domdoc/lit";
import { domdocAngularAdapterDemoSurface } from "@domdoc/angular";
import { domdocSvelteAdapterDemoSurface } from "@domdoc/svelte";
import { domdocPreactAdapterDemoSurface } from "@domdoc/preact";
import { domdocSolidAdapterDemoSurface } from "@domdoc/solid";
import { domdocNextHostAdapterDemoSurface } from "@domdoc/next-host";
import { domdocNuxtHostAdapterDemoSurface } from "@domdoc/nuxt-host";
import { domdocSvelteKitHostAdapterDemoSurface } from "@domdoc/sveltekit-host";
import { domdocAstroHostAdapterDemoSurface } from "@domdoc/astro-host";

export const M5_FRAMEWORK_ADAPTER_STUB_SURFACE = "framework-adapter-stub" as const;

/** Blueprint §12.5 meta-framework full-feature hosts (Next, Nuxt, SvelteKit, Astro). */
export const M5_BLUEPRINT_META_FRAMEWORK_HOSTS = [
  "next-host",
  "nuxt-host",
  "sveltekit-host",
  "astro-host",
] as const;

/** Shared host manifest fields expected by demo shell dataset attributes. */
export interface M5FrameworkHostManifest {
  sessionId: string;
  surface: typeof M5_FRAMEWORK_ADAPTER_STUB_SURFACE;
}

describe("M5 framework host manifest parity", () => {
  /** Primary six host shells (blueprint M5 slice). */
  const coreSix = [
    ["react", domdocReactAdapterDemoSurface],
    ["vue", domdocVueAdapterDemoSurface],
    ["lit", domdocLitAdapterDemoSurface],
    ["angular", domdocAngularAdapterDemoSurface],
    ["svelte", domdocSvelteAdapterDemoSurface],
    ["next-host", domdocNextHostAdapterDemoSurface],
  ] as const;

  const extended = [
    ["preact", domdocPreactAdapterDemoSurface],
    ["solid", domdocSolidAdapterDemoSurface],
    ["nuxt-host", domdocNuxtHostAdapterDemoSurface],
    ["sveltekit-host", domdocSvelteKitHostAdapterDemoSurface],
    ["astro-host", domdocAstroHostAdapterDemoSurface],
  ] as const;

  const blueprintMetaFramework = [
    ["next-host", domdocNextHostAdapterDemoSurface],
    ["nuxt-host", domdocNuxtHostAdapterDemoSurface],
    ["sveltekit-host", domdocSvelteKitHostAdapterDemoSurface],
    ["astro-host", domdocAstroHostAdapterDemoSurface],
  ] as const;

  it.each(coreSix)("@domdoc/%s demo surface matches shared manifest (core six)", (_label, demoSurface) => {
    const manifest: M5FrameworkHostManifest = demoSurface("demo-sess");
    expect(manifest.sessionId).toBe("demo-sess");
    expect(manifest.surface).toBe(M5_FRAMEWORK_ADAPTER_STUB_SURFACE);
  });

  it.each(extended)("@domdoc/%s demo surface matches shared manifest (extended)", (_label, demoSurface) => {
    const manifest: M5FrameworkHostManifest = demoSurface("demo-sess");
    expect(manifest.sessionId).toBe("demo-sess");
    expect(manifest.surface).toBe(M5_FRAMEWORK_ADAPTER_STUB_SURFACE);
  });

  it.each(blueprintMetaFramework)(
    "blueprint meta-framework @domdoc/%s host stub registered",
    (label, demoSurface) => {
      expect(M5_BLUEPRINT_META_FRAMEWORK_HOSTS).toContain(label);
      const manifest: M5FrameworkHostManifest = demoSurface("demo-sess");
      expect(manifest.surface).toBe(M5_FRAMEWORK_ADAPTER_STUB_SURFACE);
    },
  );
});
