import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LAZY_FEATURE_MANIFEST_STUB,
  LAZY_FEATURE_MANIFEST_STUB_SCHEMA_VERSION,
  listLazyFeatureManifestHostExamples,
} from "./lazy-feature-manifest-stub.js";
const webRoot = join(import.meta.dirname, "../../../..");

/** Keep in sync with m5-framework-host-manifest-parity.test.ts (do not import .test modules). */
const BLUEPRINT_META_FRAMEWORK_HOSTS = [
  "next-host",
  "nuxt-host",
  "sveltekit-host",
  "astro-host",
] as const;

describe("lazy feature manifest stub (blueprint §12.5 parity)", () => {
  it("matches shared docs JSON stub bytes", () => {
    const fromDisk = JSON.parse(
      readFileSync(join(webRoot, "docs/lazy-feature-manifest.stub.json"), "utf8"),
    );
    expect(fromDisk).toEqual(LAZY_FEATURE_MANIFEST_STUB);
  });

  it("lists every blueprint meta-framework host example", () => {
    for (const host of BLUEPRINT_META_FRAMEWORK_HOSTS) {
      expect(listLazyFeatureManifestHostExamples()).toContain(host);
    }
    expect(LAZY_FEATURE_MANIFEST_STUB.schemaVersion).toBe(LAZY_FEATURE_MANIFEST_STUB_SCHEMA_VERSION);
    expect(LAZY_FEATURE_MANIFEST_STUB.gateStatus).toBe("not-run");
  });
});
