import lazyManifest from "../../../docs/lazy-feature-manifest.stub.json" with { type: "json" };

/** M5/G5: Angular host re-exports the shared lazy feature manifest stub (gate not-run). */
export const domdocAngularLazyFeatureManifestSchemaVersion = lazyManifest.schemaVersion as 1;

export type DomdocAngularLazyFeatureManifestStub = typeof lazyManifest;

export const domdocAngularLazyFeatureManifestStub: DomdocAngularLazyFeatureManifestStub = lazyManifest;

export function listDomdocAngularLazyFeatureHostExamples(): readonly string[] {
  return lazyManifest.hostExamples;
}
