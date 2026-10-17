import lazyManifest from "../../../docs/lazy-feature-manifest.stub.json" with { type: "json" };

/** M5/G5: Solid host re-exports the shared lazy feature manifest stub (gate not-run). */
export const domdocSolidLazyFeatureManifestSchemaVersion = lazyManifest.schemaVersion as 1;

export type DomdocSolidLazyFeatureManifestStub = typeof lazyManifest;

export const domdocSolidLazyFeatureManifestStub: DomdocSolidLazyFeatureManifestStub = lazyManifest;

export function listDomdocSolidLazyFeatureHostExamples(): readonly string[] {
  return lazyManifest.hostExamples;
}
