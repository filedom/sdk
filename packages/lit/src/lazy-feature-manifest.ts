import lazyManifest from "../../../docs/lazy-feature-manifest.stub.json" with { type: "json" };

/** M5/G5: Lit host re-exports the shared lazy feature manifest stub (gate not-run). */
export const domdocLitLazyFeatureManifestSchemaVersion = lazyManifest.schemaVersion as 1;

export type DomdocLitLazyFeatureManifestStub = typeof lazyManifest;

export const domdocLitLazyFeatureManifestStub: DomdocLitLazyFeatureManifestStub = lazyManifest;

export function listDomdocLitLazyFeatureHostExamples(): readonly string[] {
  return lazyManifest.hostExamples;
}
