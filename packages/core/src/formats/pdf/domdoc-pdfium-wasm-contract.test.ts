import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyPdfProofOperation } from "./pdfium-proof-hooks.js";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "..");
const pkgRoot = join(webRoot, "packages", "domdoc-pdfium-wasm");

describe("domdoc-pdfium-wasm C24 contract package (G1 scaffold)", () => {
  it("README ties P01–P05 to pdfium-proof-hooks", () => {
    const readme = readFileSync(join(pkgRoot, "README.md"), "utf8");
    expect(readme).toContain("pdfium-proof-hooks.ts");
    expect(readme).toContain("pdfium-native-api.ts");
    const p04 = classifyPdfProofOperation(
      { kind: "deleteTextObject", pageIndex: 0, objectId: "0:0", expectedRevision: 0 },
      false,
    );
    expect(p04.fixtureId).toBe("P04");
  });

  it("dist manifest marks contract scaffold when present", () => {
    const manifestPath = join(pkgRoot, "dist", "index.mjs");
    if (!existsSync(manifestPath)) {
      expect(existsSync(join(pkgRoot, "scripts", "build-manifest.mjs"))).toBe(true);
      return;
    }
    const text = readFileSync(manifestPath, "utf8");
    expect(text).toContain("__domdocPdfiumContractScaffold");
    expect(text).toContain("c24WriterExports: false");
  });
});
