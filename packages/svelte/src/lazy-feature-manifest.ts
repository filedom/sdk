import lazyManifest from "../../../docs/lazy-feature-manifest.stub.json" with { type: "json" };

/** M5/G5: Svelte host re-exports the shared lazy feature manifest stub (gate not-run). */
export const domdocSvelteLazyFeatureManifestSchemaVersion = lazyManifest.schemaVersion as 1;

export type DomdocSvelteLazyFeatureManifestStub = typeof lazyManifest;

export const domdocSvelteLazyFeatureManifestStub: DomdocSvelteLazyFeatureManifestStub = lazyManifest;

export function listDomdocSvelteLazyFeatureHostExamples(): readonly string[] {
  return lazyManifest.hostExamples;
}
