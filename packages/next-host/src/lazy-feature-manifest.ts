import lazyManifest from "../../../docs/lazy-feature-manifest.stub.json" with { type: "json" };

/** M5/G5: Next.js host re-exports the shared lazy feature manifest stub (gate not-run). */
export const domdocNextHostLazyFeatureManifestSchemaVersion = lazyManifest.schemaVersion as 1;

export type DomdocNextHostLazyFeatureManifestStub = typeof lazyManifest;

export const domdocNextHostLazyFeatureManifestStub: DomdocNextHostLazyFeatureManifestStub = lazyManifest;

export function listDomdocNextHostLazyFeatureHostExamples(): readonly string[] {
  return lazyManifest.hostExamples;
}
