import lazyManifest from "../../../docs/lazy-feature-manifest.stub.json" with { type: "json" };

/** M5/G5: Nuxt host re-exports the shared lazy feature manifest stub (gate not-run). */
export const domdocNuxtHostLazyFeatureManifestSchemaVersion = lazyManifest.schemaVersion as 1;

export type DomdocNuxtHostLazyFeatureManifestStub = typeof lazyManifest;

export const domdocNuxtHostLazyFeatureManifestStub: DomdocNuxtHostLazyFeatureManifestStub = lazyManifest;

export function listDomdocNuxtHostLazyFeatureHostExamples(): readonly string[] {
  return lazyManifest.hostExamples;
}
