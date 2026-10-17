/** Blueprint §12.5 — shared lazy feature manifest stub for full host examples (gate not-run). */
export const LAZY_FEATURE_MANIFEST_STUB_SCHEMA_VERSION = 1 as const;

export interface LazyFeatureManifestLazyModuleStub {
  id: string;
  label: string;
  loadPolicy: "on-demand";
}

export interface LazyFeatureManifestStub {
  schemaVersion: typeof LAZY_FEATURE_MANIFEST_STUB_SCHEMA_VERSION;
  manifestKind: "domdoc-lazy-feature-manifest-stub";
  description: string;
  coreFeaturesEnabled: readonly string[];
  lazyModules: readonly LazyFeatureManifestLazyModuleStub[];
  hostExamples: readonly string[];
  gateStatus: "not-run";
}

/** Canonical JSON stub (mirrors docs/lazy-feature-manifest.stub.json). */
export const LAZY_FEATURE_MANIFEST_STUB: LazyFeatureManifestStub = {
  schemaVersion: 1,
  manifestKind: "domdoc-lazy-feature-manifest-stub",
  description:
    "Blueprint §12.5 / master prompt: one manifest enables implemented features across host examples; optional modules stay lazy.",
  coreFeaturesEnabled: ["F01", "F13", "F20", "F21", "F25", "F34", "F39"],
  lazyModules: [
    { id: "F50", label: "collaboration-ordered-stub", loadPolicy: "on-demand" },
    { id: "F74", label: "language-packs", loadPolicy: "on-demand" },
    { id: "ocr", label: "tesseract-worker", loadPolicy: "on-demand" },
    { id: "signing", label: "signing-provider", loadPolicy: "on-demand" },
  ],
  hostExamples: [
    "react",
    "vue",
    "angular",
    "svelte",
    "lit",
    "preact",
    "solid",
    "next-host",
    "nuxt-host",
    "sveltekit-host",
    "astro-host",
  ],
  gateStatus: "not-run",
};

export function listLazyFeatureManifestHostExamples(): readonly string[] {
  return LAZY_FEATURE_MANIFEST_STUB.hostExamples;
}
