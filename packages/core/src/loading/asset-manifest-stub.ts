/** Versioned immutable asset manifest stub (implementation update §4.5 — gate not-run). */

export interface DomdocAssetManifestEntryStub {
  logicalName: string;
  moduleId: string;
  protocolVersion: number;
  /** Expected SHA-256 hex when built artifacts are pinned (empty = not pinned in stub). */
  sha256Hex: string;
  urlPattern: string;
}

export interface DomdocAssetManifestStub {
  schemaVersion: 1;
  manifestKind: "domdoc-asset-manifest-stub";
  description: string;
  entries: readonly DomdocAssetManifestEntryStub[];
}

export const DOMDOC_ASSET_MANIFEST_STUB: DomdocAssetManifestStub = {
  schemaVersion: 1,
  manifestKind: "domdoc-asset-manifest-stub",
  description:
    "Host-resolved URLs for WASM/workers; validate protocolVersion + hash before processing state.",
  entries: [
    {
      logicalName: "display-engine-wasm",
      moduleId: "docx-adapter",
      protocolVersion: 1,
      sha256Hex: "",
      urlPattern: "{hostBase}/engine/domdoc_engine_bg.wasm",
    },
    {
      logicalName: "pdf-display-js",
      moduleId: "pdf-display",
      protocolVersion: 1,
      sha256Hex: "",
      urlPattern: "{hostBase}/pdfium/domdoc_pdfium.js",
    },
    {
      logicalName: "pdf-writer-worker",
      moduleId: "pdf-writer",
      protocolVersion: 1,
      sha256Hex: "",
      urlPattern: "{hostBase}/workers/pdf-writer.js",
    },
    {
      logicalName: "legacy-doc-importer",
      moduleId: "legacy-doc-importer",
      protocolVersion: 1,
      sha256Hex: "",
      urlPattern: "{hostBase}/formats/legacy-doc-importer.js",
    },
  ],
};
