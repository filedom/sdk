import lazyManifest from "../../../docs/lazy-feature-manifest.stub.json" with { type: "json" };

/** M5/G5: SvelteKit host re-exports the shared lazy feature manifest stub (gate not-run). */
export const domdocSvelteKitHostLazyFeatureManifestSchemaVersion = lazyManifest.schemaVersion as 1;

export type DomdocSvelteKitHostLazyFeatureManifestStub = typeof lazyManifest;

export const domdocSvelteKitHostLazyFeatureManifestStub: DomdocSvelteKitHostLazyFeatureManifestStub =
  lazyManifest;

export function listDomdocSvelteKitHostLazyFeatureHostExamples(): readonly string[] {
  return lazyManifest.hostExamples;
}
