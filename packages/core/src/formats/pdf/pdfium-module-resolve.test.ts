import { describe, expect, it } from "vitest";
import { resolvePdfiumWasmModule } from "./pdfium-module-resolve.js";

describe("G1-PDF-06 pdfium module resolve", () => {
  it("resolves vendor artifact or npm placeholder", () => {
    const resolved = resolvePdfiumWasmModule();
    if (resolved.source === "vendor-artifact") {
      expect(resolved.vendorPath).toContain("domdoc-pdfium-wasm");
      return;
    }
    expect(resolved.source).toBe("npm-placeholder");
    expect(resolved.spec).toContain("domdoc-pdfium-wasm");
  });
});
