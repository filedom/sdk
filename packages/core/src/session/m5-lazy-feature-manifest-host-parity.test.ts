import { describe, expect, it } from "vitest";
import { domdocReactLazyFeatureManifestStub } from "@domdoc/react";
import { domdocVueLazyFeatureManifestStub } from "@domdoc/vue";
import { domdocLitLazyFeatureManifestStub } from "@domdoc/lit";
import { domdocAngularLazyFeatureManifestStub } from "@domdoc/angular";
import { domdocSvelteLazyFeatureManifestStub } from "@domdoc/svelte";
import { domdocPreactLazyFeatureManifestStub } from "@domdoc/preact";
import { domdocSolidLazyFeatureManifestStub } from "@domdoc/solid";
import { domdocNextHostLazyFeatureManifestStub } from "@domdoc/next-host";
import { domdocNuxtHostLazyFeatureManifestStub } from "@domdoc/nuxt-host";
import { domdocSvelteKitHostLazyFeatureManifestStub } from "@domdoc/sveltekit-host";
import { domdocAstroHostLazyFeatureManifestStub } from "@domdoc/astro-host";
import {
  LAZY_FEATURE_MANIFEST_STUB,
  LAZY_FEATURE_MANIFEST_STUB_ID,
  computeLazyFeatureManifestStubContentHash,
} from "./lazy-feature-manifest-stub.js";

describe("M5/G5 lazy feature manifest host parity", () => {
  const canonicalHash = computeLazyFeatureManifestStubContentHash();

  const hosts = [
    ["react", domdocReactLazyFeatureManifestStub],
    ["vue", domdocVueLazyFeatureManifestStub],
    ["lit", domdocLitLazyFeatureManifestStub],
    ["angular", domdocAngularLazyFeatureManifestStub],
    ["svelte", domdocSvelteLazyFeatureManifestStub],
    ["preact", domdocPreactLazyFeatureManifestStub],
    ["solid", domdocSolidLazyFeatureManifestStub],
    ["next-host", domdocNextHostLazyFeatureManifestStub],
    ["nuxt-host", domdocNuxtHostLazyFeatureManifestStub],
    ["sveltekit-host", domdocSvelteKitHostLazyFeatureManifestStub],
    ["astro-host", domdocAstroHostLazyFeatureManifestStub],
  ] as const;

  it.each(hosts)("@domdoc/%s exports shared lazy manifest id and content hash", (_label, stub) => {
    expect(stub.manifestKind).toBe(LAZY_FEATURE_MANIFEST_STUB_ID);
    expect(stub).toEqual(LAZY_FEATURE_MANIFEST_STUB);
    expect(computeLazyFeatureManifestStubContentHash(stub)).toBe(canonicalHash);
  });
});
