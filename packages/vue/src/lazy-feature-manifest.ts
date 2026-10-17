import lazyManifest from "../../../docs/lazy-feature-manifest.stub.json" with { type: "json" };

/** M5/G5: Vue host re-exports the shared lazy feature manifest stub (gate not-run). */
export const domdocVueLazyFeatureManifestSchemaVersion = lazyManifest.schemaVersion as 1;

export type DomdocVueLazyFeatureManifestStub = typeof lazyManifest;

export const domdocVueLazyFeatureManifestStub: DomdocVueLazyFeatureManifestStub = lazyManifest;

export function listDomdocVueLazyFeatureHostExamples(): readonly string[] {
  return lazyManifest.hostExamples;
}
