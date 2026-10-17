import lazyManifest from "../../../docs/lazy-feature-manifest.stub.json" with { type: "json" };

/** M5/G5: Preact host re-exports the shared lazy feature manifest stub (gate not-run). */
export const domdocPreactLazyFeatureManifestSchemaVersion = lazyManifest.schemaVersion as 1;

export type DomdocPreactLazyFeatureManifestStub = typeof lazyManifest;

export const domdocPreactLazyFeatureManifestStub: DomdocPreactLazyFeatureManifestStub = lazyManifest;

export function listDomdocPreactLazyFeatureHostExamples(): readonly string[] {
  return lazyManifest.hostExamples;
}
