import lazyManifest from "../../../docs/lazy-feature-manifest.stub.json" with { type: "json" };

/** M5/G5: React host re-exports the shared lazy feature manifest stub (gate not-run). */
export const domdocReactLazyFeatureManifestSchemaVersion = lazyManifest.schemaVersion as 1;

export type DomdocReactLazyFeatureManifestStub = typeof lazyManifest;

export const domdocReactLazyFeatureManifestStub: DomdocReactLazyFeatureManifestStub = lazyManifest;

export function listDomdocReactLazyFeatureHostExamples(): readonly string[] {
  return lazyManifest.hostExamples;
}
